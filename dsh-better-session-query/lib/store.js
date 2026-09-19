// lib/store.js — 块索引的存储层(node:sqlite + FTS5)。
//
// 布局借的是 s-forge 那份《后端性能瓶颈 Phase4》里的结论:**倒排与过滤分离**。
//   block_fts  : 只放正文,专职 MATCH 与 bm25 排序;
//   block_meta : 普通表,放会话/事件/块路径/类型/surface/时间/长度,过滤全部落在它上面;
//   两者用 fts_rowid 做等值 JOIN,过滤条件不回表扫 FTS。
// 这也是官方 session-query 那套“UNINDEXED 列当过滤条件”的反面写法。
//
// 第二类查询(时间区间、长度区间、按事件聚合)根本不走 MATCH——它们是纯元数据谓词,
// 直接对 block_meta 下 WHERE,所以「某一时段的 agent 消息」「思考块中 2000~5000 字的块」
// 这类问题不需要倒排参与。
//
// 正文存放分两处,避免重复:
//   进倒排的块  → 正文在 block_fts(按 rowid 等值取回);
//   有正文但不进倒排的块(reasoning 等) → 正文在 block_text,只付存储、不付倒排代价。
//
// 归属保护:库带自己的 application_id 与 schema 版本。别人的库、或本应用但版本不符的
// 派生库,打开时就地重置或直接拒绝——绝不碰 session 持久化库(那是 JSONL,不是这个)。

// node:sqlite 在 Node 22.5+ 提供(22.x 会打一条 ExperimentalWarning),这里**延迟导入**:
// 激活插件不该因为 Node 版本或 flag 问题直接失败,真正的报错留到第一次用索引时,并说清楚原因。

/** 本插件派生索引的 application id('BSQ1')。 */
export const STORE_APPLICATION_ID = 0x42535131;
/** 派生索引 schema 版本;不兼容时原地重建(这个库可以随时删)。 */
export const STORE_SCHEMA_VERSION = 6;

/**
 * 中文召回用的零宽空格:unicode61 把它当分隔符(不出词项),正文与 snippet 都不受影响。
 * 目的:让 unicode61 把每个汉字切成独立词项且位置连续,于是原来的字面短语匹配
 * 自然升级成"任意 ≥1 字的中文子串召回"。这与 s-forge 的自定义分词器同构——
 * 它那边 `fts5SiYuanTokenize()` 也是逐码点出词项(见 kernel/sql/database.go:516 与 go-sqlite3 fork)。
 */
const CJK_SEP = "\u200b";
/** 需要逐字隔离的码点:常规汉字区 + 扩展 B + 假名 + 谚文。 */
const CJK_RUN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u{20000}-\u{2fa1f}\u3040-\u30ff\uac00-\ud7af]/gu;

/**
 * 索引侧与查询侧必须用**同一个**变换,否则中文全灭。
 * 1) 先归一化掉正文里既有的零宽空格;2) 每个 CJK 字两侧插分隔符;3) 相邻重复的分隔符压成一个。
 * @param value - 原始文本。
 * @returns 供 FTS5 存/查的变形文本。
 */
export function splitCjk(value) {
  const text = String(value ?? "").split(CJK_SEP).join("");
  return text
    .replace(CJK_RUN, (char) => CJK_SEP + char + CJK_SEP)
    .split(CJK_SEP + CJK_SEP)
    .join(CJK_SEP);
}

/** 把变形文本还原成人类可读的原文(读回正文与 snippet 时用)。 */
export function joinCjk(value) {
  return String(value ?? "").split(CJK_SEP).join("");
}

/**
 * 一组块的指纹:把 (seq, path, type, 是否进倒排, 正文指纹) 逐个折进一个 32 位哈希。
 * 追加快路径靠它判断"上一轮的尾部这一段有没有被动过"。
 * @param list - 块数组(顺序即传入顺序)。
 * @returns 32 位无符号整数。
 */
export function blocksDigest(list) {
  let h = 0x811c9dc5;
  for (const block of Array.isArray(list) ? list : []) {
    const part = `${block?.seq ?? -1}|${block?.path ?? ""}|${block?.type ?? ""}|${block?.searchable ? 1 : 0}|${textHash(block?.text)};`;
    for (let i = 0; i < part.length; i += 1) h = Math.imul(h ^ part.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/**
 * 正文指纹:两个 32 位 FNV-1a 拼成约 53 位。
 * 用来回答"这一块的正文有没有变",从而在差量写入里跳过没变的块——
 * 只比长度会漏掉"等长改写",所以必须真的过一遍字符。
 * @param text - 块正文。
 * @returns 0..2^53-1 的整数。
 */
export function textHash(text) {
  const s = typeof text === "string" ? text : "";
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    const code = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code + i), 0x01000193);
  }
  return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 0x1fffff);
}

const OWN_TABLES = ["index_state", "indexed_sessions", "block_meta", "block_text", "block_fts"];

/** 允许的排序字段:元数据列,不参与倒排。 */
const ORDER_COLUMNS = {
  time: "time",
  length: "length",
  seq: "seq",
  type: "block_type",
};

/**
 * 打开(必要时创建)块索引库。
 * @param options - `{ path, journalMode }`;path 支持 `:memory:`。
 * @returns 存储句柄。
 */
export async function openStore(options = {}) {
  const path = typeof options.path === "string" && options.path.trim() ? options.path.trim() : ":memory:";
  const journalMode = options.journalMode ?? "wal";
  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import("node:sqlite"));
  } catch (error) {
    throw new Error(`当前 Node(${process.version})没有 node:sqlite,块索引无法建库:${
      error && error.message ? error.message : String(error)}`);
  }
  const db = new DatabaseSync(path);
  try {
    const appId = Number(db.prepare("PRAGMA application_id").get().application_id);
    const version = Number(db.prepare("PRAGMA user_version").get().user_version);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT GLOB 'sqlite_*'")
      .all()
      .map((row) => String(row.name));
    if (appId !== 0 && appId !== STORE_APPLICATION_ID) {
      throw new Error(`块索引库 "${path}" 属于别的应用,拒绝打开`);
    }
    if (appId === 0 && tables.length > 0) {
      throw new Error(`块索引库 "${path}" 不是本插件的派生索引(已有未知表:${tables.join(", ")}),拒绝打开`);
    }
    if (appId === STORE_APPLICATION_ID && version !== STORE_SCHEMA_VERSION) {
      for (const name of tables.filter((table) => OWN_TABLES.includes(table) || table.startsWith("block_fts"))) {
        db.exec(`DROP TABLE IF EXISTS "${name.replaceAll('"', '""')}"`);
      }
      db.exec("PRAGMA user_version = 0");
      // 就地重建只是把整库页面丢进 freelist,文件不缩(实测 65.8MB 的库 DROP 成 0 行后仍是 65.8MB),
      // 所以这里立刻归还一次。此刻还没有任何业务事务,是少数能安全 VACUUM 的位置之一。
      try {
        db.exec("VACUUM");
      } catch {
        // 回收失败不影响正确性,后续还有 compact() 这条出口。
      }
    }
    db.exec(`PRAGMA journal_mode = ${journalMode.toUpperCase()}`);
    if (journalMode === "wal") {
      // 静息 WAL 的体积:默认 autocheckpoint=1000 时实测常驻 4.8MB,收到 256 并把 journal 上限
      // 钉在 1MB 后约 1.0MB(每库省约 3.8MB),写入耗时在噪声内(1899ms vs 2021ms)。
      db.exec("PRAGMA wal_autocheckpoint = 256");
      db.exec("PRAGMA journal_size_limit = 1048576");
    }
    ensureSchema(db);
    return createStore(db, path);
  } catch (error) {
    db.close();
    throw error;
  }
}

function ensureSchema(db) {
  db.exec("PRAGMA application_id = " + String(STORE_APPLICATION_ID));
  db.exec(`
    CREATE TABLE IF NOT EXISTS index_state (
      singleton   INTEGER PRIMARY KEY CHECK (singleton = 1),
      generation  INTEGER NOT NULL,
      updated_ms  INTEGER NOT NULL
    ) STRICT
  `);
  db.exec("INSERT OR IGNORE INTO index_state (singleton, generation, updated_ms) VALUES (1, 0, 0)");
  db.exec(`
    CREATE TABLE IF NOT EXISTS indexed_sessions (
      id          TEXT PRIMARY KEY,
      cwd         TEXT,
      title       TEXT,
      revision    TEXT NOT NULL,
      events      INTEGER NOT NULL,
      blocks      INTEGER NOT NULL,
      searchable  INTEGER NOT NULL,
      checked_ms  INTEGER NOT NULL,
      generation  INTEGER NOT NULL,
      tail_seq    INTEGER,
      tail_digest INTEGER,
      carry       INTEGER,
      config_key  TEXT
    ) STRICT
  `);
  // 变更令牌列:来源是 sessionPersistence.stat 的文件物理身份(不读事件日志)。
  // 用 ALTER 增量加列而不是 bump 版本号——版本号一变就得整库重建,代价太大;加列是瞬时操作。
  if (!db.prepare("PRAGMA table_info(indexed_sessions)").all().some((row) => row.name === "token")) {
    db.exec("ALTER TABLE indexed_sessions ADD COLUMN token TEXT");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS block_meta (
      block_id    TEXT PRIMARY KEY,
      fts_rowid   INTEGER,
      session_id  TEXT NOT NULL,
      cwd         TEXT,
      seq         INTEGER NOT NULL,
      path        TEXT NOT NULL,
      block_type  TEXT NOT NULL,
      surface     TEXT,
      event_type  TEXT,
      time        INTEGER,
      length      INTEGER NOT NULL,
      searchable  INTEGER NOT NULL,
      hash        INTEGER
    ) STRICT
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_block_meta_session ON block_meta(session_id, seq)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_block_meta_type ON block_meta(block_type, length)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_block_meta_event ON block_meta(event_type, time)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_block_meta_time ON block_meta(time)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_block_meta_cwd ON block_meta(cwd, time)");
  // 检索那条 JOIN 按 m.fts_rowid = block_fts.rowid 探测;没有这个索引,每条命中都要全扫一遍
  // block_meta(实测 6 万行时约 9.4ms/次探测)。
  db.exec("CREATE INDEX IF NOT EXISTS idx_block_meta_rowid ON block_meta(fts_rowid)");
  db.exec(`
    CREATE TABLE IF NOT EXISTS block_text (
      block_id  TEXT PRIMARY KEY,
      text      TEXT NOT NULL
    ) STRICT
  `);
  db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS block_fts USING fts5(text, tokenize = 'unicode61')");
  db.exec(`PRAGMA user_version = ${STORE_SCHEMA_VERSION}`);
}

/**
 * 把过滤条件编成 block_meta 上的 WHERE 片段。search 与两类元数据查询共用同一套谓词,
 * 因此"能搜到的"与"能筛到的"永远不会分叉。
 * @param filter - `{ sessionIds, blockTypes, eventTypes, surfaces, cwds, cwdsNot, requireWorkspace, seq, lengthMin, lengthMax, timeMin, timeMax, searchable }`。
 * @returns `{ sql: string[], params: unknown[] }`。
 */
export function buildPredicates(filter = {}) {
  const sql = [];
  const params = [];
  const list = (name, column) => {
    const values = Array.isArray(filter[name]) ? filter[name].filter((value) => typeof value === "string" && value !== "") : [];
    if (values.length === 0) return;
    sql.push(`${column} IN (${values.map(() => "?").join(", ")})`);
    params.push(...values);
  };
  list("sessionIds", "session_id");
  list("blockTypes", "block_type");
  list("eventTypes", "event_type");
  list("surfaces", "surface");
  // 工作区就是会话头的 cwd(DSH 的 workspaceRoot 取 header.cwd ?? 部署默认)。
  // Windows 路径大小写不敏感,所以这里显式 COLLATE NOCASE。
  const cwds = Array.isArray(filter.cwds) ? filter.cwds.filter((value) => typeof value === "string" && value !== "") : [];
  if (cwds.length > 0) {
    sql.push(`cwd COLLATE NOCASE IN (${cwds.map(() => "?").join(", ")})`);
    params.push(...cwds);
  }
  // 排除工作区(黑名单)。NULL 的 cwd 不能因为 `NULL NOT IN (...)` 求值为 NULL 而被顺手丢掉,
  // 所以显式放行 cwd IS NULL——要不要那个桶由调用方用 requireWorkspace 决定。
  const cwdsNot = Array.isArray(filter.cwdsNot) ? filter.cwdsNot.filter((value) => typeof value === "string" && value !== "") : [];
  if (cwdsNot.length > 0) {
    sql.push(`(cwd IS NULL OR cwd COLLATE NOCASE NOT IN (${cwdsNot.map(() => "?").join(", ")}))`);
    params.push(...cwdsNot);
  }
  if (filter.requireWorkspace === true) sql.push("cwd IS NOT NULL");
  // 指定事件序号(按事件列举块时用):整数才生效,负数/小数当没给。
  if (Number.isInteger(filter.seq) && filter.seq >= 0) {
    sql.push("seq = ?");
    params.push(filter.seq);
  }
  const range = (name, column) => {
    const value = filter[name];
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    sql.push(`${column} >= ?`);
    params.push(Math.trunc(value));
  };
  const upper = (name, column) => {
    const value = filter[name];
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    sql.push(`${column} <= ?`);
    params.push(Math.trunc(value));
  };
  range("lengthMin", "length");
  upper("lengthMax", "length");
  range("timeMin", "time");
  upper("timeMax", "time");
  if (filter.searchable === "only") sql.push("searchable = 1");
  if (filter.searchable === "never") sql.push("searchable = 0");
  return { sql, params };
}

function createStore(db, path) {
  /**
   * `size()` 的结果缓存。
   *
   * 为什么必须缓存:`size()` 里有两条随正文总量线性增长的全表扫描
   * (`COUNT(*) FROM block_fts` 遍历整个 FTS5 倒排;`SUM(LENGTH(CAST(text AS BLOB)))`
   * 把正文整份读出来量一遍),实测对当前这个库单次约 1.3 秒。
   * 而它算的全是**慢变量** —— 库体积、表行数、正文总字节,一秒内不可能有意义地变化,
   * 面板却是每秒问一次。缓存不改变任何判断,只是不再重复问同一个问题。
   *
   * 写入路径不必失效它:这些数字本来就是"最近一次观测",不是精确到毫秒的事实。
   * 需要精确值的地方(收缩前后对比)显式传 `{ fresh: true }`。
   */
  let sizeCache = { value: undefined, at: 0 };
  /** 缓存时长:比面板轮询间隔长得多,又短到用户手动触发收缩后能立刻看到新数字。 */
  const SIZE_CACHE_MS = 30000;
  const insertMeta = db.prepare(`
    INSERT INTO block_meta (block_id, fts_rowid, session_id, cwd, seq, path, block_type, surface, event_type, time, length, searchable, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFts = db.prepare("INSERT INTO block_fts (text) VALUES (?)");
  const insertText = db.prepare("INSERT OR REPLACE INTO block_text (block_id, text) VALUES (?, ?)");
  const deleteFtsByRowid = db.prepare("DELETE FROM block_fts WHERE rowid = ?");
  const deleteMetaBySession = db.prepare("DELETE FROM block_meta WHERE session_id = ?");
  const deleteTextBySession = db.prepare("DELETE FROM block_text WHERE block_id IN (SELECT block_id FROM block_meta WHERE session_id = ?)");
  const selectRowidsBySession = db.prepare("SELECT fts_rowid FROM block_meta WHERE session_id = ? AND fts_rowid IS NOT NULL");
  const selectSession = db.prepare("SELECT * FROM indexed_sessions WHERE id = ?");
  const upsertSession = db.prepare(`
    INSERT INTO indexed_sessions (id, cwd, title, revision, events, blocks, searchable, checked_ms, generation, tail_seq, tail_digest, carry, config_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      cwd = excluded.cwd,
      title = excluded.title,
      revision = excluded.revision,
      events = excluded.events,
      blocks = excluded.blocks,
      searchable = excluded.searchable,
      checked_ms = excluded.checked_ms,
      generation = excluded.generation,
      tail_seq = excluded.tail_seq,
      tail_digest = excluded.tail_digest,
      carry = excluded.carry,
      config_key = excluded.config_key
  `);
  const updateBlockCwd = db.prepare("UPDATE block_meta SET cwd = ? WHERE session_id = ?");
  const markCheckedStmt = db.prepare("UPDATE indexed_sessions SET checked_ms = ? WHERE id = ?");
  const setTokenStmt = db.prepare("UPDATE indexed_sessions SET token = ? WHERE id = ?");
  const deleteSessionStmt = db.prepare("DELETE FROM indexed_sessions WHERE id = ?");
  const bumpGeneration = db.prepare("UPDATE index_state SET generation = generation + 1, updated_ms = ? WHERE singleton = 1");
  const stateStmt = db.prepare("SELECT generation, updated_ms FROM index_state WHERE singleton = 1");
  const selectTextByRowid = db.prepare("SELECT text FROM block_fts WHERE rowid = ?");
  const selectTextByBlockId = db.prepare("SELECT text FROM block_text WHERE block_id = ?");
  const selectMetaByBlockId = db.prepare("SELECT * FROM block_meta WHERE block_id = ?");
  // 差量写入用:一次取出该会话已索引的全部块,好与新块集合索引更新。
  const selectMetaBySession = db.prepare(`
    SELECT block_id, fts_rowid, seq, path, block_type, surface, event_type, time, length, searchable, hash, cwd
    FROM block_meta WHERE session_id = ?
  `);
  const updateFtsText = db.prepare("UPDATE block_fts SET text = ? WHERE rowid = ?");
  const updateMetaFull = db.prepare(`
    UPDATE block_meta SET path = ?, block_type = ?, cwd = ?, surface = ?, event_type = ?, time = ?, length = ?, searchable = ?, hash = ?, fts_rowid = ?
    WHERE block_id = ?
  `);
  const updateMetaFields = db.prepare(`
    UPDATE block_meta SET path = ?, block_type = ?, cwd = ?, surface = ?, event_type = ?, time = ?
    WHERE block_id = ?
  `);
  const deleteMetaByBlockId = db.prepare("DELETE FROM block_meta WHERE block_id = ?");
  const deleteTextByBlockId = db.prepare("DELETE FROM block_text WHERE block_id = ?");

  const transaction = (work) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // 回滚本身失败时保留原始错误,它是可定位的那个。
      }
      throw error;
    }
  };

  const clamp = (value, fallback, max) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) return fallback;
    return Math.min(n, max);
  };

  /** 一条 block_meta 行的正文化:进倒排的按 rowid 取,否则回 block_text。 */
  const textOf = (row) => {
    if (row === undefined) return "";
    if (row.fts_rowid !== null && row.fts_rowid !== undefined) {
      const found = selectTextByRowid.get(row.fts_rowid);
      // 倒排里那份是拆过字的变形正文,读回时要还原;block_text 那份是原文,不能动。
      return found === undefined ? "" : joinCjk(String(found.text));
    }
    const stored = selectTextByBlockId.get(row.block_id);
    return stored === undefined ? "" : String(stored.text);
  };

  const metaView = (row, withText) => ({
    blockId: row.block_id,
    sessionId: row.session_id,
    cwd: row.cwd,
    seq: Number(row.seq),
    path: row.path,
    blockType: row.block_type,
    surface: row.surface,
    eventType: row.event_type,
    time: row.time === null ? undefined : Number(row.time),
    length: Number(row.length),
    searchable: Number(row.searchable) === 1,
    ...(withText ? { text: textOf(row) } : {}),
  });

  /** 排序子句:元数据查询用,搜引用 bm25。 */
  const orderClause = (request) => {
    const column = ORDER_COLUMNS[request.orderBy] ?? "time";
    const direction = request.descending === false ? "ASC" : "DESC";
    return `ORDER BY ${column} ${direction}, session_id ASC, seq ASC, path ASC`;
  };

  return {
    path,
    /** 当前世代:任何会话的块发生变化都会 +1,游标据此判断是否过期。 */
    generation() {
      return Number(stateStmt.get().generation);
    },
    updatedMs() {
      return Number(stateStmt.get().updated_ms);
    },
    getSession(id) {
      const row = selectSession.get(id);
      return row === undefined ? undefined : row;
    },
    /**
     * 写入一个会话的块索引。默认**差量**:与新块集合逐块索引更新,只动真的变了的部分。
     *   - 新块 → INSERT(可检索的进倒排,有正文但不进倒排的进 block_text);
     *   - 正文变了且两边都可检索 → 就地 `UPDATE block_fts SET text=? WHERE rowid=?`(省一次删+插);
     *   - 只有展示性元数据变了(如 cwd 变了) → 只 UPDATE block_meta,倒排一行都不碰;
     *   - 没变 → 完全不碰(这是"整会话重写"与它的差距所在);
     *   - 消失的块 → 删倒排行 + 正文 + 元数据。
     * 判定"没变"用正文指纹(长度 + ~53 位哈希),所以等长改写也不会被漏掉。
     * @param input - `{ sessionId, cwd, title, revision, events, blocks, now, mode }`;`mode: "full"` 强制走全量重写。
     * @returns `{ blocks, searchable, inserted, updated, unchanged, removed }`。
     */
    replaceSession({ sessionId, cwd, title, revision, events, blocks, now = Date.now(), mode = "diff", configKey }) {
      const workspace = typeof cwd === "string" && cwd !== "" ? cwd : null;
      const sessionTitle = typeof title === "string" && title.trim() !== "" ? title.trim() : null;
      const configToken = typeof configKey === "string" ? configKey : null;
      return transaction(() => {
        const generation = Number(stateStmt.get().generation) + 1;
        const list = Array.isArray(blocks) ? blocks : [];
        // 水位与尾部指纹:这一轮写入后,下次判断"能不能走追加快路径"就靠这两个数。
        const tailSeq = list.reduce((max, block) => (Number.isInteger(block?.seq) && block.seq > max ? block.seq : max), -1);
        const tailDigest = blocksDigest(list.filter((block) => block.seq === tailSeq));
        const commit = (blockCount, searchableCount) => {
          upsertSession.run(
            sessionId, workspace, sessionTitle, revision, events, blockCount, searchableCount, now, generation,
            tailSeq, tailDigest, list.length, configToken,
          );
          bumpGeneration.run(now);
        };

        // 追加快路径:上一轮的尾部(块数 + 尾部指纹)原封未动,且块开关配置没变
        // → 老块既不读也不比,只插入水位之上的新块。会话日志是追加写的,这是常态。
        const stored = mode === "full" ? undefined : selectSession.get(sessionId);
        if (stored !== undefined && Number.isInteger(stored.tail_seq) && (stored.config_key ?? null) === configToken) {
          const carry = list.reduce((count, block) => (block.seq <= stored.tail_seq ? count + 1 : count), 0);
          const sameTail = carry === Number(stored.carry ?? -1)
            && blocksDigest(list.filter((block) => block.seq === stored.tail_seq)) === Number(stored.tail_digest ?? -1);
          if (sameTail) {
            // cwd 变了要让块上的冗余列跟上(一条 UPDATE,不读回任何行)。
            if (stored.cwd !== workspace) updateBlockCwd.run(workspace, sessionId);
            let inserted = 0;
            let addedSearchable = 0;
            for (const block of list) {
              if (block.seq <= stored.tail_seq) continue;
              const text = typeof block.text === "string" ? block.text : "";
              let rowid = null;
              if (block.searchable) {
                rowid = Number(insertFts.run(splitCjk(text)).lastInsertRowid);
                addedSearchable += 1;
              } else if (text.trim() !== "") {
                insertText.run(block.id, text);
              }
              insertMeta.run(
                block.id, rowid, sessionId, workspace, block.seq, block.path, block.type,
                block.surface ?? null, block.eventType ?? null, block.time ?? null,
                Number(block.length ?? 0), block.searchable ? 1 : 0, text.trim() === "" ? 0 : textHash(text),
              );
              inserted += 1;
            }
            const searchableTotal = Number(stored.searchable ?? 0) + addedSearchable;
            commit(list.length, searchableTotal);
            return {
              blocks: list.length,
              searchable: searchableTotal,
              inserted,
              updated: 0,
              unchanged: carry,
              removed: 0,
              fast: true,
            };
          }
        }

        // 慢路径(全量 / 日志被改写 / 块开关变了):与该会话已索引的块逐块索引更新。
        // 全量模式先把旧行清干净,否则会与下面的 INSERT 撞主键。
        if (mode === "full") {
          for (const row of selectRowidsBySession.all(sessionId)) deleteFtsByRowid.run(row.fts_rowid);
          deleteTextBySession.run(sessionId);
          deleteMetaBySession.run(sessionId);
        }
        const previous = mode === "full" ? [] : selectMetaBySession.all(sessionId);
        const oldById = new Map(previous.map((row) => [row.block_id, row]));
        const nextIds = new Set(list.map((block) => block.id));
        let inserted = 0;
        let updated = 0;
        let unchanged = 0;
        let removed = 0;
        let searchable = 0;

        // 1) 消失的块:倒排、正文、元数据一起清。
        for (const row of previous) {
          if (nextIds.has(row.block_id)) continue;
          if (row.fts_rowid !== null && row.fts_rowid !== undefined) deleteFtsByRowid.run(row.fts_rowid);
          deleteTextByBlockId.run(row.block_id);
          deleteMetaByBlockId.run(row.block_id);
          removed += 1;
        }

        // 2) 现有块:逐块判断要不要动。
        const written = new Set();
        for (const block of list) {
          if (written.has(block.id)) continue;
          written.add(block.id);
          const text = typeof block.text === "string" ? block.text : "";
          const hasText = text.trim() !== "";
          const hash = hasText ? textHash(text) : 0;
          const length = Number(block.length ?? 0);
          if (block.searchable) searchable += 1;
          const old = oldById.get(block.id);
          if (old === undefined) {
            let rowid = null;
            if (block.searchable) {
              rowid = Number(insertFts.run(splitCjk(text)).lastInsertRowid);
            } else if (hasText) {
              insertText.run(block.id, text);
            }
            insertMeta.run(
              block.id, rowid, sessionId, workspace, block.seq, block.path, block.type,
              block.surface ?? null, block.eventType ?? null, block.time ?? null, length, block.searchable ? 1 : 0, hash,
            );
            inserted += 1;
            continue;
          }
          const oldSearchable = Number(old.searchable) === 1;
          const sameText = Number(old.hash ?? -1) === hash && Number(old.length) === length;
          const sameKind = oldSearchable === (block.searchable === true);
          const sameMeta = old.surface === (block.surface ?? null)
            && old.event_type === (block.eventType ?? null)
            && old.cwd === workspace
            && Number(old.time ?? -1) === Number(block.time ?? -1)
            && old.path === block.path
            && old.block_type === block.type;
          if (sameText && sameKind) {
            if (sameMeta) {
              unchanged += 1;
              continue;
            }
            // 只有展示性元数据变了:倒排一行都不碰。
            updateMetaFields.run(block.path, block.type, workspace, block.surface ?? null, block.eventType ?? null, block.time ?? null, block.id);
            updated += 1;
            continue;
          }
          let rowid = null;
          if (block.searchable) {
            if (oldSearchable && old.fts_rowid !== null && old.fts_rowid !== undefined) {
              // 两边都进倒排:就地改正文,复用原 rowid。
              updateFtsText.run(splitCjk(text), old.fts_rowid);
              rowid = old.fts_rowid;
            } else {
              if (old.fts_rowid !== null && old.fts_rowid !== undefined) deleteFtsByRowid.run(old.fts_rowid);
              rowid = Number(insertFts.run(splitCjk(text)).lastInsertRowid);
            }
            deleteTextByBlockId.run(block.id);
          } else {
            if (old.fts_rowid !== null && old.fts_rowid !== undefined) deleteFtsByRowid.run(old.fts_rowid);
            if (hasText) insertText.run(block.id, text);
            else deleteTextByBlockId.run(block.id);
          }
          updateMetaFull.run(
            block.path, block.type, workspace, block.surface ?? null, block.eventType ?? null,
            block.time ?? null, length, block.searchable ? 1 : 0, hash, rowid, block.id,
          );
          updated += 1;
        }

        commit(written.size, searchable);
        return { blocks: written.size, searchable, inserted, updated, unchanged, removed, fast: false };
      });
    },
    /** 只更新“检查过”的时间戳,不动内容(修订未变时的快路径)。 */
    markChecked(id, now = Date.now()) {
      markCheckedStmt.run(now, id);
    },
    /**
     * 记下这个会话的变更令牌(来自便宜快照:`sessionPersistence.stat` 的文件物理身份)。
     * 下次令牌相同就整段跳过——连 `listEvents` 都不必读。
     * @param id - 会话 id。
     * @param token - 令牌字符串;空值表示清掉。
     */
    setToken(id, token) {
      setTokenStmt.run(typeof token === "string" && token !== "" ? token : null, id);
    },
    /** 删除一个会话的全部索引(会话被删或不该被索引时)。 */
    deleteSession(id, now = Date.now()) {
      return transaction(() => {
        for (const row of selectRowidsBySession.all(id)) deleteFtsByRowid.run(row.fts_rowid);
        deleteTextBySession.run(id);
        deleteMetaBySession.run(id);
        deleteSessionStmt.run(id);
        bumpGeneration.run(now);
      });
    },
    /**
     * 块级全文检索。查询文本一律当字面短语(FTS5 语法视为数据),与官方语义一致。
     * @param request - `{ query, ...过滤条件, limit, offset, snippetTokens }`。
     * @returns `{ items, hasMore }`;不返回总数——官方 Phase4 的结论是别为翻页再算一次 COUNT。
     */
    search(request = {}) {
      // 查询侧与索引侧过同一个 CJK 变换,再整体包成字面短语(FTS5 语法一律当数据)。
      const phrase = `"${splitCjk(String(request.query ?? "")).replaceAll('"', '""')}"`;
      // 刻意不加 searchable = 1:JOIN 出来的行一定有 fts_rowid(等价于 searchable=1),
      // 它是恒真谓词,只会干扰计划器选路。
      const filter = buildPredicates(request);
      const conditions = filter.sql.length > 0 ? `AND ${filter.sql.join(" AND ")}` : "";
      const limit = clamp(request.limit, 20, 1000);
      const offset = Math.max(0, Math.trunc(Number(request.offset ?? 0)) || 0);
      const rows = db
        .prepare(`
          SELECT m.block_id, m.session_id, m.seq, m.path, m.block_type, m.surface, m.event_type, m.time, m.length, m.searchable,
                 snippet(block_fts, 0, '[[', ']]', '…', ?) AS snippet,
                 bm25(block_fts) AS score
          FROM block_fts JOIN block_meta m ON m.fts_rowid = block_fts.rowid
          WHERE block_fts MATCH ? ${conditions}
          ORDER BY rank
          LIMIT ? OFFSET ?
        `)
        .all(Number(request.snippetTokens ?? 24), phrase, ...filter.params, limit + 1, offset);
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit).map((row) => ({
        ...metaView(row, false),
        score: Number(row.score),
        snippet: joinCjk(String(row.snippet ?? "")),
      }));
      // 排序只能写成 FTS5 原生的 `ORDER BY rank`,否则计划器退回"全量物化 + 临时 B 树"
      // (实测 6 万块/1000 命中:8.2s → 0.18s)。代价是丢了跨表 tiebreak,
      // 所以在当页之内补一次稳定排序,让并列名次仍旧"新的在前"。
      items.sort((a, b) => (a.score - b.score) || ((b.time ?? 0) - (a.time ?? 0)));
      return { items, hasMore };
    },
    /**
     * 纯元数据查询块(时间区间 / 长度区间 / 类型 / 事件类型 / surface,可跨会话)。
     * 不经过倒排,所以它也能返回没有正文的块与没进倒排的块(如 reasoning)。
     * @param request - 过滤条件 + `{ orderBy, descending, limit, offset, withText }`。
     */
    queryBlocks(request = {}) {
      const filter = buildPredicates(request);
      const conditions = filter.sql.length > 0 ? `WHERE ${filter.sql.join(" AND ")}` : "";
      const limit = clamp(request.limit, 200, 5000);
      const offset = Math.max(0, Math.trunc(Number(request.offset ?? 0)) || 0);
      const rows = db
        .prepare(`SELECT * FROM block_meta ${conditions} ${orderClause(request)} LIMIT ? OFFSET ?`)
        .all(...filter.params, limit + 1, offset);
      const hasMore = rows.length > limit;
      return { items: rows.slice(0, limit).map((row) => metaView(row, request.withText === true)), hasMore };
    },
    /**
     * 按事件(消息)聚合查询:把同一 sessionId + seq 的块折成一条"消息"记录。
     * 这是“某一时段的 agent 消息”这类问题的自然单位:先挑消息,再读它的块。
     * @param request - 过滤条件 + `{ orderBy: 'time'|'length'|'seq', descending, limit, offset }`。
     */
    queryMessages(request = {}) {
      const filter = buildPredicates(request);
      const conditions = filter.sql.length > 0 ? `WHERE ${filter.sql.join(" AND ")}` : "";
      const limit = clamp(request.limit, 50, 2000);
      const offset = Math.max(0, Math.trunc(Number(request.offset ?? 0)) || 0);
      const order = ORDER_COLUMNS[request.orderBy] ?? "time";
      const direction = request.descending === false ? "ASC" : "DESC";
      const rows = db
        .prepare(`
          SELECT session_id, seq, event_type, surface,
                 MIN(time) AS time, MAX(time) AS last_time,
                 COUNT(*) AS blocks, SUM(searchable) AS searchable_blocks,
                 SUM(length) AS total_length, MAX(length) AS max_length
          FROM block_meta ${conditions}
          GROUP BY session_id, seq, event_type, surface
          ORDER BY ${order === "length" ? "max_length" : order === "seq" ? "seq" : "time"} ${direction}, session_id ASC
          LIMIT ? OFFSET ?
        `)
        .all(...filter.params, limit + 1, offset);
      const hasMore = rows.length > limit;
      return {
        items: rows.slice(0, limit).map((row) => ({
          sessionId: row.session_id,
          seq: Number(row.seq),
          eventType: row.event_type,
          surface: row.surface,
          time: row.time === null ? undefined : Number(row.time),
          lastTime: row.last_time === null ? undefined : Number(row.last_time),
          blocks: Number(row.blocks),
          searchableBlocks: Number(row.searchable_blocks),
          totalLength: Number(row.total_length ?? 0),
          maxLength: Number(row.max_length ?? 0),
        })),
        hasMore,
      };
    },
    /**
     * 工作区清单:按会话头的 cwd 聚合(工作区就是会话的 cwd)。
     * 这是“按工作区查询会话”的入口——先看有哪些工作区、各有几个会话。
     * @param request - `{ limit }`。
     */
    queryWorkspaces(request = {}) {
      const limit = clamp(request.limit, 50, 1000);
      const rows = db
        .prepare(`
          SELECT cwd,
                 COUNT(DISTINCT session_id) AS sessions,
                 COUNT(*) AS blocks,
                 SUM(searchable) AS searchable_blocks,
                 MAX(time) AS last_time
          FROM block_meta
          GROUP BY cwd
          ORDER BY last_time DESC
          LIMIT ?
        `)
        .all(limit);
      return {
        items: rows.map((row) => ({
          cwd: row.cwd,
          sessions: Number(row.sessions),
          blocks: Number(row.blocks),
          searchableBlocks: Number(row.searchable_blocks),
          lastTime: row.last_time === null || row.last_time === undefined ? undefined : Number(row.last_time),
        })),
      };
    },
    /** 取若干会话的标题(从索引簿记里读,不调会话服务)。 */
    titlesFor(sessionIds) {
      const map = new Map();
      const ids = Array.isArray(sessionIds) ? sessionIds : [];
      for (const id of ids) {
        if (typeof id !== "string" || id === "") continue;
        const row = selectSession.get(id);
        if (row !== undefined && typeof row.title === "string" && row.title !== "") map.set(id, row.title);
      }
      return map;
    },
    /**
     * 会话清单(索引簿记):可按工作区、会话 id 与标题片段过滤。
     * @param request - `{ cwds, cwdsNot, sessionIds, titleContains, limit, offset }`。
     */
    querySessions(request = {}) {
      const conditions = [];
      const params = [];
      const sessionIds = Array.isArray(request.sessionIds) ? request.sessionIds.filter((value) => typeof value === "string" && value !== "") : [];
      if (sessionIds.length > 0) {
        conditions.push(`id IN (${sessionIds.map(() => "?").join(", ")})`);
        params.push(...sessionIds);
      }
      const cwds = Array.isArray(request.cwds) ? request.cwds.filter((value) => typeof value === "string" && value !== "") : [];
      if (cwds.length > 0) {
        conditions.push(`cwd COLLATE NOCASE IN (${cwds.map(() => "?").join(", ")})`);
        params.push(...cwds);
      }
      const cwdsNot = Array.isArray(request.cwdsNot) ? request.cwdsNot.filter((value) => typeof value === "string" && value !== "") : [];
      if (cwdsNot.length > 0) {
        conditions.push(`(cwd IS NULL OR cwd COLLATE NOCASE NOT IN (${cwdsNot.map(() => "?").join(", ")}))`);
        params.push(...cwdsNot);
      }
      const titleContains = typeof request.titleContains === "string" && request.titleContains.trim() !== ""
        ? request.titleContains.trim()
        : undefined;
      if (titleContains !== undefined) {
        // 标题片段匹配:SQLite 的 LIKE 对 ASCII 大小写不敏感,中文按字节比较,够用且不需要额外索引。
        conditions.push("title LIKE ? ESCAPE '\\'");
        params.push(`%${titleContains.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`);
      }
      const limit = clamp(request.limit, 100, 2000);
      const offset = Math.max(0, Math.trunc(Number(request.offset ?? 0)) || 0);
      const rows = db
        .prepare(`
          SELECT id, cwd, title, revision, events, blocks, searchable, checked_ms, generation
          FROM indexed_sessions
          ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""}
          ORDER BY checked_ms DESC
          LIMIT ? OFFSET ?
        `)
        .all(...params, limit + 1, offset);
      const hasMore = rows.length > limit;
      return {
        items: rows.slice(0, limit).map((row) => ({
          sessionId: row.id,
          cwd: row.cwd,
          title: row.title,
          revision: row.revision,
          events: Number(row.events),
          blocks: Number(row.blocks),
          searchableBlocks: Number(row.searchable),
          checkedMs: Number(row.checked_ms),
          generation: Number(row.generation),
        })),
        hasMore,
      };
    },
    /**
     * 按块列举(元数据查询的便捷形态):给定会话列出它索引过的每一个块,含没有正文的块。
     * @param request - `{ sessionId, seq, limit, offset, blockTypes, lengthMin, lengthMax, timeMin, timeMax }`。
     */
    listBlocks(request = {}) {
      return this.queryBlocks({
        ...request,
        sessionIds: request.sessionId === undefined ? request.sessionIds : [request.sessionId],
        orderBy: request.orderBy ?? "seq",
        descending: request.descending ?? false,
        limit: clamp(request.limit, 200, 5000),
      });
    },
    /** 取一个块的完整正文与元数据(正文来自 FTS rowid 或 block_text)。 */
    getBlock(blockIdValue) {
      const row = selectMetaByBlockId.get(blockIdValue);
      if (row === undefined) return undefined;
      return metaView(row, true);
    },
    /**
     * 取一个块的倒排 rowid(不进倒排或不存在就是 null)。
     * 差量写入的对外可观测点:没被重写的块 rowid 不会变。
     * @param blockIdValue - 块 id。
     */
    blockRowid(blockIdValue) {
      const row = selectMetaByBlockId.get(blockIdValue);
      if (row === undefined || row.fts_rowid === null || row.fts_rowid === undefined) return null;
      return Number(row.fts_rowid);
    },
    /**
     * 体积与分表规模:给界面监控用(对照 s-forge 的 `LogDatabaseSize`,它按库打印体积)。
     * `dbBytes` 来自 SQLite 自己的页计数(含未回收页);WAL 与文件级的字节在宿主侧另算。
     *
     * **默认走缓存**(见 `createStore` 顶部的说明):这两条聚合是全文扫描,而结果全是慢变量。
     * @param options - `{ fresh: true }` 绕过缓存(收缩前后对比这类需要精确值的地方用)。
     * @returns `{ path, dbBytes, pageCount, pageSize, textBytes, tables }`。
     */
    size(options = {}) {
      if (options.fresh !== true && sizeCache.value !== undefined && Date.now() - sizeCache.at < SIZE_CACHE_MS) {
        return sizeCache.value;
      }
      const pageCount = Number(db.prepare("PRAGMA page_count").get().page_count);
      const pageSize = Number(db.prepare("PRAGMA page_size").get().page_size);
      const tables = {};
      for (const table of ["block_meta", "block_text", "block_fts", "indexed_sessions", "index_state"]) {
        tables[table] = Number(db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c);
      }
      // LENGTH() 对 TEXT 返回字符数,要字节得转 BLOB。
      const textBytes = Number(db.prepare("SELECT COALESCE(SUM(LENGTH(CAST(text AS BLOB))), 0) AS b FROM block_fts").get().b)
        + Number(db.prepare("SELECT COALESCE(SUM(LENGTH(CAST(text AS BLOB))), 0) AS b FROM block_text").get().b);
      const value = { path, dbBytes: pageCount * pageSize, pageCount, pageSize, textBytes, tables };
      sizeCache = { value, at: Date.now() };
      return value;
    },
    /**
     * 收缩:先做 FTS5 段合并(`INSERT INTO block_fts(block_fts) VALUES('optimize')`),再归还空闲页。
     * 两步都要:只 VACUUM 放不出 FTS 段内的死空间——实测删掉 30% 正文后,
     * 31.5MB →(只 VACUUM)14.2MB →(optimize + VACUUM)8.8MB。
     * 代价与约束:optimize 会先把文件撑大,必须紧跟页回收;VACUUM 不能在事务内跑、
     * 需要约 1× 临时空间且独占连接。所以它**只从关库、手动、重建这些路径调用,绝不放在检索热路径上**。
     * @param request - `{ vacuum }`;`vacuum: false` 只做段合并(便宜,适合卸载时)。
     * @returns `{ beforeBytes, afterOptimizeBytes, afterBytes, savedBytes, vacuumed }`。
     */
    compact(request = {}) {
      const vacuum = request.vacuum !== false;
      // 收缩前后对比必须绕缓存:这里要的就是"这一刻到底多少字节",缓存会把它变成空操作。
      const before = this.size({ fresh: true });
      db.exec("INSERT INTO block_fts(block_fts) VALUES('optimize')");
      const optimized = this.size({ fresh: true });
      let after = optimized;
      if (vacuum) {
        db.exec("VACUUM");
        after = this.size({ fresh: true });
      }
      return {
        beforeBytes: before.dbBytes,
        afterOptimizeBytes: optimized.dbBytes,
        afterBytes: after.dbBytes,
        savedBytes: before.dbBytes - after.dbBytes,
        vacuumed: vacuum,
      };
    },
    /**
     * 值不值得收缩:文件字节明显超出正文体量(或超过 4MB 地板)时才建议动手。
     *
     * **必须把算好的 `size()` 传进来。** 以前这里自己调 `this.size()`,而 `size()` 里有
     * 两条随正文总量线性增长的全表扫描(`COUNT(*) FROM block_fts` 要遍历整个倒排、
     * `SUM(LENGTH(CAST(text AS BLOB)))` 要读出 526MB 正文),实测单次约 1.3 秒。
     * 面板快照又同时要 `size()` 和 `shouldCompact()`,于是**一次快照把这份成本付了两遍**
     * (实测 2.6 秒),而 SSE 每 1 秒推一次 —— 请求永远追不上,永久积压。
     * 缺参数直接抛:替调用方猜一个 size 等于悄悄换掉判断依据,而这里没有便宜的近似值。
     * @param current - 调用方已经算好的 `size()` 结果。
     * @returns 是否建议收缩。
     */
    shouldCompact(current) {
      if (current === undefined || typeof current !== "object") {
        throw new Error("store.shouldCompact 需要调用方传入 size() 的结果(它自己不再重算:那是两条全表扫描)");
      }
      return current.dbBytes > Math.max(4 * 1024 * 1024, current.textBytes * 1.6);
    },
    /**
     * 当前连接上的关键参数(s-forge 在开库时也会把库参数打出来)。
     * 注意:WAL 的 `wal_autocheckpoint` 与 `journal_size_limit` 都是**连接级**设置,
     * 另开一个连接读到的会是默认值,所以只能从本连接读。
     * @returns `{ journalMode, walAutocheckpoint, journalSizeLimit, pageSize, autoVacuum, synchronous }`。
     */
    pragmas() {
      const one = (name) => {
        const row = db.prepare(`PRAGMA ${name}`).get();
        return row === undefined ? undefined : Object.values(row)[0];
      };
      return {
        journalMode: String(one("journal_mode")),
        walAutocheckpoint: Number(one("wal_autocheckpoint")),
        journalSizeLimit: Number(one("journal_size_limit")),
        pageSize: Number(one("page_size")),
        autoVacuum: Number(one("auto_vacuum")),
        synchronous: Number(one("synchronous")),
      };
    },
    /**
     * 在块索引库上执行一条**只读** SQL(SELECT/WITH)。这是把索引开放成"可编写查询语句"的形态:
     * 块正文在 block_fts(拆字变形,检索用)与 block_text(原文,未进倒排的块),元数据在 block_meta,
     * 会话簿记在 indexed_sessions。文本分析(如循环输出判定)用递归 CTE 现场写,不内置。
     *
     * 只读是**引擎级强制**,不只是形状检查:执行期间把连接切到 `PRAGMA query_only = 1`。
     * 为什么必须这样:SQLite 允许 `WITH … INSERT/UPDATE/DELETE`,光看"以 SELECT/WITH 开头"挡不住写操作。
     * query_only 由 SQLite 自己拒绝任何写/DDL/ATTACH,和语句长什么样无关。
     * 形状检查(SELECT/WITH 开头、单条语句、自动 LIMIT)只用来尽早给出可读的错误信息。
     *
     * 未覆盖的残余风险:没有语句超时。递归 CTE 若不收敛(例如漏掉 WHERE 终止条件),
     * node:sqlite 是同步 API 且没有进度回调,会把事件循环占住——所以只读通道面向"可信作者"(本 agent)使用。
     * @param request - `{ sql, limit }`;单条语句、以 SELECT 或 WITH 开头;没有 LIMIT 会自动补一个上限。
     * @returns `{ columns, rows, rowCount, sql }`;sql 是实际执行的语句(含补上的 LIMIT)。
     */
    sqlQuery(request = {}) {
      const text = String(request.sql ?? "").trim().replace(/;+\s*$/, "");
      if (!/^(select|with)\b/i.test(text)) throw new Error("只允许单条 SELECT 或 WITH 查询(索引是派生库,但仍不开写通道)");
      if (text.includes(";")) throw new Error("只允许一条语句:请去掉多余的分号");
      const limit = clamp(request.limit, 200, 5000);
      const executed = /\blimit\b/i.test(text) ? text : `${text} LIMIT ${limit}`;
      let rows;
      // query_only 是连接级开关,本连接全程同步使用,所以这三步之间不会被别的操作插进来。
      db.exec("PRAGMA query_only = 1");
      try {
        rows = db.prepare(executed).all();
      } finally {
        db.exec("PRAGMA query_only = 0");
      }
      return {
        columns: rows.length > 0 ? Object.keys(rows[0]) : [],
        rows: rows.map((row) => {
          const view = {};
          for (const [key, value] of Object.entries(row)) {
            view[key] = typeof value === "string" && value.length > 200 ? `${value.slice(0, 200)}…(${value.length})` : value;
          }
          return view;
        }),
        rowCount: rows.length,
        sql: executed,
      };
    },
    /** 索引规模统计。 */
    stats() {
      const blocks = Number(db.prepare("SELECT COUNT(*) AS c FROM block_meta").get().c);
      const searchable = Number(db.prepare("SELECT COUNT(*) AS c FROM block_meta WHERE searchable = 1").get().c);
      const texts = Number(db.prepare("SELECT COUNT(*) AS c FROM block_text").get().c);
      const sessions = Number(db.prepare("SELECT COUNT(*) AS c FROM indexed_sessions").get().c);
      const state = stateStmt.get();
      return {
        path,
        blocks,
        searchable,
        storedTexts: texts,
        sessions,
        generation: Number(state.generation),
        updatedMs: Number(state.updated_ms),
      };
    },
    close() {
      db.close();
    },
  };
}
