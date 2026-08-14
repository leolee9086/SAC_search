/**
 * Flickr 图片搜索引擎适配器
 *
 * 使用 Flickr 公开搜索页面 HTML 解析。
 * https://www.flickr.com/search?text=KEYWORD
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://www.flickr.com/search"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeFlickr(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchFlickr(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchFlickr(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?text=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseFlickrResults(html, numResults)
  })
}

export function parseFlickrResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  const itemRegex = /<a[^>]*class="[^"]*overlay[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const url = match[1].startsWith("http") ? match[1] : `https://www.flickr.com${match[1]}`
    const title = match[2].trim()
    if (!title || !url) continue

    pos++
    results.push(makeSearchResult({
      title, url, snippet: "",
      engine: "flickr", position: pos, category: "image",
    }))
  }

  return results
}

export * as Flickr from "./flickr"
