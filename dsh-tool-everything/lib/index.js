// lib/index.js — dsh-tool-everything 插件入口(host 侧)。
// 通过 Everything 自带的 HTTP 接口查询本机文件索引,提供 everything_search 与 everything_status。
//
// 审批:Everything 的索引包含整机所有文件名/路径(HTTP 接口默认还允许下载文件),
// 因此本插件的每个工具调用都要过 DSH 的审批。落点是 tools/pre-execute 这个 waterfall:
// 它由工具箱自己在执行前调用,返回 { kind: "ask" } 后由 DSH 的 approval 服务
// 走审批、写 approval/asked + approval/decided 审计事件,并把结果映射成放行或拒绝。
// 审批不可用时按 DSH 的约定 fail closed(拒绝),插件不自己放行。
import {
  DEFAULTS,
  SORT_FIELDS,
  formatResults,
  normalizeOptions,
  probeEverything,
  searchEverything,
} from "./everything.js";

const name = "dsh-tool-everything";
const inject = ["tools"];

const TOOL_SEARCH = "everything_search";
const TOOL_STATUS = "everything_status";
const OWNED_TOOLS = [TOOL_SEARCH, TOOL_STATUS];

const DEFAULT_APPROVAL_REASON =
  "Everything 索引包含整机文件名与路径,每次查询都要你确认";

// 工具定义的纯对象形态(与 dsh-tool-websearch / dsh-tool-restart 同构)。
function toolDef(toolName, description, parameters, execute, presentCall) {
  return {
    name: toolName,
    description,
    parameters,
    output: {
      schema: { type: "string" },
      render(_args, value) { return [{ type: "text", text: value }]; },
    },
    execute,
    ...(presentCall ? { presentCall } : {}),
  };
}

const SEARCH_PARAMETERS = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Everything 搜索语法(必填)。支持 name:/path:/ext:/size:/dm: 等一切 Everything 语法,"
        + "例如 'ext:psd 效果图'、'path:\"D:\\工作\" 报价'。",
    },
    path: {
      type: "string",
      description: "可选,只在这个目录下找。会作为 path:\"…\" 追加到查询上(Everything 的 HTTP 接口没有独立的目录过滤参数)。",
    },
    ext: {
      type: "string",
      description: "可选,扩展名过滤,不带点(如 psd;多个用分号,如 psd;png)。会作为 ext: 追加到查询上。",
    },
    maxResults: {
      type: "number",
      description: "返回条数上限(默认 50,受插件 config.maxResults 限制)",
    },
    offset: {
      type: "number",
      description: "跳过前 N 条(翻页用)",
    },
    sort: {
      type: "string",
      enum: SORT_FIELDS,
      description: "排序字段;不传用 Everything 当前排序",
    },
    ascending: {
      type: "boolean",
      description: "是否升序(sort 一起用)",
    },
    matchCase: { type: "boolean", description: "区分大小写" },
    wholeWord: { type: "boolean", description: "全词匹配" },
    regex: { type: "boolean", description: "把 query 当正则表达式" },
  },
  required: ["query"],
  additionalProperties: false,
};

const SEARCH_DESCRIPTION =
  "用 Everything 查询本机文件索引(毫秒级,免扫描):按文件名、路径、扩展名、大小、修改时间等检索整机文件。"
  + "query 走 Everything 自己的搜索语法,插件不解析它;path/ext 只是拼进查询的便捷参数。"
  + "这个工具的每次调用都需要用户审批。";

const STATUS_PARAMETERS = {
  type: "object",
  properties: {
    probe: {
      type: "string",
      description: "可选:顺便用一个查询探一下索引是否可用(不传则只探接口连通性)",
    },
  },
  additionalProperties: false,
};

const STATUS_DESCRIPTION =
  "查看 dsh-tool-everything 的接口状态:Everything HTTP 接口是否可达、当前 host/port、可选探针查询的命中数。";

/** 把 path/ext 便捷参数拼成 Everything 查询语法。 */
export function composeQuery(args) {
  const parts = [];
  const query = typeof args?.query === "string" ? args.query.trim() : "";
  if (query) parts.push(query);
  const dir = typeof args?.path === "string" ? args.path.trim() : "";
  if (dir) {
    const normalized = dir.replace(/[\\/]+$/, "");
    parts.push(normalized.includes(" ") ? `path:"${normalized}"` : `path:${normalized}`);
  }
  const ext = typeof args?.ext === "string" ? args.ext.trim() : "";
  if (ext) {
    const list = ext.split(/[;,]/).map((item) => item.trim().replace(/^\./, "")).filter(Boolean);
    if (list.length === 1) parts.push(`ext:${list[0]}`);
    else if (list.length > 1) parts.push(`ext:${list.join(";")}`);
  }
  return parts.join(" ");
}

function apply(ctx, rawConfig = {}) {
  const config = normalizeOptions(rawConfig);

  // 每次调用都申请权限:pre-execute 是工具箱自己的执行点,
  // 这里只对自家工具返回 ask,其余工具交给下一个监听者。
  if (config.requireApproval) {
    const reason = config.approvalReason || DEFAULT_APPROVAL_REASON;
    ctx.effect(() => ctx.on("tools/pre-execute", async (exec, next) => {
      const toolName = exec && typeof exec.name === "string" ? exec.name : "";
      if (!OWNED_TOOLS.includes(toolName)) return next();
      return { kind: "ask", reason: `${reason}(${toolName})` };
    }), "dsh-tool-everything: per-call approval");
  }

  ctx.tools.register(toolDef(
    TOOL_SEARCH,
    SEARCH_DESCRIPTION,
    SEARCH_PARAMETERS,
    async function execute(args, exec) {
      try {
        if (!args || typeof args.query !== "string" || !args.query.trim()) {
          return "ERROR: query 参数必填";
        }
        const query = composeQuery(args);
        if (query.length > config.maxQueryLength) {
          return `ERROR: 查询过长(${query.length} > ${config.maxQueryLength})`;
        }
        const count = typeof args.maxResults === "number" && args.maxResults > 0
          ? Math.min(Math.trunc(args.maxResults), config.maxResults)
          : config.defaultResults;
        const outcome = await searchEverything({
          ...config,
          query,
          count,
          offset: typeof args.offset === "number" && args.offset > 0 ? Math.trunc(args.offset) : undefined,
          sort: typeof args.sort === "string" ? args.sort : undefined,
          ascending: typeof args.ascending === "boolean" ? args.ascending : undefined,
          matchCase: args.matchCase === true,
          wholeWord: args.wholeWord === true,
          regex: args.regex === true,
        }, { signal: exec && exec.signal ? exec.signal : undefined });
        return formatResults(query, outcome, config);
      } catch (error) {
        if (exec && exec.signal && exec.signal.aborted) return "查询已取消。";
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
    function presentCall(args) {
      const query = typeof args?.query === "string" ? args.query : "";
      return { card: "generic", title: "Everything: " + query, kind: "execute" };
    },
  ));

  ctx.tools.register(toolDef(
    TOOL_STATUS,
    STATUS_DESCRIPTION,
    STATUS_PARAMETERS,
    async function execute(args, exec) {
      try {
        const outcome = await probeEverything({
          ...config,
          probe: typeof args?.probe === "string" && args.probe.trim() ? args.probe.trim() : undefined,
        }, { signal: exec && exec.signal ? exec.signal : undefined });
        const lines = [
          `Everything HTTP 接口可达: http://${config.host}:${config.port}`,
          `每次调用需审批: ${config.requireApproval ? "是" : "否"}`,
          `结果上限: 默认 ${config.defaultResults} 条,最多 ${config.maxResults} 条;超时 ${config.timeoutMs}ms`,
        ];
        if (typeof args?.probe === "string" && args.probe.trim()) {
          lines.push(`探针「${args.probe.trim()}」命中 ${outcome.total} 条`);
        }
        return lines.join("\n");
      } catch (error) {
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
  ));
}

export { apply, inject, name, DEFAULTS };
