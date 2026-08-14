/**
 * Odysee 视频搜索引擎适配器
 *
 * 搜索 Odysee 上的视频内容。
 * API: https://api.na-backend.odysee.com/api/v1/proxy?m=search&q=QUERY
 *
 * 参考 SearXNG: searx/engines/odysee.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.na-backend.odysee.com/api/v1/proxy"
const WEB_URL = "https://odysee.com"
const USER_AGENT = "opencode-search/1.0"

export function makeOdysee(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchOdysee(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchOdysee(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // Odysee 使用 JSON-RPC API
    const body = JSON.stringify({
      jsonrpc: "2.0",
      method: "search",
      params: {
        query,
        page: 1,
        limit: Math.min(numResults, 20),
        nsfw: false,
      },
    })

    const response = yield* http.execute(
      HttpClientRequest.post(API_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        HttpClientRequest.bodyText(body),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseOdyseeResults(raw, numResults)
  })
}

interface OdyseeItem {
  name?: string
  title?: string
  description?: string
  claim_id?: string
  channel_name?: string
  channel_claim_id?: string
  duration?: number
  view_count?: number
  creation_timestamp?: number
  thumbnail_url?: string
}

interface OdyseeResponse {
  result?: OdyseeItem[]
}

function parseOdyseeResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as OdyseeResponse
  const items = data?.result
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.title && !item.name) continue

    const title = item.title || item.name || ""
    const author = item.channel_name || ""
    const views = item.view_count ?? 0
    const duration = item.duration ?? 0
    const url = `${WEB_URL}/${item.channel_name || ""}/${item.name || item.claim_id || ""}`

    const parts: string[] = []
    if (author) parts.push(author)
    if (views > 0) parts.push(`${formatViews(views)} views`)
    if (duration > 0) parts.push(formatDuration(duration))

    const snippet = parts.length > 0
      ? `[${parts.join(" · ")}] ${(item.description || "").slice(0, 150)}`.trim()
      : item.description?.slice(0, 300) || "Odysee video"

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet.slice(0, 300),
        engine: "odysee",
        position: pos,
        publishedDate: item.creation_timestamp ? item.creation_timestamp * 1000 : undefined,
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

export * as OdyseeEngine from "./odysee"
