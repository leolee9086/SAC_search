// bench/search-bench.mjs — 检索排序形状的对比:ORDER BY bm25 表达式(旧) vs ORDER BY rank(新)。
//
// 为什么要比:复杂 ORDER BY 会让 FTS5 丢掉排序优化,LIMIT 就只能在"全量物化进临时 B 树"之后生效,
// 每条命中都要回表探一次 block_meta。s-forge 的 `kernel/model/search.go:1960` 用的就是纯 `ORDER BY rank`。
// 跑法:node bench/search-bench.mjs [块数,默认 20000]
import { DatabaseSync } from "node:sqlite";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openStore, splitCjk } from "../lib/store.js";

const COUNT = Number(process.argv[2] ?? 20000);
const HITS = Math.max(1, Math.round(COUNT / 20)); // 约 5% 的块含检索词
const LIMIT = 21;
const PATH = join(tmpdir(), `bsq-search-bench-${process.pid}.db`);

const OLD_SQL = `
  SELECT m.block_id, bm25(block_fts) AS score
  FROM block_fts JOIN block_meta m ON m.fts_rowid = block_fts.rowid
  WHERE block_fts MATCH ? ORDER BY score ASC, m.time DESC LIMIT ${LIMIT}
`;
const NEW_SQL = `
  SELECT m.block_id, bm25(block_fts) AS score
  FROM block_fts JOIN block_meta m ON m.fts_rowid = block_fts.rowid
  WHERE block_fts MATCH ? ORDER BY rank LIMIT ${LIMIT}
`;

const store = await openStore({ path: PATH });
const sessionId = "bench";
const blocks = [];
for (let seq = 0; seq < COUNT; seq += 1) {
  const text = seq % 20 === 0
    ? `第 ${seq} 块:缓存命中与索引设计的讨论。`
    : `第 ${seq} 块:无关正文,用来把索引撑大。`;
  blocks.push({
    id: `${sessionId}#${seq}#0`,
    sessionId,
    seq,
    path: "0",
    type: "text",
    text,
    surface: "current",
    eventType: "assistant/message",
    time: 1_700_000_000_000 + seq,
    searchable: true,
    length: Array.from(text).length,
  });
}
const writeStart = process.hrtime.bigint();
store.replaceSession({ sessionId, cwd: "D:\\dev", revision: "r1", events: COUNT, blocks, now: 1 });
const writeMs = Number(process.hrtime.bigint() - writeStart) / 1e6;
store.close();

const db = new DatabaseSync(PATH);
// 必须过与索引侧同一个拆字变换,否则中文查询永远 0 命中(这个 bench 第一版就踩过)。
const phrase = `"${splitCjk("缓存")}"`;
const plan = (sql) => db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(phrase).map((row) => row.detail).join(" | ");
const time = (sql, runs = 3) => {
  let best = Infinity;
  for (let i = 0; i < runs; i += 1) {
    const started = process.hrtime.bigint();
    db.prepare(sql).all(phrase);
    best = Math.min(best, Number(process.hrtime.bigint() - started) / 1e6);
  }
  return best;
};
const hitCount = db.prepare("SELECT COUNT(*) AS c FROM block_fts WHERE block_fts MATCH ?").get(phrase).c;

const rows = [];
rows.push({ 形状: "旧:ORDER BY bm25 ASC, m.time DESC", 毫秒: time(OLD_SQL).toFixed(1), 计划: plan(OLD_SQL) });
rows.push({ 形状: "新:ORDER BY rank", 毫秒: time(NEW_SQL).toFixed(1), 计划: plan(NEW_SQL) });
db.exec("DROP INDEX idx_block_meta_rowid");
rows.push({ 形状: "新 - 去掉 fts_rowid 索引", 毫秒: time(NEW_SQL).toFixed(1), 计划: plan(NEW_SQL) });
db.exec("CREATE INDEX idx_block_meta_rowid ON block_meta(fts_rowid)");
const after = time(NEW_SQL).toFixed(1);
db.close();
rmSync(PATH, { force: true });
rmSync(`${PATH}-wal`, { force: true });
rmSync(`${PATH}-shm`, { force: true });

console.log(`node ${process.version} · 块数 ${COUNT}(命中 ${hitCount} 条)· 每页 ${LIMIT} 条 · 写入总耗时 ${writeMs.toFixed(0)}ms\n`);
console.table(rows);
console.log(`恢复索引后再次测量:${after} ms`);
console.log("计划里出现 USE TEMP B-TREE 就说明 LIMIT 落在排序之后,全部命中都被物化了。");
