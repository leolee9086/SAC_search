// lib/blocks.js — 会话事件的“块”抽取。
//
// 这一层是纯函数:吃一个会话事件,吐出一组块。不碰 ctx,不 import 任何 DSH 包,
// 块模型照 DSH 自己的 ContentBlockMap 手写一遍
// (text / reasoning / image / file / tool-call / tool-result,可扩展)。
//
// 与官方 session-query 的差别只有一处,但正是本插件存在的理由:
//   官方:一条事件 → 拍平成一条文档(extractSessionEventText / buildSessionEventSearchDocuments);
//   这里:一条事件 → N 个块,每个块一条索引行,块有自己的类型、路径与父事件 seq。
// 于是“第几个块命中”是可表达的,而官方只能回答“哪个会话的第几号事件命中”。

/**
 * 块身份:会话 + 事件 seq + 块路径。路径用点号表示嵌套(
 * 顶层块是 "0"/"1",tool-result 内层块是 "3.0")。
 * 已定稿事件里这个三元组是稳定的;流式过程中的中间态不入索引(见 indexer)。
 * @param sessionId - 会话 id。
 * @param seq - 事件序号。
 * @param path - 块路径。
 * @returns 块 id,形如 `session-xxx#12#3.0`。
 */
export function blockId(sessionId, seq, path) {
  return `${sessionId}#${seq}#${path}`;
}

/**
 * 抽取开关。默认值对齐官方语义:思考块不入索引、结构事件不入索引;
 * 另外官方会把 tool-result 的内层内容拍平,这里保留为独立子块。
 */
export const DEFAULT_INCLUDE = {
  text: true,
  reasoning: false,
  toolCall: true,
  toolResult: false,
  todo: true,
  turnEnd: false,
  toolCallEvent: false,
  images: false,
  files: false,
};

/** 能带文本、值得进倒排的块类型。 */
const TEXT_BEARING = new Set(["text", "reasoning", "tool-call", "todo", "turn-end"]);

/** 事件没有 content 数组时,按事件类型自己造块(与官方 switch 同集)。 */
const EVENT_LEVEL = new Set(["tool/call", "todo/write", "turn/end"]);

/**
 * 从一个会话事件抽取块。
 * @param event - 原始会话事件(带 seq/type/time/data)。
 * @param options - `{ sessionId, include }`;include 与 {@link DEFAULT_INCLUDE} 合并。
 * @returns 块数组,顺序即文本顺序;没有可索引内容的块也会返回(text 为空)。
 */
export function extractBlocks(event, options = {}) {
  const include = { ...DEFAULT_INCLUDE, ...(options.include ?? {}) };
  const sessionId = options.sessionId ?? "";
  const ctx = {
    sessionId,
    seq: typeof event?.seq === "number" ? event.seq : -1,
    eventType: typeof event?.type === "string" ? event.type : "",
    time: typeof event?.time === "number" ? event.time : undefined,
    include,
  };
  const out = [];
  const data = event?.data ?? {};
  const roots = [];
  if (Array.isArray(data.content)) roots.push(data.content);
  if (Array.isArray(data.message?.content)) roots.push(data.message.content);
  for (const content of roots) collect(content, "", ctx, out);
  if (roots.length === 0 && EVENT_LEVEL.has(ctx.eventType)) collectEventLevel(event?.data ?? {}, ctx, out);
  return out;
}

/** 块入列:把公共字段(会话/事件/类型/时间)补齐,避免每个分支各写一遍。 */
function push(ctx, out, block) {
  out.push({
    sessionId: ctx.sessionId,
    seq: ctx.seq,
    eventType: ctx.eventType,
    time: ctx.time,
    path: block.path,
    type: block.type,
    text: block.text,
  });
}

/** 递归展开内容块;tool-result 的内层块各自成块(路径取父路径 + 下标)。 */
function collect(content, parentPath, ctx, out) {
  content.forEach((block, index) => {
    const path = parentPath === "" ? String(index) : `${parentPath}.${index}`;
    const type = typeof block?.type === "string" ? block.type : "unknown";
    push(ctx, out, { path, type, text: blockText(block, type) });
    if (type === "tool-result" && Array.isArray(block?.content)) collect(block.content, path, ctx, out);
  });
}

/** 没有 content 数组的事件:tool/call、todo/write、turn/end。 */
function collectEventLevel(data, ctx, out) {
  if (ctx.eventType === "tool/call" && ctx.include.toolCallEvent) {
    push(ctx, out, { path: "0", type: "tool-call", text: joinText([data.name, data.arguments]) });
    return;
  }
  if (ctx.eventType === "todo/write" && ctx.include.todo) {
    const todos = Array.isArray(data.todos) ? data.todos : [];
    todos.forEach((todo, index) => {
      push(ctx, out, { path: String(index), type: "todo", text: joinText([todo?.status, todo?.content]) });
    });
    return;
  }
  if (ctx.eventType === "turn/end" && ctx.include.turnEnd) {
    const text = turnEndText(data.reason);
    if (text) push(ctx, out, { path: "0", type: "turn-end", text });
  }
}

/** 一个内容块的文本。tool-result 自身不带文本(文本在它的内层块里)。 */
function blockText(block, type) {
  switch (type) {
    case "text":
    case "reasoning":
      return typeof block?.text === "string" ? block.text.trim() : "";
    case "tool-call":
      return joinText([block?.name, block?.arguments]);
    case "tool-result":
      return "";
    default:
      // image / file / 插件扩展块:不猜字段,登记为空文本块(元数据仍在,便于按块列举)。
      return "";
  }
}

function turnEndText(reason) {
  if (!reason || typeof reason !== "object") return "";
  switch (reason.kind) {
    case "error":
      return joinText(["error", reason.error?.message]);
    case "aborted":
      return "aborted";
    case "max-tokens":
    case "interrupted":
      return reason.kind;
    default:
      return "";
  }
}

function joinText(parts) {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join("\n");
}

/**
 * 判定一个块是否应当进倒排。
 * @param block - {@link extractBlocks} 产出的块。
 * @param include - 已合并的开关。
 * @returns true 表示文本非空且该类型被允许。
 */
export function isSearchable(block, include = DEFAULT_INCLUDE) {
  if (typeof block?.text !== "string" || block.text.trim() === "") return false;
  if (!TEXT_BEARING.has(block.type)) return false;
  switch (block.type) {
    case "text":
      return include.text === true;
    case "reasoning":
      return include.reasoning === true;
    case "tool-call":
      return include.toolCall === true;
    case "todo":
      return include.todo === true;
    case "turn-end":
      return include.turnEnd === true;
    default:
      return false;
  }
}

/**
 * 按码点数计量长度(FTS/截断都以码点为准,不能用 UTF-16 长度)。
 * @param text - 文本。
 * @returns 码点数。
 */
export function codepointLength(text) {
  return typeof text === "string" ? Array.from(text).length : 0;
}

/**
 * 会话修订指纹:用轻量事件记录(seq/type/time/surface)算一个滚动哈希。
 * 列表长度或末尾 seq 变化、以及日志中段被改写都会改变它——比“只看条数”可靠,
 * 又不必读事件正文。
 * @param records - 来自 conversation 服务 listEvents 的轻量记录。
 * @returns 形如 `128:127:1a2b3c` 的指纹。
 */
export function eventsRevision(records) {
  const list = Array.isArray(records) ? records : [];
  let hash = 0;
  for (const record of list) {
    const line = `${record?.seq ?? -1}|${record?.type ?? ""}|${record?.time ?? 0}|${record?.surface ?? ""};`;
    for (let i = 0; i < line.length; i += 1) hash = (hash * 31 + line.charCodeAt(i)) | 0;
  }
  const last = list[list.length - 1];
  return `${list.length}:${last?.seq ?? -1}:${(hash >>> 0).toString(36)}`;
}

/**
 * 把一次完整读取(带正文的事件)与一次轻量读取(带 surface 的记录)合成块列表。
 * 两个来源按 seq 对齐:官方 readSession 给正文,官方 listEvents 给 surface
 * (surface 由 DSH 自己折叠,本插件不重算,也不 import 它的实现)。
 *
 * 两次读取之间会话还会继续写入,所以 events 可能比 records 新——那些多出来的 seq
 * 在这一轮拿不到 surface,于是**跳过**。跳过而不是给一个默认值:默认值会把"还没拿到"
 * 伪装成"已经不在表层",而下游按 `surface === "current"` 判断"这条记忆是否还在眼前"
 * (记忆召回就靠它),一个假的 log-only 会让它做出完全相反的判断。
 * revision 指纹取自 records,所以下一轮 records 追上后指纹必然变化,跳过的块会被正常
 * 索引,不会漏。
 *
 * 反过来,seq 落在 records 范围内却仍然取不到 surface,说明两次读取对不上了——
 * 那是真异常,直接抛:这种时候任何一个默认值都是在替调用方猜。
 * @param events - readSession 返回的完整事件数组。
 * @param records - listEvents 返回的轻量记录数组。
 * @param options - `{ sessionId, include }`。
 * @returns 块数组。
 */
export function buildSessionBlocks(events, records, options = {}) {
  const include = { ...DEFAULT_INCLUDE, ...(options.include ?? {}) };
  const surfaceBySeq = new Map();
  for (const record of Array.isArray(records) ? records : []) surfaceBySeq.set(record?.seq, record?.surface);
  // records 里最大的 seq:比它还大的 seq 只可能是这次读取之后才写进来的。
  let newest = -1;
  for (const seq of surfaceBySeq.keys()) {
    if (typeof seq === "number" && seq > newest) newest = seq;
  }
  const blocks = [];
  for (const event of Array.isArray(events) ? events : []) {
    const seq = event?.seq;
    if (!surfaceBySeq.has(seq)) {
      if (typeof seq === "number" && seq > newest) continue;
      throw new Error(
        `buildSessionBlocks: seq ${String(seq)} 落在 records 范围内却没有 surface`
        + `(records ${surfaceBySeq.size} 条,最新 seq ${newest})`,
      );
    }
    for (const block of extractBlocks(event, { sessionId: options.sessionId, include })) {
      blocks.push({
        ...block,
        id: blockId(options.sessionId ?? "", block.seq, block.path),
        time: block.time ?? event?.time,
        surface: surfaceBySeq.get(seq),
        searchable: isSearchable(block, include),
        length: codepointLength(block.text),
      });
    }
  }
  return blocks;
}
