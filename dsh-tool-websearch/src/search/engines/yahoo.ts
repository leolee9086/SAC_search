/**
 * Yahoo 搜索引擎适配器
 *
 * 使用 Yahoo 搜索 HTML 页面解析。
 * URL: https://search.yahoo.com/search?p=QUERY
 *
 * 参考 SearXNG: searx/engines/yahoo.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://search.yahoo.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeYahoo(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchYahoo(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchYahoo(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ p: query })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseYahooResults(html, numResults)
  })
}

function parseYahooResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果: algo-sr 容器中的链接和标题
  const resultRegex = /<div[^>]*class="[^"]*algo-sr[^"]*"[^>]*>[\s\S]*?<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h3>[\s\S]*?<div[^>]*class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

  let match: RegExpExecArray | null
  while ((match = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const content = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue

    // 移除 Yahoo 跟踪 URL
    const ruMatch = url.match(/\/RU=([^/]+)\/RK/)
    if (ruMatch) {
      try { url = decodeURIComponent(ruMatch[1]) } catch { /* keep original */ }
    }

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: content,
        engine: "yahoo",
        position: pos,
        category: "general",
      }),
    )
  }

  // 备用模式：更宽松的匹配
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*class="[^"]*d-ib[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*fc-falcon[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      let url = match[1].trim()
      const title = match[2].replace(/<[^>]+>/g, "").trim()

      if (!title) continue

      const ruMatch = url.match(/\/RU=([^/]+)\/RK/)
      if (ruMatch) {
        try { url = decodeURIComponent(ruMatch[1]) } catch { /* keep original */ }
      }

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "Yahoo search result",
          engine: "yahoo",
          position: pos,
          category: "general",
        }),
      )
    }
  }

  return results
}

export * as YahooEngine from "./yahoo"
