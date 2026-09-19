// test/title.test.mjs — 会话标题:对账落库、按标题片段查会话、结果里附标题、取标题失败不拖垮索引。
import test from "node:test";
import assert from "node:assert/strict";

import { apply } from "../lib/index.js";
// 测试不碰真实用户目录:DSH_HOME 指到临时目录,库与诊断日志路径随之隔离。
process.env.DSH_HOME = `${(process.env.TEMP ?? process.env.TMP ?? ".").replace(/[\\/]+$/, "")}/bsq-test-home-${process.pid}`;
import { openStore } from "../lib/store.js";
import { createIndexer } from "../lib/indexer.js";

/** 三个会话:两个有标题、一个没有;标题读取可以按开关fail或整个缺席。 */
function fakeConversation({ failTitles = false, noTitleApi = false } = {}) {
  const sessions = [
    {
      id: "session-alpha",
      cwd: "D:\\dev",
      title: "Alpha 索引设计",
      events: [
        { seq: 9, type: "session/title", time: 2000, surface: "log-only", data: { title: "Alpha 索引设计", messageSeqs: [], source: { kind: "fallback" } } },
        { seq: 0, type: "user/message", time: 1000, surface: "current", data: { content: [{ type: "text", text: "甲的提问" }] } },
        { seq: 1, type: "assistant/message", time: 2000, surface: "current", data: { message: { content: [{ type: "text", text: "甲的答复" }] } } },
      ],
    },
    {
      id: "session-beta",
      cwd: "D:\\work",
      title: "Beta 计划",
      events: [
        { seq: 9, type: "session/title", time: 3000, surface: "log-only", data: { title: "Beta 计划", messageSeqs: [], source: { kind: "fallback" } } },
        { seq: 0, type: "user/message", time: 3000, surface: "current", data: { content: [{ type: "text", text: "乙的提问" }] } },
      ],
    },
    {
      id: "session-gamma",
      cwd: "D:\\work",
      events: [
        { seq: 0, type: "user/message", time: 4000, surface: "current", data: { content: [{ type: "text", text: "丙的提问" }] } },
      ],
    },
  ];
  const service = {
    async listSessions() {
      return sessions.map((s) => ({ header: { id: s.id, cwd: s.cwd }, live: false, persisted: true }));
    },
    async listEvents(id) {
      const found = sessions.find((s) => s.id === id);
      return found.events.map((event) => ({ seq: event.seq, type: event.type, time: event.time, surface: event.surface }));
    },
    async readSession(id) {
      const found = sessions.find((s) => s.id === id);
      return { session: { id: found.id, cwd: found.cwd }, inheritedEventCount: 0, events: found.events };
    },
    async readEvent({ sessionId, seq }) {
      const found = sessions.find((s) => s.id === sessionId);
      const target = found.events.find((event) => event.seq === seq);
      return { session: { id: sessionId }, inheritedEventCount: 0, target, events: [target], startSeq: seq, endSeq: seq };
    },
  };
  if (!noTitleApi) {
    service.readTitleSnapshots = async (ids) => {
      if (failTitles) throw new Error("标题服务不可用");
      return ids.map((id) => {
        const found = sessions.find((s) => s.id === id);
        if (found === undefined || found.title === undefined) return { status: "fulfilled", value: { session: { id } } };
        return {
          status: "fulfilled",
          value: { session: { id }, title: { title: found.title, eventSeq: 0, messageSeqs: [0], source: { kind: "user" } } },
        };
      });
    };
  }
  return service;
}

function fakeCtx(conversation) {
  const tools = new Map();
  const provided = new Map();
  const effects = [];
  return {
    get: (name) => (name === "sessionQuery" ? conversation : undefined),
    tools: { register: (def) => { tools.set(def.name, def); } },
    provide: (name, value) => { provided.set(name, value); },
    effect: (callback, label) => { effects.push({ disposer: callback(), label }); },
    inject: () => ({ dispose() {} }),
    logger: { info() {} },
    _tools: tools,
    _provided: provided,
    _effects: effects,
  };
}

test("对账时把会话标题落库,空标题不留占位", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const indexer = createIndexer({ conversation: fakeConversation(), store, options: {}, log: () => {} });
    await indexer.reconcile({ force: true });
    const byId = new Map(store.querySessions({ limit: 10 }).items.map((item) => [item.sessionId, item]));
    assert.equal(byId.get("session-alpha").title, "Alpha 索引设计");
    assert.equal(byId.get("session-beta").title, "Beta 计划");
    assert.equal(byId.get("session-gamma").title, null);
    const titles = store.titlesFor(["session-alpha", "session-gamma", "不存在"]);
    assert.deepEqual([...titles.entries()], [["session-alpha", "Alpha 索引设计"]]);
  } finally {
    store.close();
  }
});

test("按标题片段查会话:ASCII 大小写不敏感,中文按片段,通配符转义", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const indexer = createIndexer({ conversation: fakeConversation(), store, options: {}, log: () => {} });
    await indexer.reconcile({ force: true });
    assert.deepEqual(store.querySessions({ titleContains: "alpha" }).items.map((i) => i.sessionId), ["session-alpha"]);
    assert.deepEqual(store.querySessions({ titleContains: "ALPHA" }).items.map((i) => i.sessionId), ["session-alpha"]);
    assert.deepEqual(store.querySessions({ titleContains: "计划" }).items.map((i) => i.sessionId), ["session-beta"]);
    assert.equal(store.querySessions({ titleContains: "不存在" }).items.length, 0);
    // % 与 _ 是 LIKE 的通配符,必须当普通字符:查 "%" 不该命中所有行。
    assert.equal(store.querySessions({ titleContains: "%" }).items.length, 0);
    assert.equal(store.querySessions({ titleContains: "_" }).items.length, 0);
    // 标题过滤与工作区过滤可以叠加。
    assert.deepEqual(
      store.querySessions({ cwds: ["D:\\work"], titleContains: "Beta" }).items.map((i) => i.sessionId),
      ["session-beta"],
    );
  } finally {
    store.close();
  }
});

test("工具层:会话清单带标题,可按标题收窄", async () => {
  const ctx = fakeCtx(fakeConversation());
  await apply(ctx, { path: ":memory:" });
  await ctx._tools.get("session_blocks_status").execute({ reindex: true }, {});

  const list = await ctx._tools.get("session_blocks_workspaces").execute({ groupBy: "session" }, {});
  assert.match(list, /Alpha 索引设计/);
  assert.match(list, /Beta 计划/);
  assert.match(list, /session-gamma/);

  const filtered = await ctx._tools.get("session_blocks_workspaces").execute({ groupBy: "session", titleContains: "计划" }, {});
  assert.match(filtered, /session-beta/);
  assert.doesNotMatch(filtered, /session-alpha/);
});

test("检索与块查询的结果里附上标题(优先读库里那份)", async () => {
  const ctx = fakeCtx(fakeConversation());
  await apply(ctx, { path: ":memory:" });
  await ctx._tools.get("session_blocks_status").execute({ reindex: true }, {});

  const hits = await ctx._tools.get("session_blocks_search").execute({ query: "甲的答复" }, {});
  assert.match(hits, /session-alpha「Alpha 索引设计」/);

  const blocks = await ctx._tools.get("session_blocks_query").execute({ blockTypes: ["text"], workspace: "D:\\work" }, {});
  assert.match(blocks, /session-beta「Beta 计划」/);
  assert.match(blocks, /session-gamma/, "没有标题的会话照常返回,只是不附书名号");

  const messages = await ctx._tools.get("session_blocks_query").execute({ granularity: "messages", eventTypes: ["user/message"] }, {});
  assert.match(messages, /「Alpha 索引设计」/);

  const status = await ctx._tools.get("session_blocks_status").execute({ sessionId: "session-beta" }, {});
  assert.match(status, /session-beta「Beta 计划」/);
});

test("标题来自日志本身:标题服务抛错或缺席都不影响索引,也不影响标题", async () => {
  for (const [label, conversation] of [
    ["标题服务抛错", fakeConversation({ failTitles: true })],
    ["根本没有标题接口", fakeConversation({ noTitleApi: true })],
  ]) {
    const store = await openStore({ path: ":memory:" });
    try {
      const indexer = createIndexer({ conversation, store, options: {}, log: () => {} });
      const summary = await indexer.reconcile({ force: true });
      assert.equal(summary.updated, 3, `${label}:索引照常`);
      assert.equal(summary.errors, 0, `${label}:不算索引失败`);
      // 标题是日志里最后一个 session/title 事件的 data.title(与 DSH 的 foldSessionTitle 同规则),
      // 因此不依赖任何"额外读标题"的调用——这正是它比早先实现更可靠的地方。
      assert.equal(store.titlesFor(["session-alpha"]).get("session-alpha"), "Alpha 索引设计", `${label}:标题仍然落库`);
      assert.equal(store.titlesFor(["session-gamma"]).size, 0, `${label}:日志里没有 title 事件就没有标题`);
      assert.doesNotThrow(() => store.titlesFor(["没索引过的会话"]), `${label}:查询路径只能丢标题`);
    } finally {
      store.close();
    }
  }
});
