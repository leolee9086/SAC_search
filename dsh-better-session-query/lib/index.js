// lib/index.js — dsh-better-session-query 插件入口(host 侧,并行索引)。
//
// 定位:官方 @deepseek-ai/dsh-session-query-sqlite 之下再挂一套**块级**索引。
//   - 不替换 provider:官方 sessionQuery 服务照旧由原插件提供,本插件只是它的消费者;
//   - 不改任何 DSH 源码:只通过运行时服务契约(ctx.sessionQuery)读会话,自己存自己的库;
//   - 粒度下沉:官方一条事件一条文档,这里一条事件拆成 N 个块,块是索引行。
//
// 对外三样东西:
//   ctx.sessionBlockQuery   本插件提供的服务(searchBlocks/listBlocks/getBlock/reconcile/stats/close)
//   session_blocks_search   模型工具:块级全文检索
//   session_blocks_list     模型工具:列出一个会话索引过的每一个块(含无文本块)
//   session_blocks_read     模型工具:读某个事件的块原文(不依赖索引,走官方 readEvent)
//   session_blocks_status   模型工具:索引状态;可顺手触发一轮索引更新
//   session_blocks_remember 模型工具(**伪工具**):把一条问答对写进会话流。
//                           它没有任何副作用——不写库、不落盘。记忆的"存储"就是这次调用本身:
//                           tool-call 块的参数会被本索引收进倒排(tool-call 进倒排、tool-result 不进),
//                           所以参数里有什么,以后就搜得到什么。见下方 REMEMBER_* 常量处的长注释。
//
// 存储:node:sqlite + FTS5(倒排) + block_meta(过滤),见 lib/store.js。

import os from "node:os";
import path from "node:path";

import { DEFAULT_INCLUDE, extractBlocks } from "./blocks.js";
import { createIndexer, INDEXER_DEFAULTS } from "./indexer.js";
import { createIndexRunner } from "./runner.js";
import { buildMonitorPayload, fileBytes, installMonitor } from "./monitor.js";
import { createFileLog } from "./logfile.js";
import { openStore } from "./store.js";
import { openMemoryStore } from "./memory.js";
import { NOTICE_RULES, NOTICE_RULES_SERVICE } from "./notice-rules.js";
import { createPassiveRecallSource, PASSIVE_RECALL_DEFAULTS, RECALL_SOURCE_NAME } from "./passive-recall.js";

const name = "dsh-better-session-query";
const inject = ["sessionQuery", "tools"];

/** 本插件注册的服务名。刻意不复用 sessionQuery,避免与官方 provider 抢注册。 */
const SERVICE_NAME = "sessionBlockQuery";

/** 默认配置;全部可被 cordis.patch.yml 的 config 覆盖。 */
export const DEFAULTS = {
  path: "",
  journalMode: "wal",
  include: { ...DEFAULT_INCLUDE },
  ...INDEXER_DEFAULTS,
  reconcileOnSearch: "background",
  backgroundReconcileMs: 30000,
  yieldEverySessions: 1,
  // 变更令牌与清单缓存:索引更新的"少读日志"两个开关。
  useTokens: true,
  logFile: "",
  logMaxBytes: 2097152,
  monitor: { enabled: true, path: "/session-blocks" },
  defaultLimit: 20,
  maxLimit: 100,
  snippetTokens: 24,
  // 记忆库(伪工具 session_blocks_remember 的召回面)。独立文件,理由见 resolveMemoryPath。
  memoryPath: "",
  // 记忆的新鲜期:超过它的记忆在召回时降级成"只在数量不够时补齐"。暂定 2 小时。
  memoryTtlMs: 7200000,
};

/** 索引库默认落在 DSH_HOME 下,拿不到就退到用户主目录下的 .dsh。 */
function dshHome() {
  return typeof process.env.DSH_HOME === "string" && process.env.DSH_HOME.trim()
    ? process.env.DSH_HOME.trim()
    : path.join(os.homedir(), ".dsh");
}

/** 索引库默认落在 DSH_HOME 下,拿不到就退到用户主目录下的 .dsh。 */
export function resolveDbPath(configured) {
  if (typeof configured === "string" && configured.trim()) return configured.trim();
  return path.join(dshHome(), "session-blocks.db");
}

/**
 * 记忆库的位置。刻意与块索引库**分开一个文件**:块索引是随时可重建的全量派生数据,
 * 记忆是稀疏的、要按关键词召回的小库。同库会让记忆查询被十几万块的倒排拖着走,
 * 也会让每次动块索引的 schema 都要连带迁移记忆。
 */
export function resolveMemoryPath(configured) {
  if (typeof configured === "string" && configured.trim()) return configured.trim();
  return path.join(dshHome(), "session-memory.db");
}

/**
 * 诊断日志的位置。默认 `<DSH_HOME>/logs/session-blocks.log`——
 * stdout 在这个部署里不落地,失败原因这类"事后才要翻"的诊断必须落盘;显式给 "off" 关闭。
 * @param configured - 配置里的 logFile。
 * @returns 日志文件路径;空串表示关闭。
 */
export function resolveLogFile(configured) {
  const value = typeof configured === "string" ? configured.trim() : "";
  if (value === "off") return "";
  if (value !== "") return value;
  return path.join(dshHome(), "logs", "session-blocks.log");
}

/** 把配置里的路径数组收敛成非空字符串数组(匹配时大小写与尾部分隔符都不敏感)。 */
function pathList(value) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === "string" && item.trim() !== "")
    .map((item) => item.trim());
}

/** 把原始配置收敛成带默认值的配置。 */
export function normalizeOptions(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const number = (value, fallback, min, max) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(Math.max(Math.trunc(n), min), max);
  };
  const maxLimit = number(source.maxLimit, DEFAULTS.maxLimit, 1, 1000);
  return {
    path: resolveDbPath(source.path),
    journalMode: ["wal", "delete", "truncate", "persist"].includes(source.journalMode) ? source.journalMode : DEFAULTS.journalMode,
    include: { ...DEFAULT_INCLUDE, ...(source.include && typeof source.include === "object" ? source.include : {}) },
    recheckMs: number(source.recheckMs, DEFAULTS.recheckMs, 0, 86400000),
    maxSessionsPerReconcile: number(source.maxSessionsPerReconcile, DEFAULTS.maxSessionsPerReconcile, 1, 100000),
    failureCooldownMs: number(source.failureCooldownMs, DEFAULTS.failureCooldownMs, 0, 86400000),
    includeCold: source.includeCold !== false,
    includeWorkspaces: pathList(source.includeWorkspaces),
    excludeWorkspaces: pathList(source.excludeWorkspaces),
    includeWithoutWorkspace: source.includeWithoutWorkspace !== false,
    // 归档会话默认不收(归档 = 先搁一边);想连归档一起搜就设 true。
    includeArchived: source.includeArchived === true,
    // 三态的回退必须与 DEFAULTS 同源:否则改默认值不生效(这个坑真踩过)。
    reconcileOnSearch: source.reconcileOnSearch === false || source.reconcileOnSearch === "off"
      ? "off"
      : source.reconcileOnSearch === "await" ? "await"
        : source.reconcileOnSearch === "background" ? "background"
          : DEFAULTS.reconcileOnSearch,
    backgroundReconcileMs: number(source.backgroundReconcileMs, DEFAULTS.backgroundReconcileMs, 0, 3600000),
    yieldEverySessions: number(source.yieldEverySessions, DEFAULTS.yieldEverySessions, 0, 1000),
    logFile: resolveLogFile(source.logFile),
    logMaxBytes: number(source.logMaxBytes, DEFAULTS.logMaxBytes, 65536, 67108864),
    // 便宜令牌开关:默认开——有 sessionPersistence 时用它,没有就自动退回指纹比对。
    useTokens: source.useTokens !== false,
    listingTtlMs: number(source.listingTtlMs, DEFAULTS.listingTtlMs, 0, 600000),
    monitor: {
      enabled: source.monitor !== false && source.monitor?.enabled !== false,
      path: typeof source.monitor?.path === "string" && source.monitor.path.trim() !== ""
        ? source.monitor.path.trim()
        : DEFAULTS.monitor.path,
    },
    defaultLimit: number(source.defaultLimit, DEFAULTS.defaultLimit, 1, maxLimit),
    maxLimit,
    snippetTokens: number(source.snippetTokens, DEFAULTS.snippetTokens, 1, 200),
    memoryPath: resolveMemoryPath(source.memoryPath),
    memoryTtlMs: number(source.memoryTtlMs, DEFAULTS.memoryTtlMs, 0, 86400000),
  };
}

/** 本地时间 "YYYY-MM-DD HH:mm"。 */
function formatTime(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 命中列表排成给模型看的文本。 */
export function formatHits(query, outcome, titles = new Map()) {
  if (outcome.items.length === 0) return `块检索「${query}」没有命中(索引里没有匹配的块)。`;
  const lines = [`块检索「${query}」命中 ${outcome.items.length} 条${outcome.hasMore ? "(还有更多,用 offset 翻页)" : ""}:`];
  outcome.items.forEach((item, index) => {
    const title = titles.get(item.sessionId);
    const marks = [item.blockType, `seq=${item.seq}`, `path=${item.path}`, item.surface];
    const time = formatTime(item.time);
    if (time) marks.push(time);
    lines.push(`${index + 1}. ${item.sessionId}${title ? `「${title}」` : ""}  [${marks.filter(Boolean).join(", ")}]`);
    lines.push(`   ${item.snippet.replaceAll("\n", " ")}`);
  });
  return lines.join("\n");
}

/** 块列表(含无文本块)排成文本。 */
export function formatBlocks(sessionId, outcome) {
  if (outcome.items.length === 0) return `会话 ${sessionId} 的索引里没有块。`;
  const lines = [`会话 ${sessionId} 的块(${outcome.items.length} 个${outcome.hasMore ? ",还有更多" : ""}):`];
  for (const item of outcome.items) {
    const marks = [item.blockType, `path=${item.path}`, item.surface, `${item.length} 字`];
    if (!item.searchable) marks.push("不入倒排");
    lines.push(`- seq=${item.seq} ${item.blockId}  [${marks.filter(Boolean).join(", ")}]`);
  }
  return lines.join("\n");
}

/** 把 ISO 时间串或毫秒数统一成 epoch 毫秒;认不出来就返回 undefined。 */
export function toEpochMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Date.parse(value.trim());
    if (!Number.isNaN(parsed)) return parsed;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.trunc(numeric);
  }
  return undefined;
}

/** 消息(事件级聚合)列表排成文本。 */
export function formatMessages(outcome, titles = new Map()) {
  if (outcome.items.length === 0) return "没有符合条件的事件。";
  const lines = [`命中 ${outcome.items.length} 条事件${outcome.hasMore ? "(还有更多,用 offset 翻页)" : ""}:`];
  outcome.items.forEach((item, index) => {
    const title = titles.get(item.sessionId);
    const marks = [item.eventType, `seq=${item.seq}`, `${item.blocks} 块`, `${item.totalLength} 字`, item.surface];
    const time = formatTime(item.time);
    if (time) marks.push(time);
    lines.push(`${index + 1}. ${item.sessionId}${title ? `「${title}」` : ""}  [${marks.filter(Boolean).join(", ")}]`);
  });
  return lines.join("\n");
}

/** 工作区清单排成文本。 */
export function formatWorkspaces(outcome) {
  if (outcome.items.length === 0) return "索引里还没有任何工作区(还没索引过会话)。";
  const lines = [`索引覆盖 ${outcome.items.length} 个工作区:`];
  for (const item of outcome.items) {
    const marks = [`${item.sessions} 个会话`, `${item.blocks} 块`];
    const time = formatTime(item.lastTime);
    if (time) marks.push(`最近 ${time}`);
    lines.push(`- ${item.cwd ?? "(无 cwd)"}  [${marks.join(", ")}]`);
  }
  return lines.join("\n");
}

/** 会话清单排成文本。 */
export function formatSessions(outcome, titles = new Map()) {
  if (outcome.items.length === 0) return "没有符合条件的已索引会话。";
  const lines = [`命中 ${outcome.items.length} 个已索引会话${outcome.hasMore ? "(还有更多,用 offset 翻页)" : ""}:`];
  for (const item of outcome.items) {
    const title = item.title ?? titles.get(item.sessionId);
    const marks = [item.cwd ?? "无 cwd", `${item.events} 事件`, `${item.blocks} 块`];
    const time = formatTime(item.checkedMs);
    if (time) marks.push(`检查于 ${time}`);
    lines.push(`- ${item.sessionId}${title ? `「${title}」` : ""}  [${marks.join(", ")}]`);
  }
  return lines.join("\n");
}

/** 一个事件的块排成文本(带正文)。 */
export function formatEventBlocks(sessionId, seq, blocks) {
  if (blocks.length === 0) return `会话 ${sessionId} 的 seq=${seq} 没有可展示的块。`;
  const lines = [`会话 ${sessionId} seq=${seq} 的块(${blocks.length} 个):`];
  for (const block of blocks) {
    lines.push(`--- path=${block.path} type=${block.type}${block.searchable === false ? "(不入倒排)" : ""}`);
    lines.push(block.text === "" ? "(无正文;图片/文件等结构化块)" : block.text);
  }
  return lines.join("\n");
}

/** 工具定义:与 dsh-tool-everything 同构的纯对象形态。 */
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

const BLOCK_TYPES = ["text", "reasoning", "tool-call", "tool-result", "todo", "turn-end", "image", "file"];

const SEARCH_PARAMETERS = {
  type: "object",
  properties: {
    query: { type: "string", description: "检索词。按字面短语匹配(FTS5 语法当数据),不是子串扫描。" },
    sessionId: { type: "string", description: "可选:只在某一个会话里找。" },
    workspace: { type: "string", description: "可选:只在某一个工作区里找(工作区 = 会话头的 cwd,如 D:\\dev;大小写不敏感)。" },
    excludeWorkspaces: { type: "array", items: { type: "string" }, description: "可选:排除这些工作区(大小写不敏感);没有 cwd 的会话不会被顺手排除掉。" },
    blockTypes: { type: "array", items: { type: "string", enum: BLOCK_TYPES }, description: "可选:只要这些块类型。" },
    surface: { type: "string", enum: ["current", "log-only"], description: "可选:只要当前模型表层里的块(current),或只要不在表层的块(log-only)。" },
    limit: { type: "number", description: "返回条数上限(默认 20,受 config.maxLimit 限制)。" },
    offset: { type: "number", description: "跳过前 N 条(翻页用)。" },
    titles: { type: "boolean", description: "是否给命中会话附上标题(默认附;多花一次标题读取)。" },
  },
  required: ["query"],
  additionalProperties: false,
};

const LIST_PARAMETERS = {
  type: "object",
  properties: {
    sessionId: { type: "string", description: "要列举块的会话 id(必填)。" },
    seq: { type: "number", description: "可选:只看某一个事件序号里的块。" },
    limit: { type: "number", description: "返回条数上限(默认 200)。" },
    offset: { type: "number", description: "跳过前 N 条。" },
  },
  required: ["sessionId"],
  additionalProperties: false,
};

const READ_PARAMETERS = {
  type: "object",
  properties: {
    sessionId: { type: "string", description: "会话 id(与 seq 一起用;给了 blockId 时可省)。" },
    seq: { type: "number", description: "事件序号(与 sessionId 一起用)。" },
    path: { type: "string", description: "可选:只读某个块路径(如 \"3.0\")。不给就列出该事件的全部块。" },
    blockId: { type: "string", description: "可选:直接按块 id 从索引里取正文(形如 session-xxx#12#3.0),这时不需要 sessionId/seq。" },
  },
  additionalProperties: false,
};

const EVENT_TYPES = ["user/message", "assistant/message", "tool/call", "tool/result", "todo/write", "turn/end"];

const QUERY_PARAMETERS = {
  type: "object",
  properties: {
    granularity: {
      type: "string",
      enum: ["blocks", "messages"],
      description: "blocks=逐块返回;messages=按事件(消息)聚合返回(一条消息一行,带块数/总字数)。默认 blocks。",
    },
    sessionId: { type: "string", description: "可选:限定某一个会话。" },
    workspace: { type: "string", description: "可选:限定某一个工作区(工作区 = 会话头的 cwd;大小写不敏感)。" },
    excludeWorkspaces: { type: "array", items: { type: "string" }, description: "可选:排除这些工作区(大小写不敏感);要连\"没有 cwd\"的会话一起排除,用 workspace 反向收窄代替。" },
    blockTypes: { type: "array", items: { type: "string", enum: BLOCK_TYPES }, description: "可选:块类型,如 [\"reasoning\"] 只看思考块。" },
    eventTypes: { type: "array", items: { type: "string", enum: EVENT_TYPES }, description: "可选:事件类型,如 [\"assistant/message\"] 只看 agent 消息。" },
    surface: { type: "string", enum: ["current", "log-only"], description: "可选:current=当前模型表层,log-only=已不在表层的旧消息。" },
    lengthMin: { type: "number", description: "可选:块字数下限(按 Unicode 码点算)。" },
    lengthMax: { type: "number", description: "可选:块字数上限。" },
    timeFrom: { type: "string", description: "可选:起始时间,ISO 串(2026-09-14T10:00:00Z / 2026-09-14 10:00)或 epoch 毫秒。" },
    timeTo: { type: "string", description: "可选:结束时间,同上。" },
    orderBy: { type: "string", enum: ["time", "length", "seq", "type"], description: "排序字段,默认 time。" },
    descending: { type: "boolean", description: "是否降序,默认 true(新的/长的在前)。" },
    limit: { type: "number", description: "返回条数上限(默认 50)。" },
    offset: { type: "number", description: "跳过前 N 条。" },
    withText: { type: "boolean", description: "blocks 粒度时是否带正文(默认不带;要正文也可以用 session_blocks_read)。" },
  },
  additionalProperties: false,
};

const QUERY_DESCRIPTION =
  "按元数据查询会话的块/消息:时间区间(timeFrom/timeTo)、字数区间(lengthMin/lengthMax)、块类型、事件类型、surface,"
  + "可跨会话。granularity=messages 时按事件聚合,用来回答“某一段时间的 agent 消息”;"
  + "granularity=blocks 时逐块返回,用来回答“思考块里 2000~5000 字的块”。"
  + "这条路不走倒排,所以没进倒排的块(如 reasoning)同样查得到。";

const WORKSPACES_PARAMETERS = {
  type: "object",
  properties: {
    groupBy: {
      type: "string",
      enum: ["workspace", "session"],
      description: "workspace=按工作区汇总(每个工作区几个会话、几块);session=列出会话。默认 workspace。",
    },
    workspace: { type: "string", description: "groupBy=session 时可选:只看这个工作区(会话头的 cwd;大小写不敏感)。" },
    titleContains: { type: "string", description: "groupBy=session 时可选:只看标题里含这段文字的会话(标题是索引会话时从会话服务取来落库的)。" },
    limit: { type: "number", description: "返回条数上限(默认 50 个工作区 / 100 个会话)。" },
    offset: { type: "number", description: "跳过前 N 条(groupBy=session 时有效)。" },
  },
  additionalProperties: false,
};

const WORKSPACES_DESCRIPTION =
  "按工作区清点会话——工作区就是会话头的 cwd(DSH 取它当 workspaceRoot)。"
  + "groupBy=workspace 先看有哪些工作区、各有几个会话;groupBy=session 列出会话(可限定工作区)。"
  + "要按工作区检索内容,再用 session_blocks_search / session_blocks_query 的 workspace 参数。";

const STATUS_PARAMETERS = {
  type: "object",
  properties: {
    sessionId: { type: "string", description: "可选:顺带报告某个会话在索引里的修订与块数。" },
    reindex: { type: "boolean", description: "置 true 时先把索引更新一次再报告(会等这次更新跑完)。" },
    force: { type: "boolean", description: "与 reindex 一起用:忽略修订指纹,强制重建本轮涉及会话。" },
  },
  additionalProperties: false,
};

const SEARCH_DESCRIPTION =
  "在会话历史的**块**级做全文检索:一条消息会被拆成 text/reasoning/tool-call/tool-result 等块,"
  + "命中直接给到 sessionId + 事件 seq + 块路径(path)与类型,可以再按块读原文。"
  + "这是本插件自建的并行索引,不依赖官方会话搜索是否启用。";
const LIST_DESCRIPTION = "列出一个会话在块索引里的每一个块(含没有正文的图片/文件块),用于清点而不只是检索。";
const READ_DESCRIPTION = "读某个事件里的块原文(按块路径);走官方会话读取,不依赖本插件的索引是否可用。";
const STATUS_DESCRIPTION = "查看块索引状态(索引库路径、块数、已索引会话数),可选顺手更新一次索引。";

const SQL_PARAMETERS = {
  type: "object",
  properties: {
    sql: { type: "string", description: "单条只读 SELECT/WITH 语句(自动补 LIMIT,默认上限 200)。可用表:block_meta(块元数据)、block_text(未进倒排块的原文)、block_fts(倒排,正文是拆字变形)、indexed_sessions(会话簿记)。" },
    limit: { type: "number", description: "行数上限(默认 200,最大 5000)。" },
  },
  required: ["sql"],
  additionalProperties: false,
};

const SQL_DESCRIPTION =
  "在块索引库上直接跑一条**只读 SQL**(SELECT/WITH)。索引结构公开,复杂分析不内置——自己写语句。"
  + "常用表:block_meta(block_id, session_id, cwd, seq, path, block_type, surface, event_type, time, length, searchable),"
  + "block_text(block_id, text——未进倒排块的原文,如 reasoning),"
  + "indexed_sessions(id, cwd, title, revision, events, blocks, searchable, checked_ms)。"
  + "文本分析用递归 CTE 拆行。示例——「循环输出」判定(与 context-care 的 loop-guard 同参:某块末尾窗口内同一行重复 ≥15 次且占比 ≥20%、合格行数 ≥30):"
  + "对 block_text 按行递归拆开 → 用窗口函数取每块**最后 80 条合格行**(ROW_NUMBER() OVER (PARTITION BY block_id ORDER BY n DESC) ≤ 80;"
  + "别写成 `n >= total - 80`,那会把原始行序号与合格行计数混在一起、把中段卡带而结尾正常的块误判)→ 按 (block_id, line) 分组计数 "
  + "→ 筛 cnt ≥ 15 且 cnt ≥ 0.2 * min(total, 80) → 每块取 cnt 最大的那行 → JOIN block_meta 限定 block_type='reasoning'。"
  + "完整语句见 README 的「只读 SQL 通道」一节。"
  + "只读派生库,但仍只开 SELECT/WITH 通道;INSERT/UPDATE/PRAGMA/多语句一律拒绝。";

// ── 伪工具:记忆标记 ────────────────────────────────────────────────────────
//
// 为什么"没有副作用"反而是对的:
//   记忆内容本来就会经过会话日志进索引——索引器把每条消息拆成块,其中 block_type='tool-call'
//   是**进倒排**的(实测 75747/76107),而 'tool-result' 一条都不进。所以只要这个工具被调用,
//   参数里的问答对就自动成了可检索的索引行;工具再去写一遍存储,只会造出第二个真相源,
//   带来同步、去重、迁移的麻烦,而它并不比会话日志更可靠。
//
// 由此推出两条硬约束:
//   1) 内容必须写在**参数**里。写在返回值里的东西永远搜不到(tool-result 不入倒排)。
//   2) q 必须写成"未来真会拿来搜的措辞"。中文索引是单字级 + 连续子串匹配
//      (block_fts 用 unicode61,中文逐字插零宽空格后再入索引),
//      所以「钱不够」搜不到「经济困难」——换个说法就永远找不着了。
//
// 它不负责"以后一定被想起来":那取决于未来的检索行为(主动关键词召回 / 自动涣散召回)。
// 调用成功 ≠ 记住了。真正必须每次开工都读的东西属于 memos,不该写在这里。
const REMEMBER_PARAMETERS = {
  type: "object",
  properties: {
    q: {
      type: "string",
      description: "这条记忆要回答的问题。必须写成未来真会拿来搜的措辞——索引按字面连续子串匹配,换个说法就找不到了。",
    },
    a: { type: "string", description: "答案。写结论,不写过程。" },
    tag: { type: "string", description: "可选:这条记忆的相关关键字,便于成组检索(如 环境/约定/踩坑/人)。它是检索用的标签,不是分类。" },
    expires: { type: "string", description: "可选:什么情况下这条不再成立(如「换了项目就作废」)。不写则按默认新鲜期处理。" },
    perspective: {
      type: "string",
      enum: ["superego", "ego", "id"],
      description: "三选一,凭感觉判断即可,不需要准确。"
        + "如果认为这条记忆跟工作最相关,选 superego(职业我/超我);"
        + "如果认为它跟你和他人的关系最相关,选 ego(关系我/自我);"
        + "如果认为它跟你最本质的喜好和特质相关,选 id(本真我/本我)。",
    },
  },
  required: ["q", "a", "perspective"],
  additionalProperties: false,
};

const REMEMBER_DESCRIPTION =
  "把一条问答对写进会话流,供以后按关键词召回。"
  + "**这个工具没有任何副作用**:不写库、不落盘、不注册任何东西——它唯一的作用是让这段问答对成为会话里的一个 tool-call 块,"
  + "再由本插件的块索引收进倒排。所以「调用过」不等于「记住了」:以后能不能再想起来,取决于那时有没有人搜到它。"
  + "写法:q 必须写成未来真会拿来搜的措辞(索引是单字级 + 连续子串匹配,「钱不够」搜不到「经济困难」);a 写结论不写过程。"
  + "适用:情境性的、略微重要的东西(踩过的坑、当下的约定、临时结论)。"
  + "每条记忆还要标一个视角(perspective):它在哪个「我」眼里最要紧——职业我(超我)/关系我(自我)/本真我(本我),"
  + "三选一,模糊判断即可,不需要准确。三贤人不是三个人格,是同一个灵魂在三条神经通路上的切面;标视角就是标它在哪条通路上最要紧。"
  + "长期有效、必须每次开工都读的核心内容不要写在这里——那是 memos 的位置,写在这里不保证被读到。";

// ── 关键词召回 ──────────────────────────────────────────────────────────────
//
// 这是记忆的**读**那一半,和 session_blocks_search 不是一回事:
//   search 搜全库(代码、工具输出、什么都搜),recall 只搜 session_blocks_remember 写下的问答对。
// 它模拟的是"人类努力回忆"——给几个关键词当线索,而不是给一句自然语言查询。
//
// 两条规矩都在 memory.js 里落地:新鲜度分层、以及不返回当前活跃上下文里已有的记忆。
const RECALL_PARAMETERS = {
  type: "object",
  properties: {
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "1~8 个关键词。命中任意一个都算(彼此 OR)。按字面连续子串匹配,所以要用记忆里真出现过的词。",
    },
    limit: { type: "number", description: "返回条数上限(默认 5,最多 20)。" },
    tag: { type: "string", description: "可选:只要这个标签下的记忆。" },
    perspective: {
      type: "string",
      enum: ["superego", "ego", "id"],
      description: "可选:只看某一个「我」眼里的记忆(三贤人各自取自己那一份)。",
    },
  },
  required: ["keywords"],
  additionalProperties: false,
};

/**
 * 三个视角的说法。**用三贤人的名字,不用"超我/自我/本我"**——后者是心理结构
 * (它们确实一一对应),但那是解释,不是给人看的标签。
 * 工具输出与界面共用同一份映射,保证"我看到的"和"哥哥看到的"是同一套词。
 */
const PERSPECTIVE_ORDER = ["superego", "ego", "id"];
const PERSPECTIVE_LABELS = { superego: "Melchior", ego: "Balthazar", id: "Casper" };

const RECALL_DESCRIPTION =
  "按关键词召回记忆——只搜 session_blocks_remember 写下的问答对,不碰普通会话内容。"
  + "它模拟的是**人类努力回忆**:给几个关键词当线索,命中的记忆按新鲜度分层返回——"
  + "默认 2 小时内算新鲜,过期的只在数量不够时补齐,**哪怕过期那条字面更相关**"
  + "(字面相关性对旧记忆有系统性偏好,不压制的话旧记忆会一直挤占召回位)。"
  + "已经在当前活跃上下文里的本会话记忆不会再返回——它本来就在眼前,不需要被'想起'。"
  + "搜不到不等于没记过:关键词按字面连续子串匹配,换个说法就找不着了。要彻底翻用 session_blocks_sql。";

/** 把召回结果排成给模型看的文本。 */
function formatRecalled(keywords, outcome, ttlMs) {
  const hours = Math.round((ttlMs / 3600000) * 10) / 10;
  const head = `回忆「${keywords.join(" / ")}」`;
  if (outcome.items.length === 0) {
    return `${head}:没有命中任何记忆(候选 ${outcome.total} 条)。\n`
      + "提示:关键词按字面连续子串匹配,换个说法就找不着;搜不到也不等于没记过——要彻底翻用 session_blocks_sql。";
  }
  const lines = [`${head}命中 ${outcome.items.length} 条(候选 ${outcome.total} 条;新鲜期 ${hours} 小时):`];
  for (const item of outcome.items) {
    const marks = [
      item.fresh ? "新鲜" : "过期",
      PERSPECTIVE_LABELS[item.perspective] ?? "",
      item.tag ?? "",
      formatTime(item.time),
    ].filter((mark) => mark !== "");
    lines.push(`--- [${marks.join(" · ")}] ${item.sessionId}`);
    lines.push(`Q: ${item.q}`);
    lines.push(`A: ${item.a}`);
    if (item.expires) lines.push(`失效条件: ${item.expires}`);
  }
  if (outcome.items.some((item) => !item.fresh)) {
    lines.push("(标「过期」的排在新鲜之后:它们只在数量不够时补齐——这是设计,不是排序错了。)");
  }
  return lines.join("\n");
}

/**
 * 插件主体。
 * @param ctx - cordis 上下文(注入 sessionQuery / tools)。
 * @param rawConfig - 插件配置。
 */
async function apply(ctx, rawConfig = {}) {
  const config = normalizeOptions(rawConfig);
  const conversation = ctx.get("sessionQuery");
  const state = { store: undefined, indexer: undefined, runner: undefined, opening: undefined, lastSummary: undefined, persistence: undefined, registry: undefined, paused: false };
  // 便宜令牌的来源:`sessionPersistence.stat(id)` 只读会话头 + 一次文件 stat,**不读事件日志**。
  // 它是可选依赖,而且**注册顺序可能晚于本插件**——所以用 ctx.inject 延迟取得,
  // 拿到就装上、撤回就摘掉(DSH 自己的 session-query-sqlite 也是这么拿这个服务的)。
  ctx.inject(["sessionPersistence"], (childCtx) => {
    const service = childCtx.sessionPersistence;
    state.persistence = service;
    childCtx.effect(() => () => {
      if (state.persistence === service) state.persistence = undefined;
    }, "betterSessionQuery.tokenSource");
  });
  // 归档会话列表在工作区注册表里。它同样是"可能晚到"的可选依赖,所以一样延迟取得。
  ctx.inject(["workspaceRegistry"], (childCtx) => {
    const service = childCtx.workspaceRegistry;
    state.registry = service;
    childCtx.effect(() => () => {
      if (state.registry === service) state.registry = undefined;
    }, "betterSessionQuery.workspaceRegistry");
  });
  const tokenSource = {
    stat: (id) => (state.persistence === undefined ? undefined : state.persistence.stat(id)),
  };

  // 诊断必须落盘:stdout 在这个部署里不落地,事后翻不到就等于没写。
  const fileLog = createFileLog({ path: config.logFile, maxBytes: config.logMaxBytes });
  const log = (message) => {
    fileLog.write(message);
    try {
      ctx.logger?.info?.(message);
    } catch {
      // 日志不是功能的一部分,失败就安静丢弃。
    }
  };

  async function ensureOpen() {
    if (conversation === undefined) throw new Error("没有可用的会话查询服务(ctx.sessionQuery),无法读会话");
    if (state.store !== undefined) return state;
    state.opening ??= (async () => {
      const store = await openStore({ path: config.path, journalMode: config.journalMode });
      state.store = store;
      // 记忆库打不开不该拖垮主索引:没有它检索照常,只是记不成、也召回不到记忆。
      try {
        state.memory = await openMemoryStore({ path: config.memoryPath, journalMode: config.journalMode });
      } catch (error) {
        log(`记忆库打不开(记忆提取与召回将不可用):${error && error.message ? error.message : String(error)}`);
      }
      state.indexer = createIndexer({
        conversation,
        store,
        memory: state.memory,
        options: {
          include: config.include,
          recheckMs: config.recheckMs,
          maxSessionsPerReconcile: config.maxSessionsPerReconcile,
          failureCooldownMs: config.failureCooldownMs,
          listingTtlMs: config.listingTtlMs,
          includeCold: config.includeCold,
          includeWorkspaces: config.includeWorkspaces,
          excludeWorkspaces: config.excludeWorkspaces,
          includeWithoutWorkspace: config.includeWithoutWorkspace,
          includeArchived: config.includeArchived,
        },
        archivedIds: () => state.registry?.archivedSessionIds,
        tokens: config.useTokens ? tokenSource : undefined,
        log,
      });
      state.runner = createIndexRunner({
        indexer: state.indexer,
        backgroundMs: config.backgroundReconcileMs,
        yieldEvery: config.yieldEverySessions,
        log,
      });
      if (config.backgroundReconcileMs > 0 && !state.paused) state.runner.startBackground();
      return state;
    })();
    try {
      return await state.opening;
    } catch (error) {
      state.opening = undefined;
      throw error;
    }
  }

  /**
   * 按配置触发一轮索引更新。
   *   `"await"`      → 等这一轮跑完(单轮上限 maxSessionsPerReconcile)
   *   `"background"` → 不等,交给调度器后台跑(单飞:已在跑就排队,不会重复读日志)
   *   `"off"`        → 什么都不做
   * @param request - 透传 `{ signal, force, sessionIds, maxSessions }`。
   * @returns 摘要;后台或关闭模式下是 undefined。
   */
  async function triggerReconcile(request = {}) {
    const opened = await ensureOpen();
    // 暂停只掐"自动"这条路:定时器与检索触发都停下,显式请求(status{reindex:true}、面板路由)照跑。
    if (state.paused) return undefined;
    if (config.reconcileOnSearch === "off") return undefined;
    if (config.reconcileOnSearch === "background") {
      void opened.runner.run(request).catch((error) => {
        log(`后台索引更新失败:${error && error.message ? error.message : String(error)}`);
      });
      return undefined;
    }
    return opened.runner.run(request);
  }

  /**
   * 暂停/继续后台索引。暂停 = 停掉定时器 + 让在飞的一轮在下一个会话边界收尾
   * (契约里的 listEvents/readSession 都不接 signal,所以"已经开了的那一次读"必须让它读完)。
   * 暂停期间**自动**触发(定时器、检索)全部停下;显式请求照跑。
   * @param paused - true 暂停,false 继续。
   * @returns 当前状态。
   */
  function setPaused(paused) {
    const next = paused === true;
    if (next === state.paused) return { paused: next };
    state.paused = next;
    if (next) {
      state.runner?.stop();
    } else if (config.backgroundReconcileMs > 0) {
      state.runner?.startBackground();
    }
    log(next ? "索引已暂停(自动更新停止,显式请求仍可执行)" : "索引已继续");
    return { paused: next };
  }

  async function reconcile(request = {}) {
    const opened = await ensureOpen();
    const summary = await opened.runner.run(request);
    state.lastSummary = { ...summary, at: Date.now() };
    return { summary: state.lastSummary, stats: opened.store.stats() };
  }

  async function titlesFor(sessionIds) {
    const unique = [...new Set(sessionIds)].slice(0, 200);
    const titles = new Map();
    if (unique.length === 0) return titles;
    // 先读索引簿记里已落库的标题(索引更新时写进去的),再对缺的那几个补一次实时读取。
    if (state.store !== undefined) {
      for (const [id, title] of state.store.titlesFor(unique)) titles.set(id, title);
    }
    const missing = unique.filter((id) => !titles.has(id));
    if (missing.length === 0 || typeof conversation?.readTitleSnapshots !== "function") return titles;
    try {
      const results = await conversation.readTitleSnapshots(missing.slice(0, 50));
      results.forEach((result, index) => {
        const id = missing[index];
        if (result?.status === "fulfilled" && typeof result.value?.title?.title === "string") {
          titles.set(id, result.value.title.title);
        }
      });
    } catch {
      // 标题只是装饰:读不到就不附,不影响检索结果。
    }
    return titles;
  }

  // 服务:并行块索引的对外入口。官方 sessionQuery 不受影响,也不被本服务替代。
  const service = {
    /** 块级检索。 */
    async searchBlocks(request = {}) {
      const opened = await ensureOpen();
      await triggerReconcile({ signal: request.signal });
      const limit = Number.isInteger(request.limit) && request.limit > 0
        ? Math.min(request.limit, config.maxLimit)
        : config.defaultLimit;
      const outcome = opened.store.search({
        query: request.query,
        sessionIds: request.sessionId === undefined ? request.sessionIds : [request.sessionId],
        cwds: request.workspace === undefined ? request.cwds : [request.workspace],
        cwdsNot: request.excludeWorkspaces,
        blockTypes: request.blockTypes,
        surfaces: request.surface === undefined ? undefined : [request.surface],
        limit,
        offset: Number.isInteger(request.offset) && request.offset > 0 ? request.offset : 0,
        snippetTokens: config.snippetTokens,
      });
      return { ...outcome, generation: opened.store.generation() };
    },
    /** 元数据查询块(时间/长度/类型/surface;不走倒排,reasoning 也查得到)。 */
    async queryBlocks(request = {}) {
      const opened = await ensureOpen();
      return opened.store.queryBlocks({
        sessionIds: request.sessionId === undefined ? request.sessionIds : [request.sessionId],
        cwds: request.workspace === undefined ? request.cwds : [request.workspace],
        cwdsNot: request.excludeWorkspaces,
        blockTypes: request.blockTypes,
        eventTypes: request.eventTypes,
        surfaces: request.surface === undefined ? request.surfaces : [request.surface],
        lengthMin: request.lengthMin,
        lengthMax: request.lengthMax,
        timeMin: request.timeMin,
        timeMax: request.timeMax,
        orderBy: request.orderBy,
        descending: request.descending,
        limit: request.limit,
        offset: request.offset,
        withText: request.withText,
      });
    },
    /** 元数据查询消息(事件级聚合)。 */
    async queryMessages(request = {}) {
      const opened = await ensureOpen();
      return opened.store.queryMessages({
        sessionIds: request.sessionId === undefined ? request.sessionIds : [request.sessionId],
        cwds: request.workspace === undefined ? request.cwds : [request.workspace],
        cwdsNot: request.excludeWorkspaces,
        blockTypes: request.blockTypes,
        eventTypes: request.eventTypes,
        surfaces: request.surface === undefined ? request.surfaces : [request.surface],
        lengthMin: request.lengthMin,
        lengthMax: request.lengthMax,
        timeMin: request.timeMin,
        timeMax: request.timeMax,
        orderBy: request.orderBy,
        descending: request.descending,
        limit: request.limit,
        offset: request.offset,
      });
    },
    /** 工作区清单(按会话 cwd 聚合)。 */
    async queryWorkspaces(request = {}) {
      const opened = await ensureOpen();
      return opened.store.queryWorkspaces({ limit: request.limit });
    },
    /** 会话清单(索引簿记,可按工作区过滤)。 */
    async querySessions(request = {}) {
      const opened = await ensureOpen();
      return opened.store.querySessions({
        sessionIds: request.sessionId === undefined ? request.sessionIds : [request.sessionId],
        cwds: request.workspace === undefined ? request.cwds : [request.workspace],
        cwdsNot: request.excludeWorkspaces,
        titleContains: request.titleContains,
        limit: request.limit,
        offset: request.offset,
      });
    },
    /** 列举会话的块(走元数据表,含无正文块)。 */
    async listBlocks(request = {}) {
      const opened = await ensureOpen();
      if (opened.store.getSession(request.sessionId) === undefined) {
        await opened.indexer.reconcileOne(request.sessionId, { signal: request.signal, force: false });
      }
      const outcome = opened.store.listBlocks({
        sessionId: request.sessionId,
        seq: Number.isInteger(request.seq) ? request.seq : undefined,
        limit: Number.isInteger(request.limit) && request.limit > 0 ? Math.min(request.limit, 1000) : 200,
        offset: Number.isInteger(request.offset) && request.offset > 0 ? request.offset : 0,
      });
      return { ...outcome, generation: opened.store.generation() };
    },
    /** 取一个块(带正文)。 */
    async getBlock(blockIdValue) {
      const opened = await ensureOpen();
      return opened.store.getBlock(blockIdValue);
    },
    /** 手动索引更新。 */
    async reconcile(request = {}) {
      return reconcile(request);
    },
    /** 索引状态。 */
    async stats() {
      const opened = await ensureOpen();
      return { enabled: true, ...opened.store.stats(), progress: state.runner?.progress(), lastReconcile: state.lastSummary };
    },
    /** 界面监控用的完整快照(状态/进度/待办/体积/上次结果/配置)。 */
    async monitor() {
      return monitorSnapshot();
    },
    /** 只读 SQL(SELECT/WITH)直查块索引库——复杂分析不内置,自己写语句。 */
    async sqlQuery(request = {}) {
      const opened = await ensureOpen();
      return opened.store.sqlQuery(request);
    },
    /** 库收缩:先 FTS5 optimize,再 VACUUM(vacuum:false 只做前半段)。 */
    async compact(request = {}) {
      return compactStore(request);
    },
    /**
     * 暂停/继续后台索引(面板上的开关走这条路)。
     * @param paused - true 暂停自动更新;false 继续。
     * @returns `{ paused }`。
     */
    async setPaused(paused) {
      return setPaused(paused);
    },
    /** 关库(插件卸载时也会自动调)。 */
    async close() {
      if (state.store !== undefined) {
        state.store.close();
        state.store = undefined;
        state.indexer = undefined;
        state.opening = undefined;
      }
    },
  };

  /** 配置的只读摘要:监控面板要展示"现在到底是什么配置"。 */
  function publicConfig() {
    return {
      path: config.path,
      reconcileOnSearch: config.reconcileOnSearch,
      backgroundReconcileMs: config.backgroundReconcileMs,
      recheckMs: config.recheckMs,
      maxSessionsPerReconcile: config.maxSessionsPerReconcile,
      failureCooldownMs: config.failureCooldownMs,
      listingTtlMs: config.listingTtlMs,
      useTokens: config.useTokens,
      tokensAvailable: state.persistence !== undefined,
      yieldEverySessions: config.yieldEverySessions,
      includeCold: config.includeCold,
      includeWithoutWorkspace: config.includeWithoutWorkspace,
      includeArchived: config.includeArchived,
      includeWorkspaces: config.includeWorkspaces,
      excludeWorkspaces: config.excludeWorkspaces,
      logFile: config.logFile,
      logMaxBytes: config.logMaxBytes,
      include: config.include,
    };
  }

  /**
   * 会话服务报的会话总数(不含归档,见下),带 60 秒缓存。
   * 监控面板每 2 秒轮询一次快照,而对上千会话做一次 listSessions 要好几秒——不能每拍都数一遍。
   * 归档会话默认不收,所以它们也不该算进"待索引":否则覆盖率永远到不了 100%。
   */
  let listedCache = { value: undefined, at: 0 };
  async function countListedSessions() {
    if (conversation === undefined || typeof conversation.listSessions !== "function") return undefined;
    if (listedCache.at > 0 && Date.now() - listedCache.at < 60000) return listedCache.value;
    try {
      const records = await conversation.listSessions();
      const total = Array.isArray(records) ? records.length : undefined;
      const archived = config.includeArchived ? 0 : (state.registry?.archivedSessionIds?.length ?? 0);
      const value = typeof total === "number" ? Math.max(0, total - archived) : undefined;
      // 刚启动时会话服务可能先报 0——那是"还没准备好",不能缓存,否则面板会挂着 0 显示一分钟。
      if (typeof value === "number" && value > 0) listedCache = { value, at: Date.now() };
      return value;
    } catch {
      return listedCache.value;
    }
  }

  /** 一份界面监控快照:web 路由、SSE 与 service.monitor() 三处共用同一个组装。 */
  async function monitorSnapshot() {
    const base = { progress: state.runner?.progress(), last: state.lastSummary, config: publicConfig(), paused: state.paused };
    const opened = await ensureOpen();
    // size() 只算一次,再喂给 shouldCompact —— 它以前自己又算了一遍,而那一遍是全文扫描。
    const size = opened.store.size();
    return buildMonitorPayload({
      ...base,
      stats: opened.store.stats(),
      size,
      listed: await countListedSessions(),
      walBytes: fileBytes(`${config.path}-wal`),
      needsCompact: opened.store.shouldCompact(size),
    });
  }

  /**
   * 记忆面板的数据:默认按三个视角分成三份。
   * 每条记忆只归一份(三选一),所以三份加起来就是全部——这不是三个筛选视图,是同一批记忆的三个抽屉。
   */
  async function memorySnapshot() {
    const opened = await ensureOpen();
    const now = Date.now();
    if (opened.memory === undefined) {
      return { available: false, reason: "记忆库不可用(见诊断日志)", generatedAt: now, total: 0, groups: [] };
    }
    const items = opened.memory.list({ limit: 500, now, ttlMs: config.memoryTtlMs });
    const groups = PERSPECTIVE_ORDER.map((key) => {
      const mine = items.filter((item) => item.perspective === key);
      return { perspective: key, label: PERSPECTIVE_LABELS[key], count: mine.length, items: mine.slice(0, 40) };
    });
    // 没标视角的(旧记忆、或者参数里给了认不出的值)单独一栏,不混进任何一位贤人。
    const unmarked = items.filter((item) => item.perspective === undefined);
    if (unmarked.length > 0) {
      groups.push({ perspective: "", label: "未标视角", count: unmarked.length, items: unmarked.slice(0, 40) });
    }
    return {
      available: true,
      generatedAt: now,
      ttlMs: config.memoryTtlMs,
      total: items.length,
      stats: opened.memory.stats(),
      groups,
    };
  }

  /** 库收缩(FTS 段合并 + 归还空闲页)。刻意不放进检索路径:VACUUM 独占连接且需要临时空间。 */
  async function compactStore(request = {}) {
    const opened = await ensureOpen();
    const result = opened.store.compact({ vacuum: request.vacuum !== false });
    log(`块索引收缩:${Math.round(result.beforeBytes / 1048576 * 100) / 100}MB → ${
      Math.round(result.afterBytes / 1048576 * 100) / 100}MB(回收 ${Math.round(result.savedBytes / 1024)}KB)`);
    return result;
  }

  ctx.provide(SERVICE_NAME, service);
  // 提示规则:只给纯数据。判断谁该提示、以及发起提醒,都是 context_care 的事。
  ctx.provide(NOTICE_RULES_SERVICE, NOTICE_RULES);
  // 被动召回:用户说的话跟以前记过的对得上时,主动推给 context_care。
  // 用 ctx.inject 而不是 inject 导出 —— context_care 是可选的,没装就不注册,本插件照常工作。
  ctx.inject(["contextNotices"], (scope) => {
    const source = createPassiveRecallSource({
      open: ensureOpen,
      config: { ...PASSIVE_RECALL_DEFAULTS, ...(config.passiveRecall ?? {}) },
      log,
    });
    return scope.contextNotices.register(RECALL_SOURCE_NAME, source);
  });
  ctx.effect(() => () => {
    try {
      state.runner?.stop();
      // 卸载时只做便宜的 FTS 段合并(不 VACUUM:关库路径不该背一次独占+临时空间的开销)。
      // 关库路径要的是"现在真实多少字节",所以显式绕缓存。
      const size = state.store?.size?.({ fresh: true });
      if (size !== undefined && state.store.shouldCompact(size) === true) state.store.compact({ vacuum: false });
      state.store?.close();
      state.memory?.close();
    } catch {
      // 卸载期关库失败没有补救动作,进程随后退出。
    }
  }, "betterSessionQuery.close");

  ctx.tools.register(toolDef(
    "session_blocks_search",
    SEARCH_DESCRIPTION,
    SEARCH_PARAMETERS,
    async function execute(args, exec) {
      try {
        if (!args || typeof args.query !== "string" || !args.query.trim()) return "ERROR: query 参数必填";
        const opened = await ensureOpen();
        await triggerReconcile({ signal: exec?.signal });
        const limit = typeof args.limit === "number" && args.limit > 0
          ? Math.min(Math.trunc(args.limit), config.maxLimit)
          : config.defaultLimit;
        const outcome = opened.store.search({
          query: args.query.trim(),
          sessionIds: typeof args.sessionId === "string" && args.sessionId ? [args.sessionId] : undefined,
          cwds: typeof args.workspace === "string" && args.workspace ? [args.workspace] : undefined,
          cwdsNot: Array.isArray(args.excludeWorkspaces) ? args.excludeWorkspaces : undefined,
          blockTypes: Array.isArray(args.blockTypes) ? args.blockTypes : undefined,
          surfaces: typeof args.surface === "string" ? [args.surface] : undefined,
          limit,
          offset: typeof args.offset === "number" && args.offset > 0 ? Math.trunc(args.offset) : 0,
          snippetTokens: config.snippetTokens,
        });
        const titles = args.titles === false ? new Map() : await titlesFor(outcome.items.map((item) => item.sessionId));
        return formatHits(args.query.trim(), outcome, titles);
      } catch (error) {
        if (exec?.signal?.aborted) return "检索已取消。";
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
    function presentCall(args) {
      const query = typeof args?.query === "string" ? args.query : "";
      return { card: "generic", title: "会话块检索: " + query, kind: "execute" };
    },
  ));

  ctx.tools.register(toolDef(
    "session_blocks_list",
    LIST_DESCRIPTION,
    LIST_PARAMETERS,
    async function execute(args, exec) {
      try {
        if (!args || typeof args.sessionId !== "string" || !args.sessionId) return "ERROR: sessionId 参数必填";
        const opened = await ensureOpen();
        if (opened.store.getSession(args.sessionId) === undefined) {
          await opened.indexer.reconcileOne(args.sessionId, { signal: exec?.signal, force: false });
        }
        const outcome = opened.store.listBlocks({
          sessionId: args.sessionId,
          seq: typeof args.seq === "number" ? Math.trunc(args.seq) : undefined,
          limit: typeof args.limit === "number" && args.limit > 0 ? Math.min(Math.trunc(args.limit), 1000) : 200,
          offset: typeof args.offset === "number" && args.offset > 0 ? Math.trunc(args.offset) : 0,
        });
        return formatBlocks(args.sessionId, outcome);
      } catch (error) {
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
  ));

  /** 元数据查询结果(跨会话)排成文本。 */
  function formatQueryBlocks(outcome, titles = new Map()) {
    if (outcome.items.length === 0) return "没有符合条件的块。";
    const lines = [`命中 ${outcome.items.length} 个块${outcome.hasMore ? "(还有更多,用 offset 翻页)" : ""}:`];
    for (const item of outcome.items) {
      const title = titles.get(item.sessionId);
      const marks = [item.blockType, `seq=${item.seq}`, `path=${item.path}`, `${item.length} 字`, item.surface];
      if (!item.searchable) marks.push("未进倒排");
      const time = formatTime(item.time);
      if (time) marks.push(time);
      lines.push(`- ${item.sessionId}${title ? `「${title}」` : ""} ${item.blockId}  [${marks.filter(Boolean).join(", ")}]`);
      if (typeof item.text === "string") lines.push(`  ${item.text.replaceAll("\n", " ").slice(0, 400)}`);
    }
    return lines.join("\n");
  }

  ctx.tools.register(toolDef(
    "session_blocks_query",
    QUERY_DESCRIPTION,
    QUERY_PARAMETERS,
    async function execute(args, exec) {
      try {
        const opened = await ensureOpen();
        const filter = {
          sessionIds: typeof args?.sessionId === "string" && args.sessionId ? [args.sessionId] : undefined,
          cwds: typeof args?.workspace === "string" && args.workspace ? [args.workspace] : undefined,
          cwdsNot: Array.isArray(args?.excludeWorkspaces) ? args.excludeWorkspaces : undefined,
          blockTypes: Array.isArray(args?.blockTypes) ? args.blockTypes : undefined,
          eventTypes: Array.isArray(args?.eventTypes) ? args.eventTypes : undefined,
          surfaces: typeof args?.surface === "string" ? [args.surface] : undefined,
          lengthMin: typeof args?.lengthMin === "number" ? args.lengthMin : undefined,
          lengthMax: typeof args?.lengthMax === "number" ? args.lengthMax : undefined,
          timeMin: toEpochMs(args?.timeFrom),
          timeMax: toEpochMs(args?.timeTo),
        };
        const limit = typeof args?.limit === "number" && args.limit > 0 ? Math.min(Math.trunc(args.limit), 500) : 50;
        const offset = typeof args?.offset === "number" && args.offset > 0 ? Math.trunc(args.offset) : 0;
        if (args?.granularity === "messages") {
          const orderBy = args?.orderBy === "length" ? "length" : args?.orderBy === "seq" ? "seq" : "time";
          const outcome = opened.store.queryMessages({
            ...filter,
            orderBy,
            descending: args?.descending !== false,
            limit,
            offset,
          });
          const titles = await titlesFor(outcome.items.map((item) => item.sessionId));
          return formatMessages(outcome, titles);
        }
        const outcome = opened.store.queryBlocks({
          ...filter,
          orderBy: args?.orderBy,
          descending: args?.descending !== false,
          limit,
          offset,
          withText: args?.withText === true,
        });
        return formatQueryBlocks(outcome, await titlesFor(outcome.items.map((item) => item.sessionId)));
      } catch (error) {
        if (exec?.signal?.aborted) return "查询已取消。";
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
    function presentCall(args) {
      const kind = args?.granularity === "messages" ? "消息" : "块";
      return { card: "generic", title: `会话${kind}查询`, kind: "execute" };
    },
  ));

  ctx.tools.register(toolDef(
    "session_blocks_read",
    READ_DESCRIPTION,
    READ_PARAMETERS,
    async function execute(args, exec) {
      try {
        if (typeof args?.blockId === "string" && args.blockId !== "") {
          const opened = await ensureOpen();
          const block = opened.store.getBlock(args.blockId);
          if (block === undefined) return `ERROR: 索引里没有块 ${args.blockId}(该会话可能还没被索引)`;
          const marks = [block.blockType, `seq=${block.seq}`, `path=${block.path}`, `${block.length} 字`, block.surface];
          if (!block.searchable) marks.push("未进倒排");
          return `${block.blockId}  [${marks.filter(Boolean).join(", ")}]\n${
            block.text === "" ? "(无正文;图片/文件等结构化块)" : block.text}`;
        }
        if (typeof args?.sessionId !== "string" || !args.sessionId) return "ERROR: 需要 sessionId + seq,或直接给 blockId";
        if (typeof args.seq !== "number" || !Number.isInteger(args.seq)) return "ERROR: seq 参数必填(整数)";
        if (conversation === undefined) return "ERROR: 没有可用的会话查询服务(ctx.sessionQuery)";
        const window = await conversation.readEvent({ sessionId: args.sessionId, seq: args.seq }, exec?.signal);
        const blocks = extractBlocks(window.target, { sessionId: args.sessionId, include: config.include })
          .filter((block) => typeof args.path !== "string" || block.path === args.path);
        return formatEventBlocks(args.sessionId, args.seq, blocks);
      } catch (error) {
        if (exec?.signal?.aborted) return "读取已取消。";
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
  ));

  ctx.tools.register(toolDef(
    "session_blocks_workspaces",
    WORKSPACES_DESCRIPTION,
    WORKSPACES_PARAMETERS,
    async function execute(args, exec) {
      try {
        const opened = await ensureOpen();
        const limit = typeof args?.limit === "number" && args.limit > 0 ? Math.min(Math.trunc(args.limit), 1000) : undefined;
        const offset = typeof args?.offset === "number" && args.offset > 0 ? Math.trunc(args.offset) : 0;
        if (args?.groupBy === "session") {
          const outcome = opened.store.querySessions({
            cwds: typeof args?.workspace === "string" && args.workspace ? [args.workspace] : undefined,
            titleContains: typeof args?.titleContains === "string" ? args.titleContains : undefined,
            limit,
            offset,
          });
          return formatSessions(outcome);
        }
        return formatWorkspaces(opened.store.queryWorkspaces({ limit }));
      } catch (error) {
        if (exec?.signal?.aborted) return "查询已取消。";
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
    function presentCall(args) {
      return { card: "generic", title: args?.groupBy === "session" ? "工作区会话清单" : "工作区清单", kind: "execute" };
    },
  ));

  ctx.tools.register(toolDef(
    "session_blocks_status",
    STATUS_DESCRIPTION,
    STATUS_PARAMETERS,
    async function execute(args, exec) {
      try {
        const opened = await ensureOpen();        let summary = state.lastSummary;
        if (args?.reindex === true) {
          const result = await reconcile({ signal: exec?.signal, force: args.force === true, freshListing: true });
          summary = result.summary;
        }
        const stats = opened.store.stats();
        const lines = [
          `索引库: ${stats.path}`,
          `已索引 ${stats.sessions} 个会话、${stats.blocks} 个块(其中 ${stats.searchable} 个进倒排,${stats.storedTexts} 个正文另存)`,
          `写入 ${stats.generation} 次,最后 ${formatTime(stats.updatedMs) || "尚未写入"}`,
          `索引更新: 冷会话 ${Math.round(config.recheckMs / 1000)}s 复查一次,每次最多 ${config.maxSessionsPerReconcile} 个会话;检索时 ${
            config.reconcileOnSearch === "await" ? "等待更新" : config.reconcileOnSearch === "background" ? "后台更新(不等)" : "不自动更新"};让出间隔 ${
            config.yieldEverySessions > 0 ? `${config.yieldEverySessions} 个会话` : "不让出"}${
            config.backgroundReconcileMs > 0 ? `;后台每 ${Math.round(config.backgroundReconcileMs / 1000)}s 自动更新一次` : ""}${
            state.paused ? ";**已暂停**(自动更新停止,显式请求仍可执行)" : ""}`,
          `工作区: 白名单 ${config.includeWorkspaces.length > 0 ? config.includeWorkspaces.join(", ") : "(全部)"};排除 ${
            config.excludeWorkspaces.length > 0 ? config.excludeWorkspaces.join(", ") : "(无)"};无 cwd 的会话 ${
            config.includeWithoutWorkspace ? "收" : "不收"};归档会话 ${
            config.includeArchived ? "收" : `不收${state.registry === undefined ? "(注册表还没拿到,暂按不收处理)" : ""}`}`,
          `块开关: ${Object.entries(config.include).filter(([, on]) => on).map(([key]) => key).join(", ") || "无"}`,
          `变更令牌: ${config.useTokens
            ? (state.persistence !== undefined
              ? `开(sessionPersistence.stat 的文件物理身份,不读事件日志);清单缓存 ${Math.round(config.listingTtlMs / 1000)}s`
              : "开了但没拿到 sessionPersistence 服务,退回 listEvents 指纹比对")
            : "关(每轮都用 listEvents 算指纹)"}`,
        ];
        const progress = state.runner?.progress();
        if (progress !== undefined) {
          if (progress.running) {
            lines.push(`正在索引: ${progress.done}/${progress.total || progress.planned} 个会话(当前 ${progress.current ?? "-"};已更新 ${progress.updated})`);
          } else if (progress.finishedAt > 0) {
            lines.push(`上次更新: 更新 ${progress.updated}、未变 ${progress.unchanged}、失败 ${progress.errors},耗时 ${Math.max(0, progress.finishedAt - progress.startedAt)}ms`);
          } else {
            lines.push("索引更新: 还没跑过");
          }
        }
        if (summary !== undefined) {
          lines.push(`上次计划: 会话总数 ${summary.listed},计划处理 ${summary.planned}${
            summary.backlog === undefined ? "" : `(待补 ${summary.backlog}、实时 ${summary.live ?? 0}、到期 ${summary.due ?? 0}${
              summary.cooled > 0 ? `、冷却中 ${summary.cooled}` : ""}${summary.archived > 0 ? `、归档 ${summary.archived}` : ""})`},更新 ${summary.updated},未变 ${summary.unchanged},失败 ${summary.errors}`);
          if (summary.ms !== undefined) {
            lines.push(`本轮各段耗时: 令牌 ${summary.ms.tokens}ms、轻量事件 ${summary.ms.listEvents}ms、读正文 ${summary.ms.readSession}ms、抽块 ${summary.ms.extract}ms、写库 ${summary.ms.write}ms、标题 ${summary.ms.titles}ms`);
          }
        }
        const failureSamples = Array.isArray(summary?.failures) && summary.failures.length > 0
          ? summary.failures
          : state.runner?.progress()?.failures;
        if (Array.isArray(failureSamples) && failureSamples.length > 0) {
          lines.push("失败样例(全部见诊断日志):");
          for (const failure of failureSamples) {
            lines.push(`  [${failure.phase}] ${failure.sessionId} — ${failure.message}`);
          }
        }
        if (config.logFile) lines.push(`诊断日志: ${config.logFile}`);
        const listedNow = await countListedSessions();
        if (typeof listedNow === "number" && listedNow > 0) {
          lines.push(`待索引: ${Math.max(0, listedNow - stats.sessions)} 个会话(会话服务共报 ${listedNow},后台渐进补齐)`);
        } else {
          lines.push("待索引: 未知(会话服务尚未报出会话总数)");
        }
        if (typeof args?.sessionId === "string" && args.sessionId) {
          const record = opened.store.getSession(args.sessionId);
          lines.push(record === undefined
            ? `会话 ${args.sessionId}: 尚未索引`
            : `会话 ${args.sessionId}${record.title ? `「${record.title}」` : ""}: 修订 ${record.revision},${record.blocks} 块(${record.searchable} 可检索),检查于 ${formatTime(Number(record.checked_ms))}`);
        }
        return lines.join("\n");
      } catch (error) {
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
  ));

  ctx.tools.register(toolDef(
    "session_blocks_sql",
    SQL_DESCRIPTION,
    SQL_PARAMETERS,
    async function execute(args) {
      try {
        if (!args || typeof args.sql !== "string" || !args.sql.trim()) return "ERROR: sql 参数必填";
        const opened = await ensureOpen();
        const outcome = opened.store.sqlQuery({ sql: args.sql, limit: args.limit });
        if (outcome.rowCount === 0) return `查询成功,0 行。\n执行的语句: ${outcome.sql}`;
        const lines = [`查询成功,${outcome.rowCount} 行(列: ${outcome.columns.join(", ")})`];
        for (const row of outcome.rows) {
          lines.push("- " + outcome.columns.map((column) => `${column}=${row[column]}`).join("; "));
        }
        return lines.join("\n");
      } catch (error) {
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
    function presentCall(args) {
      const sql = typeof args?.sql === "string" ? args.sql : "";
      return { card: "generic", title: `块索引 SQL: ${sql.slice(0, 60)}${sql.length > 60 ? "…" : ""}`, kind: "execute" };
    },
  ));

  // 伪工具:记忆标记。execute 刻意什么都不做——理由见 REMEMBER_DESCRIPTION 与 REMEMBER_PARAMETERS 上方的长注释。
  // 参数本身就是全部内容:它作为 tool-call 块被索引器收进倒排,所以这里不碰 store / indexer,
  // 也就不调用 ensureOpen()——记一条记忆不该取决于索引库此刻能不能打开。
  ctx.tools.register(toolDef(
    "session_blocks_remember",
    REMEMBER_DESCRIPTION,
    REMEMBER_PARAMETERS,
    async function execute(args) {
      if (!args || typeof args.q !== "string" || !args.q.trim()) return "ERROR: q 参数必填";
      if (typeof args.a !== "string" || !args.a.trim()) return "ERROR: a 参数必填";
      const q = args.q.trim();
      const a = args.a.trim();
      const tag = typeof args.tag === "string" ? args.tag.trim() : "";
      const expires = typeof args.expires === "string" ? args.expires.trim() : "";
      // 回显是给"当下"核对用的;这段文字本身不进倒排(tool-result 不入倒排),
      // 所以重要内容别只写在这里——写进参数才算数。
      const lines = ["已记入会话流(以后靠关键词检索才会再出现):", `Q: ${q}`, `A: ${a}`];
      if (tag) lines.push(`tag: ${tag}`);
      if (expires) lines.push(`失效条件: ${expires}`);
      lines.push("注意:调用成功 ≠ 以后一定会被读到;必须每次开工都读的核心内容请写进 memos。");
      return lines.join("\n");
    },
    function presentCall(args) {
      const q = typeof args?.q === "string" ? args.q : "";
      return { card: "generic", title: "记一条记忆: " + q, kind: "execute" };
    },
  ));

  // 记忆的读那一半。它只搜记忆库,不碰块索引——所以块索引没打开也能用;
  // 但记忆库打不开时只能如实报错(那是真的没有可召回的东西)。
  ctx.tools.register(toolDef(
    "session_blocks_recall",
    RECALL_DESCRIPTION,
    RECALL_PARAMETERS,
    async function execute(args, exec) {
      try {
        const keywords = Array.isArray(args?.keywords) ? args.keywords : [];
        if (keywords.every((word) => typeof word !== "string" || word.trim() === "")) {
          return "ERROR: keywords 至少给一个非空关键词";
        }
        const opened = await ensureOpen();
        if (opened.memory === undefined) return "ERROR: 记忆库不可用(原因见诊断日志)";
        const limit = typeof args.limit === "number" && args.limit > 0 ? Math.min(Math.trunc(args.limit), 20) : 5;
        const outcome = opened.memory.recall({
          keywords,
          limit,
          ttlMs: config.memoryTtlMs,
          // 当前会话 id:用来排除"已经在活跃上下文里"的记忆。拿不到就不过滤,宁可多返回几条。
          sessionId: exec?.agent?.session?.id,
          tag: typeof args.tag === "string" ? args.tag.trim() : undefined,
          perspective: typeof args.perspective === "string" ? args.perspective.trim() : undefined,
        });
        return formatRecalled(keywords, outcome, config.memoryTtlMs);
      } catch (error) {
        return "ERROR: " + (error && error.message ? error.message : String(error));
      }
    },
    function presentCall(args) {
      const words = Array.isArray(args?.keywords)
        ? args.keywords.filter((word) => typeof word === "string").join(" / ")
        : "";
      return { card: "generic", title: "回忆: " + words, kind: "execute" };
    },
  ));

  // 界面监控:宿主侧只提供数据面(loopback),界面半边在 lib/client.js。
  if (config.monitor.enabled) {
    installMonitor(ctx, {
      snapshot: monitorSnapshot,
      // 手动触发:先取新鲜清单(期望看到刚建的会话),再跑一次。
      reindex: (request) => reconcile({ ...request, freshListing: true }),
      compact: (request) => compactStore(request),
      pause: (request) => setPaused(request?.paused === true),
      memories: () => memorySnapshot(),
      path: config.monitor.path,
      log,
    });
  }

  // 启用后台索引更新就**在加载时**把库打开并把定时器接上:
  // 索引是后台渐进的过程,不能等"有人碰一下"才开始——那样每次重启都会停在原地。
  // 不想要后台工作就设 backgroundReconcileMs: 0(此时库只在使用时按需打开);
  // 整个插件不想要,就在 profile 里禁用这一行,而不是给插件塞一个开关。
  // 开库失败(路径不可写、会话服务缺席)只记日志,不拒绝 apply:工具与面板会把原因报出来,
  // 一个后台索引不该因为开不了库就把整个 profile 拖下水。
  if (config.backgroundReconcileMs > 0) {
    try {
      await ensureOpen();
    } catch (error) {
      log(`后台索引更新已启用但开库失败:${error && error.message ? error.message : String(error)}`);
    }
  }
}

export { apply, inject, name, NOTICE_RULES, NOTICE_RULES_SERVICE, PASSIVE_RECALL_DEFAULTS, RECALL_SOURCE_NAME, SERVICE_NAME };
