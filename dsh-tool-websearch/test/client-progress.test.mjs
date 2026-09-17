import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
const flush = () => new Promise((resolve) => setImmediate(resolve));
const preview = (title) => ({ done: 1, total: 2, current: "mock", partialCount: 1, latestResults: [{ title, engine: "mock" }] });

// Drive the shipped module's component with controlled hooks, fetch and timers.
// No browser, DOM, server, or installed React dependency is required.
function fixture() {
  const states = [];
  const effects = [];
  const pendingEffects = [];
  const timers = new Map();
  const requests = [];
  let cursor = 0;
  let timerId = 0;
  let plugin;
  let view;
  const react = {
    createElement(type, props, ...children) { return { type, props: { ...props, children } }; },
    useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = initial;
      return [states[i], (value) => { states[i] = value; }];
    },
    useEffect(effect, deps) {
      const i = cursor++;
      const old = effects[i];
      if (!old || deps.some((value, j) => value !== old.deps[j])) {
        pendingEffects.push(() => {
          old?.cleanup?.();
          effects[i] = { deps, cleanup: effect() };
        });
      }
    },
  };
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load({ factory }) { plugin = factory(() => react); } } },
    AbortController, URLSearchParams,
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch(url, options) {
      return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
    },
  });
  plugin.apply({
    effect(fn) {
      const dispose = fn();
      return typeof dispose === "function" ? dispose : () => {};
    },
    slots: {
      inject(_name, factory) { return factory(); },
      register(options, component) { if (options.key === "web_search_meta") view = component; return () => {}; },
    },
    /*
     * 页签那三个服务的**最小 mock**。
     *
     * client.js 的 inject 里声明了它们，真实环境由 Cordis 保证存在（声明了就等于有）；
     * 但这里的 ctx 是手写的，不补就会在 apply 里读到 undefined 然后抛错 ——
     * 这正是这个测试在本轮改动后挂掉的原因。
     * 本文件只测工具卡，所以这些 mock 什么都不用做，能拿到方法就行。
     */
    sidebarRightTabs: { register() { return () => {}; } },
    sidebarRight: { openTab() {}, isExpanded() { return true; } },
    layout: { openRightbar() {} },
  });
  return {
    requests, timers,
    render(props) {
      cursor = 0;
      const tree = view(props);
      while (pendingEffects.length) pendingEffects.shift()();
      return tree;
    },
    respond(index, progress, status = 200) {
      requests[index].resolve({ ok: status === 200, status, json: async () => ({ progress }) });
      return flush();
    },
    tick(delay) {
      const found = [...timers].find(([, timer]) => timer.delay === delay);
      assert.ok(found, `expected timer ${delay}`);
      timers.delete(found[0]);
      found[1].fn();
    },
    dispose() { for (const effect of effects) effect?.cleanup?.(); },
  };
}
const running = (sessionId = "A", callId = "same") => ({ sessionId, callId, block: { argsRaw: '{"query":"test"}' } });
const completed = () => ({ ...running(), block: {
  kind: "tool-result", call: { argsRaw: '{"query":"test"}' },
  content: [{ type: "text", text: '[引擎 1 个 · 成功 1]\n\n搜索 "test" 共 1 条结果:\n1. Final title\n   [example.test]\n   mock | https://example.test/\n   Final snippet' }],
} });

test("running cards poll the exact session/call, display progress and switch to durable final results", async () => {
  const f = fixture();
  let card = f.render(running("A & B", "call/#1"));
  assert.equal(card.props.footer, "正在连接搜索引擎");
  const url = new URL(f.requests[0].url, "http://localhost");
  assert.equal(url.searchParams.get("sessionId"), "A & B");
  assert.equal(url.searchParams.get("callId"), "call/#1");
  assert.equal(f.requests[0].options.credentials, "same-origin");
  assert.equal(f.requests[0].options.cache, "no-store");
  await f.respond(0, preview("Live title"));
  card = f.render(running("A & B", "call/#1"));
  assert.match(card.props.footer, /引擎 1\/2/);
  assert.match(JSON.stringify(card), /Live title/);
  f.tick(500);
  assert.equal(f.requests.length, 2);
  card = f.render(completed());
  assert.equal(f.requests[1].options.signal.aborted, true);
  assert.match(JSON.stringify(card), /Final title/);
  assert.match(JSON.stringify(card), /Final snippet/);
  await f.respond(1, preview("Late title"));
  assert.equal(f.timers.size, 0);
  assert.doesNotMatch(JSON.stringify(f.render(completed())), /Late title/);
  f.dispose();
});

test("session and call switches never display old or late progress", async () => {
  const f = fixture();
  f.render(running("A"));
  await f.respond(0, preview("A private title"));
  assert.match(JSON.stringify(f.render(running("A"))), /A private title/);
  f.tick(500);
  let card = f.render(running("B"));
  assert.doesNotMatch(JSON.stringify(card), /A private title/);
  assert.equal(f.requests[1].options.signal.aborted, true);
  await f.respond(1, preview("A late title"));
  card = f.render(running("B"));
  assert.doesNotMatch(JSON.stringify(card), /A late title/);
  await f.respond(2, preview("B title"));
  assert.match(JSON.stringify(f.render(running("B"))), /B title/);
  assert.doesNotMatch(JSON.stringify(f.render(running("B", "other"))), /B title/);
  f.dispose();
  await f.respond(3, preview("unmounted"));
  assert.equal(f.timers.size, 0);
});

test("completed history never polls, and missing progress keeps the loading fallback", async () => {
  const f = fixture();
  f.render(completed());
  assert.equal(f.requests.length, 0);
  f.render({ block: { argsRaw: "{}" } });
  assert.equal(f.requests.length, 0);
  f.render(running());
  await f.respond(0, null);
  assert.equal(f.render(running()).props.footer, "正在连接搜索引擎");
  f.dispose();
  assert.equal(f.timers.size, 0);
});

test("authentication refusal stops polling; transient failure retries without overlapping requests", async () => {
  for (const status of [401, 403]) {
    const f = fixture();
    f.render(running());
    assert.equal([...f.timers.values()].filter((timer) => timer.delay === 500).length, 0);
    await f.respond(0, null, status);
    assert.equal(f.timers.size, 0);
    f.dispose();
  }
  const f = fixture();
  f.render(running());
  f.tick(10000);
  assert.equal(f.requests[0].options.signal.aborted, true);
  f.requests[0].reject(new Error("mock timeout"));
  await flush();
  f.tick(500);
  assert.equal(f.requests.length, 2);
  await f.respond(1, preview("Recovered"));
  assert.match(JSON.stringify(f.render(running())), /Recovered/);
  f.dispose();
  assert.equal(f.timers.size, 0);
});
