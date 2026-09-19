// bench/index-bench.mjs — 索引性能分解:拿真实会话日志,逐段计时。
//
// 目的:把"一轮 5 秒/会话"拆开,看清时间到底花在谁身上——
//   DSH 侧的日志装载(读文件 + zstd 解压 + JSONL 解析)、我这边的抽块/CJK/哈希、还是 SQLite 写入。
// 用法: node bench/index-bench.mjs <session.jsonl.zstd 路径> [sessionId]
import { readFileSync, rmSync } from "node:fs";
import { createZstdDecompress, zstdDecompressSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

import { buildSessionBlocks } from "../lib/blocks.js";
import { openStore } from "../lib/store.js";

const logPath = process.argv[2];
const sessionId = process.argv[3] ?? "bench-session";
if (logPath === undefined) {
  console.error("用法: node bench/index-bench.mjs <session.jsonl.zstd> [sessionId]");
  process.exit(2);
}

const now = () => Number(process.hrtime.bigint()) / 1e6;
const marks = {};
let clock = now();

const raw = readFileSync(logPath);
marks["读文件"] = now() - clock; clock = now();

// DSH 的日志是**多帧拼接**的 zstd(每批追加一帧,这个样本 12.5 万帧)。
// Node 的 zstd API(同步与流式)只解第一帧,所以 DSH 自己写了多帧解码器:
//   zstd-private-decoder: 一个流句柄连续解所有帧(快路径)
//   zstd-public-decoder:  逐帧 zstdDecompressSync(回退路径)
// 这里直接借用 DSH 的解码器来量"读一遍日志"的真实成本,避免用我自己的土办法得出虚高的数。
const DSH_ZSTD = "D:/dev/deepseek-harness/packages/session/session-persistence-jsonl/src/zstd.ts";
let dshZstd;
try {
  dshZstd = await import(pathToFileURL(DSH_ZSTD).href);
} catch (error) {
  console.error(`(借不到 DSH 的解码器:${error.message};改用回退路径)`);
}

function decodeWithDsh(buffer) {
  const { frames } = dshZstd.scanZstdFrames(buffer);
  const decoder = dshZstd.createZstdFrameDecoder();
  const parts = [];
  for (const part of decoder.decode(buffer, frames)) parts.push(part);
  return Buffer.concat(parts).toString("utf8");
}

function decodePublicFallback(buffer) {
  const starts = [];
  for (let i = 0; i + 3 < buffer.length; i += 1) {
    if (buffer[i] === 0x28 && buffer[i + 1] === 0xb5 && buffer[i + 2] === 0x2f && buffer[i + 3] === 0xfd) starts.push(i);
  }
  starts.push(buffer.length);
  const parts = [];
  for (let i = 0; i + 1 < starts.length; i += 1) parts.push(zstdDecompressSync(buffer.subarray(starts[i], starts[i + 1])));
  return { text: Buffer.concat(parts).toString("utf8"), frames: starts.length - 1 };
}

let text;
if (dshZstd !== undefined) {
  text = decodeWithDsh(raw);
  marks["解压 zstd(DSH 多帧解码器)"] = now() - clock; clock = now();
  // 对照:回退路径(逐帧同步解)在同一份数据上要多久。
  const fallback = decodePublicFallback(raw);
  marks["解压 zstd(逐帧回退路径,对照)"] = now() - clock; clock = now();
  if (fallback.text.length !== text.length) console.error("警告: 两条解码路径结果长度不一致");
} else {
  const fallback = decodePublicFallback(raw);
  text = fallback.text;
  marks[`解压 zstd(逐帧回退,${fallback.frames} 帧)`] = now() - clock; clock = now();
}

const lines = text.split("\n").filter((line) => line.trim() !== "");
const events = [];
let badLines = 0;
for (const line of lines) {
  try {
    events.push(JSON.parse(line));
  } catch {
    badLines += 1; // 断尾行之类:这里只做性能测量,不关心语义。
  }
}
marks["解析 JSONL"] = now() - clock; clock = now();

const records = events.map((event) => ({ seq: event.seq, type: event.type, time: event.time, surface: "current" }));
marks["构造轻量记录"] = now() - clock; clock = now();

const blocks = buildSessionBlocks(events, records, { sessionId });
marks["抽块+CJK+哈希"] = now() - clock; clock = now();

const dbPath = join(tmpdir(), `bsq-bench-${process.pid}.db`);
const store = await openStore({ path: dbPath });
marks["开库/建表"] = now() - clock; clock = now();

const written = store.replaceSession({
  sessionId,
  cwd: null,
  revision: "bench",
  events: records.length,
  blocks,
  now: Date.now(),
});
marks["SQLite 写入(含 FTS)"] = now() - clock; clock = now();

const second = store.replaceSession({
  sessionId,
  cwd: null,
  revision: "bench",
  events: records.length,
  blocks,
  now: Date.now(),
});
marks["同一会话再写一次(差量)"] = now() - clock;

store.close();
await delay(50);
for (const suffix of ["", "-wal", "-shm"]) rmSync(`${dbPath}${suffix}`, { force: true });

console.log(`日志 ${(raw.length / 1048576).toFixed(1)}MB(zstd) → 原文 ${(text.length / 1048576).toFixed(1)}MB`);
console.log(`事件 ${events.length}(坏行 ${badLines})、块 ${blocks.length}(可检索 ${blocks.filter((b) => b.searchable).length}、正文另存 ${blocks.filter((b) => !b.searchable && typeof b.text === "string" && b.text !== "").length})`);
console.log(`首次写入: 新增 ${written.inserted}、改 ${written.updated}、没动 ${written.unchanged};第二次: 新增 ${second.inserted}、改 ${second.updated}、没动 ${second.unchanged}`);
let total = 0;
for (const [key, value] of Object.entries(marks)) {
  total += value;
  console.log(`  ${key.padEnd(24, ".")} ${value.toFixed(0).padStart(7)} ms`);
}
console.log(`  ${"合计".padEnd(24, ".")} ${total.toFixed(0).padStart(7)} ms`);
