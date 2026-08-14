/**
 * Sepia Search 联邦视频搜索引擎适配器
 *
 * 搜索 PeerTube 联邦网络上的视频。
 * API: https://sepiasearch.org/api/v1/search/videos
 *
 * 参考 SearXNG: searx/engines/sepiasearch.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://sepiasearch.org/api/v1/search/videos"
const USER_AGENT = "opencode-search/1.0"

export function makeSepiaSearch(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSepiaSearch(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSepiaSearch(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      start: "0",
      count: String(Math.min(numResults, 20)),
      sort: "-createdAt",
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

    return parseSepiaSearchResults(raw, numResults)
  })
}

interface SepiaVideo {
  uuid?: string
  name?: string
  url?: string
  description?: string
  duration?: number
  views?: number
  likes?: number
  channel?: { name?: string }
  thumbnailPath?: string
  createdAt?: string
}

interface SepiaResponse {
  data?: SepiaVideo[]
  total?: number
}

export function parseSepiaSearchResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const response = parsed as SepiaResponse
  const videos = response?.data
  if (!Array.isArray(videos)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const video of videos) {
    if (results.length >= maxResults) break
    if (!video.name || !video.uuid) continue

    const channel = video.channel?.name || ""
    const duration = video.duration ? formatDuration(video.duration) : ""
    const views = video.views ? `${video.views} views` : ""
    const snippet = [channel, duration, views].filter(Boolean).join(" · ")

    pos++
    results.push(
      makeSearchResult({
        title: video.name,
        url: video.url || `https://sepiasearch.org/videos/watch/${video.uuid}`,
        snippet: snippet || "PeerTube video",
        engine: "sepiasearch",
        position: pos,
        publishedDate: video.createdAt ? new Date(video.createdAt).getTime() : undefined,
        category: "video",
      }),
    )
  }

  return results
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

export * as SepiaSearchEngine from "./sepiasearch"
