/**
 * Reddit 搜索引擎适配器
 *
 * 使用 Reddit 公开搜索页面 HTML 解析。
 * https://www.reddit.com/search/?q=KEYWORD
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://www.reddit.com/search"
const USER_AGENT = "opencode-search/1.0 (by /u/opencode)"

export function makeReddit(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchReddit(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchReddit(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}/?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseRedditResults(html, numResults)
  })
}

export function parseRedditResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  const itemRegex = /<a[^>]*id="[^"]*"[^>]*class="[^"]*search-result[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<faceplate-screen-reader-content>([\s\S]*?)<\/faceplate-screen-reader-content>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const url = match[1].startsWith("/r/") ? `https://www.reddit.com${match[1]}` : match[1]
    const title = match[2].trim()
    if (!title || !url) continue

    pos++
    results.push(makeSearchResult({ title, url, snippet: "", engine: "reddit", position: pos, category: "social" }))
  }
  return results
}

export * as Reddit from "./reddit"
