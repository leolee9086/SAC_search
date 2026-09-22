import test from "node:test";
import assert from "node:assert/strict";
import {
  createPassiveRecallSource, extractKeywords, formatRecall, PASSIVE_RECALL_DEFAULTS, RECALL_SOURCE_NAME,
} from "../lib/passive-recall.js";

/** 造一个假记忆库:recall 直接返回给它的 items。 */
function fakeOpen(items) {
  return async () => ({ memory: { recall: () => ({ items, total: items.length, fresh: items.length, stale: 0 }) } });
}

test("抽关键词:连续汉字 + 英文数字词", () => {
  assert.deepEqual(extractKeywords("记住：我在长沙，用 DSH 的 rule-engine"),
    ["记住", "我在长沙", "DSH", "rule", "engine"]);
  assert.deepEqual(extractKeywords("a b"), []);
  assert.deepEqual(extractKeywords(""), []);
});

test("太短的输入不查", async () => {
  const source = createPassiveRecallSource({ open: async () => { throw new Error("不该被调用"); } });
  assert.deepEqual(await source({ userText: "好的" }), []);
});

test("拿不到记忆库时返回空,不抛", async () => {
  const source = createPassiveRecallSource({ open: async () => ({ memory: undefined }) });
  assert.deepEqual(await source({ userText: "我在长沙住过一段时间" }), []);
});

test("得分不够就不推", async () => {
  const source = createPassiveRecallSource({
    open: fakeOpen([{ blockId: "b1", time: 0, q: "q", a: "a", score: -0.1 }]),
  });
  assert.deepEqual(await source({ userText: "我在长沙住过一段时间" }), []);
});

test("得分够就推一条,正文带日期与问答", async () => {
  const source = createPassiveRecallSource({
    open: fakeOpen([{ blockId: "b1", time: Date.UTC(2026, 8, 22), q: "我在哪", a: "长沙", score: -5 }]),
  });
  const out = await source({ userText: "我在长沙住过一段时间" });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "passive-recall:b1");
  assert.match(out[0].text, /被动召回/);
  assert.match(out[0].text, /2026-09-22/);
  assert.match(out[0].text, /长沙/);
  // 通知里不带分数 —— 那是本插件自己的判断依据,通道不需要知道。
  assert.equal(out[0].score, undefined);
  assert.equal(out[0].cooldownMinutes, PASSIVE_RECALL_DEFAULTS.cooldownMinutes);
});

test("多条够格时合成一条通知,id 带上全部 blockId", async () => {
  const source = createPassiveRecallSource({
    open: fakeOpen([
      { blockId: "b1", time: 0, q: "q1", a: "a1", score: -9 },
      { blockId: "b2", time: 0, q: "q2", a: "a2", score: -3 },
    ]),
  });
  const out = await source({ userText: "我在长沙住过一段时间" });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "passive-recall:b1,b2");
});

test("enabled=false 时什么都不做", async () => {
  const source = createPassiveRecallSource({
    open: async () => { throw new Error("不该被调用"); },
    config: { enabled: false },
  });
  assert.deepEqual(await source({ userText: "我在长沙住过一段时间" }), []);
});

test("formatRecall 排出来的是给人看的一段话", () => {
  const text = formatRecall([{ time: Date.UTC(2026, 8, 22), q: "我在哪", a: "长沙" }]);
  assert.match(text, /^-?<被动召回>/m);
  assert.match(text, /- \[2026-09-22\] 我在哪 → 长沙/);
  assert.match(text, /自动召回的/);
});

test("源名固定", () => {
  assert.equal(RECALL_SOURCE_NAME, "passive-recall");
});
