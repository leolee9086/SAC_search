/**
 * PeerTube 去中心化视频搜索引擎适配器
 *
 * 搜索 PeerTube 上的视频。
 * API: https://peer.tube/api/v1/search/videos?search=QUERY
 *
 * 参考 SearXNG: searx/engines/peertube.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://peer.tube/api/v1/search/videos"
const USER_AGENT = "opencode-search/1.0"

export function makePeerTube(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchPeerTube(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchPeerTube(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      searchTarget: "search-index",
      resultType: "videos",
      count: String(Math.min(numResults, 50)),
      sort: "-match",
      nsfw: "both",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parsePeerTubeResults(raw, numResults)
  })
}

interface PeerTubeVideo {
  url?: string
  name?: string
  description?: string
  account?: { displayName?: string }
  channel?: { displayName?: string; name?: string; host?: string }
  duration?: number
  views?: number
  publishedAt?: string
  thumbnailUrl?: string
  embedUrl?: string
  tags?: string[]
}

function parsePeerTubeResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { data?: PeerTubeVideo[] }
  const videos = data?.data
  if (!Array.isArray(videos)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const video of videos) {
    if (results.length >= maxResults) break
    if (!video.url || !video.name) continue

    const channel = video.channel?.displayName || video.channel?.name || ""
    const host = video.channel?.host || ""
    const tags = video.tags?.slice(0, 3).join(", ") || ""

    const parts: string[] = []
    if (channel) parts.push(channel)
    if (host) parts.push(`@${host}`)
    if (video.duration) {
      const min = Math.floor(video.duration / 60)
      const sec = video.duration % 60
      parts.push(`${min}:${sec.toString().padStart(2, "0")}`)
    }
    if (video.views) parts.push(`${video.views.toLocaleString()} views`)

    pos++
    results.push(
      makeSearchResult({
        title: video.name,
        url: video.url,
        snippet: parts.join(" · ") || "PeerTube video",
        engine: "peertube",
        position: pos,
        publishedDate: video.publishedAt ? new Date(video.publishedAt).getTime() : undefined,
        category: "video",
      }),
    )
  }

  return results
}

export * as PeerTubeEngine from "./peertube"
