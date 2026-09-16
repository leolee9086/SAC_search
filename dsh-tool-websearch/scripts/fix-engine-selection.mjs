/**
 * 一次性脚本：修正 selector.ts 的引擎选择语义。
 *
 * ## 要解决的缺陷
 *
 * 原实现里通用引擎的条件是 `if (!flags)` —— 于是：
 *   - `selectEngines()`（无 flags）→ 201 个引擎全上（通用 + 所有垂直）
 *   - `selectEngines({queryType:"general"})` → **通用引擎全被排除**，
 *     只剩 pubmed/igdb/openweather 这类垂直引擎
 * 两种用法都错，且后者更荒谬：明确说"通用搜索"反而丢掉了 Google/百度。
 *
 * ## 替换规则
 *
 * 1. `if (!flags)`                        → `if (isGeneral)`   （通用引擎只在 general）
 * 2. `if (!flags || flags?.queryType === "X")` → `if (isType("X"))`（垂直引擎只在对应类型）
 * 3. 语言类：`if (!flags || flags?.lang?.startsWith("zh"))` → `if (isGeneral || ...)`（中文引擎在 general 时也该上）
 * 4. 其余含 flags?. 的复合条件按语义保留，只把裸 `!flags` 换掉
 */
import { readFileSync, writeFileSync } from 'node:fs'

const path = process.argv[2] ?? 'src/search/selector.ts'
let src = readFileSync(path, 'utf8')

const report = []
const before = src

/** 规则 2：垂直引擎 —— 去掉 `!flags ||`，只留类型条件 */
src = src.replace(
  /if \(!flags \|\| flags\?\.queryType === "([a-z]+)"\) \{/g,
  (_m, t) => { report.push(`垂直引擎 → isType("${t}")`); return `if (isType("${t}")) {` },
)

/** 规则 3：语言类 —— general 时也要中文引擎 */
src = src.replace(
  /if \(!flags \|\| flags\?\.lang\?\.startsWith\("zh"\)\) \{/g,
  () => { report.push('语言引擎 → isGeneral || zh'); return 'if (isGeneral || flags?.lang?.startsWith("zh")) {' },
)

/** 规则 1：通用引擎 —— 只在 general 时加入 */
src = src.replace(
  /if \(!flags\) \{/g,
  () => { report.push('通用引擎 → isGeneral'); return 'if (isGeneral) {' },
)

/** 规则 4：复合条件里的裸 !flags */
src = src.replace(
  /if \(flags\?\.bilibili \|\| !flags \|\| flags\?\.queryType === "video"\) \{/g,
  () => { report.push('bilibili → isType("video")'); return 'if (flags?.bilibili || isType("video")) {' },
)
src = src.replace(
  /if \(flags\?\.brave \|\| hasBraveKey \|\| !flags\) \{/g,
  () => { report.push('brave → isGeneral'); return 'if (flags?.brave || hasBraveKey || isGeneral) {' },
)
src = src.replace(
  /if \(!flags \|\| flags\?\.queryType === "news" \|\| !flags\?\.queryType\) \{/g,
  () => { report.push('news 复合 → isType("news")'); return 'if (isType("news")) {' },
)

/** 把 flags 规范化注入函数开头 */
const anchor = 'export function selectEngines(\n  flags?: SelectFlags,\n): SearchEngine[] {\n  const engines: SearchEngine[] = []\n'
if (!src.includes(anchor)) {
  console.error('找不到 selectEngines 的开头，锚点不匹配 —— 没有改动任何文件')
  process.exit(1)
}
src = src.replace(anchor, `export function selectEngines(
  flags?: SelectFlags,
): SearchEngine[] {
  /*
   * flags 规范化 —— 这里是整个引擎选择的关键。
   *
   * 原实现把「没传 flags」和「queryType=general」当成两件不同的事，
   * 而通用引擎的条件写的是 \`if (!flags)\`，于是：
   *   - 无 flags：201 个引擎全上（通用 + 视频 + 购物 + 图片 + 学术…）
   *   - queryType=general：**通用引擎全部被排除**，只剩垂直引擎
   * 实测确认过：后者会丢掉 Google、百度、Startpage、Yahoo，
   * 却把 pubmed（医学）、igdb（游戏库）、openweather（天气）拉进来。
   *
   * 现在把两者统一成同一个语义：「通用网页搜索」。
   *   - 通用引擎（Google/百度/DDG/Bing…）在 \`general\` 时加入
   *   - 垂直引擎（视频/购物/学术/代码…）**只在自己那个类型时加入**
   * 这也正是 SearXNG 按 category 隔离引擎的做法。
   */
  const qt = flags?.queryType ?? "general";
  const isGeneral = qt === "general";
  const isType = (t: string) => qt === t;
  const engines: SearchEngine[] = []
`)

// 检查剩余未处理的裸 !flags
const leftovers = [...src.matchAll(/if \([^)]*!flags[^)]*\) \{/g)].map((m) => m[0])
writeFileSync(path, src, 'utf8')

console.log(`已改写 ${path}`)
console.log(`改动量：${before.length} → ${src.length} 字节`)
const counts = new Map()
for (const r of report) counts.set(r, (counts.get(r) ?? 0) + 1)
for (const [k, v] of counts) console.log(`  ${v} × ${k}`)
console.log(`\n剩余含 !flags 的条件（${leftovers.length} 处，需人工确认）：`)
for (const l of [...new Set(leftovers)]) console.log(`  ${l}`)
