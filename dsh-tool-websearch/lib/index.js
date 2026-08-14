// lib/index.js — dsh-tool-websearch 插件入口(host 侧)。
// 注册 web_search_meta(多引擎元搜索,运行中进度通过 session 事件 + sessionProjections
// 推送到浏览器,由 dsh-client-ui-websearch 渲染)与 web_search_status 两个工具。
// 搜索逻辑在构建期打包的自包含 bundle(search.bundle.mjs)中,纯 Node 运行,零运行时依赖。
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const name = "dsh-tool-websearch";
const inject = ["tools", "sessionProjections"];

const BUNDLE_URL = new URL("./search.bundle.mjs", import.meta.url);

// 运行中进度投影单元的 key(客户端 useProjection 同名读取)。
const PROGRESS_KEY = "websearch-progress";
// 进度事件类型(进 session 日志,驱动投影单元折叠)。
const PROGRESS_EVENT = "tool/websearch-progress";

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
  // 注册运行中进度投影单元:每个 "tool/websearch-progress" 事件折叠进
  // { callId -> progress },经 session/projection 帧推送到浏览器供 UI 渲染。
  // 恒等 schema:值是我们自己构造的纯 JSON,无需额外校验(避免引入 zod 依赖)。
  const projections = ctx.get("sessionProjections");
  if (projections) {
    ctx.effect(() => projections.register({
      key: PROGRESS_KEY,
      stateVersion: 1,
      schema: { parse: (v) => v },
      init: () => ({}),
      apply: (state, event) => {
        if (!event || event.type !== PROGRESS_EVENT) return state;
        const d = event.data || {};
        if (typeof d.callId !== "string" || !d.callId) return state;
        return {
          ...state,
          [d.callId]: {
            done: typeof d.done === "number" ? d.done : 0,
            total: typeof d.total === "number" ? d.total : 0,
            current: typeof d.current === "string" ? d.current : "",
            phase: typeof d.phase === "string" ? d.phase : "start",
            partialCount: typeof d.partialCount === "number" ? d.partialCount : 0,
            latestResults: Array.isArray(d.latestResults) ? d.latestResults : [],
          },
        };
      },
      view: (state) => state,
    }));
  }

  ctx.tools.register(toolDef(
    "web_search_meta",
    DESCRIPTION,
    PARAMETERS,
    async function execute(args, exec) {
      try {
        if (!args || typeof args.query !== "string" || !args.query.trim()) {
          return "ERROR: query 参数必填";
        }
        if (!existsSync(fileURLToPath(BUNDLE_URL))) {
          return "ERROR: 搜索 bundle 缺失(" + fileURLToPath(BUNDLE_URL) + ")。请在插件目录运行 `bun run build` 后重新安装。";
        }
        // 进度通道:每引擎相位 append 到会话事件流,投影单元折叠后推送到 UI
        const session = exec && exec.agent && exec.agent.session ? exec.agent.session : undefined;
        const callId = exec && exec.callId ? String(exec.callId) : undefined;
        const emitProgress = session && callId
          ? (p) => {
              try {
                session.append(PROGRESS_EVENT, { callId, ...p }, { ignorable: true });
              } catch {
                /* 进度观测绝不能破坏搜索本身 */
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
}

export { apply, inject, name };
