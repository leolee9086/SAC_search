/**
 * Invidious YouTube 前端搜索引擎适配器
 *
 * 搜索 Invidious（隐私友好 YouTube 前端）上的视频。
 * API: https://vid.puffyan.us/api/v1/search?q=QUERY&type=video
 *
 * 参考 SearXNG: searx/engines/invidious.py
 * 零风险：公开 JSON API，无需 key
 * 多实例并行，提升可用性
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const INVIDIOUS_INSTANCES = [
  "https://vid.puffyan.us",
  "https://invidious.nerdvpn.de",
  "https://invidious.privacyredirect.com",
]
const USER_AGENT = "opencode-search/1.0"

export function makeInvidious(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchInvidious(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchInvidious(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const results: SearchResult[] = []

    for (const instance of INVIDIOUS_INSTANCES) {
      if (results.length >= numResults) break

      const params = new URLSearchParams({
        q: query,
        type: "video",
      })

      try {
        const response = yield* http.execute(
          HttpClientRequest.get(`${instance}/api/v1/search?${params.toString()}`).pipe(
            HttpClientRequest.setHeaders({
              "User-Agent": USER_AGENT,
              Accept: "application/json",
            }),
          ),
        ).pipe(Effect.timeout(timeout))

        if (response.status < 200 || response.status >= 400) continue
        const raw: string = yield* response.text
        if (!raw) continue

        const instanceResults = parseInvidiousResults(raw, numResults)
        results.push(...instanceResults)
      } catch {
        continue
      }
    }

    return results.slice(0, numResults)
  })
}

interface InvidiousVideo {
  videoId?: string
  title?: string
  author?: string
  authorId?: string
  viewCount?: number
  publishedText?: string
  lengthSeconds?: number
  description?: string
}

function parseInvidiousResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const items = parsed as InvidiousVideo[]
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.title || !item.videoId) continue

    const title = item.title
    const author = item.author || ""
    const views = item.viewCount ?? 0
    const duration = item.lengthSeconds ?? 0
    const url = `https://invidious.nerdvpn.de/watch?v=${item.videoId}`

    const parts: string[] = []
    if (author) parts.push(author)
    if (views > 0) parts.push(`${formatViews(views)} views`)
    if (duration > 0) parts.push(formatDuration(duration))
    if (item.publishedText) parts.push(item.publishedText)

    const snippet = parts.length > 0
      ? `[${parts.join(" · ")}] ${(item.description || "").slice(0, 150)}`.trim()
      : item.description?.slice(0, 300) || "Invidious video"

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet.slice(0, 300),
        engine: "invidious",
        position: pos,
        category: "video",
      }),
    )
  }

  return results
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`
  return String(views)
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

export * as InvidiousEngine from "./invidious"
