/**
 * 精确审计：selector 里**定义了、但任何 queryType 都选不中**的引擎。
 *
 * 为什么较真：bilibili 就是被这个坑埋掉的 —— 它的加入条件里少了一个
 * `isGeneral`，于是"单跑能稳定返回 30 条"的引擎永远不出现在通用搜索里，
 * 而且**不报错、不警告**，不专门查就永远发现不了。
 *
 * 和上一个版本的区别：上一版拿**文件名**猜引擎名（误报很多，
 * 因为 selector 里的 name 和文件名并不总是一致），
 * 这一版直接从 selector 源码里提取 `name: "xxx"` 的实际取值来比对。
 *
 * 用法：bun scripts/audit-engines.ts
 */
import { readFileSync } from 'node:fs'
import { selectEngines } from '../src/search/selector.ts'

const QUERY_TYPES = ['general', 'code', 'news', 'academic', 'social', 'video', 'shopping'] as const

const everSelected = new Set<string>()
const perType = new Map<string, number>()

for (const t of QUERY_TYPES) {
  const names = selectEngines({ queryType: t }).map((e) => e.name)
  perType.set(t, names.length)
  for (const n of names) everSelected.add(n)
}
for (const n of selectEngines().map((e) => e.name)) everSelected.add(n)

console.log('=== 各 queryType 选出的引擎数 ===')
for (const t of QUERY_TYPES) console.log(`  ${t.padEnd(10)} ${perType.get(t) ?? 0}`)
console.log(`  无 flags    ${selectEngines().length}`)
console.log(`\n合并去重后**能被选中**的引擎：${everSelected.size} 个`)

/* 从 selector 源码里提取所有 define 出来的引擎名 */
const src = readFileSync('src/search/selector.ts', 'utf8')
const defined = new Set<string>()
for (const m of src.matchAll(/name:\s*"([a-zA-Z0-9_-]+)"/g)) {
  defined.add(m[1]!)
}
console.log(`selector 里**定义**的引擎名：${defined.size} 个`)

const never = [...defined].filter((n) => !everSelected.has(n)).sort()

console.log(`\n=== 定义了但任何 queryType 都选不中（${never.length} 个）===`)
for (let i = 0; i < never.length; i += 5) {
  console.log('  ' + never.slice(i, i + 5).join(', '))
}

/* 顺便看看哪些引擎只在非 general 的类型里出现 —— 这类最可能是"漏了 isGeneral" */
const generalSet = new Set(selectEngines({ queryType: 'general' }).map((e) => e.name))
const onlyInVerticals = [...everSelected].filter((n) => !generalSet.has(n)).sort()
console.log(`\n=== 只在垂直类型里出现、通用搜索拿不到（${onlyInVerticals.length} 个）===`)
for (let i = 0; i < onlyInVerticals.length; i += 6) {
  console.log('  ' + onlyInVerticals.slice(i, i + 6).join(', '))
}
