/**
 * Rotten Tomatoes 电影评价搜索引擎适配器
 *
 * 搜索 Rotten Tomatoes 上的电影评价。
 * URL: https://www.rottentomatoes.com/search?search=QUERY
 *
 * 参考 SearXNG: searx/engines/rottentomatoes.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.rottentomatoes.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeRottenTomatoes(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchRottenTomatoes(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchRottenTomatoes(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ search: query })

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

    return parseRottenTomatoesResults(html, numResults)
  })
}

function parseRottenTomatoesResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 search-page-media-row 组件
  const rowRegex = /<search-page-media-row[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/search-page-media-row>/gi

  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const title = match[2].trim()
    const thumbnail = match[3].trim()

    if (!title || !href) continue

    const url = href.startsWith("http") ? href : `${BASE_URL}${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: "Rotten Tomatoes",
        engine: "rottentomatoes",
        position: pos,
        category: "video",
      }),
    )
  }

  // 备用模式：匹配更宽松的链接
  if (results.length === 0) {
    const fallbackRegex = /href="(https:\/\/www\.rottentomatoes\.com\/m\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const url = match[1]
      const title = match[2].trim()

      if (!title) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "Movie on Rotten Tomatoes",
          engine: "rottentomatoes",
          position: pos,
          category: "video",
        }),
      )
    }
  }

  return results
}

export * as RottenTomatoesEngine from "./rottentomatoes"
