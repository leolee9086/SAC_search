// sync-search.mjs — 从 s-code 仓库同步 search 模块到本插件(一次性构建期工具,可重复运行)。
// 用法: node scripts/sync-search.mjs <s-code-search-dir>
// 排除: persistent-cache.ts(bun:sqlite,Node 不可用)、proxy-state.ts(opencode 内部模块)。
// 对 index.ts 做最小改动:移除 PersistentCache 的导入与导出(保持其余源码原样)。
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("..", import.meta.url));
const srcDir = resolve(process.argv[2] ?? "");
if (!srcDir) {
  console.error("用法: node scripts/sync-search.mjs <s-code-search-dir>");
  process.exit(2);
}

const destDir = join(here, "src", "search");
const EXCLUDE = new Set(["persistent-cache.ts", "proxy-state.ts"]);

rmSync(destDir, { recursive: true, force: true });
mkdirSync(destDir, { recursive: true });
cpSync(srcDir, destDir, { recursive: true, filter: (s) => !EXCLUDE.has(join(s).split(/[\\/]/).pop()) });

// 最小化修改 index.ts:去掉 PersistentCache 导入与导出
const indexPath = join(destDir, "index.ts");
let index = readFileSync(indexPath, "utf8");
const importLine = 'import * as PersistentCacheModule from "./persistent-cache"\n';
if (index.includes(importLine)) index = index.replace(importLine, "");
index = index.replace(", PersistentCacheModule as PersistentCache", "");
writeFileSync(indexPath, index, "utf8");

console.log("已同步:", srcDir, "->", destDir);
console.log("排除:", [...EXCLUDE].join(", "));
