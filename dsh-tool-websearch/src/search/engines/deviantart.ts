/**
 * DeviantArt 艺术作品搜索引擎适配器
 *
 * 搜索 DeviantArt 上的艺术作品。
 * URL: https://www.deviantart.com/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/deviantart.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.deviantart.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeDeviantArt(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDeviantArt(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchDeviantArt(
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

    return parseDeviantArtResults(html, numResults)
  })
}

function parseDeviantArtResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配艺术作品链接: /art/SLUG
  const artRegex = /href="(https:\/\/www\.deviantart\.com\/[^/]+\/art\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"/gi

  let match: RegExpExecArray | null
  while ((match = artRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const url = match[1].trim()
    const title = match[2].trim()
    const thumbnail = match[3].trim()

    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: "DeviantArt artwork",
        engine: "deviantart",
        position: pos,
        category: "image",
      }),
    )
  }

  // 备用模式：更宽松的匹配
  if (results.length === 0) {
    const fallbackRegex = /href="(\/[^/]+\/art\/[^"]*)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const href = match[1]
      const title = match[2].trim()

      if (!title) continue

      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "Artwork on DeviantArt",
          engine: "deviantart",
          position: pos,
          category: "image",
        }),
      )
    }
  }

  return results
}

export * as DeviantArtEngine from "./deviantart"
