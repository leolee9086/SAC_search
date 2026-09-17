/**
 * 端到端冒烟测试：**真的去搜一次**。
 *
 * ## 为什么它不在 `pnpm test` 里
 *
 * 它依赖真实网络和第三方站点：慢（几秒到几十秒）、且会因限流/波动偶发失败。
 * 这种测试混进单元套件，失败时**无法区分"代码坏了"还是"网络抖了"** ——
 * 结果就是没人再信它，连真失败也被当噪声忽略。
 * 所以分开：`pnpm test` 快而确定（跑 mock），这个按需跑（跑真的）。
 *
 * ## 它测什么
 *
 * 不测"召回质量"（那是 `scripts/check-relevance.ts` 加上人工判断的事），
 * 只测**每次真实搜索都必须成立的契约**：
 *
 *   1. 能拿到结果（不是零条、不是抛错）
 *   2. **每条结果的 url 都是合法的 http(s) 绝对地址**
 *      ← 这条是本轮踩出来的：wiby 吐了 8 条没有 url 的结果，
 *        一路带到聚合层才炸（`Cannot read properties of undefined (reading 'replace')`）。
 *        如果当时有这个断言，问题在提交前就会暴露，而不是等哥刷新页面。
 *   3. `searchDetailed` 的结构字段齐全（它是页签的数据源）
 *   4. `searchWeb` 的文本里没有未解包的跳转链接（那些 URL 对模型没有意义）
 *
 * 用法：`pnpm run test:e2e`
 */
import assert from 'node:assert/strict'
import { searchDetailed, searchWeb } from '../lib/search.bundle.mjs'

/** 一次真实搜索的查询词。用中文，顺带覆盖分词与中文引擎那条链路 */
const QUERY = process.env.E2E_QUERY ?? '妊娠糖尿病饮食注意事项'

function isHttpUrl(value) {
  if (typeof value !== 'string' || value === '') return false
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

let failures = 0
function check(label, fn) {
  try {
    fn()
    console.log(`  ✓ ${label}`)
  } catch (error) {
    failures += 1
    console.log(`  ✗ ${label}`)
    console.log(`      ${error.message.split('\n')[0]}`)
  }
}

console.log(`端到端：真实搜索「${QUERY}」\n`)

// ── searchDetailed（页签的数据源）────────────────────────
console.log('searchDetailed:')
const detailed = await searchDetailed({ query: QUERY, numResults: 20 })

check('返回了结果', () => {
  assert.ok(Array.isArray(detailed.results), 'results 不是数组')
  assert.ok(detailed.results.length > 0, '一条结果都没有（可能全网都在限流，也可能真坏了）')
})

check('结构字段齐全', () => {
  for (const key of ['statsLine', 'results', 'elapsedMs', 'engineCount', 'fromCache']) {
    assert.ok(key in detailed, `缺字段 ${key}`)
  }
  assert.equal(typeof detailed.statsLine, 'string')
  assert.equal(typeof detailed.elapsedMs, 'number')
  assert.ok(detailed.elapsedMs > 0, 'elapsedMs 不合理')
})

/*
 * 这条是**本轮那个 bug 的回归测试** —— 比前面两条重要得多。
 * 脏数据（没有 url 的条目）必须在聚合层之前就被挡掉，绝不能进到结果里。
 */
check('每条结果的 url 都是合法的 http(s) 地址', () => {
  const bad = detailed.results.filter((r) => !isHttpUrl(r.url))
  assert.equal(
    bad.length,
    0,
    `${bad.length} 条结果的 url 不合法，例如：${JSON.stringify(bad.slice(0, 2).map((r) => ({ engine: r.engines, url: r.url })))}`,
  )
})

check('每条结果都有非空标题', () => {
  const bad = detailed.results.filter((r) => typeof r.title !== 'string' || r.title.trim() === '')
  assert.equal(bad.length, 0, `${bad.length} 条结果没有标题`)
})

console.log(`   （${detailed.results.length} 条 · ${detailed.engineCount} 个引擎 · ${Math.round(detailed.elapsedMs / 1000)} 秒）`)

// ── searchWeb（工具那条路径）────────────────────────────
console.log('\nsearchWeb:')
const text = await searchWeb({ query: QUERY, numResults: 5 })

check('返回了给模型的文本', () => {
  assert.ok(typeof text === 'string' && text.length > 0, '返回了空文本')
  assert.ok(!text.startsWith('ERROR'), `返回了错误：${text.slice(0, 120)}`)
})

check('文本里没有未解包的跳转链接', () => {
  // bing/谷歌的跳转链接对模型毫无意义（看不出目标站点），必须在聚合前解开
  const redirects = text.match(/https?:\/\/(www\.)?(bing\.com\/ck\/a|google\.com\/url)\b/g) ?? []
  assert.equal(redirects.length, 0, `还有 ${redirects.length} 条未解包的跳转链接`)
})

console.log(`   （${text.split('\n').length} 行 · ${text.length} 字符）`)

// ── 结论 ────────────────────────────────────────────────
console.log('')
if (failures === 0) {
  console.log('端到端全部通过。')
} else {
  console.log(`端到端失败 ${failures} 项。`)
  process.exitCode = 1
}
