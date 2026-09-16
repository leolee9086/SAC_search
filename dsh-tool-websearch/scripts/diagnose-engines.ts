/**
 * 引擎成败明细诊断。
 *
 * 为什么要这个：`[引擎 46 个 · 成功 5 · 失败 41]` 这种汇总只告诉我们"很糟"，
 * 但不告诉**糟在哪**。要优化召回，必须知道：
 *   - 哪些引擎一个结果都没返回
 *   - 失败的具体原因（限流？CAPTCHA？需要 API key？解析器坏了？）
 *
 * 用法：bun scripts/diagnose-engines.mjs "查询词" [queryType]
 */
import { Effect } from 'effect'
import { FetchHttpClient, HttpClient } from 'effect/unstable/http'
import { executeAll, getGlobalState } from '../src/search/executor.ts'
import { selectEngines } from '../src/search/selector.ts'
import { makeSearchOptions } from '../src/search/engine.ts'

const query = process.argv[2] ?? '设计师兼程序员怎么赚钱'
const queryType = process.argv[3] ?? 'general'

const program = Effect.gen(function* () {
  const http = yield* HttpClient.HttpClient
  const engines = selectEngines({ queryType })
  const opts = makeSearchOptions({ numResults: 30 })
  const started = Date.now()
  const r = yield* executeAll(engines, http, query, opts, getGlobalState())
  return { r, engines, elapsed: Date.now() - started }
})

const { r, engines, elapsed } = await Effect.runPromise(
  Effect.provide(program, FetchHttpClient.layer),
)

/** 每个引擎贡献了多少条 */
const byEngine = new Map<string, number>()
for (const res of r.results) byEngine.set(res.engine, (byEngine.get(res.engine) ?? 0) + 1)

const failed = new Map<string, string>()
for (const e of r.errors) {
  const name = String((e as { engine?: unknown }).engine ?? '?')
  const msg = String((e as { message?: unknown }).message ?? JSON.stringify(e))
  failed.set(name, msg)
}

console.log(`查询: ${query}   类型: ${queryType}   引擎 ${engines.length} 个   耗时 ${elapsed}ms`)
console.log(`原始结果 ${r.results.length} 条，错误 ${r.errors.length} 个\n`)

const sorted = [...byEngine].sort((a, b) => b[1] - a[1])
console.log(`=== 有结果的引擎（${sorted.length} 个，共 ${r.results.length} 条）===`)
for (const [name, n] of sorted) console.log(`  ${name.padEnd(22)} ${String(n).padStart(4)} 条`)

console.log(`\n=== 报错的引擎（${failed.size} 个）===`)
for (const [name, msg] of failed) {
  console.log(`  ${name.padEnd(22)} ${msg.slice(0, 110)}`)
}

const silent = engines.filter((e) => !byEngine.has(e.name) && !failed.has(e.name))
console.log(`\n=== 既不报错也没结果（${silent.length} 个，最可疑）===`)
for (let i = 0; i < silent.length; i += 6) {
  console.log('  ' + silent.slice(i, i + 6).map((e) => e.name).join(', '))
}
