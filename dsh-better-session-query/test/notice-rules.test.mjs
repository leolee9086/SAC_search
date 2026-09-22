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
