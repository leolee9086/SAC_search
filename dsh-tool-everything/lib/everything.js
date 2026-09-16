// lib/everything.js — Everything HTTP 接口的客户端与结果映射。
// 这一层是纯函数 + 一次 fetch,不碰 ctx,便于用假 fetch 直接测。
//
// 接口事实(在 Everything 1.4.1.1032 上实测):
//   GET http://host:port/?search=<查询>&json=1&count=N&offset=M
//       &path_column=1&size_column=1&date_modified_column=1
//       &sort=<字段>&ascending=0|1&case=1&wholeword=1&regex=1
//   返回 {"totalResults":N,"results":[{"type","name","path","size","date_modified"}]}
//   - path/size/date_modified 只在显式请求对应 *_column=1 时才出现;
//   - size 是字符串字节数;
//   - date_modified 是 Windows FILETIME(1601 起的 100ns 数),不是 Unix 时间戳;
//   - date_created/date_accessed 只有在 Everything 里勾了"索引创建时间/访问时间"才会返回,
//     默认配置下请求了也拿不到,所以这里不请求它们;
//   - 查询串走 Everything 自己的搜索语法(name:/path:/ext:/size:/dm: 等),插件不解析它。

/** 默认配置;全部可被 cordis.patch.yml 的 config 覆盖。 */
export const DEFAULTS = {
  host: "127.0.0.1",
  port: 8080,
  timeoutMs: 15000,
  defaultResults: 50,
  maxResults: 500,
  maxQueryLength: 4096,
  approvalMode: "auto",
  approvalReason: "",
};

/**
 * 审批档位:
 *   auto   跟着会话的文件权限走——完全权限(danger-full-access)直接调用,
 *          read-only / workspace-write 需要审批。这是默认。
 *   always 每次调用都要审批。
 *   never  从不审批(不推荐:Everything 索引包含整机文件名)。
 *
 * 工作区检索(everything_workspace_search)不受 auto 的这条分支影响:它的范围
 * 由插件钉在工作区内,默认直接放行,只有解析不到工作区根时才申请审批。
 */
export const APPROVAL_MODES = ["auto", "always", "never"];

/** Everything 允许的排序字段(HTTP 接口的 sort 参数)。 */
export const SORT_FIELDS = [
  "name",
  "path",
  "size",
  "extension",
  "type",
  "date_modified",
  "date_created",
  "date_accessed",
  "run_count",
];

const FILETIME_EPOCH_OFFSET_MS = 11644473600000;

/** 把原始配置收敛成一份带默认值的配置。 */
export function normalizeOptions(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const number = (value, fallback, min, max) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(Math.trunc(n), min), max);
  };
  const maxResults = number(source.maxResults, DEFAULTS.maxResults, 1, 100000);
  return {
    host: typeof source.host === "string" && source.host.trim() ? source.host.trim() : DEFAULTS.host,
    port: number(source.port, DEFAULTS.port, 1, 65535),
    timeoutMs: number(source.timeoutMs, DEFAULTS.timeoutMs, 100, 600000),
    defaultResults: number(source.defaultResults, DEFAULTS.defaultResults, 1, maxResults),
    maxResults,
    maxQueryLength: number(source.maxQueryLength, DEFAULTS.maxQueryLength, 16, 65536),
    approvalMode: APPROVAL_MODES.includes(source.approvalMode) ? source.approvalMode : DEFAULTS.approvalMode,
    approvalReason: typeof source.approvalReason === "string" ? source.approvalReason : "",
  };
}

/**
 * Windows FILETIME(1601-01-01 起的 100 纳秒数)转 Unix 毫秒。
 * @param value - Everything 返回的 date_modified(字符串或数字)。
 * @returns Unix 毫秒;无法解析时返回 undefined。
 */
export function fileTimeToUnixMs(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const ticks = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(ticks) || ticks <= 0) return undefined;
  return Math.floor(ticks / 10000) - FILETIME_EPOCH_OFFSET_MS;
}

/** Unix 毫秒转本地时间 "YYYY-MM-DD HH:mm"。 */
export function formatLocalTime(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 人类可读的字节数。 */
export function formatSize(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

/** 把 Everything 的一条结果映射成插件自己的形状。 */
export function mapResult(item) {
  const record = item && typeof item === "object" ? item : {};
  const dir = typeof record.path === "string" ? record.path.replace(/\\/g, "/").replace(/\/+$/, "") : "";
  const name = typeof record.name === "string" ? record.name : "";
  const isFolder = record.type === "folder";
  const sizeValue = record.size === undefined ? undefined : Number(record.size);
  return {
    type: isFolder ? "folder" : "file",
    name,
    dir,
    path: dir ? `${dir}/${name}` : name,
    size: Number.isFinite(sizeValue) ? sizeValue : undefined,
    modifiedMs: fileTimeToUnixMs(record.date_modified),
  };
}

/**
 * 拼查询 URL。Everything 1.4 的 HTTP 接口不认 path/size/date 过滤参数,
 * 目录与扩展名过滤要靠查询语法(path:"..."、ext:...),由调用方拼进 query。
 */
export function formatSearchUrl(options) {
  const config = normalizeOptions(options);
  const params = new URLSearchParams();
  params.set("search", String(options.query ?? ""));
  params.set("json", "1");
  params.set("count", String(options.count ?? config.defaultResults));
  params.set("path_column", "1");
  params.set("size_column", "1");
  params.set("date_modified_column", "1");
  if (options.offset) params.set("offset", String(options.offset));
  if (options.sort) params.set("sort", String(options.sort));
  if (options.ascending !== undefined) params.set("ascending", options.ascending ? "1" : "0");
  if (options.matchCase) params.set("case", "1");
  if (options.wholeWord) params.set("wholeword", "1");
  if (options.regex) params.set("regex", "1");
  return `http://${config.host}:${config.port}/?${params.toString()}`;
}

/** 调用 Everything HTTP 接口。失败一律抛带人话的 Error。 */
export async function requestEverything(options, { signal, fetchImpl } = {}) {
  const config = normalizeOptions(options);
  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== "function") throw new Error("当前 Node 没有 fetch,无法访问 Everything HTTP 接口");
  const signals = [];
  if (signal) signals.push(signal);
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    signals.push(AbortSignal.timeout(config.timeoutMs));
  }
  const combined = signals.length > 0 && typeof AbortSignal.any === "function" ? AbortSignal.any(signals) : signals[0];
  let response;
  try {
    response = await doFetch(formatSearchUrl(options), combined ? { signal: combined } : {});
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error(`访问 Everything HTTP 接口超时(${config.timeoutMs}ms)`);
    }
    throw new Error(everythingUnreachableMessage(config, error));
  }
  if (!response || !response.ok) {
    throw new Error(`Everything HTTP 接口返回 ${response ? response.status : "无响应"};确认 http_server_enabled=1 且端口是 ${config.port}`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error("Everything HTTP 接口返回的不是 JSON;确认请求带了 json=1");
  }
}

/** 连接失败时给出可操作的提示。 */
export function everythingUnreachableMessage(config, error) {
  const detail = error && error.message ? error.message : String(error);
  return `连不上 Everything HTTP 接口 http://${config.host}:${config.port}(${detail})。`
    + "请在 Everything 的 工具→选项→HTTP 服务器 里启用服务,并让 http_server_bindings=127.0.0.1、http_server_port 与插件 config.port 一致。";
}

/** 搜索并返回归一化结果。 */
export async function searchEverything(options, runtime = {}) {
  const config = normalizeOptions(options);
  const payload = await requestEverything(options, runtime);
  const rawResults = payload && Array.isArray(payload.results) ? payload.results : [];
  return {
    total: Number.isFinite(Number(payload?.totalResults)) ? Number(payload.totalResults) : rawResults.length,
    results: rawResults.map(mapResult),
  };
}

/** 把查询结果排成给模型看的文本。 */
export function formatResults(query, outcome, options = {}) {
  const config = normalizeOptions(options);
  const results = Array.isArray(outcome.results) ? outcome.results : [];
  if (results.length === 0) {
    return `Everything 查询「${query}」没有匹配项(共 0 条)。`;
  }
  const lines = [`Everything 查询「${query}」共 ${outcome.total} 条匹配,显示 ${results.length} 条:`];
  results.forEach((item, index) => {
    const marks = [item.type === "folder" ? "目录" : "文件"];
    if (item.size !== undefined) marks.push(formatSize(item.size));
    const time = formatLocalTime(item.modifiedMs);
    if (time) marks.push(time);
    lines.push(`${index + 1}. ${item.path}  [${marks.join(", ")}]`);
  });
  if (outcome.total > results.length) {
    lines.push(`(还有 ${outcome.total - results.length} 条未显示;用 offset 翻页或收紧查询)`);
  }
  return lines.join("\n");
}

/** 探活:只关心接口是否可达、以及可选探针查询的命中数。 */
export async function probeEverything(options, runtime = {}) {
  const payload = await requestEverything({ ...options, query: options.probe ?? "", count: 1 }, runtime);
  return {
    reachable: true,
    total: Number.isFinite(Number(payload?.totalResults)) ? Number(payload.totalResults) : 0,
  };
}

/** 把 ext 便捷参数拼成 Everything 的 ext: 子句(多个用 `;` 分隔);没有就返回空串。 */
export function composeExtClause(ext) {
  const value = typeof ext === "string" ? ext.trim() : "";
  if (!value) return "";
  const list = value.split(/[;,]/).map((item) => item.trim().replace(/^\./, "")).filter(Boolean);
  return list.length > 0 ? `ext:${list.join(";")}` : "";
}

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

/**
 * 把调用方给的相对子目录收敛成安全的相对片段。
 * 三种写法一律拒绝,因为它们都能把范围带出工作区:
 *   - 绝对路径(盘符、UNC、前导分隔符)等于换一个根;
 *   - 任何 `..` 段等于向上跳;
 *   - 引号与换行能提前闭合 path:"…",再拼一条指向别处的 path:。
 * 工作区检索免审批的前提就是范围确实留在工作区内,所以这一层必须收紧。
 */
export function confineSubpath(value) {
  if (value === undefined || value === null) return { value: "" };
  if (typeof value !== "string") return { error: "subpath 必须是字符串" };
  const raw = value.trim();
  if (!raw) return { value: "" };
  const unified = raw.replace(/\//g, "\\");
  if (/^[a-zA-Z]:/.test(unified) || unified.startsWith("\\\\")) {
    return { error: "subpath 必须是工作区内的相对路径,不能是绝对路径或 UNC 路径" };
  }
  const segments = [];
  for (const segment of unified.split("\\")) {
    const item = segment.trim();
    if (!item || item === ".") continue;
    if (item === "..") return { error: "subpath 不能包含 .." };
    if (/["\r\n]/.test(item)) return { error: "subpath 不能包含引号或换行" };
    segments.push(item);
  }
  return { value: segments.join("\\") };
}

/** Everything 的 OR 运算符:工作区检索里出现它就等于放弃范围限定。 */
const OR_OPERATOR = "|";

/**
 * 拼工作区检索的查询串。范围由插件自己钉上去(工作区根 + 相对子目录),
 * 调用方给的 query 只当搜索条件,不参与限定范围。
 * @param args - 工具入参(query/subpath/ext)。
 * @param workspaceRoot - 本会话的工作区根;解析不到时直接报错,不做退让。
 * @returns {{query: string}|{error: string}}
 */
export function composeWorkspaceQuery(args, workspaceRoot) {
  const root = (typeof workspaceRoot === "string" ? workspaceRoot.trim() : "")
    .replace(/\//g, "\\")
    .replace(/\\+$/, "");
  if (!root) return { error: "解析不到本会话的工作区根目录,无法把范围限定在工作区内" };
  const query = typeof args?.query === "string" ? args.query.trim() : "";
  if (query.includes(OR_OPERATOR)) {
    return { error: `工作区检索不接受 ${OR_OPERATOR}(Everything 的 OR),它会把范围带出工作区` };
  }
  const subpath = confineSubpath(args?.subpath);
  if (subpath.error) return { error: subpath.error };
  const parts = [];
  if (query) parts.push(query);
  parts.push(`path:"${subpath.value ? `${root}\\${subpath.value}` : root}\\"`);
  const ext = composeExtClause(args?.ext);
  if (ext) parts.push(ext);
  return { query: parts.join(" ") };
}
