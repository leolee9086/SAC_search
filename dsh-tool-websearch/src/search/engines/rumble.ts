/**
 * Rumble 视频搜索引擎适配器
 *
 * 搜索 Rumble 上的视频。
 * URL: https://rumble.com/search/video?q=QUERY
 *
 * 参考 SearXNG: searx/engines/rumble.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://rumble.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeRumble(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchRumble(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchRumble(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search/video?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseRumbleResults(html, numResults)
  })
}

function parseRumbleResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配视频列表项
  const itemRegex = /<li[^>]*class="[^"]*video-listing-entry[^"]*"[^>]*>[\s\S]*?<a[^>]*class="[^"]*video-item--a[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*class="[^"]*video-item--img[^"]*"[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<h3[^>]*class="[^"]*video-item--title[^"]*"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<span[^>]*class="[^"]*video-item--views[^"]*"[^>]*data-value="([^"]*)"/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const thumbnail = match[2].trim()
    const title = match[3].replace(/<[^>]+>/g, "").trim()
    const views = match[4].trim()

    if (!title || !href) continue

    const url = href.startsWith("http") ? href : `${BASE_URL}${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: views ? `${views} views · Rumble` : "Rumble video",
        engine: "rumble",
        position: pos,
        category: "video",
      }),
    )
  }

  return results
}

export * as RumbleEngine from "./rumble"
