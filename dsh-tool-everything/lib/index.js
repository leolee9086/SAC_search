// lib/index.js — dsh-tool-everything 插件入口(host 侧)。
// 通过 Everything 自带的 HTTP 接口查询本机文件索引,提供 everything_search、everything_workspace_search
// 与 everything_status。
//
// 审批:Everything 的索引包含整机所有文件名/路径(HTTP 接口默认还允许下载文件),
// 因此整机检索(everything_search)的每个工具调用都要过 DSH 的审批。落点是 tools/pre-execute
// 这个 waterfall:它由工具箱自己在执行前调用,返回 { kind: "ask" } 后由 DSH 的 approval 服务
// 走审批、写 approval/asked + approval/decided 审计事件,并把结果映射成放行或拒绝。
// 审批不可用时按 DSH 的约定 fail closed(拒绝),插件不自己放行。
//
// 工作区检索(everything_workspace_search)的范围由插件自己拼在工作区根上,不可能返回工作区内的
// 文件之外的条目,所以默认直接放行——免审批的依据是工具身份加插件自己拼的范围,不是调用方给的参数。
// 只有解析不到工作区根时它才申请审批(fail closed)。
import {
  DEFAULTS,
  SORT_FIELDS,
  composeExtClause,
  composeWorkspaceQuery,
  formatResults,
  normalizeOptions,
  probeEverything,
  searchEverything,
} from "./everything.js";

const name = "dsh-tool-everything";
const inject = ["tools"];

const TOOL_SEARCH = "everything_search";
const TOOL_WORKSPACE_SEARCH = "everything_workspace_search";
const TOOL_STATUS = "everything_status";
const OWNED_TOOLS = [TOOL_SEARCH, TOOL_WORKSPACE_SEARCH, TOOL_STATUS];
const WORKSPACE_TOOLS = [TOOL_WORKSPACE_SEARCH];

const DEFAULT_APPROVAL_REASON = "读取 Everything 的整机文件名索引";
const WORKSPACE_APPROVAL_REASON = "解析不到本会话的工作区根,无法确认范围留在工作区内";

/**
 * 把这次调用的关键参数摘成审批理由的一部分——审批的人得先看见"搜什么"再决定。
 * @param toolName - 工具名。
 * @param args - exec.arguments(已解析的调用参数)。
 * @returns 形如 `query="效果图" path="D:\工作" ext=psd maxResults=20` 的摘要。
 */
export function describeCall(toolName, args) {
  const input = args && typeof args === "object" ? args : {};
  const parts = [];
  for (const key of ["query", "path", "subpath", "ext", "probe"]) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) parts.push(`${key}=${JSON.stringify(value)}`);
  }
  for (const key of ["maxResults", "offset"]) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value)) parts.push(`${key}=${value}`);
  }
  if (typeof input.sort === "string" && input.sort) parts.push(`sort=${input.sort}`);
  for (const flag of ["ascending", "regex", "matchCase", "wholeWord"]) {
    if (input[flag] === true) parts.push(flag);
  }
  return parts.length > 0 ? parts.join(" ") : "无参数";
}

/** 完全权限档:DSH 声明为无需审批,工具直接调用才是正常行为。 */
const FULL_ACCESS_MODE = "danger-full-access";

/** 取会话相关的解析入参:有会话就带上,没有就按部署默认解析。 */
function policyRequest(exec) {
  const session = exec && exec.agent ? exec.agent.session : undefined;
  return session ? { session } : {};
}

/**
 * 读会话当前生效的文件权限(显式覆盖 > 会话 sandbox/mode 事件 > 部署默认)。
 * 读不到(部署里没挂 sandboxPolicy)时返回 undefined,调用方按"非完全权限"处理。
 */
export function currentSandboxMode(ctx, exec) {
  const policy = typeof ctx.get === "function" ? ctx.get("sandboxPolicy") : undefined;
  if (!policy || typeof policy.resolve !== "function") return undefined;
  try {
    return policy.resolve(policyRequest(exec)).mode;
  } catch {
    return undefined;
  }
}

/**
 * 读会话当前生效的工作区根。与会话文件权限同源(同一个 sandboxPolicy.resolve),
 * 插件不自己猜 cwd;读不到时返回 undefined,由调用方 fail closed。
 */
export function currentWorkspaceRoot(ctx, exec) {
  const policy = typeof ctx.get === "function" ? ctx.get("sandboxPolicy") : undefined;
  if (!policy || typeof policy.resolve !== "function") return undefined;
  try {
    const resolved = policy.resolve(policyRequest(exec));
    const root = resolved && typeof resolved.workspaceRoot === "string" ? resolved.workspaceRoot.trim() : "";
    return root || undefined;
  } catch {
    return undefined;
  }
}

/**
 * 决定这次调用要不要审批。
 * 默认 auto:完全权限直接放行,其余权限档要审批;读不到权限时按需要审批处理(fail closed)。
 * @returns {{ask: boolean, mode: string|undefined}} ask 为 false 表示不必问。
 */
export function decideApproval(ctx, exec, config) {
  const mode = currentSandboxMode(ctx, exec);
  if (config.approvalMode === "never") return { ask: false, mode };
  if (config.approvalMode === "always") return { ask: true, mode };
  return { ask: mode !== FULL_ACCESS_MODE, mode };
}

/**
 * 工作区检索的审批档。范围由插件钉在工作区内,默认直接放行;
 * 只有解析不到工作区根时才申请审批(此时无法确认范围留在工作区内);
 * approvalMode=always 仍然一律申请。
 * @returns {{ask: boolean, mode: string|undefined, workspaceRoot: string|undefined}}
 */
export function decideWorkspaceApproval(ctx, exec, config) {
  const mode = currentSandboxMode(ctx, exec);
  const workspaceRoot = currentWorkspaceRoot(ctx, exec);
  if (config.approvalMode === "always") return { ask: true, mode, workspaceRoot };
  return { ask: workspaceRoot === undefined, mode, workspaceRoot };
}

/** 审批理由统一截断,不把弹窗撑爆。 */
function trimReason(reason) {
  return reason.length > 400 ? `${reason.slice(0, 400)}…` : reason;
}

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

const PARAM_QUERY = {
  type: "string",
  description: "Everything 搜索语法(必填)。实测 1.4 的 HTTP 接口支持 ext:/path:/folder:/size:/dm:/file: 等函数,"
    + "例如 'ext:psd 效果图'、'path:\"D:\\工作\\\" 报价'、'size:>1mb dm:today'。"
    + "注意 name: 函数经 HTTP 接口无效(返回 0),要按文件名找就直接写文件名。",
};

const PARAM_PATH = {
  type: "string",
  description: "可选,把搜索限定在这个目录里。会作为 path:\"…\\\" 追加到查询上,并自动补尾部分隔符,"
    + "所以 D:\\dev 不会连带匹配 D:\\dev2 这类同前缀目录(Everything 1.4 的 HTTP 接口本身没有目录过滤参数)。",
};

const PARAM_SUBPATH = {
  type: "string",
  description: "可选,工作区内的相对子目录(如 src\\lib);省略就搜整个工作区。"
    + "绝对路径、UNC、.. 与引号一律拒绝——它们会把范围带出工作区。",
};

const PARAM_EXT = {
  type: "string",
  description: "可选,扩展名过滤,不带点(如 psd;多个用分号,如 psd;png)。会作为 ext: 追加到查询上。",
};

const PARAM_MAX_RESULTS = {
  type: "number",
  description: "返回条数上限(默认 50,受插件 config.maxResults 限制)",
};

const PARAM_OFFSET = {
  type: "number",
  description: "跳过前 N 条(翻页用)",
};

const PARAM_SORT = {
  type: "string",
  enum: SORT_FIELDS,
  description: "排序字段;不传用 Everything 当前排序",
};

const PARAM_ASCENDING = { type: "boolean", description: "是否升序(sort 一起用)" };
const PARAM_MATCH_CASE = { type: "boolean", description: "区分大小写" };
const PARAM_WHOLE_WORD = { type: "boolean", description: "全词匹配" };
const PARAM_REGEX = { type: "boolean", description: "把 query 当正则表达式" };

const SEARCH_PARAMETERS = {
  type: "object",
  properties: {
    query: PARAM_QUERY,
    path: PARAM_PATH,
    ext: PARAM_EXT,
    maxResults: PARAM_MAX_RESULTS,
    offset: PARAM_OFFSET,
    sort: PARAM_SORT,
    ascending: PARAM_ASCENDING,
    matchCase: PARAM_MATCH_CASE,
    wholeWord: PARAM_WHOLE_WORD,
    regex: PARAM_REGEX,
  },
  required: ["query"],
  additionalProperties: false,
};

const WORKSPACE_SEARCH_PARAMETERS = {
  type: "object",
  properties: {
    query: PARAM_QUERY,
    subpath: PARAM_SUBPATH,
    ext: PARAM_EXT,
    maxResults: PARAM_MAX_RESULTS,
    offset: PARAM_OFFSET,
    sort: PARAM_SORT,
    ascending: PARAM_ASCENDING,
    matchCase: PARAM_MATCH_CASE,
    wholeWord: PARAM_WHOLE_WORD,
    regex: PARAM_REGEX,
  },
  required: ["query"],
  additionalProperties: false,
};

const SEARCH_DESCRIPTION =
  "用 Everything 查询本机文件索引(毫秒级,免扫描):按文件名、路径、扩展名、大小、修改时间等检索整机文件。"
  + "query 走 Everything 自己的搜索语法,插件不解析它;path/ext 只是拼进查询的便捷参数。"
  + "索引含整机文件名,因此在工作区/只读权限下每次调用都需要用户审批,完全文件权限下直接调用。"
  + "只想搜当前工作区就用 everything_workspace_search,那个不需要审批。";

const WORKSPACE_SEARCH_DESCRIPTION =
  "在当前会话的工作区内用 Everything 检索(毫秒级,免扫描):范围由插件钉死在本会话的工作区根上,"
  + "只会返回工作区内的条目,默认不需要审批。query 走 Everything 自己的搜索语法,但不接受 |"
  + "(Everything 的 OR,会把范围带出工作区);subpath 是在工作区内再往下限定的相对子目录,ext 是扩展名便捷参数。"
  + "要检索工作区以外的整机文件,用 everything_search(每次调用都要审批)。";

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
    // path: 是"整条路径里含这段文本"的匹配,不补尾部分隔符会把同前缀的兄弟目录一起带进来
    // (实测 path:"C:\Program Files" 317684 条,补成 path:"C:\Program Files\" 后 283886 条)。
    const scoped = /[\\/]$/.test(dir) ? dir : `${dir}\\`;
    parts.push(`path:"${scoped}"`);
  }
  const ext = composeExtClause(args?.ext);
  if (ext) parts.push(ext);
  return parts.join(" ");
}

/** 把入参映射成 searchEverything 的选项;两个检索工具共用。 */
function searchOptions(args, config, query) {
  return {
    ...config,
    query,
    count: typeof args.maxResults === "number" && args.maxResults > 0
      ? Math.min(Math.trunc(args.maxResults), config.maxResults)
      : config.defaultResults,
    offset: typeof args.offset === "number" && args.offset > 0 ? Math.trunc(args.offset) : undefined,
    sort: typeof args.sort === "string" ? args.sort : undefined,
    ascending: typeof args.ascending === "boolean" ? args.ascending : undefined,
    matchCase: args.matchCase === true,
    wholeWord: args.wholeWord === true,
    regex: args.regex === true,
  };
}

function apply(ctx, rawConfig = {}) {
  const config = normalizeOptions(rawConfig);

  // 审批按工具分流:整机检索跟会话权限档走,工作区检索解析得到工作区根就放行。
  // ctx.on() 本身就把监听器挂在本插件 fiber 上(卸载自动摘除),不需要再包一层 ctx.effect。
  if (config.approvalMode !== "never") {
    const baseReason = config.approvalReason || DEFAULT_APPROVAL_REASON;
    ctx.on("tools/pre-execute", async (exec, next) => {
      const toolName = exec && typeof exec.name === "string" ? exec.name : "";
      if (!OWNED_TOOLS.includes(toolName)) return next();
      const workspaceTool = WORKSPACE_TOOLS.includes(toolName);
      const decision = workspaceTool
        ? decideWorkspaceApproval(ctx, exec, config)
        : decideApproval(ctx, exec, config);
      if (!decision.ask) return next();
      const where = decision.mode ? `当前文件权限 ${decision.mode}` : "当前文件权限未知";
      // 工作区检索只在解析不到工作区根时才问,理由是"确认不了范围";approvalMode=always 时仍用通用理由。
      const why = workspaceTool && decision.workspaceRoot === undefined ? WORKSPACE_APPROVAL_REASON : baseReason;
      // 关键词在前:审批的人先看到搜什么,再看通用说明与权限档。
      return { kind: "ask", reason: trimReason(`${toolName} ${describeCall(toolName, exec.arguments)} · ${why} · ${where}`) };
    });
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
        const outcome = await searchEverything(searchOptions(args, config, query), {
          signal: exec && exec.signal ? exec.signal : undefined,
        });
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
    TOOL_WORKSPACE_SEARCH,
    WORKSPACE_SEARCH_DESCRIPTION,
    WORKSPACE_SEARCH_PARAMETERS,
    async function execute(args, exec) {
      try {
        if (!args || typeof args.query !== "string" || !args.query.trim()) {
          return "ERROR: query 参数必填";
        }
        const composed = composeWorkspaceQuery(args, currentWorkspaceRoot(ctx, exec));
        if (composed.error) return "ERROR: " + composed.error;
        if (composed.query.length > config.maxQueryLength) {
          return `ERROR: 查询过长(${composed.query.length} > ${config.maxQueryLength})`;
        }
        const outcome = await searchEverything(searchOptions(args, config, composed.query), {
          signal: exec && exec.signal ? exec.signal : undefined,
        });
        return formatResults(composed.query, outcome, config);
      } catch (error) {
        if (exec && exec.signal && exec.signal.aborted) return "查询已取消。";
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
    function presentCall(args) {
      const query = typeof args?.query === "string" ? args.query : "";
      return { card: "generic", title: "工作区内: " + query, kind: "execute" };
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
        const workspaceRoot = currentWorkspaceRoot(ctx, exec);
        const lines = [
          `Everything HTTP 接口可达: http://${config.host}:${config.port}`,
          `审批档位: ${config.approvalMode}${config.approvalMode === "auto" ? "(整机检索:完全权限直接调用,工作区/只读权限需审批;工作区检索:解析得到工作区根就直接调用)" : ""}`,
          `本会话生效的文件权限: ${currentSandboxMode(ctx, exec) ?? "未知"}`,
          workspaceRoot
            ? `工作区检索: 免审批,范围钉在 path:"${workspaceRoot}\\"`
            : "工作区检索: 解析不到本会话的工作区根,会按需审批",
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
