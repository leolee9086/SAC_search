// lib/index.js — dsh-tool-websearch 插件入口(host 侧)。
// 注册 web_search_meta、web_search_status、web_search_proxy；浏览器结果卡和代理开关
// 由同一包的 ./client entry 渲染。搜索逻辑在构建期打包的自包含 bundle 中。
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createProgressStore } from "./progress.js";

const name = "dsh-tool-websearch";
const inject = ["tools", "webServer", "connection"];

const BUNDLE_URL = new URL("./search.bundle.mjs", import.meta.url);
const PROGRESS_API = "/api/dsh-websearch/progress";
const PROXY_API_BASE = "/api/dsh-websearch/proxy";

// 工具定义的纯对象形态(parameters 已是 JSON Schema),与 dsh-tool-restart 同构。
function toolDef(toolName, description, parameters, execute, presentCall) {
  return {
    name: toolName,
    description,
    parameters,
    output: {
      schema: { type: "string" },
      render(_a, v) { return [{ type: "text", text: v }]; },
    },
    execute,
    ...(presentCall ? { presentCall } : {}),
  };
}

const QUERY_TYPES = ["general", "code", "news", "academic", "social", "video", "shopping"];
const TIME_RANGES = ["day", "week", "month", "year"];

const PARAMETERS = {
  type: "object",
  properties: {
    query: { type: "string", description: "搜索查询词(必填)" },
    numResults: { type: "number", description: "返回结果数(默认 8,最大 50)" },
    queryType: {
      type: "string",
      enum: QUERY_TYPES,
      description: "查询类型,决定使用的引擎集合(不传时自动检测查询意图)",
    },
    timeRange: {
      type: "string",
      enum: TIME_RANGES,
      description: "时间范围过滤",
    },
    lang: {
      type: "string",
      description: "语言偏好(如 zh-CN、en),影响中文/英文引擎与区域参数",
    },
    engines: {
      type: "array",
      items: { type: "string" },
      description: "显式指定引擎白名单(如 ['duckduckgo','bing','baidu'])。不传时使用全部引擎。可用引擎见 web_search_status",
    },
    maxWaitSeconds: {
      type: "number",
      description: "总超时上限(秒)。不传时无总超时,由每引擎 15 秒超时兜底",
    },
  },
  required: ["query"],
  additionalProperties: false,
};

const DESCRIPTION =
  "搜索互联网获取最新信息:多引擎元搜索,本地直接调用 DuckDuckGo/Bing/Google/百度/搜狗等免 API key 引擎," +
  "并发执行、结果去重聚合、按引擎权重与时效性评分。适用于知识截止日期之后的信息、当前事件、文档、新闻、代码、学术、购物比价等场景。" +
  "默认使用全部引擎,一次搜索可能需要较长时间,运行中界面实时显示各引擎进度;可用 engines 参数指定子集加速,或用 maxWaitSeconds 设定总超时。";

function apply(ctx) {
  const progressStore = createProgressStore();
  ctx.effect(() => () => progressStore.dispose(), "dsh-tool-websearch: transient progress");

  const webServer = ctx.get("webServer");
  if (webServer && typeof webServer.register === "function") {
    const json = (res, status, data) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(data));
    };
    // Use the same Host/Origin and browser-cookie fence as DSH's own HTTP routes.
    const rejected = (req, res) => {
      const connection = ctx.get("connection");
      const status = typeof connection?.requestRejection === "function"
        ? connection.requestRejection(req)
        : 503;
      if (status === undefined) return false;
      res.writeHead(status, { "Cache-Control": "no-store" });
      res.end();
      return true;
    };
    ctx.effect(() => webServer.register({
      kind: "exact",
      path: PROGRESS_API,
      handler: async (req, res) => {
        if (rejected(req, res)) return;
        if (req.method !== "GET") {
          res.writeHead(405, { Allow: "GET", "Cache-Control": "no-store" });
          res.end();
          return;
        }
        const url = new URL(req.url || "/", "http://localhost");
        const sessionId = url.searchParams.get("sessionId");
        const callId = url.searchParams.get("callId");
        if (!sessionId || !callId || sessionId.length > 512 || callId.length > 512
          || url.searchParams.getAll("sessionId").length !== 1
          || url.searchParams.getAll("callId").length !== 1) {
          json(res, 400, { error: "sessionId and callId are required" });
          return;
        }
        // No session enumeration or callId-only fallback: collisions stay isolated.
        const progress = progressStore.get(sessionId, callId);
        json(res, 200, { progress: progress ?? null });
      },
    }), "dsh-tool-websearch: progress api route");
    ctx.effect(() => webServer.register({
      kind: "prefix",
      path: PROXY_API_BASE,
      handler: async (req, res) => {
        try {
          if (rejected(req, res)) return;
          const { getProxyState, setProxyEnabled, toggleProxy } = await import("./search.bundle.mjs");
          const url = new URL(req.url || "/", "http://localhost");
          const method = (req.method || "GET").toUpperCase();
          if (method === "GET") {
            json(res, 200, getProxyState());
            return;
          }
          if (method === "POST" && url.pathname.endsWith("/toggle")) {
            json(res, 200, await toggleProxy());
            return;
          }
          if (method === "POST" && url.pathname.endsWith("/set")) {
            let body = "";
            for await (const chunk of req) {
              body += chunk;
              if (body.length > 8192) {
                json(res, 413, { error: "request body too large" });
                return;
              }
            }
            const parsed = JSON.parse(body || "{}");
            json(res, 200, await setProxyEnabled(
              parsed.enabled === true,
              typeof parsed.proxyUrl === "string" && parsed.proxyUrl ? parsed.proxyUrl : undefined,
            ));
            return;
          }
          res.writeHead(404);
          res.end("not found");
        } catch (error) {
          json(res, 500, { error: error && error.message ? error.message : String(error) });
        }
      },
    }), "dsh-tool-websearch: proxy api routes");
  }

  // Proxy initialization is non-critical; each search still reports its own request errors.
  void import("./search.bundle.mjs")
    .then((bundle) => bundle.ensureProxyApplied())
    .catch(() => undefined);

  ctx.tools.register(toolDef(
    "web_search_meta",
    DESCRIPTION,
    PARAMETERS,
    async function execute(args, exec) {
      let observation;
      try {
        if (!args || typeof args.query !== "string" || !args.query.trim()) {
          return "ERROR: query 参数必填";
        }
        if (!existsSync(fileURLToPath(BUNDLE_URL))) {
          return "ERROR: 搜索 bundle 缺失(" + fileURLToPath(BUNDLE_URL) + ")。请在插件目录运行 `bun run build` 后重新安装。";
        }
        const sessionId = exec?.agent?.session?.id;
        const callId = exec?.callId;
        observation = typeof sessionId === "string" && typeof callId === "string"
          ? progressStore.start(sessionId, callId, exec?.signal)
          : undefined;
        const emitProgress = observation
          ? (p) => {
              try {
                observation.update(p);
              } catch {
                /* Progress observation must never fail the search. */
              }
            }
          : undefined;
        const { searchWeb } = await import("./search.bundle.mjs");
        return await searchWeb({
          query: args.query,
          numResults: typeof args.numResults === "number" && args.numResults > 0 ? args.numResults : undefined,
          queryType: args.queryType,
          timeRange: args.timeRange,
          lang: args.lang,
          engines: Array.isArray(args.engines) ? args.engines.filter((e) => typeof e === "string") : undefined,
          maxWaitSeconds: typeof args.maxWaitSeconds === "number" && args.maxWaitSeconds > 0 ? args.maxWaitSeconds : undefined,
        }, exec && exec.signal ? exec.signal : undefined, emitProgress);
      } catch (error) {
        if (exec && exec.signal && exec.signal.aborted) return "搜索已取消。";
        return "ERROR: " + (error && error.message ? error.message : String(error));
      } finally {
        observation?.finish();
      }
    },
    function presentCall(args) {
      const q = args && typeof args.query === "string" ? args.query : "";
      return { card: "generic", title: "正在搜索: " + q, kind: "execute" };
    },
  ));

  ctx.tools.register(toolDef(
    "web_search_status",
    "查看 web_search_meta 的引擎清单、健康状态、速率限制与缓存统计(不触发网络访问)",
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    async function execute(_args, _exec) {
      try {
        if (!existsSync(fileURLToPath(BUNDLE_URL))) {
          return "ERROR: 搜索 bundle 缺失(" + fileURLToPath(BUNDLE_URL) + ")。请在插件目录运行 `bun run build` 后重新安装。";
        }
        const { listEngines, getStatus } = await import("./search.bundle.mjs");
        const engines = listEngines();
        const status = getStatus ? getStatus() : null;
        const lines = ["可用引擎 " + engines.length + " 个(全部免 key,无需配置 API key):"];
        for (const e of engines) {
          lines.push("  " + e.name + " (权重 " + e.weight + ",超时 " + e.timeoutMs + "ms)");
        }
        if (status) {
          lines.push("");
          lines.push("速率限制器: " + JSON.stringify(status.rateLimiter));
          lines.push("缓存: " + JSON.stringify(status.cache));
          lines.push("引擎健康: " + JSON.stringify(status.engines));
        }
        return lines.join("\n");
      } catch (error) {
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
  ));

  ctx.tools.register(toolDef(
    "web_search_proxy",
    "查看或切换 web_search 的系统代理开关(探测 127.0.0.1:7890 等本地代理,启用后 DuckDuckGo/Google 等国际引擎可访问)。" +
    "action=get 返回当前状态;action=toggle 切换;action=set 显式设置 enabled 与可选 proxyUrl。",
    {
      type: "object",
      properties: {
        action: { type: "string", enum: ["get", "toggle", "set"], description: "get=查询,toggle=切换,set=设置" },
        enabled: { type: "boolean", description: "set 时:是否启用" },
        proxyUrl: { type: "string", description: "set 时:显式代理 URL(缺省使用探测结果)" },
      },
      required: ["action"],
      additionalProperties: false,
    },
    async function execute(args) {
      try {
        const { getProxyState, setProxyEnabled, toggleProxy } = await import("./search.bundle.mjs");
        const action = args && typeof args.action === "string" ? args.action : "get";
        const state = action === "toggle"
          ? await toggleProxy()
          : action === "set"
            ? await setProxyEnabled(
              args.enabled === true,
              typeof args.proxyUrl === "string" && args.proxyUrl ? args.proxyUrl : undefined,
            )
            : getProxyState();
        return "代理状态: " + (state.enabled ? "启用" : "禁用") +
          (state.proxyUrl ? " · " + state.proxyUrl : "") +
          " · 来源: " + state.source +
          (state.detectedUrl && state.detectedUrl !== state.proxyUrl ? " · 探测到: " + state.detectedUrl : "");
      } catch (error) {
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
    function presentCall(args) {
      const action = args && typeof args.action === "string" ? args.action : "get";
      return { card: "generic", title: "代理: " + action, kind: "execute" };
    },
  ));
}

export { apply, inject, name };
