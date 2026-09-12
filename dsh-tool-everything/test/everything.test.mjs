// test/everything.test.mjs — 传输层纯函数 + 假 fetch + 假 ctx 的审批闸门测试。
// 不打真实网络,不依赖本机装没装 Everything。
import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULTS,
  composeQuery,
  describeCall,
} from "../lib/index.js";
import {
  fileTimeToUnixMs,
  formatLocalTime,
  formatResults,
  formatSearchUrl,
  formatSize,
  mapResult,
  normalizeOptions,
  probeEverything,
  searchEverything,
} from "../lib/everything.js";
import { apply, inject, name } from "../lib/index.js";

/** 造一个只记事的假 ctx;sandboxMode 给了就假装挂了 sandboxPolicy 服务。 */
function fakeCtx({ sandboxMode } = {}) {
  const tools = new Map();
  const listeners = new Map();
  const effects = [];
  return {
    tools: { register(def) { tools.set(def.name, def); } },
    get(serviceName) {
      if (serviceName !== "sandboxPolicy" || sandboxMode === undefined) return undefined;
      return { resolve: () => ({ mode: sandboxMode, workspaceRoot: "D:/dev" }) };
    },
    on(event, handler) {
      const list = listeners.get(event) ?? [];
      list.push(handler);
      listeners.set(event, list);
      return () => {
        const current = listeners.get(event) ?? [];
        listeners.set(event, current.filter((item) => item !== handler));
      };
    },
    effect(callback, label) { effects.push({ disposer: callback(), label }); },
    _tools: tools,
    _listeners: listeners,
    _effects: effects,
    async _preExecute(toolName, exec = {}) {
      const handlers = listeners.get("tools/pre-execute") ?? [];
      let index = 0;
      const next = async () => {
        const handler = handlers[index++];
        if (!handler) return { kind: "allow" };
        return handler({ name: toolName, agent: { session: { id: "session-test" } }, ...exec }, next);
      };
      return next();
    },
  };
}

/** 造一个假 fetch,记录 URL 并返回给定 JSON。 */
function fakeFetch(payload, { status = 200, fail } = {}) {
  const calls = [];
  const impl = async (url) => {
    calls.push(String(url));
    if (fail) throw fail;
    return {
      ok: status >= 200 && status < 300,
      status,
      async json() {
        if (typeof payload === "string") return JSON.parse(payload);
        return payload;
      },
    };
  };
  impl.calls = calls;
  return impl;
}

test("normalizeOptions 给默认值并把越界整数夹回范围", () => {
  const config = normalizeOptions();
  assert.equal(config.host, DEFAULTS.host);
  assert.equal(config.port, DEFAULTS.port);
  assert.equal(config.requireApproval, undefined);
  assert.equal(config.approvalMode, "auto");
  const clamped = normalizeOptions({ port: 99999, maxResults: 0, defaultResults: 100000, host: "  " });
  assert.equal(clamped.port, 65535);
  assert.equal(clamped.maxResults, 1);
  assert.equal(clamped.defaultResults, 1);
  assert.equal(clamped.host, DEFAULTS.host);
  assert.equal(normalizeOptions({ approvalMode: "always" }).approvalMode, "always");
});

test("fileTimeToUnixMs 把 Everything 的 FILETIME 换成 Unix 毫秒", () => {
  // Everything.exe 的 date_modified,对应 2026-01-23 02:57:44Z。
  assert.equal(fileTimeToUnixMs("134136106640000000"), 1769137064000);
  assert.equal(fileTimeToUnixMs(134136106640000000), 1769137064000);
  assert.equal(fileTimeToUnixMs(undefined), undefined);
  assert.equal(fileTimeToUnixMs(""), undefined);
  assert.equal(fileTimeToUnixMs("abc"), undefined);
  assert.equal(fileTimeToUnixMs("0"), undefined);
  // 不能被当成毫秒直接用:那样会得到 1970 年。
  assert.ok(fileTimeToUnixMs("134136106640000000") > 1700000000000);
});

test("mapResult 统一路径分隔符并带上大小与时间", () => {
  const file = mapResult({ type: "file", name: "a.psd", path: "D:\\工作\\图", size: "2048", date_modified: "134136106640000000" });
  assert.deepEqual(file, {
    type: "file",
    name: "a.psd",
    dir: "D:/工作/图",
    path: "D:/工作/图/a.psd",
    size: 2048,
    modifiedMs: 1769137064000,
  });
  const folder = mapResult({ type: "folder", name: "图", path: "D:\\工作" });
  assert.equal(folder.type, "folder");
  assert.equal(folder.path, "D:/工作/图");
  assert.equal(folder.size, undefined);
  assert.equal(folder.modifiedMs, undefined);
  assert.equal(mapResult(undefined).path, "");
});

test("formatSize 与 formatLocalTime 输出稳定", () => {
  assert.equal(formatSize(0), "0 B");
  assert.equal(formatSize(2048), "2.0 KB");
  assert.equal(formatSize(5 * 1024 * 1024), "5.0 MB");
  assert.equal(formatSize(undefined), "");
  assert.equal(formatLocalTime(undefined), "");
  assert.match(formatLocalTime(1769137064000), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
});

test("formatSearchUrl 只带请求的列与开关", () => {
  const url = new URL(formatSearchUrl({ query: "效果图 报价", count: 7 }));
  assert.equal(url.host, "127.0.0.1:8080");
  assert.equal(url.searchParams.get("search"), "效果图 报价");
  assert.equal(url.searchParams.get("json"), "1");
  assert.equal(url.searchParams.get("count"), "7");
  assert.equal(url.searchParams.get("path_column"), "1");
  assert.equal(url.searchParams.get("size_column"), "1");
  assert.equal(url.searchParams.get("date_modified_column"), "1");
  assert.equal(url.searchParams.get("offset"), null);
  assert.equal(url.searchParams.get("case"), null);
  assert.equal(url.searchParams.get("sort"), null);
});

test("formatSearchUrl 带上翻页、排序与匹配开关", () => {
  const url = new URL(formatSearchUrl({
    query: "a", count: 1, offset: 20, sort: "date_modified", ascending: false, matchCase: true, wholeWord: true, regex: true,
  }));
  assert.equal(url.searchParams.get("offset"), "20");
  assert.equal(url.searchParams.get("sort"), "date_modified");
  assert.equal(url.searchParams.get("ascending"), "0");
  assert.equal(url.searchParams.get("case"), "1");
  assert.equal(url.searchParams.get("wholeword"), "1");
  assert.equal(url.searchParams.get("regex"), "1");
});

test("带空格的查询经 URL 编码后仍能原样还原", () => {
  const url = new URL(formatSearchUrl({ query: 'path:"C:\\Program Files" 报价', count: 5 }));
  assert.equal(url.searchParams.get("search"), 'path:"C:\\Program Files" 报价');
  assert.match(url.search, /\+/);
});

test("composeQuery 把 path/ext 拼成 Everything 语法", () => {
  assert.equal(composeQuery({ query: "报价" }), "报价");
  assert.equal(composeQuery({ query: "报价", ext: ".psd" }), "报价 ext:psd");
  assert.equal(composeQuery({ query: "报价", ext: "psd;png" }), "报价 ext:psd;png");
  assert.equal(composeQuery({ query: "报价", path: "D:\\工作\\图" }), "报价 path:D:\\工作\\图");
  assert.equal(composeQuery({ query: "报价", path: "D:\\我的 图\\" }), "报价 path:\"D:\\我的 图\"");
  assert.equal(composeQuery({}), "");
});

test("searchEverything 解析 totalResults 并映射结果", async () => {
  const fetchImpl = fakeFetch({
    totalResults: 2,
    results: [
      { type: "file", name: "a.txt", path: "C:\\tmp", size: "10", date_modified: "134136106640000000" },
      { type: "folder", name: "sub", path: "C:\\tmp" },
    ],
  });
  const outcome = await searchEverything({ query: "a", count: 2 }, { fetchImpl });
  assert.equal(outcome.total, 2);
  assert.equal(outcome.results.length, 2);
  assert.equal(outcome.results[0].path, "C:/tmp/a.txt");
  assert.equal(outcome.results[0].modifiedMs, 1769137064000);
  assert.equal(outcome.results[1].type, "folder");
  assert.match(fetchImpl.calls[0], /^http:\/\/127\.0\.0\.1:8080\/\?/);
});

test("searchEverything 容忍缺字段的空响应", async () => {
  const outcome = await searchEverything({ query: "x" }, { fetchImpl: fakeFetch({ totalResults: 0, results: [] }) });
  assert.equal(outcome.total, 0);
  assert.deepEqual(outcome.results, []);
  const noFields = await searchEverything({ query: "x" }, { fetchImpl: fakeFetch({}) });
  assert.equal(noFields.total, 0);
});

test("非 200 与连不上都给可操作的中文报错", async () => {
  await assert.rejects(
    () => searchEverything({ query: "x" }, { fetchImpl: fakeFetch({}, { status: 500 }) }),
    /http_server_enabled/,
  );
  const refused = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8080"), { name: "TypeError" });
  await assert.rejects(
    () => searchEverything({ query: "x" }, { fetchImpl: fakeFetch(null, { fail: refused }) }),
    /HTTP 服务器/,
  );
  await assert.rejects(
    () => searchEverything({ query: "x" }, { fetchImpl: fakeFetch("<html>") }),
    /不是 JSON/,
  );
});

test("请求超时与调用方取消区分开", async () => {
  const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
  await assert.rejects(
    () => searchEverything({ query: "x" }, { fetchImpl: fakeFetch(null, { fail: timeout }) }),
    /超时/,
  );
  const controller = new AbortController();
  controller.abort();
  const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
  await assert.rejects(
    () => searchEverything({ query: "x" }, { fetchImpl: fakeFetch(null, { fail: abortError }), signal: controller.signal }),
    (error) => error.name === "AbortError",
  );
});

test("formatResults 排成给模型看的文本", () => {
  const text = formatResults("a", {
    total: 3,
    results: [{ type: "file", name: "a.txt", dir: "C:/tmp", path: "C:/tmp/a.txt", size: 2048, modifiedMs: 1769137064000 }],
  });
  assert.match(text, /共 3 条匹配,显示 1 条/);
  assert.match(text, /1\. C:\/tmp\/a\.txt {2}\[文件, 2\.0 KB, \d{4}-\d{2}-\d{2} \d{2}:\d{2}\]/);
  assert.match(text, /还有 2 条未显示/);
  assert.match(formatResults("a", { total: 0, results: [] }), /没有匹配项/);
});

test("probeEverything 只取可达性与命中数", async () => {
  const outcome = await probeEverything({ probe: "Everything.exe" }, { fetchImpl: fakeFetch({ totalResults: 4, results: [] }) });
  assert.deepEqual(outcome, { reachable: true, total: 4 });
});

test("插件注册两个工具并导出常规字段", () => {
  const ctx = fakeCtx();
  apply(ctx);
  assert.equal(name, "dsh-tool-everything");
  assert.deepEqual(inject, ["tools"]);
  assert.deepEqual([...ctx._tools.keys()].sort(), ["everything_search", "everything_status"]);
  for (const def of ctx._tools.values()) {
    assert.equal(typeof def.execute, "function");
    assert.equal(def.parameters.type, "object");
    assert.equal(def.output.schema.type, "string");
  }
  assert.deepEqual(ctx._tools.get("everything_search").parameters.required, ["query"]);
});

test("完全权限下直接调用,不进审批", async () => {
  const ctx = fakeCtx({ sandboxMode: "danger-full-access" });
  apply(ctx);
  assert.deepEqual(await ctx._preExecute("everything_search"), { kind: "allow" });
  assert.deepEqual(await ctx._preExecute("everything_status"), { kind: "allow" });
});

test("工作区/只读权限下要审批,理由里带上当前权限", async () => {
  for (const mode of ["workspace-write", "read-only"]) {
    const ctx = fakeCtx({ sandboxMode: mode });
    apply(ctx);
    const decision = await ctx._preExecute("everything_search");
    assert.equal(decision.kind, "ask", mode);
    assert.match(decision.reason, new RegExp(`当前文件权限 ${mode}`));
    assert.match(decision.reason, /everything_search/);
    assert.match(decision.reason, /整机文件名索引/);
  }
});

test("读不到权限服务时按需要审批处理(fail closed)", async () => {
  const ctx = fakeCtx();
  apply(ctx);
  const decision = await ctx._preExecute("everything_search");
  assert.equal(decision.kind, "ask");
  assert.match(decision.reason, /当前文件权限未知/);
});

test("别的工具一律原样放行", async () => {
  for (const sandboxMode of [undefined, "workspace-write", "danger-full-access"]) {
    const ctx = fakeCtx({ sandboxMode });
    apply(ctx);
    assert.deepEqual(await ctx._preExecute("bash"), { kind: "allow" });
    assert.deepEqual(await ctx._preExecute("everything_search_other"), { kind: "allow" });
  }
});

test("approvalMode=always 时完全权限也要审批", async () => {
  const ctx = fakeCtx({ sandboxMode: "danger-full-access" });
  apply(ctx, { approvalMode: "always" });
  assert.equal((await ctx._preExecute("everything_search")).kind, "ask");
});

test("approvalMode=never 时完全不注册审批监听", async () => {
  for (const sandboxMode of [undefined, "workspace-write", "danger-full-access"]) {
    const ctx = fakeCtx({ sandboxMode });
    apply(ctx, { approvalMode: "never" });
    assert.equal((await ctx._preExecute("everything_search")).kind, "allow");
    assert.equal((ctx._listeners.get("tools/pre-execute") ?? []).length, 0);
  }
});

test("非法的 approvalMode 落回 auto", () => {
  assert.equal(normalizeOptions({ approvalMode: "yolo" }).approvalMode, "auto");
  assert.equal(normalizeOptions({ approvalMode: "always" }).approvalMode, "always");
  assert.equal(normalizeOptions().approvalMode, "auto");
});

test("审批理由里带上这次调用的关键词", async () => {
  const ctx = fakeCtx({ sandboxMode: "workspace-write" });
  apply(ctx);
  const decision = await ctx._preExecute("everything_search", {
    arguments: { query: "效果图", path: "D:\\工作", ext: "psd", maxResults: 20, regex: true },
  });
  assert.equal(decision.kind, "ask");
  assert.match(decision.reason, /^everything_search /);
  assert.match(decision.reason, /query="效果图"/);
  assert.match(decision.reason, /path="D:\\\\工作"/);
  assert.match(decision.reason, /ext="psd"/);
  assert.match(decision.reason, /maxResults=20/);
  assert.match(decision.reason, /regex/);
  assert.match(decision.reason, /当前文件权限 workspace-write/);
});

test("describeCall 只摘已知字段,什么都不给时说明无参数", () => {
  assert.equal(describeCall("everything_status", {}), "无参数");
  assert.equal(describeCall("everything_search", undefined), "无参数");
  assert.equal(describeCall("everything_search", { query: "a", sort: "size", ascending: true }), 'query="a" sort=size ascending');
  assert.equal(describeCall("everything_status", { probe: "Everything.exe" }), 'probe="Everything.exe"');
  // 空字符串与非法数字不算参数。
  assert.equal(describeCall("everything_search", { query: "  ", maxResults: Number.NaN }), "无参数");
});

test("理由过长时截断,不把弹窗撑爆", async () => {
  const ctx = fakeCtx({ sandboxMode: "read-only" });
  apply(ctx);
  const decision = await ctx._preExecute("everything_search", { arguments: { query: "x".repeat(2000) } });
  assert.equal(decision.kind, "ask");
  assert.ok(decision.reason.length <= 401, `理由长度 ${decision.reason.length}`);
  assert.match(decision.reason, /…$/);
});

test("审批自定义理由会带进 ask", async () => {
  const ctx = fakeCtx({ sandboxMode: "workspace-write" });
  apply(ctx, { approvalReason: "自定义理由" });
  const decision = await ctx._preExecute("everything_search");
  assert.match(decision.reason, /自定义理由/);
  assert.match(decision.reason, /^everything_search 无参数 · 自定义理由/);
});

test("everything_search 走配置的端口并返回文本", async () => {
  const ctx = fakeCtx();
  apply(ctx, { port: 9000 });
  const fetchImpl = fakeFetch({ totalResults: 1, results: [{ type: "file", name: "a.txt", path: "C:\\tmp", size: "1024", date_modified: "134136106640000000" }] });
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    const text = await ctx._tools.get("everything_search").execute({ query: "a", ext: "txt" }, { signal: undefined });
    assert.match(text, /共 1 条匹配/);
    assert.match(text, /C:\/tmp\/a\.txt/);
    assert.match(fetchImpl.calls[0], /^http:\/\/127\.0\.0\.1:9000\/\?/);
    // Everything 1.4 的 HTTP 接口把 "+" 当空格解(实测 Program+Files 与 Program%20Files 同为 377 条),
    // 所以 URLSearchParams 的默认编码可以直接用;这里按 URL 语义解回来核对。
    assert.equal(new URL(fetchImpl.calls[0]).searchParams.get("search"), "a ext:txt");
  } finally {
    globalThis.fetch = original;
  }
});

test("everything_search 的入参校验与错误路径不抛异常", async () => {
  const ctx = fakeCtx();
  apply(ctx);
  const search = ctx._tools.get("everything_search");
  assert.equal(await search.execute({}, {}), "ERROR: query 参数必填");
  assert.equal(await search.execute({ query: "   " }, {}), "ERROR: query 参数必填");
  const original = globalThis.fetch;
  globalThis.fetch = fakeFetch({}, { status: 503 });
  try {
    const text = await search.execute({ query: "a" }, {});
    assert.match(text, /^ERROR: /);
    assert.match(text, /http_server_enabled/);
  } finally {
    globalThis.fetch = original;
  }
});

test("everything_status 报告接口与限制", async () => {
  const ctx = fakeCtx();
  apply(ctx, { port: 8080, defaultResults: 20, maxResults: 100 });
  const original = globalThis.fetch;
  globalThis.fetch = fakeFetch({ totalResults: 4, results: [] });
  try {
    const def = ctx._tools.get("everything_status");
    const text = await def.execute({}, {});
    assert.match(text, /http:\/\/127\.0\.0\.1:8080/);
    assert.match(text, /审批档位: auto/);
    assert.match(text, /本会话生效的文件权限: 未知/);
    assert.match(text, /默认 20 条,最多 100 条/);
    const probed = await def.execute({ probe: "Everything.exe" }, {});
    assert.match(probed, /探针「Everything\.exe」命中 4 条/);
  } finally {
    globalThis.fetch = original;
  }
});
