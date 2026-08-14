// probe.mjs — 用纯 Node 运行 bundle,验证真实搜索可用(不依赖 bun runtime)。
// 用法: node test/probe.mjs [query] [numResults]
import { searchWeb } from "../lib/search.bundle.mjs";

const query = process.argv[2] ?? "opencode AI coding agent";
const numResults = Number(process.argv[3] ?? 5);

console.error(`[probe] 查询: "${query}" numResults=${numResults} (node ${process.version})`);
const started = Date.now();
try {
  const text = await searchWeb({ query, numResults });
  console.error(`[probe] 耗时 ${Date.now() - started}ms,结果长度 ${text.length}`);
  console.log(text.slice(0, 3000));
} catch (e) {
  console.error("[probe] 失败:", e && e.stack ? e.stack : String(e));
  process.exit(1);
}
