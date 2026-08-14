/**
 * BitChute 视频搜索引擎适配器
 *
 * 搜索 BitChute 上的视频。
 * API: https://api.bitchute.com/api/beta/search/videos (POST JSON)
 *
 * 参考 SearXNG: searx/engines/bitchute.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.bitchute.com/api/beta/search/videos"
const USER_AGENT = "opencode-search/1.0"

export function makeBitchute(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchBitchute(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchBitchute(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const body = JSON.stringify({
      offset: 0,
      limit: Math.min(numResults, 50),
      query,
      sensitivity_id: "normal",
      sort: "new",
    })

    const response = yield* http.execute(
      HttpClientRequest.post(API_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
        }),
        HttpClientRequest.bodyText(body),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseBitchuteResults(raw, numResults)
  })
}

interface BitchuteVideo {
  video_id?: string
  video_name?: string
  description?: string
  duration?: string
  view_count?: number
  thumbnail_url?: string
  date_published?: string
  channel?: {
    channel_name?: string
  }
}

export function parseBitchuteResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { videos?: BitchuteVideo[] }
  const videos = data?.videos
  if (!Array.isArray(videos)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of videos) {
    if (results.length >= maxResults) break
    if (!item.video_id || !item.video_name) continue

    const url = `https://www.bitchute.com/video/${item.video_id}`
    const author = item.channel?.channel_name || ""
    const duration = item.duration || ""

    const parts: string[] = []
    if (author) parts.push(author)
    if (duration) parts.push(duration)
    if (item.view_count) parts.push(`${item.view_count} views`)

    pos++
    results.push(
      makeSearchResult({
        title: item.video_name,
        url,
        snippet: parts.length > 0
          ? `[${parts.join(" · ")}] ${item.description || ""}`.trim()
          : item.description || "BitChute video",
        engine: "bitchute",
        position: pos,
        publishedDate: item.date_published ? new Date(item.date_published).getTime() : undefined,
        category: "video",
      }),
    )
  }

  return results
}

export * as BitchuteEngine from "./bitchute"
