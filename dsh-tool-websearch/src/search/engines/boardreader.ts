/**
 * Boardreader 论坛搜索引擎适配器
 *
 * 搜索 Boardreader 上的论坛帖子。
 * URL: https://boardreader.com/search.php?q=QUERY
 *
 * 参考 SearXNG: searx/engines/boardreader.py
 * 风险较低：公开 HTML 页面解析
 * 特点：聚合多个论坛的搜索结果
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://boardreader.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeBoardreader(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchBoardreader(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchBoardreader(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search.php?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseBoardreaderResults(html, numResults)
  })
}

function parseBoardreaderResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果块
  const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/gi

  let match: RegExpExecArray | null
  while ((match = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
        snippet: snippet.slice(0, 300),
        engine: "boardreader",
        position: pos,
        category: "social",
      }),
    )
  }

  // 备用模式：更宽松的匹配
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const url = match[1].trim()
      const title = match[2].replace(/<[^>]+>/g, "").trim()

      if (!title || !url || url.includes("boardreader.com")) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "",
          engine: "boardreader",
          position: pos,
          category: "social",
        }),
      )
    }
  }

  return results
}

export * as BoardreaderEngine from "./boardreader"
