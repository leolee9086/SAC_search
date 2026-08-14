/**
 * 搜狗视频搜索引擎适配器
 *
 * 搜索搜狗视频平台上的短视频。
 * API: https://v.sogou.com/api/video/shortVideoV2?page=1&pagesize=10&query=QUERY
 *
 * 参考 SearXNG: searx/engines/sogou_videos.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://v.sogou.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeSogouVideos(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSogouVideos(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSogouVideos(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      page: "1",
      pagesize: String(Math.min(numResults, 20)),
      query,
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/api/video/shortVideoV2?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          Referer: `${BASE_URL}/`,
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseSogouVideosResults(raw, numResults)
  })
}

interface SogouVideoEntry {
  titleEsc?: string
  url?: string
  site?: string
  picurl?: string
  date?: string
  duration?: string
}

export function parseSogouVideosResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { data?: { list?: SogouVideoEntry[] } }
  const items = data?.data?.list
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.titleEsc || !item.url) continue

    const videoUrl = item.url.startsWith("/") ? `${BASE_URL}${item.url}` : item.url

    const parts: string[] = []
    if (item.site) parts.push(item.site)
    if (item.duration) parts.push(item.duration)
    if (item.date) parts.push(item.date)

    pos++
    results.push(
      makeSearchResult({
        title: item.titleEsc,
        url: videoUrl,
        snippet: parts.length > 0 ? parts.join(" · ") : "Sogou video",
        engine: "sogou-videos",
        position: pos,
        publishedDate: item.date ? new Date(item.date).getTime() : undefined,
        category: "video",
      }),
    )
  }

  return results
}

export * as SogouVideosEngine from "./sogou-videos"
