/**
 * 引擎成败明细诊断。
 *
 * 为什么要这个：`[引擎 46 个 · 成功 5 · 失败 41]` 这种汇总只告诉我们"很糟"，
 * 但不告诉**糟在哪**。要优化召回必须知道：
 *   - 哪些引擎一个结果都没返回
 *   - 失败的具体原因（限流？CAPTCHA？需要 API key？解析器坏了？）
 *
 * ## 两个容易踩的坑（都踩过）
 *
 * 1. **用 bun 跑必须手动装 undici 的代理**：bun 有自己的 fetch 实现，
 *    不认 `setGlobalDispatcher`。所以下面显式把全局 fetch 换成 undici 的，
 *    否则墙外引擎全部"失败"，得出完全错误的结论。
 * 2. **同一查询第二次会命中缓存**，看起来"秒回但只有几条"。
 *    排查引擎时请换新词。
 *
 * 用法：
 *   bun scripts/diagnose-engines.ts "查询词" [queryType] [引擎1,引擎2,...]
 *   例：bun scripts/diagnose-engines.ts "测试" general zhihu,weibo,douban
 */
import { Effect } from 'effect'
import { FetchHttpClient, HttpClient } from 'effect/unstable/http'
import { executeAll, getGlobalState } from '../src/search/executor.ts'
import { selectEngines } from '../src/search/selector.ts'
import { makeSearchOptions } from '../src/search/engine.ts'
import { NO_PROXY } from '../src/search/proxy.ts'
import { EnvHttpProxyAgent, fetch as undiciFetch, setGlobalDispatcher } from 'undici'

const PROXY = process.env.DSH_WEBSEARCH_PROXY ?? 'http://127.0.0.1:7890'

/*
 * 让 bun 也走代理（见文件头说明 1）。
 *
 * 用 EnvHttpProxyAgent + 产品里同一份 NO_PROXY，而不是无差别的 ProxyAgent ——
 * 否则国内站点（知乎/豆瓣/微博）会被硬塞进代理然后全部失败，
 * 而我们要考察的恰恰是它们。**测试时的分流必须和生产一致**，
 * 不然测出来的结论对不上线上行为。
 */
setGlobalDispatcher(new EnvHttpProxyAgent({
  httpProxy: PROXY,
  httpsProxy: PROXY,
  noProxy: NO_PROXY.join(','),
}))
globalThis.fetch = undiciFetch as unknown as typeof fetch

const query = process.argv[2] ?? '设计师兼程序员怎么赚钱'
const queryType = process.argv[3] ?? 'general'
/** 只测这些引擎（逗号分隔）；不传则测该 queryType 下的全部 */
const only = (process.argv[4] ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '')

/**
 * 取引擎列表。
 *
 * 不只用当前 queryType 的集合 —— 像 bilibili 属于 video、weibo 属于 social，
 * 用 general 拿不到它们，而它们恰恰是「中文平台收录」要考察的对象。
 * 所以把各类型的集合合并起来再筛。
 */
function collectEngines() {
  const seen = new Map<string, ReturnType<typeof selectEngines>[number]>()
  const types = [undefined, 'general', 'video', 'social', 'code', 'news', 'academic'] as const
  for (const t of types) {
    for (const e of selectEngines(t === undefined ? undefined : { queryType: t })) {
      if (!seen.has(e.name)) seen.set(e.name, e)
    }
  }
  return [...seen.values()]
}

const program = Effect.gen(function* () {
  const http = yield* HttpClient.HttpClient
  const all = collectEngines()
  const engines = only.length > 0 ? all.filter((e) => only.includes(e.name)) : all
  const missing = only.filter((n) => !all.some((e) => e.name === n))
  if (missing.length > 0) {
    console.error(`⚠️ 这些引擎名不存在（检查拼写）：${missing.join(', ')}`)
  }
  const opts = makeSearchOptions({ numResults: 30 })
  const started = Date.now()
  const r = yield* executeAll(engines, http, query, opts, getGlobalState())
  return { r, engines, elapsed: Date.now() - started }
})

const { r, engines, elapsed } = await Effect.runPromise(
  Effect.provide(program, FetchHttpClient.layer),
)

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
