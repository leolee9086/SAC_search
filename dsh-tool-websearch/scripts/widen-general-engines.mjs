/**
 * 回退上一轮批量替换里**过窄**的那部分。
 *
 * ## 问题
 *
 * 上一轮把 `if (!flags || flags?.queryType === "X")` 机械改成了 `if (isType("X"))`。
 * 但原语义是「**无 flags 时也加入**，且 X 类型时加入」——
 * 改成 `isType("X")` 之后，通用查询再也拿不到这些引擎了，
 * 而它们里有 Wikipedia、GitHub、MDN、各大新闻站 —— 全是通用搜索的常客。
 *
 * 这是「召回变窄」，与目标相反。
 *
 * ## 正解
 *
 * 两层职责分开：
 *   - **条件**表达"这个引擎属于哪些查询类型" → `isGeneral || isType("X")`
 *   - **GENERAL_ENGINE_NAMES 白名单**表达"通用搜索最终用哪几个" → 唯一收敛点
 *
 * 这样垂直引擎（pubmed/igdb/openweather）虽然进了候选集，
 * 但会被白名单挡掉；而 wikipedia/github/mdn 这些写进白名单的则能正常召回。
 * 调整取舍时只改白名单一处，不必再动这 100 多个条件。
 */
import { readFileSync, writeFileSync } from 'node:fs'

const path = process.argv[2] ?? 'src/search/selector.ts'
let src = readFileSync(path, 'utf8')
const before = src

let n = 0

/** 单类型：isType("X") → isGeneral || isType("X") */
src = src.replace(
  /if \(isType\("([a-z]+)"\)\) \{/g,
  (_m, t) => { n++; return `if (isGeneral || isType("${t}")) {` },
)

/** 双类型（搜狗微信）：isType("news") || isType("social") → 也要带上 general */
src = src.replace(
  /if \(isType\("news"\) \|\| isType\("social"\)\) \{/g,
  () => { n++; return 'if (isGeneral || isType("news") || isType("social")) {' },
)

/** `isType("general")` 与 `isGeneral` 等价，统一写法 */
src = src.replace(/if \(isType\("general"\)\) \{/g, () => { n++; return 'if (isGeneral) {' })

writeFileSync(path, src, 'utf8')
console.log(`回退了 ${n} 处条件（${before.length} → ${src.length} 字节）`)
console.log('现在：general 的候选集 = 原「无 flags」时的那批，再由白名单收敛')
