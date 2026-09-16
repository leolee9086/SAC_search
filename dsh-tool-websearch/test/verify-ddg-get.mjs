/**
 * 验证：把 DDG 引擎切到 GET 之后，用**引擎自己的解析器**能否从真实响应里解出结果。
 *
 * 只断言三件事（都必须是客观可判的）：
 *   1. 请求成功（状态码 200）
 *   2. 没命中验证墙
 *   3. parseHtmlResults 真的解出 ≥3 条结果，且标题/URL 非空
 *
 * 两个实现细节：
 *  - 用 **bun** 跑（`bun test/verify-ddg-get.mjs`）：项目本身由 bun 构建，
 *    它能直接执行 .ts 并解析仓库里不带扩展名的相对导入；Node 两样都不行。
 *  - 请求交给 curl：Node 内置 fetch 不认 HTTP_PROXY，直连会超时，
 *    那会把「代理没生效」误判成「DDG 不可用」。
 */
import { parseHtmlResults } from '../src/search/engines/duckduckgo.ts'

const QUERY = process.argv[2] ?? '微舆'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
const PROXY = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? 'http://127.0.0.1:7890'

// 与引擎改动后的调用方式一致：GET + q/kl
const url = new URL('https://html.duckduckgo.com/html/')
url.searchParams.set('q', QUERY)
url.searchParams.set('kl', 'cn-zh')

console.log(`GET ${url.toString()}`)
const proc = Bun.spawnSync([
  'curl.exe', '-s', '--max-time', '25', '-x', PROXY, '-o', '-', '-w', '\n<<<STATUS:%{http_code}>>>',
  '-H', `User-Agent: ${UA}`,
  '-H', 'Accept-Language: zh-CN,zh-CN;q=0.7',
  url.toString(),
], { stdout: 'pipe', stderr: 'pipe' })

const stdout = proc.stdout.toString()
const m = /<<<STATUS:(\d+)>>>\s*$/.exec(stdout)
const status = m ? Number(m[1]) : 0
const html = m ? stdout.slice(0, m.index) : stdout

let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  OK   ${name}${detail ? '  ' + detail : ''}`) }
  else { fail++; console.log(` FAIL  ${name}  ${detail}`) }
}

check('请求成功 (200)', status === 200, `status=${status} len=${html.length}`)
check('未命中验证墙', !/challenge-form|anomaly-modal|bots use duckduckgo too/i.test(html))

const results = parseHtmlResults(html, 8)
check('解析出结果 (>=3 条)', results.length >= 3, `${results.length} 条`)
check('标题都非空', results.length > 0 && results.every((r) => r.title.trim() !== ''))
check('URL 都非空', results.length > 0 && results.every((r) => r.url.trim() !== ''))

console.log('\n解析结果预览：')
for (const [i, r] of results.slice(0, 5).entries()) {
  console.log(`  ${i + 1}. ${r.title.slice(0, 60)}`)
  console.log(`     ${r.url.slice(0, 80)}`)
  if (r.snippet) console.log(`     ${r.snippet.slice(0, 70)}`)
}

console.log(`\n=== 合计 ${pass + fail} 项，失败 ${fail} 项 ===`)
process.exitCode = fail === 0 ? 0 : 1
