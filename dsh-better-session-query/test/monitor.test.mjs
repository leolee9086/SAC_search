// test/monitor.test.mjs — 界面监控:快照组装、loopback 守卫、路由行为。
//
// 这里只测纯逻辑。跟 DSH 的对接(路由什么时候挂上、到底挂没挂上)不在这里断言,
// 理由写在文件末尾那条占位用例里。
import test from "node:test";
import assert from "node:assert/strict";

import { buildMonitorPayload, createMonitorRoute, fileBytes, isLoopback } from "../lib/monitor.js";

/** 造一个假请求。 */
function fakeReq(method, url, address = "127.0.0.1", body = "") {
  const listeners = new Map();
  const req = {
    method,
    url,
    headers: {},
    socket: address === undefined ? {} : { remoteAddress: address },
    on(event, callback) { listeners.set(event, callback); },
    emit(event) { const cb = listeners.get(event); if (cb) cb(); },
    async *[Symbol.asyncIterator]() {
      if (body !== "") yield Buffer.from(body, "utf8");
    },
  };
  return req;
}

/** 造一个假响应。 */
function fakeRes() {
  return {
    status: 0,
    headers: {},
    body: "",
    writeHead(status, headers) { this.status = status; this.headers = headers ?? {}; },
    write(chunk) { this.body += String(chunk); },
    end(chunk) { if (chunk !== undefined) this.body += String(chunk); this.done = true; },
    on() {},
  };
}

const STATS = { sessions: 8, blocks: 100, searchable: 80, storedTexts: 12, generation: 7, updatedMs: 1_700_000_000_000 };
const SIZE = { path: "D:\\x.db", dbBytes: 40960, pageCount: 10, pageSize: 4096, textBytes: 2048, tables: { block_meta: 100, block_text: 12 } };

test("snapshot:会话总数未知时不许假装知道(0 不等于「共 0 个会话」)", () => {
  const unknown = buildMonitorPayload({ stats: STATS, size: SIZE, listed: 0, config: {} });
  assert.equal(unknown.index.sessions, 8);
  assert.equal(unknown.index.listed, null, "0 要当作未知,而不是总数 0");
  assert.equal(unknown.index.pending, null);
  assert.equal(unknown.index.coverage, null, "不许算出 100% 这种假象");
  const missing = buildMonitorPayload({ stats: STATS, size: SIZE, config: {} });
  assert.equal(missing.index.listed, null, "压根没给也是未知");
  const known = buildMonitorPayload({ stats: STATS, size: SIZE, listed: 16, config: {} });
  assert.equal(known.index.listed, 16);
  assert.equal(known.index.pending, 8);
  assert.equal(known.index.coverage, 0.5);
});

test("snapshot:状态/进度/覆盖率/体积/上次结果/配置各就各位", () => {
  const payload = buildMonitorPayload({
    stats: STATS,
    size: SIZE,
    listed: 10,
    walBytes: 1024,
    now: 1_700_000_005_000,
    progress: { running: true, phase: "writing", done: 5, total: 8, updated: 3, unchanged: 2, errors: 1, current: "session-x", startedAt: 1_700_000_000_000, finishedAt: 0 },
    last: { at: 1, listed: 10, planned: 8, excluded: 1, updated: 3, unchanged: 5, errors: 0 },
    config: { path: "D:\\x.db", reconcileOnSearch: "background" },
  });
  assert.equal(payload.version, 1);
  assert.deepEqual(payload.state.running, true);
  assert.equal(payload.state.percent, 63, "5/8 → 63%");
  assert.equal(payload.state.ratePerSecond, 1, "5 个会话 / 5 秒");
  assert.equal(payload.state.current, "session-x");
  assert.deepEqual(payload.index.sessions, 8);
  assert.equal(payload.index.listed, 10);
  assert.equal(payload.index.pending, 2);
  assert.equal(payload.index.coverage, 0.8);
  assert.equal(payload.size.dbBytes, 40960);
  assert.equal(payload.size.walBytes, 1024);
  assert.equal(payload.size.bytesPerBlock, 410, "40960 / 100");
  assert.deepEqual(payload.size.tables, { block_meta: 100, block_text: 12 });
  assert.equal(payload.last.planned, 8);
  assert.equal(payload.last.excluded, 1);
  assert.equal(payload.config.reconcileOnSearch, "background");
});

test("snapshot:拿不到会话总数时报「未知」,不假装没有缺口", () => {
  const payload = buildMonitorPayload({ stats: STATS, size: SIZE, progress: undefined, listed: undefined });
  assert.equal(payload.index.sessions, 8, "已索引数是知道的");
  assert.equal(payload.index.listed, null, "总数未知就明说未知");
  assert.equal(payload.index.pending, null);
  assert.equal(payload.index.coverage, null, "未知时既不算 100% 也不算缺口");
  assert.equal(payload.state.running, false);
  assert.equal(payload.state.percent, 0);
  assert.equal(payload.last, null);
  assert.equal(payload.config, null);
});

test("fileBytes:内存库与不存在的文件都是 0", () => {
  assert.equal(fileBytes(":memory:"), 0);
  assert.equal(fileBytes(""), 0);
  assert.equal(fileBytes(undefined), 0);
  assert.equal(fileBytes("D:\\绝对不存在的目录\\x.db"), 0);
  assert.ok(fileBytes(new URL(import.meta.url).pathname.replace(/^\//, "")) > 0, "真实文件要给得出字节数");
});

test("isLoopback:只认本机地址", () => {
  assert.equal(isLoopback(fakeReq("GET", "/", "127.0.0.1")), true);
  assert.equal(isLoopback(fakeReq("GET", "/", "::1")), true);
  assert.equal(isLoopback(fakeReq("GET", "/", "::ffff:127.0.0.1")), true);
  assert.equal(isLoopback(fakeReq("GET", "/", "10.0.0.7")), false);
  assert.equal(isLoopback(fakeReq("GET", "/", null)), false, "没有 remoteAddress 一律拒绝");
  assert.equal(isLoopback({}), false);
});

test("路由:loopback 守卫、快照、回忆、触发、404 与自定义前缀", async () => {
  const calls = [];
  const route = createMonitorRoute({
    snapshot: async () => ({ hello: "world" }),
    memories: async () => ({ groups: [] }),
    reindex: async (request) => { calls.push(request); return { updated: 2 }; },
    compact: async (request) => ({ savedBytes: 2048, vacuumed: request.vacuum !== false }),
    pause: (request) => ({ paused: request.paused === true }),
  }, "/sb/");
  assert.equal(route.kind, "prefix");
  assert.equal(route.path, "/sb", "尾斜杠要抹掉");
  const handler = route.handler;

  // 非本机:403,且不泄露任何内容。
  const blocked = fakeRes();
  await handler(fakeReq("GET", "/sb/monitor.json", "192.168.1.9"), blocked);
  assert.equal(blocked.status, 403);

  // 快照。
  const ok = fakeRes();
  await handler(fakeReq("GET", "/sb/monitor.json"), ok);
  assert.equal(ok.status, 200);
  assert.deepEqual(JSON.parse(ok.body), { hello: "world" });
  assert.match(ok.headers["content-type"], /application\/json/);

  // 记忆:面板上那三份走的就是这条。
  const mem = fakeRes();
  await handler(fakeReq("GET", "/sb/memories.json"), mem);
  assert.equal(mem.status, 200);
  assert.deepEqual(JSON.parse(mem.body), { groups: [] });

  // 数据面取不到时给 500,而不是把异常抛出去。
  const broken = createMonitorRoute({
    snapshot: async () => { throw new Error("库没了"); },
    memories: async () => { throw new Error("库没了"); },
  }, "/sb");
  const badSnap = fakeRes();
  await broken.handler(fakeReq("GET", "/sb/monitor.json"), badSnap);
  assert.equal(badSnap.status, 500);
  assert.deepEqual(JSON.parse(badSnap.body), { error: "库没了" });
  const badMem = fakeRes();
  await broken.handler(fakeReq("GET", "/sb/memories.json"), badMem);
  assert.equal(badMem.status, 500);

  // 手动触发一轮。
  const trig = fakeRes();
  await handler(fakeReq("POST", "/sb/reindex", "127.0.0.1", "{\"force\":true}"), trig);
  assert.equal(trig.status, 200);
  assert.deepEqual(calls, [{ force: true }]);
  assert.deepEqual(JSON.parse(trig.body), { ok: true, summary: { updated: 2 } });

  // 未知路由。
  const miss = fakeRes();
  await handler(fakeReq("GET", "/sb/nope"), miss);
  assert.equal(miss.status, 404);

  // 回收空间。
  const comp = fakeRes();
  await handler(fakeReq("POST", "/sb/compact", "127.0.0.1", "{\"vacuum\":false}"), comp);
  assert.equal(comp.status, 200);
  assert.deepEqual(JSON.parse(comp.body), { ok: true, result: { savedBytes: 2048, vacuumed: false } });

  // 暂停/继续:面板上的那个开关。
  const pauseRes = fakeRes();
  await handler(fakeReq("POST", "/sb/pause", "127.0.0.1", "{\"paused\":true}"), pauseRes);
  assert.equal(pauseRes.status, 200);
  assert.deepEqual(JSON.parse(pauseRes.body), { ok: true, result: { paused: true } });

  // SSE:给的是事件流头,并且推了第一帧。
  const sse = fakeRes();
  const req = fakeReq("GET", "/sb/events");
  await handler(req, sse);
  assert.match(sse.headers["content-type"], /text\/event-stream/);
  assert.match(sse.body, /^data: \{"hello":"world"\}/);
  req.emit("close");
});

test("跟 DSH 的对接:不测(这条只是占位)", () => {
  // 路由什么时候挂上、到底挂没挂上、宿主没有这个服务时怎么降级——都不在这里断言。
  //
  // 它们是跟宿主的对接,真实跑一次就知道结果(重启后 curl 一下
  // /session-blocks/monitor.json 有没有 200),而仿真出来的时序反而测不到真事故:
  // 本文件曾经为了这件事搭过一整套「假 ctx + 假 webServer」,
  // 147 条测试全绿,而面板全程「记忆库不可用: HTTP 404」——
  // 因为真实实现是急切的 ctx.get("webServer"),宿主那一刻还没注册这个服务,
  // 而假 ctx 却总是"给得出"服务,于是把事故盖住了。
  //
  // 所以:对接部分按真实环境调代码(现在用 ctx.inject(["webServer"], …) 等服务就位),
  // 不写测试。该测的算法在 memory.test.mjs / cjk-recall.test.mjs。
  assert.ok(true, "占位:这里不需要测试");
});