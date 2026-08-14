/**
 * 1x 艺术摄影搜索引擎适配器
 *
 * 搜索 1x.com 上的艺术摄影作品。
 * API: https://1x.com/backend/search.php?q=QUERY
 *
 * 参考 SearXNG: searx/engines/www1x.py
 * 风险较低：公开 HTML/XML 解析，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://1x.com"
const SEARCH_URL = "https://1x.com/backend/search.php"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function make1x(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      search1x(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function search1x(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parse1xResults(raw, numResults)
  })
}

export function parse1xResults(body: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 1x returns XML with photo links: <a href="/photo/123">Title</a>
  const linkRegex = /<a[^>]*href="(\/photo\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(body)) !== null) {
    if (results.length >= maxResults) break
    const url = `${BASE_URL}${match[1].trim()}`
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: "1x.com art photography",
        engine: "1x",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as OneXEngine from "./1x"
