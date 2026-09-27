// 提示规则是纯数据。这里只验证形状 —— 不为了测一条规则就把规则引擎拖成依赖:
// 插件之间(以及插件与库之间)的边界越少越好,这条规则的消费者那边另有测试。
import test from "node:test";
import assert from "node:assert/strict";
import { NOTICE_RULES, NOTICE_RULES_SERVICE } from "../lib/notice-rules.js";

test("提示规则服务名固定", () => {
  assert.equal(NOTICE_RULES_SERVICE, "memoryNoticeRules");
});

test("每条规则都写全了必填字段", () => {
  for (const rule of NOTICE_RULES) {
    assert.equal(typeof rule.id, "string", "id");
    assert.ok(rule.id.length > 0);
    assert.equal(typeof rule.order, "number", rule.id + " order");
    assert.ok(["notify", "transform"].includes(rule.action.kind), rule.id + " action.kind");
    assert.equal(typeof rule.action.by, "string", rule.id + " action.by");
    assert.ok(Array.isArray(rule.placement), rule.id + " placement");
    if (rule.action.kind === "notify") {
      assert.equal(typeof rule.action.say, "string", rule.id + " action.say");
      assert.ok(rule.action.say.length > 0);
    }
  }
});

test("规则 id 不重复", () => {
  const ids = NOTICE_RULES.map(rule => rule.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("正则写成字符串,不传 RegExp 对象", () => {
  for (const rule of NOTICE_RULES) {
    for (const field of ["said", "produced", "findRegex"]) {
      const value = rule.when[field];
      if (value !== undefined) assert.equal(typeof value, "string", rule.id + " " + field);
    }
  }
});

test("空闲提醒:15 分钟没调用记忆工具就提醒,并在提醒里说清怎么记", () => {
  const rule = NOTICE_RULES.find((candidate) => candidate.id === "memory-idle");
  assert.ok(rule, "memory-idle 规则不见了");
  // 引擎的 idle 语义是「调用过、但已过 N 分钟」(从没调用过时不命中),所以必须指名工具。
  assert.deepEqual(rule.when.idle, { since: "session_blocks_remember", minutes: 15 });
  assert.ok(rule.placement.includes("user"), "提醒发生在用户说话那一刻,不打断助手输出");
  // idle 的条件是「距离上次记东西」,不是「距离上次提醒」—— 不压冷却会每轮都响。
  assert.equal(rule.cooldownMinutes, 15);
  // 提醒必须说清「记的时候注意什么」,否则这条规则只会催,不会告诉它怎么做。
  for (const needle of ["- q 写成", "- a 只写结论", "- tag 给", "- perspective 三选一"]) {
    assert.ok(rule.action.say.includes(needle), "提醒里缺了「" + needle + "」");
  }
  // 也要有「没有就不要硬凑」的出口。
  assert.match(rule.action.say, /不要为了回应这条提醒硬凑/);
});

test("明说「记住」那条排在空闲提醒前面", () => {
  const explicit = NOTICE_RULES.find((rule) => rule.id === "memory-remember-request");
  const idle = NOTICE_RULES.find((rule) => rule.id === "memory-idle");
  // order 小的先赢:用户明说「记住」时,那条的措辞更贴切。
  assert.ok(explicit.order < idle.order, "顺序反了的话空闲提醒会盖过明确指令");
});

