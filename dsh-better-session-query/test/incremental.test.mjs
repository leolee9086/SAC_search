// test/incremental.test.mjs — 差量写入:只有真变了的块被动过,未变块的 fts_rowid 与倒排原样保留。
import test from "node:test";
import assert from "node:assert/strict";

import { openStore, textHash } from "../lib/store.js";
import { createIndexer } from "../lib/indexer.js";

/** 造一个块记录(形状与 blocks.js 的 buildSessionBlocks 输出一致)。 */
function block(sessionId, seq, path, type, text, extra = {}) {
  return {
    id: `${sessionId}#${seq}#${path}`,
    sessionId,
    seq,
    path,
    type,
    text,
    surface: extra.surface ?? "current",
    eventType: extra.eventType ?? "assistant/message",
    time: extra.time ?? 1000 + seq,
    searchable: extra.searchable ?? (text.trim() !== "" && type !== "reasoning"),
    length: Array.from(text).length,
  };
}

/** 读一个块的倒排 rowid:测试用它判断"有没有被删了重插"。 */
function ftsRowid(store, blockId) {
  return store.blockRowid(blockId);
}

test("textHash:等长改写也会变,同文本稳定", () => {
  assert.equal(textHash("abc"), textHash("abc"));
  assert.notEqual(textHash("abc"), textHash("abd"), "等长但不同内容必须不同");
  assert.notEqual(textHash("中文甲"), textHash("中文乙"));
  assert.equal(textHash(""), textHash(""));
  assert.equal(Number.isSafeInteger(textHash("任意一段很长的中文文本🙂")), true);
});

test("只追加一个事件:未变块一行都不碰,新增块才写", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const sessionId = "s1";
    const first = [
      block(sessionId, 0, "0", "text", "第一块"),
      block(sessionId, 0, "1", "text", "第二块"),
    ];
    const write1 = store.replaceSession({ sessionId, cwd: "D:\\dev", revision: "r1", events: 1, blocks: first, now: 1 });
    assert.equal(write1.inserted, 2);
    assert.equal(write1.unchanged, 0);
    const rowidBefore = ftsRowid(store, `${sessionId}#0#0`);

    // 纯追加:老块逐字节相同,只有一个新事件、一个新块。
    const second = [...first, block(sessionId, 1, "0", "text", "第三块")];
    const write2 = store.replaceSession({ sessionId, cwd: "D:\\dev", revision: "r2", events: 2, blocks: second, now: 2 });
    assert.equal(write2.inserted, 1, "只有新块被插入");
    assert.equal(write2.unchanged, 2, "两个老块原样保留");
    assert.equal(write2.updated, 0);
    assert.equal(write2.removed, 0);
    assert.equal(ftsRowid(store, `${sessionId}#0#0`), rowidBefore, "未变块的倒排 rowid 不变(没有删了重插)");
    assert.equal(store.stats().generation, 2, "世代照样递增,游标能感知变化");
    assert.match(store.search({ query: "第三块" }).items[0].snippet, /第三块/);
    assert.ok(store.search({ query: "第一块" }).items.length >= 1, "老块照样搜得到");
  } finally {
    store.close();
  }
});

test("同一块正文被改写:就地更新倒排,rowid 不变", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const sessionId = "s1";
    store.replaceSession({
      sessionId,
      cwd: null,
      revision: "r1",
      events: 1,
      blocks: [block(sessionId, 0, "0", "text", "流式片段甲")],
      now: 1,
    });
    const rowidBefore = ftsRowid(store, `${sessionId}#0#0`);
    // 流式会话同一 seq 的正文会增长:id 不变、内容变了。
    // 注意改写后的文本刻意不含原串——中文现在走子串召回,含前缀会命中(那是正确语义)。
    const write2 = store.replaceSession({
      sessionId,
      cwd: null,
      revision: "r2",
      events: 1,
      blocks: [block(sessionId, 0, "0", "text", "换成了另外一句话")],
      now: 2,
    });
    assert.equal(write2.updated, 1);
    assert.equal(write2.inserted, 0);
    assert.equal(ftsRowid(store, `${sessionId}#0#0`), rowidBefore, "就地 UPDATE 复用原 rowid");
    assert.equal(store.getBlock(`${sessionId}#0#0`).text, "换成了另外一句话");
    assert.equal(store.search({ query: "流式片段甲" }).items.length, 0, "旧正文已从倒排里消失");
    assert.equal(store.search({ query: "另外一句话" }).items.length, 1);
  } finally {
    store.close();
  }
});

test("块变少或末 seq 回退:残留块被删干净(倒排与正文一起)", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const sessionId = "s1";
    store.replaceSession({
      sessionId,
      cwd: null,
      revision: "r1",
      events: 3,
      blocks: [
        block(sessionId, 0, "0", "text", "留下的块"),
        block(sessionId, 1, "0", "reasoning", "要被删掉的思考", { searchable: false }),
        block(sessionId, 2, "0", "text", "也要被删掉"),
      ],
      now: 1,
    });
    assert.equal(store.stats().blocks, 3);
    assert.equal(store.stats().storedTexts, 1, "思考块正文存在 block_text");

    const write2 = store.replaceSession({
      sessionId,
      cwd: null,
      revision: "r2",
      events: 1,
      blocks: [block(sessionId, 0, "0", "text", "留下的块")],
      now: 2,
    });
    assert.equal(write2.removed, 2);
    assert.equal(write2.unchanged, 1);
    assert.equal(store.stats().blocks, 1);
    assert.equal(store.stats().storedTexts, 0, "被删思考块的正文也清掉了");
    assert.equal(store.search({ query: "也要被删掉" }).items.length, 0);
    assert.equal(store.getBlock(`${sessionId}#1#0`), undefined);
  } finally {
    store.close();
  }
});

test("只有 cwd/标题变了:倒排一行都不碰,元数据跟着更新", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const sessionId = "s1";
    store.replaceSession({
      sessionId,
      cwd: "D:\\old",
      title: "旧标题",
      revision: "r1",
      events: 1,
      blocks: [block(sessionId, 0, "0", "text", "正文没变")],
      now: 1,
    });
    const rowidBefore = ftsRowid(store, `${sessionId}#0#0`);
    const write2 = store.replaceSession({
      sessionId,
      cwd: "D:\\new",
      title: "新标题",
      revision: "r2",
      events: 1,
      blocks: [block(sessionId, 0, "0", "text", "正文没变")],
      now: 2,
    });
    assert.equal(write2.fast, true, "纯元数据变化(只有 cwd/标题)也能走追加快路径");
    assert.equal(write2.updated, 0, "块行没被重写");
    assert.equal(write2.unchanged, 1);
    assert.equal(ftsRowid(store, `${sessionId}#0#0`), rowidBefore, "倒排 rowid 不变:没删没插");
    assert.equal(store.getBlock(`${sessionId}#0#0`).cwd, "D:\\new");
    const sessions = store.querySessions({ sessionIds: [sessionId] }).items;
    assert.equal(sessions[0].cwd, "D:\\new");
    assert.equal(sessions[0].title, "新标题");
  } finally {
    store.close();
  }
});

test("倒排开关翻转:两块之间原地迁移(倒排 ↔ block_text)", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const sessionId = "s1";
    store.replaceSession({
      sessionId,
      cwd: null,
      revision: "r1",
      events: 1,
      blocks: [block(sessionId, 0, "0", "reasoning", "思考内容", { searchable: false })],
      now: 1,
    });
    assert.equal(store.stats().searchable, 0);
    assert.equal(store.stats().storedTexts, 1);
    assert.equal(store.queryBlocks({ sessionIds: [sessionId], withText: true }).items[0].text, "思考内容", "不进倒排也能读到正文");

    // include.reasoning 打开后重建:同一块要进倒排,block_text 里那份要清掉。
    const write2 = store.replaceSession({
      sessionId,
      cwd: null,
      revision: "r2",
      events: 1,
      blocks: [block(sessionId, 0, "0", "reasoning", "思考内容", { searchable: true })],
      now: 2,
    });
    assert.equal(write2.updated, 1);
    assert.equal(store.stats().searchable, 1);
    assert.equal(store.stats().storedTexts, 0, "同一份正文不能两处都留");
    assert.equal(store.search({ query: "思考内容" }).items.length, 1);

    // 再关回去:倒排行要清掉,正文回到 block_text。
    store.replaceSession({
      sessionId,
      cwd: null,
      revision: "r3",
      events: 1,
      blocks: [block(sessionId, 0, "0", "reasoning", "思考内容", { searchable: false })],
      now: 3,
    });
    assert.equal(store.stats().searchable, 0);
    assert.equal(store.stats().storedTexts, 1);
    assert.equal(store.search({ query: "思考内容" }).items.length, 0);
  } finally {
    store.close();
  }
});

test("force 全量重写与差量写入结果一致(可观测状态等价)", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const sessionId = "s1";
    const blocks = [
      block(sessionId, 0, "0", "text", "甲"),
      block(sessionId, 1, "0", "reasoning", "乙的思考", { searchable: false }),
      block(sessionId, 2, "0", "text", "丙"),
    ];
    const diff = store.replaceSession({ sessionId, cwd: "D:\\dev", revision: "r1", events: 3, blocks, now: 1 });
    const statsDiff = store.stats();
    const searchesDiff = ["甲", "丙"].map((query) => store.search({ query }).items.length);

    const full = store.replaceSession({ sessionId, cwd: "D:\\dev", revision: "r2", events: 3, blocks, now: 2, mode: "full" });
    assert.equal(full.inserted, 3, "全量模式把三块都重插");
    assert.deepEqual(store.stats().blocks, statsDiff.blocks);
    assert.deepEqual(store.stats().searchable, statsDiff.searchable);
    assert.deepEqual(store.stats().storedTexts, statsDiff.storedTexts);
    assert.deepEqual(["甲", "丙"].map((query) => store.search({ query }).items.length), searchesDiff);
    assert.equal(diff.searchable, full.searchable);
  } finally {
    store.close();
  }
});

test("对账两轮:第二轮没有变更时不重写正文,块与倒排都原样", async () => {
  const sessionId = "session-x";
  const events = [
    { seq: 0, type: "user/message", time: 1000, surface: "current", data: { content: [{ type: "text", text: "提问甲" }] } },
    { seq: 1, type: "assistant/message", time: 2000, surface: "current", data: { message: { content: [{ type: "text", text: "答复甲" }] } } },
  ];
  let readSessionCalls = 0;
  const conversation = {
    async listSessions() {
      return [{ header: { id: sessionId, cwd: "D:\\dev" }, live: false, persisted: true }];
    },
    async listEvents() {
      return events.map((event) => ({ seq: event.seq, type: event.type, time: event.time, surface: event.surface }));
    },
    async readSession() {
      readSessionCalls += 1;
      return { session: { id: sessionId, cwd: "D:\\dev" }, inheritedEventCount: 0, events };
    },
    async readTitleSnapshots(ids) {
      return ids.map(() => ({ status: "fulfilled", value: {} }));
    },
  };
  const store = await openStore({ path: ":memory:" });
  try {
    const indexer = createIndexer({ conversation, store, options: { recheckMs: 0 }, log: () => {} });
    await indexer.reconcile({});
    const rowidBefore = ftsRowid(store, `${sessionId}#0#0`);
    const second = await indexer.reconcile({});
    assert.equal(second.unchanged, 1);
    assert.equal(second.updated, 0);
    assert.equal(readSessionCalls, 1, "第二轮连正文都没读");
    assert.equal(ftsRowid(store, `${sessionId}#0#0`), rowidBefore);
  } finally {
    store.close();
  }
});
