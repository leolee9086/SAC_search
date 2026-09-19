// test/async.test.mjs — 异步索引:单飞、分片让出、进度、后台模式、取消。
import test from "node:test";
import assert from "node:assert/strict";

import { apply } from "../lib/index.js";
// 测试不碰真实用户目录:DSH_HOME 指到临时目录,库与诊断日志路径随之隔离。
process.env.DSH_HOME = `${(process.env.TEMP ?? process.env.TMP ?? ".").replace(/[\\/]+$/, "")}/bsq-test-home-${process.pid}`;
import { openStore } from "../lib/store.js";
import { createIndexer } from "../lib/indexer.js";
import { createIndexRunner } from "../lib/runner.js";

/** 造 N 个会话的假 conversation;可选把 listEvents 挂在一个闸门上,用来观察"在飞的运行"。 */
function fakeConversation(count = 3, { gate } = {}) {
  const sessions = Array.from({ length: count }, (_, index) => ({
    id: `session-${index}`,
    cwd: "D:\\dev",
    events: [
      { seq: 0, type: "user/message", time: 1000 + index, surface: "current", data: { content: [{ type: "text", text: `第 ${index} 个会话` }] } },
    ],
  }));
  const stats = { inFlight: 0, maxInFlight: 0, listEvents: 0, readSession: 0 };
  return {
    stats,
    async listSessions() {
      return sessions.map((s) => ({ header: { id: s.id, cwd: s.cwd }, live: false, persisted: true }));
    },
    async listEvents(id) {
      stats.listEvents += 1;
      stats.inFlight += 1;
      stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
      try {
        if (gate !== undefined) await gate;
        const found = sessions.find((s) => s.id === id);
        return found.events.map((event) => ({ seq: event.seq, type: event.type, time: event.time, surface: event.surface }));
      } finally {
        stats.inFlight -= 1;
      }
    },
    async readSession(id) {
      stats.readSession += 1;
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

test("单飞:并发触发不会并行跑两轮", async () => {
  const conversation = fakeConversation(3);
  const store = await openStore({ path: ":memory:" });
  try {
    const indexer = createIndexer({ conversation, store, options: {}, log: () => {} });
    const runner = createIndexRunner({ indexer, yieldEvery: 1 });
    const [first, second] = await Promise.all([runner.run({ force: true }), runner.run({ force: true })]);
    assert.equal(first.updated, 3);
    assert.equal(second.updated, 3, "第二轮照样跑完(排队,不丢请求)");
    assert.equal(conversation.stats.maxInFlight, 1, "同一时刻只有一轮在跑");
    assert.equal(conversation.stats.readSession, 6, "两轮各自读过一次(单飞不等于合并)");
  } finally {
    store.close();
  }
});

test("进度:phase 序列与计数一路走到 done,最后回到 idle", async () => {
  const conversation = fakeConversation(3);
  const store = await openStore({ path: ":memory:" });
  try {
    const indexer = createIndexer({ conversation, store, options: {}, log: () => {} });
    const seen = [];
    const runner = createIndexRunner({
      indexer,
      yieldEvery: 1,
      onProgress: (progress) => { seen.push({ ...progress }); },
    });
    await runner.run({ force: true });
    assert.equal(seen[0].phase, "listing");
    assert.ok(seen.some((p) => p.phase === "planned" && p.total === 3));
    const comparing = seen.filter((p) => p.phase === "session");
    assert.deepEqual(comparing.map((p) => p.done), [1, 2, 3], "第一相:三个会话逐个比对修订");
    assert.equal(comparing.at(-1).updated, 0, "第一相还没写,updated 仍是 0");
    const writing = seen.filter((p) => p.phase === "writing");
    assert.deepEqual(writing.map((p) => p.done), [1, 2, 3], "第二相:三个会话逐个写入");
    assert.equal(writing.at(-1).updated, 3);
    assert.equal(seen.at(-1).phase, "idle");
    assert.equal(seen.at(-1).running, false);
    assert.equal(runner.isRunning(), false);
    assert.equal(runner.progress().finishedAt > 0, true);
  } finally {
    store.close();
  }
});

test("分片让出:对账期间事件循环被交还(宏任务有机会跑)", async () => {
  const conversation = fakeConversation(4);
  const store = await openStore({ path: ":memory:" });
  try {
    const indexer = createIndexer({ conversation, store, options: {}, log: () => {} });
    const runner = createIndexRunner({ indexer, yieldEvery: 1 });
    let turns = 0;
    let ticking = true;
    const tick = () => {
      if (!ticking) return;
      turns += 1;
      setImmediate(tick);
    };
    setImmediate(tick);
    await runner.run({ force: true });
    ticking = false;
    assert.ok(turns >= 4, `对账期间应至少交还事件循环 4 次,实际 ${turns}`);
  } finally {
    store.close();
  }
});

test("后台模式:检索不等待对账,后台跑完后就能搜到", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const conversation = fakeConversation(2, { gate });
  const ctx = fakeCtx(conversation);
  await apply(ctx, { path: ":memory:", reconcileOnSearch: "background" });
  const service = ctx._provided.get("sessionBlockQuery");

  const first = await ctx._tools.get("session_blocks_search").execute({ query: "第 0 个会话" }, {});
  assert.match(first, /没有命中/, "后台模式下检索不等对账,索引还是空的");
  assert.equal(service.stats !== undefined, true);
  const during = await service.stats();
  assert.equal(during.progress.running, true, "此刻后台正在对账");

  release();
  for (let i = 0; i < 100 && (await service.stats()).progress.running; i += 1) {
    await new Promise((resolve) => { setImmediate(resolve); });
  }
  const second = await ctx._tools.get("session_blocks_search").execute({ query: "第 0 个会话" }, {});
  assert.match(second, /session-0/);
  await service.close();
});

test("stop():在飞的一轮在会话边界优雅停下,后台定时也能真正停掉", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    let listEventsCalls = 0;
    const sessions = Array.from({ length: 5 }, (_, index) => ({ id: `s${index}`, cwd: "D:\\dev" }));
    const conversation = {
      async listSessions() {
        return sessions.map((s) => ({ header: { id: s.id, cwd: s.cwd }, live: false, persisted: true }));
      },
      async listEvents(id) {
        listEventsCalls += 1;
        if (listEventsCalls === 1) await gate; // 第一个会话卡住,期间调用 stop()
        return [{ seq: 0, type: "user/message", time: 1000, surface: "current" }];
      },
      async readSession(id) {
        return {
          session: { id, cwd: "D:\\dev" },
          inheritedEventCount: 0,
          events: [{
            seq: 0, type: "user/message", time: 1000, surface: "current",
            data: { content: [{ type: "text", text: `会话 ${id}` }] },
          }],
        };
      },
      async readTitleSnapshots(ids) {
        return ids.map(() => ({ status: "fulfilled", value: {} }));
      },
    };
    const indexer = createIndexer({ conversation, store, options: {}, log: () => {} });
    const runner = createIndexRunner({ indexer, log: () => {} });

    const inFlight = runner.run({ force: true });
    await new Promise((resolve) => { setImmediate(resolve); });
    assert.equal(listEventsCalls, 1, "此刻正卡在第一个会话上");
    runner.stop();
    release();
    const summary = await inFlight;
    assert.equal(summary.aborted, true, "取消要如实标记,而不是假装跑完");
    assert.equal(listEventsCalls, 1, "停下之后没有再读任何会话");
    assert.equal(runner.progress().phase, "stopped");
    assert.equal(runner.isRunning(), false);

    // 后台定时:能跑起来;stop() 之后不再跑。
    const background = createIndexRunner({ indexer, backgroundMs: 5, log: () => {} });
    assert.equal(background.startBackground(), true);
    assert.equal(background.startBackground(), false, "重复开定时是幂等的");
    await new Promise((resolve) => { setTimeout(resolve, 40); });
    const afterStart = listEventsCalls;
    assert.ok(afterStart > 1, `后台定时确实跑了一轮(读到 ${afterStart} 次)`);
    background.stop();
    await new Promise((resolve) => { setTimeout(resolve, 40); });
    assert.equal(listEventsCalls, afterStart, "stop() 之后后台不再触发新的一轮");
  } finally {
    store.close();
  }
});
