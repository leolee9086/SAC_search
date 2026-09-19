// test/sql.test.mjs — 只读 SQL 通道:白名单校验、自动 LIMIT、以及用递归 CTE 写出「循环输出」判定。
//
// 设计立场:复杂分析(如循环输出)**不内置**——索引结构公开,判定由查询语句现场表达。
// 这里的循环判定 SQL 与 context-care 的 loop-guard 同参:某块末尾 80 行内同一行重复 ≥15 次
// 且占比 ≥20%、 qualifying 行数 ≥30。
import test from "node:test";
import assert from "node:assert/strict";

import { openStore } from "../lib/store.js";

/** 造一个块。 */
function block(sessionId, seq, type, text, searchable = type !== "reasoning") {
  return {
    id: `${sessionId}#${seq}#0`,
    sessionId,
    seq,
    path: "0",
    type,
    text,
    surface: "current",
    eventType: "assistant/message",
    time: 1_700_000_000_000 + seq,
    searchable,
    length: Array.from(text).length,
  };
}

/**
 * 循环输出判定的查询语句(与 README/工具描述里给模型看的示例同一形状)。
 * 窗口必须用窗口函数取"最后 80 条**合格**行"——直接写 `n >= total - 80` 会把
 * "原始行序号"与"合格行计数"混在一起(夹杂短行/空行时窗口远不止 80 行),
 * 于是中段卡带、结尾正常的块会被误判。这个坑真踩过,见下面那条回归测试。
 */
const LOOP_SQL = `
  WITH RECURSIVE
  split(block_id, n, line, rest) AS (
    SELECT bt.block_id, -1, '', bt.text || char(10)
    FROM block_text bt JOIN block_meta m ON m.block_id = bt.block_id
    WHERE m.block_type = 'reasoning'
    UNION ALL
    SELECT block_id, n + 1,
           substr(rest, 1, instr(rest, char(10)) - 1),
           substr(rest, instr(rest, char(10)) + 1)
    FROM split WHERE rest <> ''
  ),
  lines AS (
    SELECT block_id, n, trim(line, char(9) || char(10) || char(13) || ' ') AS line
    FROM split WHERE n >= 0 AND length(trim(line, char(9) || char(10) || char(13) || ' ')) >= 3
  ),
  per_block AS (
    SELECT block_id, COUNT(*) AS total FROM lines GROUP BY block_id
  ),
  ranked AS (
    SELECT block_id, line, ROW_NUMBER() OVER (PARTITION BY block_id ORDER BY n DESC) AS rev
    FROM lines
  ),
  tail AS (
    SELECT block_id, line FROM ranked WHERE rev <= 80
  ),
  counts AS (
    SELECT block_id, line, COUNT(*) AS cnt FROM tail GROUP BY block_id, line
  ),
  hits AS (
    SELECT c.block_id, c.line, c.cnt, p.total,
           ROW_NUMBER() OVER (PARTITION BY c.block_id ORDER BY c.cnt DESC) AS rn
    FROM counts c JOIN per_block p USING (block_id)
    -- 占比的分母是**窗口长度**(min(总合格行数, 80)),与 loop-guard 的 tail.length 一致。
    WHERE c.cnt >= 15 AND c.cnt >= 0.2 * MIN(p.total, 80) AND p.total >= 30
  ),
  best AS (
    -- 与 loop-guard 一致:每块只报最严重的那一行。
    SELECT block_id, line, cnt, total FROM hits WHERE rn = 1
  )
  SELECT h.block_id, h.line, h.cnt, h.total, m.length
  FROM best h JOIN block_meta m ON m.block_id = h.block_id
  ORDER BY h.cnt DESC
`;

test("sqlQuery:只开 SELECT/WITH 通道,其余一律拒绝", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    for (const bad of [
      "INSERT INTO block_meta VALUES (1)",
      "UPDATE block_meta SET length = 0",
      "DELETE FROM block_meta",
      "PRAGMA journal_mode = delete",
      "ATTACH DATABASE 'x' AS y",
      "SELECT 1; DROP TABLE block_meta",
      "create table t(x)",
    ]) {
      assert.throws(() => store.sqlQuery({ sql: bad }), `${bad} 必须被拒绝`);
    }
  } finally {
    store.close();
  }
});

test("sqlQuery:写操作由引擎拒绝——WITH 开头的 CTE 也不能借道写库", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    store.replaceSession({
      sessionId: "s1",
      cwd: null,
      revision: "r1",
      events: 1,
      blocks: [block("s1", 0, "text", "原本的正文")],
      now: 1,
    });
    // 形状检查放行的写法:以 WITH 开头,但收尾是写操作。SQLite 允许 CTE 前缀 INSERT/UPDATE/DELETE,
    // 所以这里必须靠 PRAGMA query_only 兜住。
    const writes = [
      "WITH x AS (SELECT 1) INSERT INTO block_meta (block_id) SELECT 'evil' FROM x",
      "WITH x AS (SELECT 1) UPDATE block_meta SET length = 999999",
      "WITH x AS (SELECT 1) DELETE FROM block_text",
      "SELECT 1 WHERE 1 = (SELECT COUNT(*) FROM block_meta) /* 顺手确认 SELECT 仍可用 */",
    ];
    assert.throws(() => store.sqlQuery({ sql: writes[0] }), "WITH … INSERT 必须被拒");
    assert.throws(() => store.sqlQuery({ sql: writes[1] }), "WITH … UPDATE 必须被拒");
    assert.throws(() => store.sqlQuery({ sql: writes[2] }), "WITH … DELETE 必须被拒");
    assert.equal(store.sqlQuery({ sql: writes[3] }).rowCount, 1, "普通 SELECT 照常");
    // 库没被动过。
    assert.equal(store.stats().blocks, 1);
    assert.equal(store.getBlock("s1#0#0").text, "原本的正文");
    assert.equal(store.getBlock("evil"), undefined);
    // query_only 用完必须复位,否则后续索引写入会全线瘫痪。
    store.replaceSession({
      sessionId: "s2",
      cwd: null,
      revision: "r1",
      events: 1,
      blocks: [block("s2", 0, "text", "查询之后再写入")],
      now: 2,
    });
    assert.equal(store.stats().blocks, 2, "查询结束后写路径必须恢复正常");
    assert.equal(store.pragmas().journalMode.length > 0, true);
  } finally {
    store.close();
  }
});

test("sqlQuery:普通查询可用,缺 LIMIT 自动补上", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    store.replaceSession({
      sessionId: "s1",
      cwd: "D:\\dev",
      revision: "r1",
      events: 1,
      blocks: [block("s1", 0, "text", "正文一条")],
      now: 1,
    });
    const plain = store.sqlQuery({ sql: "SELECT block_id, block_type FROM block_meta" });
    assert.equal(plain.rowCount, 1);
    assert.match(plain.sql, /LIMIT \d+$/, "没写 LIMIT 要自动补");
    const paged = store.sqlQuery({ sql: "SELECT block_id FROM block_meta LIMIT 5" });
    assert.equal(paged.sql.includes("LIMIT 200"), false, "自带 LIMIT 不重复补");
    assert.equal(paged.rowCount, 1);
    const counted = store.sqlQuery({ sql: "SELECT COUNT(*) AS c FROM block_meta", limit: 10 });
    assert.equal(counted.rows[0].c, 1);
  } finally {
    store.close();
  }
});

test("循环判定 SQL:真实形状的思考块被认出来,正常思考块不误报", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    // 卡带样本:与 context-care 记录的形状同构——同一行反复出现。
    const loopedLines = [];
    for (let i = 0; i < 20; i += 1) {
      loopedLines.push(`（输出。）`, `**做。**`, "go.");
    }
    loopedLines.push("前面还有一段不重复的铺垫,把总行数撑过 30。", "铺垫第二行,内容各不相同。", "铺垫第三行,继续撑行数。");
    // 正常样本:40 行互不相同的长思考。
    const normalLines = Array.from({ length: 40 }, (_, i) => `正常思考第 ${i} 行:这一步在验证块级索引的判定边界 ${i}。`);
    store.replaceSession({
      sessionId: "s1",
      cwd: "D:\\dev",
      revision: "r1",
      events: 2,
      blocks: [
        block("s1", 0, "reasoning", loopedLines.join("\n")),
        block("s1", 1, "reasoning", normalLines.join("\n")),
      ],
      now: 1,
    });
    const outcome = store.sqlQuery({ sql: LOOP_SQL, limit: 50 });
    assert.equal(outcome.rowCount, 1, `只应命中卡带的那一块,实际 ${outcome.rowCount}`);
    assert.equal(outcome.rows[0].block_id, "s1#0#0");
    assert.equal(outcome.rows[0].cnt, 20);
    assert.equal(outcome.rows[0].total, 63);
    assert.ok(
      ["（输出。）", "**做。**", "go."].includes(outcome.rows[0].line),
      `最严重行应是三条循环行之一,实际:${outcome.rows[0].line}`,
    );
    assert.equal(outcome.rows[0].length, Array.from(loopedLines.join("\n")).length);
  } finally {
    store.close();
  }
});

test("循环判定 SQL:正好卡在阈值下的不误报(14 次 / 不足 30 行)", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const lines = [];
    for (let i = 0; i < 14; i += 1) lines.push("循环行");
    for (let i = 0; i < 36; i += 1) lines.push(`普通行 ${i},各不相同。`);
    store.replaceSession({
      sessionId: "s1",
      cwd: null,
      revision: "r1",
      events: 1,
      blocks: [block("s1", 0, "reasoning", lines.join("\n"))],
      now: 1,
    });
    const outcome = store.sqlQuery({ sql: LOOP_SQL, limit: 50 });
    assert.equal(outcome.rowCount, 0, "14 次 < 15 次阈值,不得命中");
  } finally {
    store.close();
  }
});

test("循环判定 SQL:中段卡带但结尾正常的不误报,窗口只认最后 80 条合格行", async () => {
  const store = await openStore({ path: ":memory:" });
  try {
    const distinct = (prefix, count) => Array.from({ length: count }, (_, i) => `${prefix}第 ${i} 行,各不相同。`);
    // A:中段卡带 30 行,之后又写了 90 行正常内容 → 末尾窗口内没有重复,不该命中。
    const middle = [...distinct("开头", 40), ...Array.from({ length: 30 }, () => "卡带行"), ...distinct("收尾", 90)];
    // B:对照样本,末尾 60 行全是同一句 → 必须命中,且 cnt 不能超过窗口长度 80。
    const tail = [...distinct("铺垫", 30), ...Array.from({ length: 200 }, (_, i) => (i >= 140 ? "卡带行" : `中间第 ${i} 行,各不相同。`))];
    store.replaceSession({
      sessionId: "s1",
      cwd: null,
      revision: "r1",
      events: 2,
      blocks: [
        block("s1", 0, "reasoning", middle.join("\n")),
        block("s1", 1, "reasoning", tail.join("\n")),
      ],
      now: 1,
    });
    const outcome = store.sqlQuery({ sql: LOOP_SQL, limit: 50 });
    assert.equal(outcome.rowCount, 1, `只有末尾卡带的那块该命中,实际 ${outcome.rowCount}`);
    assert.equal(outcome.rows[0].block_id, "s1#1#0");
    assert.equal(outcome.rows[0].cnt, 60);
    assert.ok(outcome.rows[0].cnt <= 80, "窗口是 80 行,cnt 不可能超过窗口长度");
    assert.equal(outcome.rows[0].total, 230);
  } finally {
    store.close();
  }
});
