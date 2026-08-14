/**
 * Bandcamp 音乐搜索引擎适配器
 *
 * 搜索 Bandcamp 上的音乐。
 * URL: https://bandcamp.com/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/bandcamp.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://bandcamp.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeBandcamp(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchBandcamp(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchBandcamp(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query })

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

    return parseBandcampResults(html, numResults)
  })
}

function parseBandcampResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果列表项
  const itemRegex = /<li[^>]*class="[^"]*searchresult[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*heading[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*subhead[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const content = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !href) continue

    const url = href.startsWith("http") ? href : `${BASE_URL}${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: content || "Bandcamp music",
        engine: "bandcamp",
        position: pos,
        category: "music",
      }),
    )
  }

  return results
}

export * as BandcampEngine from "./bandcamp"
