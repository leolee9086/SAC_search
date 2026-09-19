// test/memory.test.mjs — 记忆库的单元测试:解析、差量写入、召回的三条规矩。
//
// 不 import 任何 DSH 包:记忆库只依赖 node:sqlite 与 store.js 的 CJK 变换。
import test from "node:test";
import assert from "node:assert/strict";

import { MEMORY_TOOL, openMemoryStore, parseMemoryBlock } from "../lib/memory.js";

/** 造一个记忆块(形状与索引器抽出来的块一致)。 */
function memoryBlock({ id = "b1", seq = 1, time = Date.now(), surface = "log-only", args = {} } = {}) {
  return { id, seq, time, surface, type: "tool-call", text: `${MEMORY_TOOL} ${JSON.stringify(args)}` };
}

test("parseMemoryBlock:认出记忆块并解析各字段", () => {
  const parsed = parseMemoryBlock(memoryBlock({
    args: { q: "包管理器用哪个", a: "pnpm", tag: "环境", expires: "换项目就作废", perspective: "superego" },
  }));
  assert.deepEqual(parsed, {
    q: "包管理器用哪个",
    a: "pnpm",
    tag: "环境",
    expires: "换项目就作废",
    perspective: "superego",
  });
});

test("parseMemoryBlock:视角缺失或不认识时当没标,但不拒收整条", () => {
  assert.equal(parseMemoryBlock(memoryBlock({ args: { q: "q", a: "a" } })).perspective, "");
  assert.equal(parseMemoryBlock(memoryBlock({ args: { q: "q", a: "a", perspective: "本我" } })).perspective, "");
});

test("parseMemoryBlock:非记忆块与坏 JSON 都返回 undefined,不抛错", () => {
  assert.equal(parseMemoryBlock(undefined), undefined);
  assert.equal(parseMemoryBlock({ type: "text", text: `${MEMORY_TOOL} {}` }), undefined, "非 tool-call 不算");
  assert.equal(parseMemoryBlock({ type: "tool-call", text: "session_blocks_search {\"query\":\"x\"}" }), undefined, "别的工具不算");
  assert.equal(parseMemoryBlock({ type: "tool-call", text: `${MEMORY_TOOL} {坏掉的` }), undefined, "坏 JSON 不该抛");
  assert.equal(parseMemoryBlock(memoryBlock({ args: { q: "", a: "只有答案" } })), undefined, "q 空不算");
  assert.equal(parseMemoryBlock(memoryBlock({ args: { q: "只有问题", a: "  " } })), undefined, "a 空不算");
});

test("记忆库:写入后能按关键词召回,并带着视角与标签", async () => {
  const store = await openMemoryStore({ path: ":memory:" });
  try {
    const now = Date.now();
    const result = store.ingest({
      sessionId: "s-1",
      cwd: "C:\\fake",
      blocks: [
        memoryBlock({ id: "b1", time: now, args: { q: "包管理器用哪个", a: "pnpm", tag: "环境", perspective: "superego" } }),
        memoryBlock({ id: "b2", time: now, args: { q: "哥哥熬夜时我该说什么", a: "直接说、说清楚、不止说一次", tag: "人", perspective: "ego" } }),
      ],
    });
    assert.deepEqual(result, { found: 2, inserted: 2, updated: 0, removed: 0 });

    const hit = store.recall({ keywords: ["包管理器"], sessionId: "s-other" });
    assert.equal(hit.items.length, 1);
    assert.equal(hit.items[0].q, "包管理器用哪个");
    assert.equal(hit.items[0].tag, "环境");
    assert.equal(hit.items[0].perspective, "superego");
    assert.equal(hit.items[0].fresh, true);

    // 只搜记忆问答对:普通会话内容不在这个库里,自然搜不到。
    assert.equal(store.recall({ keywords: ["苹果"], sessionId: "s-other" }).items.length, 0);
  } finally {
    store.close();
  }
});

test("记忆库:差量写入——消失的记忆被删掉", async () => {
  const store = await openMemoryStore({ path: ":memory:" });
  try {
    const now = Date.now();
    store.ingest({
      sessionId: "s-1",
      cwd: "C:\\fake",
      blocks: [
        memoryBlock({ id: "b1", time: now, args: { q: "留下来的", a: "1", perspective: "ego" } }),
        memoryBlock({ id: "b2", time: now, args: { q: "要被删掉的", a: "2", perspective: "ego" } }),
      ],
    });
    const second = store.ingest({
      sessionId: "s-1",
      cwd: "C:\\fake",
      blocks: [memoryBlock({ id: "b1", time: now, args: { q: "留下来的", a: "1", perspective: "ego" } })],
    });
    assert.equal(second.removed, 1);
    assert.equal(store.recall({ keywords: ["要被删掉的"], sessionId: "s-other" }).items.length, 0);
    assert.equal(store.stats().memories, 1);
  } finally {
    store.close();
  }
});

test("召回:过期的只在数量不够时补齐,且永远排在新鲜之后", async () => {
  const store = await openMemoryStore({ path: ":memory:" });
  try {
    const now = Date.now();
    const twoHours = 7200000;
    store.ingest({
      sessionId: "s-1",
      cwd: "C:\\fake",
      blocks: [
        // 过期那条的字面相关性更高(问题里就有"苹果"),新鲜那条只是沾边——
        // 这正是要压制的偏好:字面相关性对旧记忆有系统性优势。
        memoryBlock({ id: "old", time: now - twoHours * 3, args: { q: "苹果 相关的旧结论", a: "旧", perspective: "superego" } }),
        memoryBlock({ id: "new", time: now - 60000, args: { q: "水果摊在哪", a: "新", perspective: "id" } }),
      ],
    });
    const hit = store.recall({ keywords: ["苹果", "水果摊"], sessionId: "s-other" });
    assert.equal(hit.items.length, 2);
    assert.equal(hit.items[0].q, "水果摊在哪", "新鲜的排前面,哪怕它字面更不相关");
    assert.equal(hit.items[0].fresh, true);
    assert.equal(hit.items[1].q, "苹果 相关的旧结论");
    assert.equal(hit.items[1].fresh, false, "过期的垫底");

    // 数量够的时候,过期的那条根本不该出现。
    const onlyFresh = store.recall({ keywords: ["苹果", "水果摊"], sessionId: "s-other", limit: 1 });
    assert.equal(onlyFresh.items.length, 1);
    assert.equal(onlyFresh.items[0].fresh, true);
  } finally {
    store.close();
  }
});

test("召回:不返回当前活跃上下文里已有的本会话记忆", async () => {
  const store = await openMemoryStore({ path: ":memory:" });
  try {
    const now = Date.now();
    store.ingest({
      sessionId: "s-1",
      cwd: "C:\\fake",
      blocks: [
        memoryBlock({ id: "live", time: now, surface: "current", args: { q: "还在眼前的那条", a: "1", perspective: "ego" } }),
        memoryBlock({ id: "cold", time: now, surface: "log-only", args: { q: "已经沉下去的那条", a: "2", perspective: "ego" } }),
      ],
    });
    const mine = store.recall({ keywords: ["那条"], sessionId: "s-1" });
    assert.deepEqual(mine.items.map((item) => item.q), ["已经沉下去的那条"], "current 的不返回");
    // 换个会话看,两条都在——排除只针对"当前"会话。
    const other = store.recall({ keywords: ["那条"], sessionId: "s-2" });
    assert.equal(other.items.length, 2);
  } finally {
    store.close();
  }
});

test("召回:能按视角取某一位贤人的那一份", async () => {
  const store = await openMemoryStore({ path: ":memory:" });
  try {
    const now = Date.now();
    store.ingest({
      sessionId: "s-1",
      cwd: "C:\\fake",
      blocks: [
        memoryBlock({ id: "b1", time: now, args: { q: "这条关于做事", a: "1", perspective: "superego" } }),
        memoryBlock({ id: "b2", time: now, args: { q: "这条关于相处", a: "2", perspective: "ego" } }),
      ],
    });
    const egoOnly = store.recall({ keywords: ["这条"], sessionId: "s-other", perspective: "ego" });
    assert.deepEqual(egoOnly.items.map((item) => item.q), ["这条关于相处"]);
  } finally {
    store.close();
  }
});

test("召回:关键词为空时不查库,直接返回空", async () => {
  const store = await openMemoryStore({ path: ":memory:" });
  try {
    assert.deepEqual(store.recall({ keywords: [], sessionId: "s-other" }).items, []);
    assert.deepEqual(store.recall({ keywords: ["  ", ""], sessionId: "s-other" }).items, []);
  } finally {
    store.close();
  }
});
