// test/cjk-recall.test.mjs — 中文子串召回:同一个 CJK 拆字变换用于索引侧与查询侧。
//
// 背景:unicode61 对中文不切分,"工作区甲的回答"整串才是一个词项,查「回答」命不中。
// 做法(与 s-forge 的 siyuan 分词器同构:它也是逐码点出词项):存与查都对文本做
// 「每个 CJK 字两侧插零宽空格」的变换,于是 unicode61 把每个汉字切成独立词项、位置连续,
// 字面短语匹配就自然升级成任意 ≥1 字的中文子串召回。英文行为刻意不变。
import test from "node:test";
import assert from "node:assert/strict";

import { joinCjk, openStore, splitCjk, textHash } from "../lib/store.js";

/** 造一个可检索的块。 */
function block(sessionId, seq, text) {
  return {
    id: `${sessionId}#${seq}#0`,
    sessionId,
    seq,
    path: "0",
    type: "text",
    text,
    surface: "current",
    eventType: "user/message",
    time: 1000 + seq,
    searchable: true,
    length: Array.from(text).length,
  };
}

/** 建一个带若干块的库。 */
async function storeWith(lines) {
  const store = await openStore({ path: ":memory:" });
  const sessionId = "s1";
  store.replaceSession({
    sessionId,
    cwd: "D:\\dev",
    revision: "r1",
    events: lines.length,
    blocks: lines.map((text, seq) => block(sessionId, seq, text)),
    now: 1,
  });
  return store;
}

test("splitCjk/joinCjk:往返无损,且幂等", () => {
  const text = "工作区甲的回答 sqlite检索 FTS5索引 2个";
  const split = splitCjk(text);
  assert.equal(joinCjk(split), text, "反拆必须还原原文");
  assert.equal(splitCjk(split), split, "重复变换结果不变(幂等)");
  assert.equal(joinCjk(text), text, "没有零宽空格时是恒等");
  assert.equal(splitCjk("hello world"), "hello world", "纯英文不动");
  assert.ok(split.includes("\u200b工\u200b"), "每个汉字两侧都有分隔符");
  assert.equal(splitCjk("工作").split("\u200b").filter(Boolean).join(""), "工作");
});

test("中文 1 字 / 2 字 / 3 字查询都能命中(改造前全是 0)", async () => {
  const store = await storeWith([
    "断句:这里是回答,对吗",
    "工作区甲的提问",
    "另一个工作区的回答",
    "検索のテスト",
  ]);
  try {
    const hit = (query) => store.search({ query }).items.length;
    assert.equal(hit("答"), 2, "1 字:两行里各有一个「答」");
    assert.equal(hit("回答"), 2, "2 字:改造前是 0");
    assert.equal(hit("工作"), 2, "2 字");
    assert.equal(hit("工作区"), 2, "3 字");
    assert.equal(hit("検索"), 1, "日文假名+汉字混排");
    assert.equal(hit("工作区甲的提问"), 1, "整串不退化");
    assert.equal(hit("不存在的词"), 0);
  } finally {
    store.close();
  }
});

test("逐字隔离:emoji/拉丁/数字相邻的中文也能命中", async () => {
  const store = await storeWith([
    "🙂工作区的第一条",
    "DSH工作区索引",
    "第2个工作区",
  ]);
  try {
    const hit = (query) => store.search({ query }).items.length;
    assert.equal(hit("工作"), 3, "只在相邻汉字之间插分隔符的写法在这里会 0 命中");
    assert.equal(hit("工作区"), 3);
    assert.equal(hit("第2个"), 1);
  } finally {
    store.close();
  }
});

test("英文与符号行为不变:FTS5 语法仍当数据,子串不召回", async () => {
  const store = await storeWith(["hello world", "苹果酱 与 苹果"]);
  try {
    assert.equal(store.search({ query: "hello" }).items.length, 1);
    assert.equal(store.search({ query: "ell" }).items.length, 0, "英文不做子串召回(与改造前一致)");
    for (const query of ["OR", "NEAR", "(paren)", "*", 'say "hi"', "苹果 OR 香蕉"]) {
      assert.doesNotThrow(() => store.search({ query }), `查询 ${query} 不该被当语法解析出错`);
    }
    assert.equal(store.search({ query: "苹果" }).items.length, 1);
  } finally {
    store.close();
  }
});

test("读回不残留零宽空格:snippet 与 getBlock", async () => {
  const store = await storeWith(["苹果酱与苹果派"]);
  try {
    const hit = store.search({ query: "苹果" }).items[0];
    assert.equal(hit.snippet.includes("\u200b"), false, "snippet 要反拆干净");
    assert.match(hit.snippet, /苹果/);
    const found = store.getBlock("s1#0#0");
    assert.equal(found.text, "苹果酱与苹果派");
    assert.equal(found.text.includes("\u200b"), false);
    assert.equal(found.length, Array.from("苹果酱与苹果派").length, "长度按原文码点算");
  } finally {
    store.close();
  }
});

test("正文里本来就有零宽空格:归一化后照样搜得到", async () => {
  const store = await storeWith(["他用工作\u200b区里的东西"]);
  try {
    assert.equal(store.search({ query: "工作区" }).items.length, 1, "被零宽空格污染的正文也能命中");
    assert.equal(store.getBlock("s1#0#0").text.includes("\u200b"), false, "读回时已归一化");
  } finally {
    store.close();
  }
});

test("差量写入的两条路径都过拆字变换(追加快路径与就地更新)", async () => {
  const store = await storeWith(["第一句 中文内容"]);
  const sessionId = "s1";
  try {
    // 追加:走追加快路径。
    store.replaceSession({
      sessionId,
      cwd: "D:\\dev",
      revision: "r2",
      events: 2,
      blocks: [block(sessionId, 0, "第一句 中文内容"), block(sessionId, 1, "第二句 追加的内容")],
      now: 2,
    });
    assert.equal(store.search({ query: "追加" }).items.length, 1, "快路径插入的块也要拆字");
    // 就地更新:同一 seq 正文改写。
    store.replaceSession({
      sessionId,
      cwd: "D:\\dev",
      revision: "r3",
      events: 2,
      blocks: [block(sessionId, 0, "第一句 中文内容"), block(sessionId, 1, "改成了别的话")],
      now: 3,
    });
    assert.equal(store.search({ query: "别的话" }).items.length, 1, "就地更新也要拆字");
    assert.equal(store.search({ query: "追加" }).items.length, 0, "旧词项要真的消失");
  } finally {
    store.close();
  }
});

test("textHash 与拆字无关:指纹算的是原文", () => {
  assert.equal(textHash("工作区"), textHash("工作区"));
  assert.notEqual(textHash(splitCjk("工作区")), textHash("工作区"), "变形文本的指纹本就不同(索引里只存原文指纹)");
});
