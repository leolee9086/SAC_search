// test/compact.test.mjs — 库收缩出口:FTS 段合并 + 归还空闲页,pragma,以及老版本库重建后的回收。
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { STORE_APPLICATION_ID, STORE_SCHEMA_VERSION, openStore } from "../lib/store.js";

/** 建一个临时库路径,并在测试结束时清掉。 */
function tempPath(tag) {
  const path = join(tmpdir(), `bsq-compact-${process.pid}-${tag}.db`);
  const cleanup = () => {
    for (const suffix of ["", "-wal", "-shm"]) rmSync(`${path}${suffix}`, { force: true });
  };
  cleanup();
  return { path, cleanup };
}

/** 造一批块(正文约 400 字,好让体积看得出变化)。 */
function blocks(sessionId, count, seed = 0) {
  return Array.from({ length: count }, (_, index) => {
    const text = `第 ${seed + index} 块正文:` + "索引把一条消息拆成块,块是索引行,用来做块级检索。".repeat(8);
    return {
      id: `${sessionId}#${index}#0`,
      sessionId,
      seq: index,
      path: "0",
      type: "text",
      text,
      surface: "current",
      eventType: "assistant/message",
      time: 1_700_000_000_000 + index,
      searchable: true,
      length: Array.from(text).length,
    };
  });
}

test("compact:段合并 + VACUUM 后体积不增,返回值口径正确", async () => {
  const { path, cleanup } = tempPath("basic");
  const store = await openStore({ path });
  try {
    store.replaceSession({ sessionId: "s1", cwd: "D:\\dev", revision: "r1", events: 30, blocks: blocks("s1", 30), now: 1 });
    const result = store.compact({ vacuum: true });
    assert.equal(result.vacuumed, true);
    assert.ok(result.beforeBytes > 0);
    assert.ok(result.afterBytes > 0);
    assert.ok(result.afterBytes <= result.beforeBytes, `收缩后不该变大:${result.beforeBytes} → ${result.afterBytes}`);
    assert.equal(result.savedBytes, result.beforeBytes - result.afterBytes);
    // WAL 下磁盘文件大小不等于逻辑页数(数据可能还在 -wal 里),所以比逻辑体积。
    assert.equal(store.size().dbBytes, result.afterBytes);
    // 收缩不该动内容。
    assert.equal(store.stats().blocks, 30);
    assert.equal(store.search({ query: "块级检索" }).items.length > 0, true);
  } finally {
    store.close();
    cleanup();
  }
});

test("compact:删掉大量块之后才真正回收(只删不缩是常态)", async () => {
  const { path, cleanup } = tempPath("shrink");
  const store = await openStore({ path });
  try {
    store.replaceSession({ sessionId: "big", cwd: "D:\\dev", revision: "r1", events: 400, blocks: blocks("big", 400), now: 1 });
    const grown = store.size().dbBytes;
    store.deleteSession("big");
    const afterDelete = store.size();
    const result = store.compact({ vacuum: true });
    assert.ok(result.afterBytes < afterDelete.dbBytes, "收缩应当真的把逻辑体积缩小");
    assert.ok(result.afterBytes < grown, `收缩后应小于写入峰值:${result.afterBytes} < ${grown}`);
    assert.equal(store.stats().blocks, 0);
    assert.equal(store.search({ query: "块级检索" }).items.length, 0);
  } finally {
    store.close();
    cleanup();
  }
});

test("compact({vacuum:false}):只做 FTS 段合并,不做整库重写", async () => {
  const { path, cleanup } = tempPath("optimize-only");
  const store = await openStore({ path });
  try {
    store.replaceSession({ sessionId: "s1", cwd: null, revision: "r1", events: 50, blocks: blocks("s1", 50), now: 1 });
    const result = store.compact({ vacuum: false });
    assert.equal(result.vacuumed, false);
    assert.equal(result.afterBytes, result.afterOptimizeBytes, "没有 VACUUM 就没有第二阶段");
    assert.equal(store.stats().blocks, 50);
  } finally {
    store.close();
    cleanup();
  }
});

test("shouldCompact:小库不催,明显偏大才催", async () => {
  const { path, cleanup } = tempPath("threshold");
  const store = await openStore({ path });
  // size() 默认走缓存(它里面有两条全文扫描,面板每秒问一次不能每拍重算);
  // 这个测试每一步都刚改过库、要读当下真实值,所以一律 fresh: true。
  const measure = () => store.size({ fresh: true });
  const judge = () => store.shouldCompact(measure());
  try {
    assert.equal(judge(), false, "空库(4MB 以下)不该被催");
    store.replaceSession({ sessionId: "small", cwd: null, revision: "r1", events: 300, blocks: blocks("small", 300), now: 1 });
    store.deleteSession("small");
    assert.equal(judge(), false, "三百块这个量级回收不值得一次 VACUUM(地板是 4MB)");
    // 造一个超过地板的库,再删空:这时才该建议收缩。
    for (let round = 0; round < 10; round += 1) {
      store.replaceSession({
        sessionId: `fat-${round}`,
        cwd: null,
        revision: "r1",
        events: 400,
        blocks: blocks(`fat-${round}`, 400, round * 1000),
        now: 1 + round,
      });
    }
    for (let round = 0; round < 10; round += 1) store.deleteSession(`fat-${round}`);
    assert.ok(measure().dbBytes > 4 * 1024 * 1024, `先要有超过地板的库:${measure().dbBytes}`);
    assert.equal(judge(), true, "块删光了但文件还占着,应当建议收缩");
  } finally {
    store.close();
    cleanup();
  }
});

test("size():默认走缓存,fresh 绕过缓存", async () => {
  const { path, cleanup } = tempPath("size-cache");
  const store = await openStore({ path });
  try {
    const first = store.size();
    assert.equal(store.size(), first, "缓存窗口内返回同一个对象(不是重新算了一遍)");
    store.replaceSession({ sessionId: "s1", cwd: null, revision: "r1", events: 10, blocks: blocks("s1", 10), now: 1 });
    assert.equal(store.size().tables.block_meta, first.tables.block_meta, "缓存内看不到刚写进去的块");
    assert.equal(store.size({ fresh: true }).tables.block_meta, 10, "fresh 必须反映刚写进去的块");
  } finally {
    store.close();
    cleanup();
  }
});

test("shouldCompact:缺参数直接抛,不替调用方猜一个 size", async () => {
  const { path, cleanup } = tempPath("no-size");
  const store = await openStore({ path });
  try {
    assert.throws(() => store.shouldCompact(), /需要调用方传入 size\(\) 的结果/);
  } finally {
    store.close();
    cleanup();
  }
});

test("pragma:WAL 的 autocheckpoint 与 journal 上限按侦察结论钉住", async () => {
  const { path, cleanup } = tempPath("pragma");
  const store = await openStore({ path, journalMode: "wal" });
  try {
    store.replaceSession({ sessionId: "s1", cwd: null, revision: "r1", events: 1, blocks: blocks("s1", 1), now: 1 });
    // 这两个都是连接级 pragma,必须从 store 自己那条连接读。
    const pragmas = store.pragmas();
    assert.equal(pragmas.journalMode, "wal");
    assert.equal(pragmas.walAutocheckpoint, 256);
    assert.equal(pragmas.journalSizeLimit, 1048576);
    assert.ok(pragmas.pageSize > 0);
  } finally {
    store.close();
    cleanup();
  }
});

test("pragma:非 WAL 模式不去设 WAL 专属参数", async () => {
  const { path, cleanup } = tempPath("delete-mode");
  const store = await openStore({ path, journalMode: "delete" });
  try {
    store.replaceSession({ sessionId: "s1", cwd: null, revision: "r1", events: 1, blocks: blocks("s1", 1), now: 1 });
    const pragmas = store.pragmas();
    assert.equal(pragmas.journalMode, "delete");
    assert.notEqual(pragmas.walAutocheckpoint, 256, "delete 模式不该被改成 WAL 的取值");
  } finally {
    store.close();
    cleanup();
  }
});

test("老版本库:版本不符就地重建,并把 freelist 立刻归还", async () => {
  const { path, cleanup } = tempPath("legacy");
  // 先手工造一个"本插件但版本很老、内容很胖"的库。
  const legacy = new DatabaseSync(path);
  legacy.exec(`PRAGMA application_id = ${STORE_APPLICATION_ID}`);
  legacy.exec("PRAGMA user_version = 1");
  legacy.exec("CREATE TABLE indexed_sessions (id TEXT PRIMARY KEY) STRICT");
  legacy.exec("CREATE TABLE block_meta (block_id TEXT PRIMARY KEY) STRICT");
  legacy.exec("CREATE TABLE block_text (block_id TEXT PRIMARY KEY, text TEXT NOT NULL) STRICT");
  legacy.exec("CREATE VIRTUAL TABLE block_fts USING fts5(text, tokenize='unicode61')");
  const insert = legacy.prepare("INSERT INTO block_fts (text) VALUES (?)");
  const payload = "历史正文".repeat(400);
  for (let i = 0; i < 400; i += 1) insert.run(`${i}${payload}`);
  legacy.exec("PRAGMA user_version = 1");
  const fat = statSync(path).size;
  legacy.close();
  assert.ok(fat > 1024 * 1024, `造出来的老库应当有分量:${fat}`);

  const store = await openStore({ path });
  try {
    const after = statSync(path).size;
    assert.ok(after < fat, `重建后应当归还空闲页:${fat} → ${after}`);
    assert.equal(store.stats().blocks, 0, "重建后是空索引");
    assert.equal(store.size().textBytes, 0);
    // 新库照样能用。
    store.replaceSession({ sessionId: "s1", cwd: null, revision: "r1", events: 1, blocks: blocks("s1", 1), now: 1 });
    assert.equal(store.search({ query: "块级检索" }).items.length, 1);
  } finally {
    store.close();
    cleanup();
  }
  // 顺带把版本常量钉在测试里,免得改版本时忘了它意味着一次全量重建。
  assert.equal(typeof STORE_SCHEMA_VERSION, "number");
});
