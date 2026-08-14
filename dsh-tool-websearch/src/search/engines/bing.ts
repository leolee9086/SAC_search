/**
 * Bing 搜索引擎适配器
 *
 * 参考 SearXNG 的 Bing 引擎实现 (searx/engines/bing.py)
 * 通过解析 Bing 公开 HTML 搜索结果页，无需 API key。
 *
 * 关键区别：
 * - 使用正则而非 lxml XPath（TypeScript 环境限制）
 * - 支持两种 HTML 变体：<h2><a> 和 <a class="tilk">
 * - 处理 Bing 的 ck/a 重定向 URL base64 编码
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BING_SEARCH_URL = "https://www.bing.com/search"
const BING_HOST = "https://www.bing.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeBing(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBing(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchBing(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `${BING_SEARCH_URL}?q=${encodeURIComponent(query)}&setlang=en`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/xhtml+xml",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []

    const html: string = yield* response.text
    if (html.includes("captcha") || html.includes("verify")) return []

    return parseBingResults(html, numResults)
  })
}

/**
 * 解码 Bing 的 ck/a 重定向 URL
 *
 * Bing 使用形如 https://www.bing.com/ck/a?... 的追踪链接，
 * 实际 URL 在 u 参数中经过 base64url 编码（无填充）。
 * 参考 SearXNG: base64.urlsafe_b64decode
 */
function decodeBingUrl(href: string): string {
  if (!href.startsWith(`${BING_HOST}/ck/a?`) && !href.startsWith("/ck/a?")) {
    return href
  }

  try {
    const qs = new URL(href, BING_HOST).searchParams
    const u = qs.get("u")
    if (!u) return href
    if (!u.startsWith("a1")) return href

    // base64url without padding
    const encoded = u.slice(2)
    const padded = encoded + "=".repeat((-encoded.length % 4 + 4) % 4)
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
    return decoded
  } catch {
    return href
  }
}

/**
 * 提取单个 b_algo 块的结果
 *
 * 支持两种 HTML 变体：
 * 1. <h2><a href="...">标题</a></h2> (SearXNG 使用的标准结构)
 * 2. <div class="b_tpcn"><a class="tilk" href="...">标题</a></div> (实际观察到的结构)
 */
function extractResult(block: string): { title: string; url: string; snippet: string } | undefined {
  // 尝试变体 1：<h2><a href="URL">标题</a>
  const h2Match = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i)
  if (h2Match) {
    const url = decodeBingUrl(h2Match[1])
    const title = h2Match[2].replace(/<[^>]*>/g, "").trim()
    if (title && url) return extractSnippet(block, title, url)
  }

  // 尝试变体 2：<a class="tilk" href="URL">标题</a>
  const tilkMatch = block.match(/<a[^>]*class="tilk"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
  if (tilkMatch) {
    const url = decodeBingUrl(tilkMatch[1])
    const title = tilkMatch[2].replace(/<[^>]*>/g, "").trim()
    if (title && url) return extractSnippet(block, title, url)
  }

  return undefined
}

/**
 * 从 b_algo 块中提取摘要，参考 SearXNG 清理 <span class="algoSlug_icon">
 */
function extractSnippet(block: string, title: string, url: string): { title: string; url: string; snippet: string } {
  // 清理 decorative icons
  const cleaned = block.replace(/<span[^>]*class="algoSlug_icon"[^>]*>[\s\S]*?<\/span>/gi, "")

  // 提取 <p> 标签内容（SearXNG 方式）
  const pTags: string[] = []
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let pMatch: RegExpExecArray | null
  while ((pMatch = pRegex.exec(cleaned)) !== null) {
    const text = pMatch[1].replace(/<[^>]*>/g, "").trim()
    if (text) pTags.push(text)
  }

  return { title, url, snippet: pTags.join(" ").trim() }
}

/**
 * 解析 Bing 搜索结果 HTML
 *
 * 参考 SearXNG 的 XPath: //ol[@id="b_results"]/li[contains(@class, "b_algo")]
 * 使用正则匹配，支持多种 HTML 变体。
 */
export function parseBingResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  const seen = new Set<string>()
  let pos = 0

  // 先定位到结果容器，避免匹配非搜索结果
  const containerStart = html.indexOf('<ol id="b_results"')
  const searchHtml = containerStart === -1 ? html : html.slice(containerStart)

  // 逐块提取 <li class="b_algo">...</li>
  const algoRegex = /<li[^>]*class="b_algo"[^>]*>[\s\S]*?<\/li>/gi
  let match: RegExpExecArray | null

  while ((match = algoRegex.exec(searchHtml)) !== null) {
    if (results.length >= maxResults) break

    const extracted = extractResult(match[0])
    if (!extracted) continue
    if (seen.has(extracted.url)) continue
    seen.add(extracted.url)

    pos++
    results.push(makeSearchResult({
      title: extracted.title,
      url: extracted.url,
      snippet: extracted.snippet,
      engine: "bing",
      position: pos,
    }))
  }

  return results
}

export * as BingEngine from "./bing"
