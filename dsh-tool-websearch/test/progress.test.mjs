/*
 * 让 lib/index.js 用 bundle 的**裸 URL** 去 import。
 *
 * 下面那个 mock.module 的 key 就是裸 URL，而 mock 是**按说明符**匹配的：
 * 如果 index.js 带着 `?v=<mtime>` 去 import，key 对不上，mock 就**静默失效** ——
 * 测试会跑起真实搜索（54 个引擎、十几秒），断言自然过不了，
 * 而且报错信息只会说"搜索先于进度返回"，完全看不出是 mock 没生效。
 *
 * 必须在 lib/index.js 被加载**之前**设置（它在 fixture() 里动态 import）。
 */
process.env.DSH_WEBSEARCH_PLAIN_BUNDLE = "1";

import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createProgressStore } from "../lib/progress.js";

// Replace the entire bundle before loading the host: no proxy probing or network.
let runSearch;
let proxyReads = 0;
mock.module(new URL("../lib/search.bundle.mjs", import.meta.url).href, {
  cache: true,
  namedExports: {
    searchWeb: (...args) => runSearch(...args),
    ensureProxyApplied: async () => {},
    getProxyState: () => { proxyReads++; return { enabled: false }; },
    setProxyEnabled: async (enabled) => ({ enabled }),
    toggleProxy: async () => ({ enabled: true }),
    listEngines: () => [],
    getStatus: () => ({}),
  },
});
await import("../lib/search.bundle.mjs");
const { apply, inject } = await import("../lib/index.js");
const API = "/api/dsh-websearch/progress";
const progress = (title = "preview") => ({
  done: 1, total: 3, current: "mock", phase: "result", partialCount: 2,
  latestResults: [{ title, url: "https://example.test/", engine: "mock" }],
});

function fixture() {
  const routes = new Map();
  const tools = new Map();
  const disposers = [];
  const requests = [];
  const connection = {
    requestRejection(req) { requests.push(req); return req.rejection; },
  };
  const services = {
    connection,
    webServer: {
      register(route) {
        routes.set(route.path, route);
        return () => routes.delete(route.path);
      },
    },
    /*
     * apply 会读它来把知乎开放平台的凭证注入环境变量（ref: ZHIHU_ACCESS_SECRET）。
     * 这个测试只关心进度路由，所以给个最小实现 —— 但**必须存在**，
     * 因为这个 fixture 的 ctx.get 对未声明的服务是直接断言失败的。
     */
    credentials: { async resolve() { return undefined; } },
  };
  apply({
    get(name) {
      assert.ok(name in services, `unexpected service: ${name}`);
      return services[name];
    },
    effect(start) { disposers.push(start()); },
    tools: { register(tool) { tools.set(tool.name, tool); } },
  });
  async function request(path = API, query = "sessionId=A&callId=same", options = {}) {
    const req = { url: path + "?" + query, method: "GET", headers: {}, ...options };
    const res = {
      writeHead(status, headers = {}) { this.status = status; this.headers = headers; },
      end(body = "") { this.body = body; },
    };
    await routes.get(path).handler(req, res);
    assert.equal(requests.at(-1), req, "every route uses the connection trust fence");
    return { ...res, data: res.body ? JSON.parse(res.body) : undefined };
  }
  return {
    tools, routes, services, request,
    dispose() { for (const dispose of disposers.reverse()) dispose?.(); },
  };
}

function execution(sessionId = "A", callId = "same", signal) {
  const writes = [];
  return {
    writes,
    exec: { callId, signal, agent: { session: { id: sessionId, append(...args) { writes.push(args); } } } },
  };
}

function pausedSearch() {
  const calls = [];
  const waiters = [];
  calls.waitFor = (count) => calls.length >= count ? Promise.resolve()
    : new Promise((resolve) => waiters.push({ count, resolve }));
  runSearch = (args, signal, emit) => new Promise((resolve, reject) => {
    calls.push({ args, signal, emit, resolve, reject });
    emit?.(progress(args.query));
    for (const waiter of waiters) if (calls.length >= waiter.count) waiter.resolve();
  });
  return calls;
}

test("running searches isolate identical call ids by session and preserve final tool output without appends", async () => {
  // credentials 是本轮为知乎开放平台凭证加的（Host 侧解析 ref 后注入环境变量）
  assert.deepEqual(inject, ["tools", "webServer", "connection", "credentials"]);
  const f = fixture();
  const calls = pausedSearch();
  const a = execution("A");
  const b = execution("B");
  const tool = f.tools.get("web_search_meta");
  const resultA = tool.execute({ query: "alpha" }, a.exec);
  const resultB = tool.execute({ query: "beta" }, b.exec);
  await Promise.race([
    calls.waitFor(2),
    Promise.all([resultA, resultB]).then((values) => assert.fail(`searches returned before progress: ${JSON.stringify(values)}`)),
  ]);
  assert.equal((await f.request()).data.progress.latestResults[0].title, "alpha");
  assert.equal((await f.request(API, "sessionId=B&callId=same")).data.progress.latestResults[0].title, "beta");
  assert.deepEqual((await f.request(API, "sessionId=C&callId=same")).data, { progress: null });
  assert.deepEqual((await f.request(API, "sessionId=A&callId=other")).data, { progress: null });
  assert.equal((await f.request()).headers["Cache-Control"], "no-store");
  const final = '[引擎 1 个 · 成功 1]\n\n搜索 "alpha" 共 1 条结果:\n1. final result';
  calls[0].resolve(final);
  assert.equal(await resultA, final);
  assert.deepEqual(tool.output.render({}, final), [{ type: "text", text: final }]);
  assert.deepEqual((await f.request()).data, { progress: null });
  calls[0].emit(progress("late alpha"));
  assert.deepEqual((await f.request()).data, { progress: null });
  assert.equal((await f.request(API, "sessionId=B&callId=same")).data.progress.latestResults[0].title, "beta");
  calls[1].resolve("beta final");
  assert.equal(await resultB, "beta final");
  assert.deepEqual(a.writes, []);
  assert.deepEqual(b.writes, []);
  f.dispose();
  assert.equal(f.routes.size, 0);
});

test("auth rejection precedes reads, malformed queries and unsupported methods cannot enumerate progress", async () => {
  const f = fixture();
  for (const rejection of [401, 403]) {
    for (const path of [API, "/api/dsh-websearch/proxy"]) {
      const readsBefore = proxyReads;
      const response = await f.request(path, "", { rejection });
      assert.equal(response.status, rejection);
      assert.equal(response.body, "");
      assert.equal(proxyReads, readsBefore);
    }
  }
  for (const query of ["", "callId=same", "sessionId=A", "sessionId=A&callId=", "sessionId=A&sessionId=B&callId=same", "sessionId=A&callId=x&callId=y", "sessionId=" + "A".repeat(513) + "&callId=x"]) {
    assert.equal((await f.request(API, query)).status, 400);
  }
  const response = await f.request(API, "sessionId=A&callId=same", { method: "POST" });
  assert.equal(response.status, 405);
  assert.equal(response.headers.Allow, "GET");
  f.services.connection = undefined;
  // A missing auth provider fails closed, without calling the absent fence.
  const res = { writeHead(status) { this.status = status; }, end() {} };
  await f.routes.get(API).handler({ method: "GET", url: API }, res);
  assert.equal(res.status, 503);
  f.dispose();
});

test("errors, cancellation and plugin disposal remove progress and ignore late callbacks", async () => {
  for (const mode of ["error", "cancel", "dispose"]) {
    const f = fixture();
    const calls = pausedSearch();
    const abort = new AbortController();
    const { exec, writes } = execution("A", "same", abort.signal);
    const result = f.tools.get("web_search_meta").execute({ query: mode }, exec);
    await calls.waitFor(1);
    const handler = f.routes.get(API).handler;
    if (mode === "cancel") abort.abort();
    if (mode === "dispose") f.dispose();
    if (mode !== "error") {
      calls[0].emit(progress("late"));
      const res = { writeHead() {}, end(body) { this.body = body; } };
      await handler({ method: "GET", url: API + "?sessionId=A&callId=same" }, res);
      assert.deepEqual(JSON.parse(res.body), { progress: null });
    }
    calls[0].reject(new Error("mock failure"));
    assert.equal(await result, mode === "cancel" ? "搜索已取消。" : "ERROR: mock failure");
    if (mode !== "dispose") {
      assert.deepEqual((await f.request()).data, { progress: null });
      f.dispose();
    }
    assert.deepEqual(writes, []);
  }
});

test("cached/no-progress output and execution without a session still work", async () => {
  const f = fixture();
  runSearch = async () => "[缓存命中] final";
  const tool = f.tools.get("web_search_meta");
  const { exec, writes } = execution();
  assert.equal(await tool.execute({ query: "cached" }, exec), "[缓存命中] final");
  assert.equal(await tool.execute({ query: "headless" }, {}), "[缓存命中] final");
  assert.equal(await tool.execute({ query: " " }, exec), "ERROR: query 参数必填");
  assert.deepEqual((await f.request()).data, { progress: null });
  assert.deepEqual(writes, []);
  f.dispose();
});

test("replaced observations cannot overwrite or delete a newer run; disposal prevents new observations", () => {
  const store = createProgressStore();
  const old = store.start("A", "call");
  const current = store.start("A", "call");
  current.update(progress("new"));
  old.update(progress("old"));
  old.finish();
  assert.equal(store.get("A", "call").latestResults[0].title, "new");
  const rows = Array.from({ length: 9 }, (_, i) => ({ title: String(i), url: "", engine: "mock", secret: "omit" }));
  current.update({ ...progress(), latestResults: rows });
  assert.equal(store.get("A", "call").latestResults.length, 5);
  assert.equal(store.get("A", "call").latestResults[0].secret, undefined);
  rows[0].title = "changed";
  assert.equal(store.get("A", "call").latestResults[0].title, "0");
  store.dispose();
  current.update(progress("late"));
  assert.equal(store.get("A", "call"), undefined);
  assert.equal(store.start("B", "next"), undefined);
  const fresh = createProgressStore();
  assert.equal(fresh.start("A", "call", AbortSignal.abort()), undefined);
  assert.equal(fresh.get("A", "call"), undefined);
  fresh.dispose();
});
