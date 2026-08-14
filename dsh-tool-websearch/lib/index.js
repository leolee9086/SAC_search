// lib/index.js — dsh-tool-websearch 插件入口(host 侧)。
// 注册 web_search_meta(多引擎元搜索)与 web_search_status 两个工具。
// 搜索逻辑在构建期打包的自包含 bundle(search.bundle.mjs)中,纯 Node 运行,零运行时依赖。
//
// 本文件属于 standard 分支:只用官方公共 API(session.append 仅用于官方已知事件),
// 不向会话日志写入任何自定义事件类型,因此会话历史永远不会被本插件污染。
// 运行中逐引擎进度通道见 progress-events 分支(tool/websearch-progress 自定义事件)。
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const name = "dsh-tool-websearch";
const inject = ["tools"];

const BUNDLE_URL = new URL("./search.bundle.mjs", import.meta.url);

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
  "默认使用全部引擎,一次搜索可能需要较长时间;可用 engines 参数指定子集加速,或用 maxWaitSeconds 设定总超时。";

function apply(ctx) {
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
        // standard 分支:不向会话写入任何自定义事件;运行中无逐引擎进度,
        // UI 显示 presentCall 静态卡片,搜索完成时返回聚合结果。
        const { searchWeb } = await import("./search.bundle.mjs");
        return await searchWeb({
          query: args.query,
          numResults: typeof args.numResults === "number" && args.numResults > 0 ? args.numResults : undefined,
          queryType: args.queryType,
          timeRange: args.timeRange,
          lang: args.lang,
          engines: Array.isArray(args.engines) ? args.engines.filter((e) => typeof e === "string") : undefined,
          maxWaitSeconds: typeof args.maxWaitSeconds === "number" && args.maxWaitSeconds > 0 ? args.maxWaitSeconds : undefined,
        }, exec && exec.signal ? exec.signal : undefined);
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
