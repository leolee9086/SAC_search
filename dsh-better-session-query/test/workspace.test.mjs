// test/workspace.test.mjs — 按工作区(cwd)查询会话:对账写入 cwd、元数据过滤、会话/工作区清单。
import test from "node:test";
import assert from "node:assert/strict";

import { apply } from "../lib/index.js";
// 测试不碰真实用户目录:DSH_HOME 指到临时目录,库与诊断日志路径随之隔离。
process.env.DSH_HOME = `${(process.env.TEMP ?? process.env.TMP ?? ".").replace(/[\\/]+$/, "")}/bsq-test-home-${process.pid}`;
import { openStore } from "../lib/store.js";
import { createIndexer, workspaceAllowed } from "../lib/indexer.js";

/** 两个工作区、各一个会话的假 conversation 服务(DSH ctx.sessionQuery 的最小契约)。 */
function fakeConversation() {
  const sessions = [
    {
      id: "session-dev",
      cwd: "D:\\dev",
      events: [
        { seq: 0, type: "user/message", time: 1000, surface: "current", data: { content: [{ type: "text", text: "工作区甲的提问" }] } },
        { seq: 1, type: "assistant/message", time: 2000, surface: "current", data: { message: { content: [{ type: "text", text: "工作区甲的回答" }] } } },
      ],
    },
    {
      id: "session-work",
      cwd: "D:\\work",
      events: [
        { seq: 0, type: "user/message", time: 3000, surface: "current", data: { content: [{ type: "text", text: "工作区乙的提问" }] } },
        { seq: 1, type: "assistant/message", time: 4000, surface: "current", data: { message: { content: [{ type: "text", text: "乙的回答" }] } } },
      ],
    },
    { id: "session-nowhere", cwd: undefined, events: [{ seq: 0, type: "user/message", time: 5000, surface: "current", data: { content: [{ type: "text", text: "没有 cwd 的会话" }] } }] },
  ];
  return {
    sessions,
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
    async readTitleSnapshots(ids) {
      return ids.map(() => ({ status: "fulfilled", value: {} }));
    },
    async readEvent({ sessionId, seq }) {
      const found = sessions.find((s) => s.id === sessionId);
      const target = found.events.find((event) => event.seq === seq);
      return { session: { id: sessionId }, inheritedEventCount: 0, target, events: [target], startSeq: seq, endSeq: seq };
    },
  };
}

/** 一个只记事的假 ctx。 */
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

test("对账把会话头的 cwd 写进索引,并按工作区聚合", async () => {
  const conversation = fakeConversation();
  const store = await openStore({ path: ":memory:" });
  try {
    const indexer = createIndexer({ conversation, store, options: {}, log: () => {} });
    const summary = await indexer.reconcile({ force: true });
    assert.equal(summary.updated, 3);
    const workspaces = store.queryWorkspaces();
    const byCwd = new Map(workspaces.items.map((item) => [item.cwd, item]));
    assert.equal(byCwd.get("D:\\dev").sessions, 1);
    assert.equal(byCwd.get("D:\\work").sessions, 1);
    assert.ok(byCwd.get("D:\\dev").blocks >= 2);
    assert.equal(byCwd.get(null).sessions, 1, "没有 cwd 的会话归到 null 桶,不丢");
    const sessions = store.querySessions({ cwds: ["d:\\WORK"] });
    assert.equal(sessions.items.length, 1, "cwd 过滤大小写不敏感");
    assert.equal(sessions.items[0].sessionId, "session-work");
  } finally {
    store.close();
  }
});

test("服务层:工作区清单与会话清单", async () => {
  const ctx = fakeCtx(fakeConversation());
  await apply(ctx, { path: ":memory:" });
  const service = ctx._provided.get("sessionBlockQuery");
  await service.reconcile({ force: true });

  const workspaces = await service.queryWorkspaces();
  assert.deepEqual(workspaces.items.map((item) => item.cwd).sort(), ["D:\\dev", "D:\\work", null].sort());

  const sessions = await service.querySessions({ workspace: "D:\\work" });
  assert.deepEqual(sessions.items.map((item) => item.sessionId), ["session-work"]);
  await service.close();
});

test("工具层:按工作区查块、按工作区检索、列工作区/会话", async () => {
  const ctx = fakeCtx(fakeConversation());
  await apply(ctx, { path: ":memory:" });
  await ctx._tools.get("session_blocks_status").execute({ reindex: true }, {});

  const workspaceList = await ctx._tools.get("session_blocks_workspaces").execute({}, {});
  assert.match(workspaceList, /D:\\dev/);
  assert.match(workspaceList, /D:\\work/);

  const sessionList = await ctx._tools.get("session_blocks_workspaces").execute({ groupBy: "session", workspace: "d:\\DEV" }, {});
  assert.match(sessionList, /session-dev/);
  assert.doesNotMatch(sessionList, /session-work/, "工作区过滤必须生效(且大小写不敏感)");

  const blocks = await ctx._tools.get("session_blocks_query").execute({ workspace: "D:\\work", blockTypes: ["text"] }, {});
  assert.match(blocks, /session-work/);
  assert.doesNotMatch(blocks, /session-dev/);

  // unicode61 不做中文分词:"工作区甲的回答"整串才是一个 token,所以查询要用整串。
  const hits = await ctx._tools.get("session_blocks_search").execute({ query: "工作区甲的回答", workspace: "D:\\dev" }, {});
  assert.match(hits, /session-dev/);
  assert.doesNotMatch(hits, /session-work/);

  const messages = await ctx._tools.get("session_blocks_query").execute({
    granularity: "messages",
    workspace: "D:\\work",
    eventTypes: ["assistant/message"],
  }, {});
  assert.match(messages, /session-work/);
  assert.doesNotMatch(messages, /session-dev/);
});

test("索引层:排除工作区后不收,已索引的会被清掉", async () => {
  const conversation = fakeConversation();
  const store = await openStore({ path: ":memory:" });
  try {
    const all = createIndexer({ conversation, store, options: {}, log: () => {} });
    await all.reconcile({ force: true });
    assert.equal(store.querySessions().items.length, 3);

    const filtered = createIndexer({
      conversation,
      store,
      options: { excludeWorkspaces: ["d:\\WORK\\"] },
      log: () => {},
    });
    const summary = await filtered.reconcile({ force: true });
    assert.equal(summary.excluded, 1, "被排除的会话要从索引里清掉");
    assert.deepEqual(store.querySessions().items.map((item) => item.sessionId).sort(), ["session-dev", "session-nowhere"]);
  } finally {
    store.close();
  }
});

test("索引层:白名单只收列出的工作区,无 cwd 的会话可关掉", async () => {
  const conversation = fakeConversation();
  const store = await openStore({ path: ":memory:" });
  try {
    const only = createIndexer({
      conversation,
      store,
      options: { includeWorkspaces: ["D:\\work"] },
      log: () => {},
    });
    await only.reconcile({ force: true });
    assert.deepEqual(store.querySessions().items.map((item) => item.sessionId), ["session-work"]);

    const noOrphan = createIndexer({
      conversation,
      store,
      options: { includeWithoutWorkspace: false },
      log: () => {},
    });
    await noOrphan.reconcile({ force: true });
    assert.deepEqual(store.querySessions().items.map((item) => item.sessionId).sort(), ["session-dev", "session-work"]);
  } finally {
    store.close();
  }
});

test("查询层:排除工作区,且不误伤没有 cwd 的会话", async () => {
  const ctx = fakeCtx(fakeConversation());
  await apply(ctx, { path: ":memory:" });
  await ctx._tools.get("session_blocks_status").execute({ reindex: true }, {});

  const blocks = await ctx._tools.get("session_blocks_query").execute({ excludeWorkspaces: ["D:\\work"] }, {});
  assert.match(blocks, /session-dev/);
  assert.match(blocks, /session-nowhere/, "NULL cwd 不能因为 NOT IN 的 NULL 语义被顺手丢掉");
  assert.doesNotMatch(blocks, /session-work/);

  const hits = await ctx._tools.get("session_blocks_search").execute(
    { query: "乙的回答", excludeWorkspaces: ["D:\\dev"] },
    {},
  );
  assert.match(hits, /session-work/);
  assert.doesNotMatch(hits, /session-dev/);
});

test("workspaceAllowed:大小写与尾部分隔符不敏感,黑名单优先于白名单", () => {
  assert.equal(workspaceAllowed("D:\\dev", {}), true);
  assert.equal(workspaceAllowed(undefined, {}), true, "默认收没有 cwd 的会话");
  assert.equal(workspaceAllowed(undefined, { includeWithoutWorkspace: false }), false);
  assert.equal(workspaceAllowed("D:\\WORK\\", { excludeWorkspaces: ["d:\\work"] }), false);
  assert.equal(workspaceAllowed("D:\\dev", { includeWorkspaces: ["D:\\work"] }), false);
  assert.equal(workspaceAllowed("D:\\dev", { includeWorkspaces: ["D:\\dev"], excludeWorkspaces: ["D:\\dev"] }), false);
  assert.equal(workspaceAllowed("D:\\dev", { includeWorkspaces: [], excludeWorkspaces: [] }), true);
  assert.equal(
    workspaceAllowed(undefined, { includeWorkspaces: ["D:\\work"] }),
    false,
    "白名单是穷尽的:列了白名单,没有 cwd 的会话不在名单里",
  );
});

