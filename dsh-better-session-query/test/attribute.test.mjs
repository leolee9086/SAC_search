import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openStore, STORE_SCHEMA_VERSION } from "../lib/store.js";

/** 一个临时库路径。属性表要测"重开后还在",所以不能用 :memory:。 */
function tempDbPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-attr-"));
  return path.join(dir, `${name}.db`);
}

/** 一条最小可用的属性。 */
function entry(overrides = {}) {
  return {
    sessionId: "s1",
    seq: 42,
    blockIndex: 0,
    fromPos: 10,
    toPos: 20,
    namespace: "context-care",
    name: "循环清理",
    value: { removedLines: 12, pattern: "line-repeat" },
    origin: "plugin",
    visibility: "user",
    ...overrides,
  };
}

test("写入后能按 session 读回来", async () => {
  const store = await openStore({ path: tempDbPath("basic") });
  const id = store.putAttribute(entry());
  assert.equal(typeof id, "string");
  const rows = store.listAttributes({ sessionId: "s1" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, id);
  assert.equal(rows[0].seq, 42);
  assert.equal(rows[0].blockIndex, 0);
  assert.equal(rows[0].fromPos, 10);
  assert.equal(rows[0].name, "循环清理");
  assert.deepEqual(rows[0].value, { removedLines: 12, pattern: "line-repeat" });
  assert.equal(rows[0].origin, "plugin");
  assert.equal(rows[0].visibility, "user");
  assert.equal(rows[0].deletedMs, undefined);
  store.close();
});

test("属性名支持任意 Unicode —— 存储层不限制字符集", async () => {
  const store = await openStore({ path: tempDbPath("unicode") });
  store.putAttribute(entry({ name: "标记·带标点/emoji🌱" }));
  const rows = store.listAttributes({ sessionId: "s1", name: "标记·带标点/emoji🌱" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "标记·带标点/emoji🌱");
  store.close();
});

test("同一位置可以挂多条 —— 标记天然是多条", async () => {
  const store = await openStore({ path: tempDbPath("multi") });
  const a = store.putAttribute(entry({ name: "重点" }));
  const b = store.putAttribute(entry({ name: "重点" }));
  const c = store.putAttribute(entry({ name: "疑问" }));
  assert.notEqual(a, b);
  assert.equal(new Set([a, b, c]).size, 3);
  assert.equal(store.listAttributes({ sessionId: "s1" }).length, 3);
  store.close();
});

test("按 namespace 与 seq 过滤", async () => {
  const store = await openStore({ path: tempDbPath("filter") });
  store.putAttribute(entry({ namespace: "context-care", seq: 1 }));
  store.putAttribute(entry({ namespace: "other", seq: 1 }));
  store.putAttribute(entry({ namespace: "context-care", seq: 2 }));
  assert.equal(store.listAttributes({ sessionId: "s1", namespace: "context-care" }).length, 2);
  assert.equal(store.listAttributes({ sessionId: "s1", seq: 1 }).length, 2);
  assert.equal(store.listAttributes({ sessionId: "s1", namespace: "context-care", seq: 2 }).length, 1);
  assert.deepEqual(store.attributeNamespaces(), ["context-care", "other"]);
  store.close();
});

test("软删:默认读不到,但行还在(显式要才给)", async () => {
  const store = await openStore({ path: tempDbPath("softdelete") });
  const id = store.putAttribute(entry());
  assert.equal(store.removeAttribute(id), true);
  assert.equal(store.listAttributes({ sessionId: "s1" }).length, 0);
  const all = store.listAttributes({ sessionId: "s1", includeDeleted: true });
  assert.equal(all.length, 1);
  assert.equal(typeof all[0].deletedMs, "number");
  // 再删一次不再生效 —— 它已经是删掉的了。
  assert.equal(store.removeAttribute(id), false);
  store.close();
});

test("全局属性:不属于任何会话也能存", async () => {
  const store = await openStore({ path: tempDbPath("global") });
  store.putAttribute(entry({ sessionId: undefined, seq: undefined }));
  const rows = store.listAttributes({});
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sessionId, undefined);
  assert.equal(rows[0].seq, undefined);
  store.close();
});

test("库版本升级会重建块索引,但属性表必须活下来", async () => {
  const dbPath = tempDbPath("upgrade");
  const store = await openStore({ path: dbPath });
  const id = store.putAttribute(entry({ name: "升级前写的" }));
  assert.equal(STORE_SCHEMA_VERSION, 7);
  store.close();

  // 把 user_version 退回去,模拟"旧版本库遇到新代码"那次升级。
  const { DatabaseSync } = await import("node:sqlite");
  const raw = new DatabaseSync(dbPath);
  raw.exec("PRAGMA user_version = 6");
  raw.close();

  const reopened = await openStore({ path: dbPath });
  const rows = reopened.listAttributes({ sessionId: "s1" });
  assert.equal(rows.length, 1, "属性表是原始数据,升级不该把它 DROP 掉");
  assert.equal(rows[0].id, id);
  assert.equal(rows[0].name, "升级前写的");
  reopened.close();
});

test("value 坏掉时抛错,不静默变成 null", async () => {
  const dbPath = tempDbPath("badvalue");
  const store = await openStore({ path: dbPath });
  const id = store.putAttribute(entry());
  store.close();
  const { DatabaseSync } = await import("node:sqlite");
  const raw = new DatabaseSync(dbPath);
  raw.prepare("UPDATE attribute SET value = ? WHERE id = ?").run("{不是 JSON", id);
  raw.close();
  const reopened = await openStore({ path: dbPath });
  assert.throws(() => reopened.listAttributes({ sessionId: "s1" }));
  reopened.close();
});
