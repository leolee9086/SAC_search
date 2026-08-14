/**
 * Google 搜索引擎适配器
 *
 * 参考 SearXNG 的 google.py (18.8KB)
 * 完整的语言/地区/域名协商 + CAPTCHA 检测。
 *
 * 策略：
 * - getGoogleInfo() 处理 hl/lr/cr 参数和子域名选择
 * - isGoogleCaptcha() 三段式 CAPTCHA 检测
 * - CONSENT cookie 绕过 GDPR 弹窗
 * - Google Search App User-Agent
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"
import { getGoogleInfo, isGoogleCaptcha } from "./google-traits"

export function makeGoogle(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGoogle(http, query, opts.numResults || config.maxResults, config.timeout, opts.lang),
  }
}

function searchGoogle(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
  lang?: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 使用 traits 获取语言/地区/域名参数
    const info = getGoogleInfo(lang)

    const params = new URLSearchParams({
      q: query,
      num: String(Math.min(numResults, 20)),
      start: "0",
      filter: "0",
      safe: "off",
      ...info.params,
    })

    const url = `https://${info.subdomain}/search?${params.toString()}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          ...info.headers,
          "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Cookie: Object.entries(info.cookies).map(([k, v]) => `${k}=${v}`).join("; "),
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    // CAPTCHA 检测
    if (isGoogleCaptcha(response.status, html)) return []

    return parseGoogleResults(html, numResults)
  })
}

/**
 * 解析 Google 搜索结果 HTML
 *
 * 参考 SearXNG: //a[@data-ved and not(@class)]
 * 标题: h3 内容
 * URL: a/@href → /url?q=实际URL
 * 摘要: div.VwiC3b
 */
export function parseGoogleResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  const titleRegex = /<a[^>]*data-ved[^>]*href="\/url\?q=([^"&]+)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>/gi

  const titlePositions: Array<{ url: string; title: string; index: number }> = []
  let titleMatch: RegExpExecArray | null
  while ((titleMatch = titleRegex.exec(html)) !== null) {
    if (titlePositions.length >= maxResults * 2) break
    let url = decodeURIComponent(titleMatch[1])
    if (url.includes("&sa=U")) url = url.split("&sa=U")[0]
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim()
    if (title && url) titlePositions.push({ url, title, index: titleMatch.index })
  }

  for (const tp of titlePositions) {
    if (results.length >= maxResults) break
    const after = html.slice(tp.index, tp.index + 2000)
    let snippet = ""
    const snipMatch = after.match(/<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    if (snipMatch) snippet = snipMatch[1].replace(/<[^>]*>/g, "").trim()

    pos++
    results.push(
      makeSearchResult({
        title: tp.title,
        url: tp.url,
        snippet: snippet.slice(0, 300),
        engine: "google",
        position: pos,
      }),
    )
  }

  return results
}

export * as Google from "./google"
