/**
 * OpenClipArt 矢量图搜索引擎适配器
 *
 * 搜索 OpenClipArt 上的免费矢量图。
 * URL: https://openclipart.org/search/?query=QUERY
 *
 * 参考 SearXNG: searx/engines/openclipart.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://openclipart.org"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeOpenClipArt(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchOpenClipArt(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchOpenClipArt(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      p: "1",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search/?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseOpenClipArtResults(html, numResults)
  })
}

export function parseOpenClipArtResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 gallery 中的 artwork div
  const itemRegex = /<div[^>]*class="[^"]*artwork[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const imgSrc = match[2].trim()
    const alt = match[3].trim()

    if (!href || !alt) continue

    if (href.startsWith("/")) href = `${BASE_URL}${href}`
    else if (!href.startsWith("http")) href = `${BASE_URL}/${href}`

    pos++
    results.push(
      makeSearchResult({
        title: alt,
        url: href,
        snippet: `OpenClipArt: ${alt}`,
        engine: "openclipart",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as OpenClipArtEngine from "./openclipart"
