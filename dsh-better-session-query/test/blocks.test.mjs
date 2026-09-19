// test/blocks.test.mjs — 块抽取的纯函数测试:不碰 ctx、不碰 sqlite、不读 DSH 源码。
import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_INCLUDE,
  blockId,
  buildSessionBlocks,
  codepointLength,
  eventsRevision,
  extractBlocks,
  isSearchable,
} from "../lib/blocks.js";

/** 造一个用户消息事件(消息体在 data.content)。 */
function userMessage(seq, content, time = 1700000000000) {
  return { seq, type: "user/message", time, data: { content } };
}

/** 造一个助手消息事件(消息体在 data.message.content)。 */
function assistantMessage(seq, content, time = 1700000001000) {
  return { seq, type: "assistant/message", time, data: { message: { content } } };
}

test("一条消息拆成 N 个块,路径按出现顺序编号", () => {
  const blocks = extractBlocks(userMessage(3, [
    { type: "text", text: "第一段" },
    { type: "text", text: "第二段" },
  ]), { sessionId: "s1" });
  assert.deepEqual(blocks.map((block) => [block.path, block.type, block.text]), [
    ["0", "text", "第一段"],
    ["1", "text", "第二段"],
  ]);
  assert.equal(blocks[0].seq, 3);
  assert.equal(blocks[0].sessionId, "s1");
  assert.equal(blocks[0].eventType, "user/message");
  assert.equal(blocks[0].time, 1700000000000);
});

test("tool-result 的内层内容各自成块,路径是父路径加下标", () => {
  const blocks = extractBlocks(assistantMessage(7, [{
    type: "tool-result",
    toolCallId: "c1",
    content: [{ type: "text", text: "命令输出" }],
  }]), { sessionId: "s1" });
  assert.deepEqual(blocks.map((block) => [block.path, block.type, block.text]), [
    ["0", "tool-result", ""],
    ["0.0", "text", "命令输出"],
  ]);
});

test("助手消息里的 tool-call 块带上名字与参数", () => {
  const blocks = extractBlocks(assistantMessage(4, [{
    type: "tool-call",
    id: "c1",
    name: "read",
    arguments: "{\"file_path\":\"a.txt\"}",
  }]), { sessionId: "s1" });
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, "tool-call");
  assert.equal(blocks[0].text, "read\n{\"file_path\":\"a.txt\"}");
});

test("图片/文件块登记为块但正文为空(不猜字段)", () => {
  const blocks = extractBlocks(userMessage(2, [
    { type: "image", attachment: { attachmentId: "a1", name: "shot.png" } },
    { type: "text", text: "看这张图" },
  ]), { sessionId: "s1" });
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "image");
  assert.equal(blocks[0].text, "");
  assert.equal(blocks[1].text, "看这张图");
});

test("没有 content 数组的事件:tool/call 默认不入块,todo/write 每个待办一块", () => {
  const toolCall = extractBlocks({ seq: 9, type: "tool/call", time: 1, data: { name: "grep", arguments: "{}" } }, { sessionId: "s1" });
  assert.deepEqual(toolCall, [], "toolCallEvent 默认关闭:助手消息里已有 tool-call 块,避免双重索引");
  const opted = extractBlocks(
    { seq: 9, type: "tool/call", time: 1, data: { name: "grep", arguments: "{}" } },
    { sessionId: "s1", include: { toolCallEvent: true } },
  );
  assert.deepEqual(opted.map((block) => [block.path, block.type, block.text]), [["0", "tool-call", "grep\n{}"]]);

  const todos = extractBlocks({
    seq: 10,
    type: "todo/write",
    time: 2,
    data: { todos: [{ status: "pending", content: "写测试" }, { status: "done", content: "建包" }] },
  }, { sessionId: "s1" });
  assert.deepEqual(todos.map((block) => [block.path, block.type, block.text]), [
    ["0", "todo", "pending\n写测试"],
    ["1", "todo", "done\n建包"],
  ]);
});

test("turn/end 默认不入块,打开后只收语义化的结束原因", () => {
  const event = { seq: 11, type: "turn/end", time: 3, data: { reason: { kind: "error", error: { message: "炸了" } } } };
  assert.deepEqual(extractBlocks(event, { sessionId: "s1" }), []);
  assert.deepEqual(
    extractBlocks(event, { sessionId: "s1", include: { turnEnd: true } }).map((block) => block.text),
    ["error\n炸了"],
  );
  assert.deepEqual(
    extractBlocks({ seq: 12, type: "turn/end", time: 4, data: { reason: { kind: "completed" } } },
      { sessionId: "s1", include: { turnEnd: true } }),
    [],
    "completed 是结构事件,没有语义文本",
  );
});

test("isSearchable:空文本与关闭的类型都不进倒排", () => {
  assert.equal(isSearchable({ type: "text", text: "有内容" }), true);
  assert.equal(isSearchable({ type: "text", text: "   " }), false);
  assert.equal(isSearchable({ type: "reasoning", text: "思考" }), false, "思考块默认不入索引,与官方语义一致");
  assert.equal(isSearchable({ type: "reasoning", text: "思考" }, { ...DEFAULT_INCLUDE, reasoning: true }), true);
  assert.equal(isSearchable({ type: "image", text: "" }), false);
});

test("buildSessionBlocks 补上块 id、surface 与长度", () => {
  const events = [
    userMessage(0, [{ type: "text", text: "你好" }]),
    assistantMessage(1, [{ type: "reasoning", text: "想想" }, { type: "text", text: "世界" }]),
  ];
  const records = [
    { seq: 0, type: "user/message", time: 1700000000000, surface: "log-only" },
    { seq: 1, type: "assistant/message", time: 1700000001000, surface: "current" },
  ];
  const blocks = buildSessionBlocks(events, records, { sessionId: "s1" });
  assert.deepEqual(blocks.map((block) => [block.id, block.path, block.type, block.surface, block.searchable, block.length]), [
    [blockId("s1", 0, "0"), "0", "text", "log-only", true, 2],
    [blockId("s1", 1, "0"), "0", "reasoning", "current", false, 2],
    [blockId("s1", 1, "1"), "1", "text", "current", true, 2],
  ]);
  assert.equal(blocks[0].id, "s1#0#0");
});

test("buildSessionBlocks 跳过 records 还没追上的新块,而不是给它一个默认 surface", () => {
  const events = [
    userMessage(0, [{ type: "text", text: "旧" }]),
    userMessage(1, [{ type: "text", text: "刚写进来的" }]),
  ];
  // records 只到 seq 0:seq 1 是这次读取之后才写进来的,这一轮还没有它的 surface。
  const records = [{ seq: 0, type: "user/message", time: 1700000000000, surface: "current" }];
  const blocks = buildSessionBlocks(events, records, { sessionId: "s1" });
  assert.deepEqual(blocks.map((block) => block.id), ["s1#0#0"], "新块这一轮不产出,等下一轮 records 追上");
});

test("buildSessionBlocks 在 records 范围内缺 surface 时直接抛错", () => {
  const events = [
    userMessage(0, [{ type: "text", text: "甲" }]),
    userMessage(1, [{ type: "text", text: "乙" }]),
  ];
  // seq 1 落在 records 范围内(最新 seq 是 2)却缺了它——两次读取对不上,不该替调用方猜一个。
  const records = [
    { seq: 0, type: "user/message", time: 1700000000000, surface: "current" },
    { seq: 2, type: "user/message", time: 1700000002000, surface: "current" },
  ];
  assert.throws(
    () => buildSessionBlocks(events, records, { sessionId: "s1" }),
    /落在 records 范围内却没有 surface/,
  );
});

test("codepointLength 按码点而不是 UTF-16 长度", () => {
  assert.equal(codepointLength("abc"), 3);
  assert.equal(codepointLength("🙂🙂"), 2);
  assert.equal("🙂🙂".length, 4, "UTF-16 长度会翻倍,所以不能用它");
  assert.equal(codepointLength(undefined), 0);
});

test("eventsRevision 对条数、末尾 seq 与中段改写都敏感", () => {
  const base = [
    { seq: 0, type: "user/message", time: 1, surface: "current" },
    { seq: 1, type: "assistant/message", time: 2, surface: "current" },
  ];
  const same = base.map((record) => ({ ...record }));
  assert.equal(eventsRevision(base), eventsRevision(same));
  assert.notEqual(eventsRevision(base), eventsRevision(base.slice(0, 1)));
  const rewritten = [base[0], { ...base[1], type: "tool/call" }];
  assert.notEqual(eventsRevision(base), eventsRevision(rewritten), "中段改写也要被发现");
  assert.equal(eventsRevision([]), "0:-1:0");
});
