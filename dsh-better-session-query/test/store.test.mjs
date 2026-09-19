// test/store.test.mjs — 存储层测试:真开一个 node:sqlite 库,验证写入、检索、元数据过滤、正文来源与归属保护。
//
// 用 :memory: 库跑绝大多数用例(互不干扰、跑完即散);只有归属保护要碰真实文件,
// 一律写到 os.tmpdir() 下的临时目录并在 finally 里删掉,不写死任何本机路径。
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { openStore, buildPredicates, STORE_APPLICATION_ID, STORE_SCHEMA_VERSION } from "../lib/store.js";

const T0 = 1700000000000;

/** 造一个块:形状与 blocks.js 的 buildSessionBlocks 输出一致。 */
function makeBlock(sessionId, seq, blockPath, type, text, options = {}) {
  return {
    id: `${sessionId}#${seq}#${blockPath}`,
    sessionId,
    seq,
    path: blockPath,
    type,
    text,
    surface: options.surface ?? "current",
    eventType: options.eventType ?? "user/message",
    time: options.time ?? T0,
    length: Array.from(text).length,
    searchable: options.searchable ?? true,
  };
}

/** 一个会话的固定块集:2 个可检索块 + 1 个只存正文的思考块 + 1 个无正文的图片块。 */
function s1Blocks() {
  return [
    makeBlock("s1", 0, "0", "text", "苹果 香蕉"),
    makeBlock("s1", 1, "0", "reasoning", "内部推理", {
      searchable: false,
      eventType: "assistant/message",
      time: T0 + 1000,
    }),
    makeBlock("s1", 1, "1", "text", "结论:苹果 不错", { eventType: "assistant/message", time: T0 + 1000 }),
    // 注意:FTS 按词切分,查询 "苹果" 只能命中把「苹果」当独立词出现的块,不是子串扫描。
    makeBlock("s1", 2, "0", "image", "", { searchable: false, surface: "log-only", time: T0 + 2000 }),
  ];
}

/** 开一个内存库并把 s1 的块写进去。 */
async function storeWithS1() {
  const store = await openStore({ path: ":memory:" });
  const written = store.replaceSession({ sessionId: "s1", revision: "rev-1", events: 3, blocks: s1Blocks(), now: 5000 });
  return { store, written };
}

/** 一个临时目录(调用方负责删)。 */
function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bsq-store-"));
}

// 假的工作区路径:只是测试数据,不指向本机任何真实目录。
const WORKSPACE_A = "C:\\fake\\alpha";
const WORKSPACE_B = "C:\\fake\\beta";

/** 两个会话在同一工作区、一个在别的工作区、一个没有工作区。 */
async function storeWithWorkspaces() {
  const store = await openStore({ path: ":memory:" });
  store.replaceSession({
    sessionId: "w1",
    cwd: WORKSPACE_A,
    revision: "r1",
    events: 1,
    now: 1000,
    blocks: [makeBlock("w1", 0, "0", "text", "苹果 在工作区甲")],
  });
  store.replaceSession({
    sessionId: "w2",
    cwd: WORKSPACE_A,
    revision: "r1",
    events: 2,
    now: 2000,
    blocks: [
      makeBlock("w2", 0, "0", "text", "香蕉"),
      makeBlock("w2", 1, "0", "text", "苹果 也在工作区甲", { time: T0 + 100 }),
    ],
  });
  store.replaceSession({
    sessionId: "w3",
    cwd: WORKSPACE_B,
    revision: "r1",
    events: 1,
    now: 3000,
    blocks: [makeBlock("w3", 0, "0", "text", "苹果 在别的工作区", { time: T0 + 5000 })],
  });
  store.replaceSession({
    sessionId: "w9",
    revision: "r1",
    events: 1,
    now: 4000,
    blocks: [makeBlock("w9", 0, "0", "text", "没有工作区的块")],
  });
  return store;
}

test("openStore(':memory:') 建库:空库 stats 全零", async () => {
  const store = await openStore({ path: ":memory:" });
  assert.deepEqual(store.stats(), {
    path: ":memory:",
    blocks: 0,
    searchable: 0,
    storedTexts: 0,
    sessions: 0,
    generation: 0,
    updatedMs: 0,
  });
  store.close();
});

test("replaceSession 写入后 stats 数字正确,generation 递增", async () => {
  const { store, written } = await storeWithS1();
  assert.equal(written.blocks, 4, "4 个块");
  assert.equal(written.searchable, 2, "2 个进倒排");
  assert.equal(written.inserted, 4, "首轮全部是新增");
  assert.equal(written.unchanged, 0);
  const stats = store.stats();
  assert.equal(stats.blocks, 4, "4 个块都进了元数据表");
  assert.equal(stats.searchable, 2, "只有 2 个块进倒排");
  assert.equal(stats.storedTexts, 1, "思考块正文单独存了一份");
  assert.equal(stats.sessions, 1);
  assert.equal(stats.generation, 1, "写一次会话,世代 +1");
  assert.equal(stats.updatedMs, 5000);

  store.replaceSession({ sessionId: "s1", revision: "rev-2", events: 3, blocks: s1Blocks(), now: 6000 });
  assert.equal(store.generation(), 2, "同一个会话重写也照样 +1");
  assert.equal(store.stats().blocks, 4, "旧块被替换而不是叠加");
  assert.equal(store.getSession("s1").revision, "rev-2");
  store.close();
});

test("search:命中的是字面短语,FTS5 语法当数据", async () => {
  const { store } = await storeWithS1();
  store.replaceSession({
    sessionId: "s2",
    revision: "rev-2",
    events: 1,
    now: 5000,
    blocks: [makeBlock("s2", 0, "0", "text", 'say "hi" to OR * (paren) NEAR', { surface: "log-only", time: T0 + 3000 })],
  });

  assert.deepEqual(store.search({ query: "苹果" }).items.map((item) => item.blockId), ["s1#0#0", "s1#1#1"]);
  assert.equal(store.search({ query: "苹果 香蕉" }).items.length, 1, "空格分隔的短语按顺序匹配");
  assert.equal(store.search({ query: "苹果 OR 香蕉" }).items.length, 0, "OR 没有被当运算符:它是短语里的一个词,顺序对不上就不该命中");
  assert.equal(store.search({ query: "OR" }).items.length, 1, "OR 作为词被检索到");
  assert.equal(store.search({ query: "NEAR" }).items.length, 1);
  assert.equal(store.search({ query: "(paren)" }).items.length, 1, "括号被当普通字符");
  assert.equal(store.search({ query: 'say "hi"' }).items.length, 1, "查询里的双引号被转义成字面量");
  assert.equal(store.search({ query: '"' }).items.length, 0, "孤立的引号既不报错也不当语法");
  assert.equal(store.search({ query: "*" }).items.length, 0, "星号是分隔符,不构成 token,也不该抛 FTS5 语法错");
  assert.equal(store.search({ query: "不存在的词" }).items.length, 0);
  store.close();
});

test("search:snippet 用 [[ ]] 标出命中位置", async () => {
  const { store } = await storeWithS1();
  const [first] = store.search({ query: "苹果" }).items;
  assert.match(first.snippet, /\[\[苹果\]\]/);
  const noHit = store.search({ query: "香蕉" }).items[0];
  assert.match(noHit.snippet, /\[\[香蕉\]\]/);
  store.close();
});

test("search:更相关的块按 bm25 排在前面", async () => {
  const store = await openStore({ path: ":memory:" });
  store.replaceSession({
    sessionId: "rank",
    revision: "r1",
    events: 3,
    now: 1,
    blocks: [
      makeBlock("rank", 0, "0", "text", "苹果 苹果 苹果 苹果", { time: T0 }),
      makeBlock("rank", 1, "0", "text", `苹果 ${"填充 ".repeat(40)}`, { time: T0 + 1000 }),
      makeBlock("rank", 2, "0", "text", "完全无关的一段话", { time: T0 + 2000 }),
    ],
  });
  const { items } = store.search({ query: "苹果", limit: 10 });
  assert.equal(items.length, 2, "无关块不命中");
  assert.equal(items[0].blockId, "rank#0#0", "短且出现次数多的块更相关");
  assert.ok(items[0].score < items[1].score, "bm25 分数越小越相关,升序即最相关在前");
  store.close();
});

test("search:limit / offset / hasMore 正确", async () => {
  const { store } = await storeWithS1();
  const firstPage = store.search({ query: "苹果", limit: 1 });
  assert.equal(firstPage.items.length, 1);
  assert.equal(firstPage.hasMore, true, "还有下一条时 hasMore 为真");

  const secondPage = store.search({ query: "苹果", limit: 1, offset: 1 });
  assert.equal(secondPage.items.length, 1);
  assert.equal(secondPage.hasMore, false);
  assert.notEqual(secondPage.items[0].blockId, firstPage.items[0].blockId, "翻页不重复");

  assert.equal(store.search({ query: "苹果", offset: 2 }).items.length, 0, "offset 越界返回空");
  assert.equal(store.search({ query: "苹果", limit: 0 }).items.length, 2, "非法 limit 落回默认值而不是返回 0 条");
  store.close();
});

test("search:sessionId / blockType / surface 过滤生效", async () => {
  const { store } = await storeWithS1();
  store.replaceSession({
    sessionId: "s2",
    revision: "rev-2",
    events: 1,
    now: 5000,
    blocks: [makeBlock("s2", 0, "0", "text", "苹果 在另一个会话", { surface: "log-only", time: T0 + 3000 })],
  });

  assert.deepEqual(store.search({ query: "苹果", sessionIds: ["s2"] }).items.map((item) => item.blockId), ["s2#0#0"]);
  assert.deepEqual(store.search({ query: "苹果", sessionIds: ["s1"] }).items.map((item) => item.blockId), ["s1#0#0", "s1#1#1"]);
  assert.equal(store.search({ query: "苹果", sessionIds: ["s1"], blockTypes: ["todo"] }).items.length, 0);
  assert.equal(store.search({ query: "苹果", sessionIds: ["s1"], blockTypes: ["text"] }).items.length, 2);
  assert.deepEqual(store.search({ query: "苹果", surfaces: ["log-only"] }).items.map((item) => item.blockId), ["s2#0#0"]);
  assert.equal(store.search({ query: "苹果", surfaces: ["current"] }).items.length, 2);
  store.close();
});

test("search:searchable=0 的块永远不出现在搜索结果里", async () => {
  const { store } = await storeWithS1();
  assert.equal(store.search({ query: "内部推理" }).items.length, 0, "思考块没进倒排,搜不到");
  assert.equal(store.search({ query: "推理" }).items.length, 0);
  assert.equal(store.getBlock("s1#1#0").text, "内部推理", "但它的正文确实在库里(block_text)");
  assert.equal(store.queryBlocks({ blockTypes: ["reasoning"] }).items.length, 1);
  store.close();
});

test("queryBlocks:长度区间与时间区间过滤", async () => {
  const { store } = await storeWithS1();
  const short = store.queryBlocks({ blockTypes: ["text"], lengthMax: 5 });
  assert.deepEqual(short.items.map((item) => item.blockId), ["s1#0#0"], "只有 5 字的块在下限之内");

  const long = store.queryBlocks({ blockTypes: ["text"], lengthMin: 6, lengthMax: 20 });
  assert.deepEqual(long.items.map((item) => [item.blockId, item.length]), [["s1#1#1", 8]]);

  const window = store.queryBlocks({ timeMin: T0 + 500, timeMax: T0 + 1500 });
  assert.deepEqual(
    window.items.map((item) => item.blockId),
    ["s1#1#0", "s1#1#1"],
    "默认按时间降序;同一事件内按 seq/path 升序",
  );
  assert.equal(store.queryBlocks({ timeMin: T0 + 5000 }).items.length, 0);
  assert.equal(store.queryBlocks({ timeMax: T0 - 1 }).items.length, 0);
  store.close();
});

test("queryBlocks:blockTypes / eventTypes / surfaces 过滤", async () => {
  const { store } = await storeWithS1();
  assert.deepEqual(store.queryBlocks({ blockTypes: ["image"] }).items.map((item) => item.blockId), ["s1#2#0"]);
  assert.deepEqual(
    store.queryBlocks({ eventTypes: ["assistant/message"] }).items.map((item) => item.blockId),
    ["s1#1#0", "s1#1#1"],
    "事件类型过滤只留助手消息的两块;同一时间戳下按 seq/path 升序",
  );
  assert.deepEqual(store.queryBlocks({ surfaces: ["log-only"] }).items.map((item) => item.blockId), ["s1#2#0"]);
  assert.equal(store.queryBlocks({ surfaces: ["current"] }).items.length, 3);
  assert.equal(store.queryBlocks({ blockTypes: ["text"], eventTypes: ["assistant/message"] }).items.length, 1, "多条件是与关系");
  store.close();
});

test("queryBlocks:没进倒排的思考块也查得到,withText 能取回正文", async () => {
  const { store } = await storeWithS1();
  const withoutText = store.queryBlocks({ blockTypes: ["reasoning"] }).items[0];
  assert.equal(withoutText.blockType, "reasoning");
  assert.equal(withoutText.searchable, false);
  assert.equal(withoutText.length, 4, "长度来自元数据,不需要正文表参与");
  assert.equal("text" in withoutText, false, "默认不带正文");

  const withText = store.queryBlocks({ blockTypes: ["reasoning"], withText: true }).items[0];
  assert.equal(withText.text, "内部推理", "正文来自 block_text");
  store.close();
});

test("queryBlocks:orderBy length + descending:false 升序", async () => {
  const { store } = await storeWithS1();
  const ascending = store.queryBlocks({ orderBy: "length", descending: false });
  assert.deepEqual(ascending.items.map((item) => item.length), [0, 4, 5, 8]);
  const descending = store.queryBlocks({ orderBy: "length" });
  assert.deepEqual(descending.items.map((item) => item.length), [8, 5, 4, 0]);
  store.close();
});

test("queryMessages:同一 sessionId+seq 的多个块折成一条", async () => {
  const { store } = await storeWithS1();
  const page = store.queryMessages({ sessionIds: ["s1"] });
  assert.equal(page.items.length, 3, "3 个事件各一条");
  assert.deepEqual(page.items.map((item) => item.seq), [2, 1, 0], "默认按时间降序");

  const seq1 = page.items.find((item) => item.seq === 1);
  assert.equal(seq1.blocks, 2, "seq=1 的两块折成一条");
  assert.equal(seq1.searchableBlocks, 1);
  assert.equal(seq1.totalLength, 4 + 8);
  assert.equal(seq1.maxLength, 8);
  assert.equal(seq1.eventType, "assistant/message");
  assert.equal(seq1.time, T0 + 1000);
  assert.equal(seq1.lastTime, T0 + 1000);

  const seq0 = page.items.find((item) => item.seq === 0);
  assert.equal(seq0.blocks, 1);
  assert.equal(seq0.totalLength, 5);
  store.close();
});

test("queryMessages:时间区间过滤生效", async () => {
  const { store } = await storeWithS1();
  const inWindow = store.queryMessages({ sessionIds: ["s1"], timeMin: T0 + 500, timeMax: T0 + 1500 });
  assert.deepEqual(inWindow.items.map((item) => item.seq), [1]);
  const wide = store.queryMessages({ sessionIds: ["s1"], timeMin: T0, timeMax: T0 + 2000, descending: false });
  assert.deepEqual(wide.items.map((item) => item.seq), [0, 1, 2], "升序时按事件先后");
  assert.equal(store.queryMessages({ sessionIds: ["s1"], timeMin: T0 + 5000 }).items.length, 0);
  store.close();
});

test("listBlocks:含 searchable=false 的块,按 seq/path 升序", async () => {
  const { store } = await storeWithS1();
  const page = store.listBlocks({ sessionId: "s1" });
  assert.deepEqual(
    page.items.map((item) => [item.blockId, item.searchable]),
    [["s1#0#0", true], ["s1#1#0", false], ["s1#1#1", true], ["s1#2#0", false]],
    "无正文、没进倒排的块也要列出来",
  );
  assert.deepEqual(page.items.map((item) => item.path), ["0", "0", "1", "0"], "path 是块在事件里的位置");
  assert.equal(page.hasMore, false);
  store.close();
});

test("getBlock:两种正文来源都能取回,不存在的块返回 undefined", async () => {
  const { store } = await storeWithS1();
  const fromFts = store.getBlock("s1#0#0");
  assert.equal(fromFts.text, "苹果 香蕉", "进倒排的块从 block_fts 按 rowid 取正文");
  assert.equal(fromFts.searchable, true);
  assert.equal(fromFts.length, 5);

  const fromText = store.getBlock("s1#1#0");
  assert.equal(fromText.text, "内部推理", "没进倒排的块从 block_text 取正文");
  assert.equal(fromText.searchable, false);
  assert.equal(fromText.blockType, "reasoning");

  assert.equal(store.getBlock("s1#2#0").text, "", "结构化块登记为块但正文为空");
  assert.equal(store.getBlock("s1#99#0"), undefined);
  assert.equal(store.getBlock(""), undefined);
  store.close();
});

test("deleteSession:块与正文都清掉,stats 归零,indexed_sessions 里也没了", async () => {
  const { store } = await storeWithS1();
  const before = store.generation();
  store.deleteSession("s1", 7000);
  const stats = store.stats();
  assert.equal(stats.blocks, 0);
  assert.equal(stats.searchable, 0);
  assert.equal(stats.storedTexts, 0, "block_text 里的思考块正文也一并删掉");
  assert.equal(stats.sessions, 0);
  assert.equal(stats.generation, before + 1, "删除同样推进世代");
  assert.equal(stats.updatedMs, 7000);
  assert.equal(store.getSession("s1"), undefined);
  assert.equal(store.search({ query: "苹果" }).items.length, 0);
  assert.equal(store.queryBlocks({}).items.length, 0);
  assert.equal(store.getBlock("s1#0#0"), undefined);
  store.close();
});

test("openStore:拒绝别的应用的库(application_id 不符)", async () => {
  const dir = tempDir();
  const target = path.join(dir, "foreign.db");
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(target);
    db.exec("PRAGMA application_id = 123456");
    db.exec("CREATE TABLE someone_else (a INTEGER)");
    db.close();
    await assert.rejects(() => openStore({ path: target }), /属于别的应用/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("openStore:拒绝已有未知表的库(application_id 为 0)", async () => {
  const dir = tempDir();
  const target = path.join(dir, "alien.db");
  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(target);
    db.exec("CREATE TABLE someone_else (a INTEGER)");
    db.close();
    await assert.rejects(() => openStore({ path: target }), /不是本插件的派生索引/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("openStore:自己的库重开可用,schema 版本不符时就地重置", async () => {
  const dir = tempDir();
  const target = path.join(dir, "own.db");
  try {
    const first = await openStore({ path: target });
    first.replaceSession({
      sessionId: "s1",
      revision: "r1",
      events: 1,
      now: 1,
      blocks: [makeBlock("s1", 0, "0", "text", "重建前写入的块")],
    });
    assert.equal(first.stats().blocks, 1);
    first.close();

    const { DatabaseSync } = await import("node:sqlite");
    const inspect = new DatabaseSync(target);
    assert.equal(Number(inspect.prepare("PRAGMA application_id").get().application_id), STORE_APPLICATION_ID);
    assert.equal(Number(inspect.prepare("PRAGMA user_version").get().user_version), STORE_SCHEMA_VERSION);
    inspect.exec("PRAGMA user_version = 99");
    inspect.close();

    const again = await openStore({ path: target });
    assert.equal(again.stats().blocks, 0, "版本不符:旧派生表被丢弃,库本身还能继续用");
    again.replaceSession({
      sessionId: "s2",
      revision: "r1",
      events: 1,
      now: 2,
      blocks: [makeBlock("s2", 0, "0", "text", "重置后写入的块")],
    });
    assert.equal(again.search({ query: "重置后写入的块" }).items.length, 1);
    assert.equal(again.search({ query: "重建前写入的块" }).items.length, 0);
    again.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("replaceSession:会话的 cwd 落到会话簿记与块元数据上", async () => {
  const store = await openStore({ path: ":memory:" });
  store.replaceSession({
    sessionId: "w1",
    cwd: WORKSPACE_A,
    revision: "r1",
    events: 1,
    now: 1000,
    blocks: [makeBlock("w1", 0, "0", "text", "苹果 在工作区甲")],
  });
  store.replaceSession({
    sessionId: "w9",
    revision: "r1",
    events: 1,
    now: 2000,
    blocks: [makeBlock("w9", 0, "0", "text", "没有工作区的会话")],
  });

  assert.equal(store.getSession("w1").cwd, WORKSPACE_A);
  assert.equal(store.getSession("w9").cwd, null, "不传 cwd 就存 NULL,不猜默认工作区");
  assert.equal(store.getBlock("w1#0#0").cwd, WORKSPACE_A, "块元数据也带上工作区");
  assert.equal(store.queryBlocks({ blockTypes: ["text"], lengthMin: 1 }).items.find((item) => item.sessionId === "w9").cwd, null);
  store.close();
});

test("queryWorkspaces:按 cwd 聚合会话与块", async () => {
  const store = await storeWithWorkspaces();
  const outcome = store.queryWorkspaces({});
  assert.equal(outcome.items.length, 3);
  const byCwd = new Map(outcome.items.map((item) => [item.cwd, item]));
  assert.equal(outcome.items[0].cwd, WORKSPACE_B, "最近有写入的工作区排前面");

  const beta = byCwd.get(WORKSPACE_B);
  assert.equal(beta.sessions, 1);
  assert.equal(beta.blocks, 1);
  assert.equal(beta.searchableBlocks, 1);
  assert.equal(beta.lastTime, T0 + 5000);

  const alpha = byCwd.get(WORKSPACE_A);
  assert.equal(alpha.sessions, 2, "同一 cwd 的两个会话算一个工作区");
  assert.equal(alpha.blocks, 3);
  assert.equal(alpha.searchableBlocks, 3);
  assert.equal(alpha.lastTime, T0 + 100);

  const orphan = byCwd.get(null);
  assert.equal(orphan.sessions, 1, "没记 cwd 的块自成一组");
  assert.equal(orphan.blocks, 1);
  store.close();
});

test("querySessions:按工作区与会话 id 过滤,cwd 大小写不敏感", async () => {
  const store = await storeWithWorkspaces();
  const all = store.querySessions({});
  assert.deepEqual(all.items.map((item) => item.sessionId), ["w9", "w3", "w2", "w1"], "默认按检查时间降序");
  assert.equal(all.items[0].cwd, null);
  assert.equal(all.items.find((item) => item.sessionId === "w2").blocks, 2);
  assert.equal(all.items.find((item) => item.sessionId === "w2").searchableBlocks, 2);
  assert.equal(all.items.find((item) => item.sessionId === "w1").checkedMs, 1000);
  assert.equal(all.hasMore, false);

  assert.deepEqual(
    store.querySessions({ cwds: [WORKSPACE_A.toUpperCase()] }).items.map((item) => item.sessionId),
    ["w2", "w1"],
    "Windows 路径大小写不敏感",
  );
  assert.deepEqual(store.querySessions({ sessionIds: ["w3"] }).items.map((item) => item.sessionId), ["w3"]);
  assert.equal(store.querySessions({ cwds: [WORKSPACE_B], sessionIds: ["w1"] }).items.length, 0, "多条件是与关系");

  const paged = store.querySessions({ limit: 1 });
  assert.equal(paged.items.length, 1);
  assert.equal(paged.hasMore, true);
  assert.equal(store.querySessions({ limit: 1, offset: 3 }).items.length, 1);
  store.close();
});

test("cwds 过滤在 search / queryBlocks / queryMessages 上都生效", async () => {
  const store = await storeWithWorkspaces();
  assert.deepEqual(
    store.search({ query: "苹果", cwds: [WORKSPACE_A] }).items.map((item) => item.blockId).sort(),
    ["w1#0#0", "w2#1#0"],
  );
  assert.equal(store.search({ query: "苹果", cwds: [WORKSPACE_A.toUpperCase()] }).items.length, 2, "检索侧同样大小写不敏感");
  assert.equal(store.search({ query: "苹果", cwds: [WORKSPACE_B] }).items.length, 1);
  assert.equal(store.queryBlocks({ cwds: [WORKSPACE_A] }).items.length, 3);
  assert.deepEqual(
    store.queryBlocks({ cwdsNot: [WORKSPACE_A] }).items.map((item) => item.blockId).sort(),
    ["w3#0#0", "w9#0#0"],
    "黑名单不能顺手把没有 cwd 的会话也丢掉",
  );
  assert.equal(store.queryBlocks({ requireWorkspace: true }).items.length, 4, "只算记了工作区的块(w9 的那块不算)");
  assert.deepEqual(store.search({ query: "苹果", cwdsNot: [WORKSPACE_A] }).items.map((item) => item.blockId), ["w3#0#0"]);
  assert.deepEqual(
    store.queryMessages({ cwds: [WORKSPACE_A], descending: false }).items.map((item) => [item.sessionId, item.seq]),
    [["w1", 0], ["w2", 0], ["w2", 1]],
  );
  store.close();
});

test("buildPredicates:空过滤返回空数组,各类过滤的片段与参数个数正确", () => {
  assert.deepEqual(buildPredicates(), { sql: [], params: [] });
  assert.deepEqual(buildPredicates({}), { sql: [], params: [] });
  assert.deepEqual(buildPredicates({ sessionIds: [], blockTypes: ["", undefined, 7] }), { sql: [], params: [] }, "空串与非字符串一律丢掉");

  const lists = buildPredicates({
    sessionIds: ["s1", "s2"],
    blockTypes: ["text"],
    eventTypes: ["assistant/message"],
    surfaces: ["current"],
    cwds: ["C:\\fake\\alpha"],
  });
  assert.deepEqual(lists.sql, [
    "session_id IN (?, ?)",
    "block_type IN (?)",
    "event_type IN (?)",
    "surface IN (?)",
    "cwd COLLATE NOCASE IN (?)",
  ]);
  assert.deepEqual(lists.params, ["s1", "s2", "text", "assistant/message", "current", "C:\\fake\\alpha"]);
  assert.deepEqual(buildPredicates({ cwds: [] }), { sql: [], params: [] });
  assert.deepEqual(buildPredicates({ cwds: [7, ""] }), { sql: [], params: [] }, "工作区过滤同样只接受非空字符串");
  assert.deepEqual(
    buildPredicates({ cwdsNot: ["C:\\fake\\alpha"] }),
    { sql: ["(cwd IS NULL OR cwd COLLATE NOCASE NOT IN (?))"], params: ["C:\\fake\\alpha"] },
    "黑名单显式放行 cwd IS NULL,否则 NULL NOT IN (...) 会把那些行一起判成未知",
  );
  assert.deepEqual(buildPredicates({ requireWorkspace: true }), { sql: ["cwd IS NOT NULL"], params: [] });
  assert.deepEqual(buildPredicates({ requireWorkspace: false }), { sql: [], params: [] });

  const ranges = buildPredicates({ lengthMin: 10.9, lengthMax: 20.1, timeMin: T0, timeMax: T0 + 1000.7 });
  assert.deepEqual(ranges.sql, ["length >= ?", "length <= ?", "time >= ?", "time <= ?"]);
  assert.deepEqual(ranges.params, [10, 20, T0, T0 + 1000], "区间值取整");

  assert.deepEqual(buildPredicates({ searchable: "only" }), { sql: ["searchable = 1"], params: [] });
  assert.deepEqual(buildPredicates({ searchable: "never" }), { sql: ["searchable = 0"], params: [] });
  assert.deepEqual(buildPredicates({ searchable: "whatever" }), { sql: [], params: [] });

  const ignored = buildPredicates({ lengthMin: "10", timeMax: Number.NaN, blockTypes: "text", sessionIds: "s1" });
  assert.deepEqual(ignored, { sql: [], params: [] }, "类型不对就不生成谓词,而不是编出错的 SQL");
});
