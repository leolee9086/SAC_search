// test/logfile.test.mjs — 落盘诊断日志:写入、单代轮换、显式关闭、目录自动创建,以及插件接线后失败原因可见。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createFileLog } from "../lib/logfile.js";
import { resolveLogFile } from "../lib/index.js";
import { apply } from "../lib/index.js";

const DIR = join(tmpdir(), `bsq-logfile-test-${process.pid}`);
const cleanup = () => rmSync(DIR, { recursive: true, force: true });

test("createFileLog:写入带时间戳,目录自动创建", () => {
  const path = join(DIR, "nested", "session-blocks.log");
  const log = createFileLog({ path, maxBytes: 1024 * 1024 });
  log.write("第一行");
  log.write("第二行");
  const text = readFileSync(path, "utf8");
  assert.match(text, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z 第一行\n/, "每行带 ISO 时间戳");
  assert.match(text, /第二行$/m);
  cleanup();
});

test("createFileLog:超过上限后单代轮换(.1),当前文件重新计数", () => {
  const path = join(DIR, "rotate.log");
  const log = createFileLog({ path, maxBytes: 100 });
  for (let i = 0; i < 6; i += 1) log.write(`第 ${i} 条足够长的诊断信息,撑大文件用。`);
  const current = readFileSync(path, "utf8");
  assert.ok(current.length <= 100 + 200, `当前文件在轮换线附近:${current.length}`);
  const archived = readFileSync(`${path}.1`, "utf8");
  assert.ok(archived.length > 0, "上一代归档存在");
  cleanup();
});

test("createFileLog:path 为空串是显式关闭,write 是空操作", () => {
  const log = createFileLog({ path: "" });
  assert.equal(log.path, "");
  assert.doesNotThrow(() => log.write("不应落盘"));
});

test("resolveLogFile:默认 <DSH_HOME>/logs,off 关闭,显式路径透传", () => {
  process.env.DSH_HOME = join(DIR, "home");
  assert.equal(resolveLogFile(""), join(DIR, "home", "logs", "session-blocks.log"));
  assert.equal(resolveLogFile(undefined), join(DIR, "home", "logs", "session-blocks.log"));
  assert.equal(resolveLogFile("off"), "");
  assert.equal(resolveLogFile("D:\\custom\\log.txt"), "D:\\custom\\log.txt");
  delete process.env.DSH_HOME;
});

test("接线:对账失败的原因落盘,状态工具能报出来", async () => {
  process.env.DSH_HOME = join(DIR, "home2");
  const logPath = join(DIR, "home2", "logs", "session-blocks.log");
  const failingId = "session-broken";
  const conversation = {
    async listSessions() {
      return [
        { header: { id: "session-ok", cwd: "D:\\dev" }, live: false, persisted: true },
        { header: { id: failingId, cwd: "D:\\dev" }, live: false, persisted: true },
      ];
    },
    async listEvents(id) {
      if (id === failingId) throw new Error("日志回放校验失败(造的)");
      return [{ seq: 0, type: "user/message", time: 1, surface: "current" }];
    },
    async readSession(id) {
      return {
        session: { id, cwd: "D:\\dev" },
        inheritedEventCount: 0,
        events: [{ seq: 0, type: "user/message", time: 1, surface: "current", data: { content: [{ type: "text", text: "正文" }] } }],
      };
    },
    async readTitleSnapshots(ids) { return ids.map(() => ({ status: "fulfilled", value: {} })); },
  };
  const tools = new Map();
  const ctx = {
    get: (name) => (name === "sessionQuery" ? conversation : undefined),
    tools: { register: (def) => { tools.set(def.name, def); } },
    provide: () => {},
    effect: (callback) => { callback(); },
    inject: () => ({ dispose() {} }),
    logger: { info() {} },
  };
  // 记忆库也要显式指到内存:它的默认路径落在 DSH_HOME 下,否则会在这个临时目录里
  // 留下一个被锁住的 session-memory.db,让下面的 cleanup() 删不掉目录。
  await apply(ctx, { path: ":memory:", memoryPath: ":memory:", logFile: logPath });
  const status = await tools.get("session_blocks_status").execute({ reindex: true }, {});
  assert.match(status, /失败样例/);
  assert.match(status, new RegExp(failingId));
  assert.match(status, /日志回放校验失败/);
  const onDisk = readFileSync(logPath, "utf8");
  assert.match(onDisk, /比对会话 session-broken 失败:日志回放校验失败/, "失败原因必须落盘,stdout 不算数");
  cleanup();
});
