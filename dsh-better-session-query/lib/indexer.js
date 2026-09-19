// lib/indexer.js — 索引更新:把会话日志里的块搬进索引。
//
// 只通过**运行时服务契约**读会话(注入的 conversation 服务,即官方的 ctx.sessionQuery):
//   listSessions(signal)      列出逻辑会话(带 live/persisted 标志)
//   listEvents(sessionId)     轻量事件记录(seq/type/time/**surface**)——修订指纹与 surface 都来自这里
//   readSession(sessionId)    完整事件(带正文)——块从这里抽
// 不 import 任何 DSH 包,不改任何 DSH 源码;surface 由 DSH 自己折叠,本插件只接收结果。
//
// 索引更新策略(与官方 provider 的差别):
//   官方:每次搜索都全量观察 + 逐会话比对 revision;
//   这里:按会话做 TTL 节流(冷会话默认 10 分钟复查一次,实时会话每次都查),
//         再用轻量记录的滚动哈希判修订,只有真变了才读正文重建该会话的块。

import { buildSessionBlocks, eventsRevision } from "./blocks.js";

/** 索引更新默认参数;全部可被插件 config 覆盖。 */
export const INDEXER_DEFAULTS = {
  recheckMs: 600000,
  maxSessionsPerReconcile: 25,
  // 读不出来的会话(seeded/旧格式)会永远停在"未索引",不加冷却就每轮都进 plan、白吃名额。
  failureCooldownMs: 1800000,
  // 会话清单缓存:上千会话时一次 listSessions 要好几秒,而它在一轮之内与相邻几轮之间几乎不变。
  listingTtlMs: 15000,
  // 归档会话:归档只是工作区注册表里的一个 id 列表(日志原地不动、listSessions 照样列出来),
  // 默认不收——归档的意思是"先搁一边",不该继续出现在检索结果里;已经在索引里的会被清掉。
  includeArchived: false,
  // 标题不在这里取:它由 writeSession 从 readSession 的事件里折出来(见 titleFromEvents),
  // 与 DSH 的 foldSessionTitle 同一条规则、同一份数据,所以不必多读一遍日志。
  includeCold: true,
  includeWorkspaces: [],
  excludeWorkspaces: [],
  includeWithoutWorkspace: true,
};

/** 路径比较用:统一小写、去掉尾部分隔符(Windows 路径大小写不敏感)。 */
function normalizeWorkspaceList(value) {
  return (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === "string" && item.trim() !== "")
    .map((item) => item.trim().replace(/[\\/]+$/, "").toLowerCase());
}

/**
 * 这个工作区要不要收进索引。白名单非空时只收白名单;黑名单永远优先。
 * 白名单是**穷尽**的:列了白名单,没有 cwd 的会话就不在名单里,不收;
 * `includeWithoutWorkspace` 只在没有白名单时决定要不要收那些会话。
 * 这是**索引层**的排除:被排除的会话连日志都不读。
 * @param cwd - 会话头的 cwd(没有就是 undefined/null/空串)。
 * @param options - `{ includeWorkspaces, excludeWorkspaces, includeWithoutWorkspace }`。
 * @returns true 表示收。
 */
export function workspaceAllowed(cwd, options = {}) {
  const include = normalizeWorkspaceList(options.includeWorkspaces);
  const exclude = normalizeWorkspaceList(options.excludeWorkspaces);
  if (cwd === undefined || cwd === null || cwd === "") {
    if (include.length > 0) return false;
    return options.includeWithoutWorkspace !== false;
  }
  const key = String(cwd).trim().replace(/[\\/]+$/, "").toLowerCase();
  if (include.length > 0 && !include.includes(key)) return false;
  return !exclude.includes(key);
}

/**
 * 造一个索引更新器。
 * @param input - `{ conversation, store, options, log }`;conversation 是注入的会话查询服务。
 * @returns 索引更新器句柄。
 */
export function createIndexer({ conversation, store, options = {}, log = () => {}, tokens, archivedIds, memory }) {
  const config = { ...INDEXER_DEFAULTS, ...options };
  /** 块开关的指纹:它一变,已索引块的 searchable 就可能全变,追加快路径必须失效。 */
  const includeKey = JSON.stringify(config.include ?? {});
  /** 失败冷却:sessionId → 上次失败时刻。抑制对读不出来的会话的每轮重试。 */
  const failedAt = new Map();
  /**
   * 分段计时:用来回答"时间到底花在谁身上"。
   * 只累加,不参与判断;summary 里给平均值,慢会话单独打一行明细。
   */
  const timings = { tokens: 0, listEvents: 0, readSession: 0, extract: 0, write: 0, titles: 0, sessions: 0 };
  const nowMs = () => Number(process.hrtime.bigint()) / 1e6;

  /** 这个会话是不是还在失败冷却里(force 时会话由调用方绕过 needsCheck,这里也一并绕过)。 */
  function underCooldown(id, now) {
    const at = failedAt.get(id);
    return at !== undefined && now - at < config.failureCooldownMs;
  }

  /**
   * 便宜的变更令牌。来源是注入的 `sessionPersistence.stat(id)`——
   * 它只读会话头 + 对文件做一次 `stat`,**不读事件日志**,返回的 `revision` 就是文件物理身份。
   * 拿不到(服务缺席、旧格式被拒)就返回 undefined,调用方退回 `listEvents` 指纹比对。
   * @param id - 会话 id。
   * @returns 令牌字符串,或 undefined。
   */
  async function readToken(id) {
    if (tokens === undefined || typeof tokens.stat !== "function") return undefined;
    const started = nowMs();
    try {
      const snapshot = await tokens.stat(id);
      const revision = snapshot?.revision;
      return typeof revision === "string" && revision !== "" ? revision : undefined;
    } catch {
      // 历史代次/旧格式会被 stat 拒绝——那不是令牌问题,交给指纹路径去读、去记录、去冷却。
      return undefined;
    } finally {
      timings.tokens += nowMs() - started;
    }
  }

  /** 归档会话 id 集合(来自工作区注册表;服务缺席或没给就返回空集合)。 */
  function readArchived() {
    if (typeof archivedIds !== "function") return new Set();
    try {
      const value = archivedIds();
      if (value instanceof Set) return value;
      return new Set(Array.isArray(value) ? value : []);
    } catch {
      // 注册表读不到就当没有归档——宁可多索引,也不要因为读不到状态而漏掉会话。
      return new Set();
    }
  }

  /** 让下一轮重新取会话清单。 */
  function invalidateListing() {
    listingCache = { at: 0, value: undefined };
  }

  /** listSessions 的 TTL 缓存:上千会话时它要好几秒,而一轮之内几乎不变。 */
  let listingCache = { at: 0, value: undefined };
  async function listSessionsCached(signal) {
    const ttl = Number(config.listingTtlMs ?? 0);
    if (ttl > 0 && listingCache.value !== undefined && Date.now() - listingCache.at < ttl) {
      return listingCache.value;
    }
    const listed = await conversation.listSessions(signal);
    const value = Array.isArray(listed) ? listed : [];
    listingCache = { at: Date.now(), value };
    return value;
  }

  /** 从一条会话记录里稳妥地取 id 与 live 标志(不同后端字段位置略有差异)。 */
  function readRecord(record) {
    const id = record?.header?.id ?? record?.session?.id ?? record?.id;
    if (typeof id !== "string" || id === "") return undefined;
    const live = record?.live === true || record?.availability?.live === true;
    const persisted = record?.persisted === true || record?.availability?.persisted === true;
    const cwd = record?.header?.cwd ?? record?.session?.cwd;
    return { id, live, persisted, cwd: typeof cwd === "string" ? cwd : undefined };
  }

  /** 该不该在这一轮检查这个会话。 */
  function needsCheck(item, indexed, now, force) {
    if (force) return true;
    if (item.live) return true;
    if (indexed === undefined) return true;
    const checked = Number(indexed.checked_ms ?? 0);
    return now - checked >= config.recheckMs;
  }

  /**
   * 从**已经读到的**事件里折出标题:日志里最后一个 `session/title` 事件的 `data.title`(见下)。
   */
  /**
   * 第一相:判断这个会话要不要重建。两级判据,先便宜后昂贵:
   *   1. 变更令牌(文件物理身份,**不读日志**):令牌与上次记录的相同 → 直接放过;
   *   2. 令牌不同或拿不到 → 读轻量事件算指纹,指纹相同则顺手把令牌补上。
   * @returns `{ outcome: "unchanged" }` 或 `{ outcome: "changed", records, revision, token }`。
   */
  async function planSession(item, { force = false, now = Date.now() } = {}) {
    const indexed = store.getSession(item.id);
    const token = await readToken(item.id);
    if (!force && indexed !== undefined && token !== undefined && indexed.token === token) {
      store.markChecked(item.id, now);
      return { outcome: "unchanged" };
    }
    const listedAt = nowMs();
    const records = await conversation.listEvents(item.id);
    timings.listEvents += nowMs() - listedAt;
    const revision = eventsRevision(records);
    if (!force && indexed !== undefined && indexed.revision === revision) {
      if (token !== undefined) store.setToken(item.id, token);
      store.markChecked(item.id, now);
      return { outcome: "unchanged" };
    }
    return { outcome: "changed", records, revision, token };
  }

  /**
   * 从**已经读到的**事件里折出标题:日志里最后一个 `session/title` 事件的 `data.title`。
   * 这与 DSH 的 `foldSessionTitle` 是同一条规则(源码原文就是 findLast(type === 'session/title')),
   * 数据来源也是同一份日志——所以**不必**再为标题单独装载一次日志。
   * 标题在写入日志时就已归一化,这里直接用。
   * @param events - `readSession` 返回的完整事件。
   * @returns 标题字符串,或 undefined。
   */
  function titleFromEvents(events) {
    if (!Array.isArray(events)) return undefined;
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event?.type !== "session/title") continue;
      const title = event.data?.title;
      return typeof title === "string" && title.trim() !== "" ? title.trim() : undefined;
    }
    return undefined;
  }

  /** 第二相:读正文、抽块、差量写入。 */
  async function writeSession(item, { records, revision, signal, now = Date.now(), title, token } = {}) {
    const readAt = nowMs();
    const snapshot = await conversation.readSession(item.id);
    timings.readSession += nowMs() - readAt;
    const events = snapshot?.events ?? [];
    const extractAt = nowMs();
    const blocks = buildSessionBlocks(events, records, {
      sessionId: item.id,
      include: config.include,
    });
    timings.extract += nowMs() - extractAt;
    const writeAt = nowMs();
    const written = store.replaceSession({
      sessionId: item.id,
      cwd: item.cwd,
      // 标题优先从这份事件里折(同一条规则、同一份数据),只有调用方显式给了才用它。
      title: title ?? titleFromEvents(events),
      revision,
      events: Array.isArray(records) ? records.length : 0,
      blocks,
      now,
      configKey: includeKey,
    });
    timings.write += nowMs() - writeAt;
    // 记忆提取走的是独立的小库。它是附加价值,失败只记日志——不该让一条坏记忆
    // (或者一个打不开的记忆库)把整轮主索引拖下水。
    if (memory !== undefined) {
      try {
        const ingested = memory.ingest({ sessionId: item.id, cwd: item.cwd, blocks });
        if (ingested.found > 0 || ingested.removed > 0) {
          log(`记忆库 ${item.id}:提取 ${ingested.found} 条(新增 ${ingested.inserted}、改 ${ingested.updated}、删 ${ingested.removed})`);
        }
      } catch (error) {
        log(`记忆提取失败 ${item.id}:${error && error.message ? error.message : String(error)}`);
      }
    }
    // 写完才记令牌:先记后写一旦写失败,下一轮就会因为"令牌没变"而永远跳过这个会话。
    if (token !== undefined) store.setToken(item.id, token);
    log(`已索引会话 ${item.id}:${written.blocks} 块(可检索 ${written.searchable};新增 ${written.inserted}、改 ${written.updated}、没动 ${written.unchanged}、删 ${written.removed})`);
    return written;
  }

  return {
    config,
    /** 让下一轮重新取会话清单(手动触发索引更新、或期望看到刚建的会话时用)。 */
    invalidateListing,
    /**
     * 索引更新一批会话。
     * @param request - `{ signal, force, sessionIds, maxSessions }`。
     * @returns 本轮摘要 `{ listed, planned, updated, unchanged, errors }`。
     */
    async reconcile(request = {}) {
      const now = Date.now();
      if (request.freshListing === true) invalidateListing();
      const timingBase = { ...timings };
      const onProgress = typeof request.onProgress === "function" ? request.onProgress : () => {};
      const yieldEvery = Number.isInteger(request.yieldEvery) && request.yieldEvery > 0 ? request.yieldEvery : 0;
      const listed = await listSessionsCached(request.signal);
      const wanted = Array.isArray(request.sessionIds) && request.sessionIds.length > 0
        ? new Set(request.sessionIds)
        : undefined;
      const limit = Number.isInteger(request.maxSessions) && request.maxSessions > 0
        ? request.maxSessions
        : config.maxSessionsPerReconcile;
      const plan = [];
      const purge = [];
      const archivedSet = config.includeArchived ? undefined : readArchived();
      let archivedCount = 0;
      let backlogSize = 0;
      let liveSize = 0;
      let dueSize = 0;
      for (const raw of Array.isArray(listed) ? listed : []) {
        const item = readRecord(raw);
        if (item === undefined) continue;
        const indexed = store.getSession(item.id);
        if (archivedSet !== undefined && archivedSet.has(item.id)) {
          // 归档 = 先搁一边:连日志都不读;已索引的清掉,取消归档后下一轮自然重新进来。
          if (indexed !== undefined) purge.push(item.id);
          archivedCount += 1;
          continue;
        }
        if (!workspaceAllowed(item.cwd, config)) {
          // 索引层排除:已经在索引里的要清掉,否则"排除"只对新会话生效、旧块永远留着。
          if (indexed !== undefined) purge.push(item.id);
          continue;
        }
        if (wanted !== undefined && !wanted.has(item.id)) continue;
        if (!config.includeCold && !item.live) continue;
        if (underCooldown(item.id, now) && request.force !== true) continue;
        if (!needsCheck(item, indexed, now, request.force === true)) continue;
        // 从未索引过的会话最值钱:它们决定覆盖率。已索引的实时会话是"永远到期"的,
        // 若不给 backlog 保底名额,名额会被同一批实时会话吃光、backlog 永不前进(实测卡在 111/1489)。
        if (indexed === undefined) backlogSize += 1;
        else if (item.live) liveSize += 1;
        else dueSize += 1;
        plan.push({ ...item, backlog: indexed === undefined });
      }
      for (const id of purge) store.deleteSession(id, now);
      // 组内排序:实时会话优先,其次是列表本身的顺序(新会话在前)。
      plan.sort((a, b) => Number(b.live) - Number(a.live));
      const summary = {
        listed: Array.isArray(listed) ? listed.length : 0,
        planned: plan.length,
        backlog: backlogSize,
        live: liveSize,
        due: dueSize,
        archived: archivedCount,
        cooled: failedAt.size,
        excluded: purge.length,
        updated: 0,
        unchanged: 0,
        errors: 0,
        failures: [],
        aborted: false,
      };
      // backlog 非空时至少留一半名额给它(它决定覆盖率);fresher(实时/到期复查)拿剩下的,
      // fresher 不够就把余下名额还给 backlog——否则一轮会白白少处理几个会话。
      const backlog = plan.filter((item) => item.backlog);
      const fresher = plan.filter((item) => !item.backlog);
      const quota = Math.min(backlog.length, Math.max(1, Math.ceil(limit / 2)));
      const head = backlog.slice(0, quota);
      const remaining = limit - head.length;
      const tail = fresher.slice(0, remaining);
      if (tail.length < remaining) tail.push(...backlog.slice(quota, quota + (remaining - tail.length)));
      const batch = [...head, ...tail];
      const total = batch.length;
      onProgress({ phase: "planned", listed: summary.listed, planned: summary.planned, total });
      let done = 0;
      const changed = [];
      // 第一相:逐会话比修订。没变的会话到这里就结束了——标题与正文都不会去读。
      for (const item of batch) {
        // 取消只能落在会话边界上:契约里的 listEvents/readSession 都不接 signal,
        // 所以"已经开了的那一次读"必须让它读完,之后就地停下。
        if (request.signal?.aborted === true) {
          summary.aborted = true;
          break;
        }
        try {
          const planned = await planSession(item, { force: request.force === true, now });
          if (planned.outcome === "unchanged") {
            summary.unchanged += 1;
            failedAt.delete(item.id);
          } else changed.push({ item, records: planned.records, revision: planned.revision, token: planned.token });
        } catch (error) {
          summary.errors += 1;
          const message = error && error.message ? error.message : String(error);
          failedAt.set(item.id, now);
          if (summary.failures.length < 5) summary.failures.push({ sessionId: item.id, phase: "compare", message });
          log(`比对会话 ${item.id} 失败:${message}`);
        }
        done += 1;
        onProgress({
          phase: "session",
          listed: summary.listed,
          planned: summary.planned,
          total,
          done,
          updated: summary.updated,
          unchanged: summary.unchanged,
          errors: summary.errors,
          current: item.id,
        });
        // 分片让出:单会话的事务仍然是同步块,但块与块之间必须把事件循环交还出去。
        if (yieldEvery > 0 && done % yieldEvery === 0) {
          await new Promise((resolve) => {
            setImmediate(resolve);
          });
        }
      }
      // 第二相:读正文 → 抽块 → 差量写入。
      // 标题不单独取:它由 writeSession 从这份 readSession 的事件里折出来(同一条规则、同一份数据),
      // 早先每轮额外调一次 readTitleSnapshots 等于白读一整份日志。
      let written = 0;
      for (const entry of changed) {
        if (request.signal?.aborted === true) {
          summary.aborted = true;
          break;
        }
        try {
          const sessionAt = nowMs();
          const before = { ...timings };
          await writeSession(entry.item, {
            records: entry.records,
            revision: entry.revision,
            signal: request.signal,
            now,
            title: undefined,
            token: entry.token,
          });
          summary.updated += 1;
          failedAt.delete(entry.item.id);
          // 慢会话单独打一行明细:块数很少却很慢 = 固定开销(装载/校验),块数多则看写入。
          const elapsed = nowMs() - sessionAt;
          if (elapsed >= 1500) {
            log(`慢会话 ${entry.item.id}:${Math.round(elapsed)}ms(${entry.records.length} 事件;令牌 ${Math.round(timings.tokens - before.tokens)}、轻量 ${Math.round(timings.listEvents - before.listEvents)}、正文 ${Math.round(timings.readSession - before.readSession)}、抽块 ${Math.round(timings.extract - before.extract)}、写入 ${Math.round(timings.write - before.write)}ms)`);
          }
        } catch (error) {
          summary.errors += 1;
          const message = error && error.message ? error.message : String(error);
          failedAt.set(entry.item.id, now);
          if (summary.failures.length < 5) summary.failures.push({ sessionId: entry.item.id, phase: "write", message });
          log(`索引会话 ${entry.item.id} 失败:${message}`);
        }
        written += 1;
        onProgress({
          phase: "writing",
          listed: summary.listed,
          planned: summary.planned,
          total: changed.length,
          done: written,
          updated: summary.updated,
          unchanged: summary.unchanged,
          errors: summary.errors,
          current: entry.item.id,
        });
        if (yieldEvery > 0) {
          await new Promise((resolve) => {
            setImmediate(resolve);
          });
        }
      }
      // 冷却计数按**本轮结束后**的状态报(计划时它还反映上一轮,用来判断"有几个被压着不再重试")。
      summary.cooled = failedAt.size;
      // 本轮各段耗时(ms):回答"时间花在谁身上"——令牌/轻量事件/正文/抽块/写入。
      summary.ms = Object.fromEntries(
        Object.entries(timings).map(([key, value]) => [key, Math.round(value - (timingBase[key] ?? 0))]),
      );
      onProgress({
        phase: "done",
        listed: summary.listed,
        planned: summary.planned,
        total,
        done,
        updated: summary.updated,
        unchanged: summary.unchanged,
        errors: summary.errors,
        backlog: summary.backlog,
        live: summary.live,
        due: summary.due,
        cooled: summary.cooled,
      });
      return summary;
    },
    /** 只索引更新指定会话(用于按 id 精确刷新)。 */
    async reconcileOne(sessionId, { signal, force = true } = {}) {
      const records = await conversation.listSessions(signal);
      for (const raw of Array.isArray(records) ? records : []) {
        const item = readRecord(raw);
        if (item !== undefined && item.id === sessionId) {
          if (!workspaceAllowed(item.cwd, config)) {
            // 被排除的工作区:精确刷新也不破例,顺手把残留清掉。
            if (store.getSession(sessionId) !== undefined) store.deleteSession(sessionId);
            return "skipped";
          }
          const planned = await planSession(item, { force, now: Date.now() });
          if (planned.outcome === "unchanged") return "unchanged";
          await writeSession(item, {
            records: planned.records,
            revision: planned.revision,
            signal,
            token: planned.token,
          });
          return "updated";
        }
      }
      // 列表里没有(例如已被删除):清掉索引,避免留陈旧块。
      if (store.getSession(sessionId) !== undefined) store.deleteSession(sessionId);
      return "skipped";
    },
  };
}
