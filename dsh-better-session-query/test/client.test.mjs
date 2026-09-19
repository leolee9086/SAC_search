// test/client.test.mjs — 界面半边:真加载 lib/client.js,检查两份语言字典不漂移。
//
// 为什么值得单独测:中文文案曾经抄成两份(组件兜底 + 注册给 locale 的 zh),
// 加 pause/resume 时只改了一份,面板就冒出「Pause indexing」。这类漏键只能靠
// "真把工厂跑起来、把注册的字典抓出来比对"来防。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(HERE, "..", "lib", "client.js"), "utf8");

/** 在假 window 里跑一遍经典脚本,拿到它注册的工厂。 */
function loadFactory() {
  let loaded;
  const window = {
    __ModuleLoader__: {
      load(entry) { loaded = entry; },
    },
  };
  // 经典脚本没有 import/export,直接当函数体跑;只借用 window 一个全局。
  const run = new Function("window", "console", SOURCE);
  run(window, { error() {} });
  assert.ok(loaded !== undefined, "必须调用 window.__ModuleLoader__.load");
  assert.equal(loaded.id, "dsh-better-session-query", "注册 id 要等于包名(客户端模块表按行 id 查工厂)");
  return loaded.factory;
}

/** 用假 ctx 把工厂跑起来,收下它注册的字典与插槽。 */
function runClient() {
  const dictionaries = [];
  const effects = [];
  const registrations = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (initial) => [initial, () => {}],
    useEffect: () => {},
    useCallback: (fn) => fn,
  };
  const ctx = {
    // 界面里拿到的 t 来自 ctx.locale.bind(NS);假实现按 ns 找已注册的那份 zh 字典。
    locale: {
      register: (ns, dict) => { dictionaries.push({ ns, dict }); return () => {}; },
      bind: (ns) => (key) => [...dictionaries].reverse().find((entry) => entry.ns === ns)?.dict?.zh?.[key] ?? key,
    },
    effect: (callback) => { effects.push(callback()); },
    sidebarRightTabs: { register: (entry) => { registrations.push(entry); return () => {}; } },
    slots: {
      inject: (name, callback) => { registrations.push({ slot: name }); callback(); },
      register: (entry) => { registrations.push(entry); return () => {}; },
    },
  };
  const plugin = loadFactory()((id) => {
    assert.equal(id, "react", "只允许 require 基线模块 react");
    return react;
  });
  assert.equal(typeof plugin.apply, "function");
  plugin.apply(ctx);
  return { dictionaries, registrations, plugin };
}

test("client:zh 与 en 的键完全一致(缺键会掉进另一种语言)", () => {
  const { dictionaries } = runClient();
  assert.equal(dictionaries.length, 1, "只注册一份字典");
  const { ns, dict } = dictionaries[0];
  assert.equal(ns, "dsh-better-session-query");
  const zh = Object.keys(dict.zh).sort();
  const en = Object.keys(dict.en).sort();
  assert.deepEqual(zh, en, `两份字典的键必须一一对应;只在 zh:${zh.filter((k) => !en.includes(k))};只在 en:${en.filter((k) => !zh.includes(k))}`);
  for (const [key, text] of Object.entries(dict.zh)) {
    assert.equal(typeof text, "string", `zh.${key} 要是字符串`);
    assert.ok(text.trim() !== "", `zh.${key} 不能是空的`);
  }
  for (const [key, text] of Object.entries(dict.en)) {
    assert.ok(typeof text === "string" && text.trim() !== "", `en.${key} 不能是空的`);
  }
  // 就是漏过的这三个:暂停/继续/已暂停。
  assert.equal(dict.zh.pause, "暂停索引");
  assert.equal(dict.zh.resume, "继续索引");
  assert.equal(dict.zh.paused, "已暂停");
});

test("client:注册了页签、条目与三个插槽,且不 import 任何 DSH 包", () => {
  const { registrations, plugin } = runClient();
  const slots = registrations.filter((entry) => typeof entry.slot === "string").map((entry) => entry.slot);
  assert.ok(slots.includes("sidebar.right.pane.tab"), "要注册右侧栏页签内容");
  assert.ok(slots.includes("sidebar.right.pane.tab.title"), "要注册页签标题");
  assert.ok(slots.includes("sidebar.footer.action"), "要注册侧栏底部入口");
  const tab = registrations.find((entry) => entry.id === "dsh-better-session-query" && entry.kind !== undefined);
  assert.ok(tab !== undefined, "要注册页签本体");
  assert.equal(tab.kind, "dsh-better-session-query:monitor");
  assert.deepEqual(plugin.inject, ["slots", "locale", "sidebarRightTabs", "sidebarRight", "layout"], "界面半边声明的注入");
  assert.equal(plugin.name, "dsh-better-session-query-client");
  assert.doesNotMatch(SOURCE, /@deepseek-ai\//, "不许 import DSH 包");
  assert.doesNotMatch(SOURCE, /\bimport\s/, "经典脚本:没有 import");
});
