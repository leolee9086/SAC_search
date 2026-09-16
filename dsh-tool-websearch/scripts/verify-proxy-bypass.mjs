/**
 * 验证 EnvHttpProxyAgent 的 noProxy 到底有没有生效。
 *
 * 背景：`so.com` / `douban.com` / `weibo.com` 直连 200、走代理 000（完全失败），
 * 所以它们必须在 noProxy 里。但配好之后搜索里它们**仍然**报 Transport error，
 * 说明分流没起作用 —— 需要直接验证，而不是继续推断。
 */
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'

const NO_PROXY = 'so.com,www.so.com,360.cn,douban.com,weibo.com,baidu.com,zhihu.com'

setGlobalDispatcher(new EnvHttpProxyAgent({
  httpProxy: 'http://127.0.0.1:7890',
  httpsProxy: 'http://127.0.0.1:7890',
  noProxy: NO_PROXY,
}))

const urls = [
  ['so.com（应在 noProxy 里 → 期望直连成功）', 'https://www.so.com/s?q=test'],
  ['douban（应在 noProxy 里）', 'https://www.douban.com/search?q=test'],
  ['google（不在 noProxy → 期望走代理成功）', 'https://www.google.com/search?q=test'],
  ['wikipedia（不在 noProxy → 走代理）', 'https://zh.wikipedia.org/wiki/Test'],
]

for (const [label, url] of urls) {
  const started = Date.now()
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) })
    console.log(`OK   ${label}\n     → ${r.status} (${Date.now() - started}ms)`)
  } catch (e) {
    console.log(`FAIL ${label}\n     → ${e.message} (${Date.now() - started}ms)`)
  }
}
