/**
 * Tootfinder Mastodon 社交搜索适配器
 *
 * 搜索 Mastodon 联邦网络上的公开帖子。
 * API: https://www.tootfinder.ch/rest/api/search/QUERY
 *
 * 参考 SearXNG: searx/engines/tootfinder.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://www.tootfinder.ch/rest/api/search"
const USER_AGENT = "opencode-search/1.0"

export function makeTootfinder(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchTootfinder(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchTootfinder(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}/${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseTootfinderResults(raw, numResults)
  })
}

interface TootResult {
  url?: string
  content?: string
  created_at?: string
  card?: { title?: string }
  media_attachments?: Array<{ type?: string; preview_url?: string }>
}

export function parseTootfinderResults(raw: string, maxResults: number): SearchResult[] {
  let data: TootResult[] | undefined
  // tootfinder API may append HTML error lines before JSON; find the JSON line
  for (const line of raw.split("\n")) {
    if (line.startsWith("[{")) {
      try { data = JSON.parse(line) as TootResult[] } catch { /* ignore */ }
      break
    }
  }
  if (!data) {
    try { data = JSON.parse(raw) as TootResult[] } catch { return [] }
  }
  if (!Array.isArray(data)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of data) {
    if (results.length >= maxResults) break
    if (!item.url) continue

    const title = item.card?.title || item.content?.replace(/<[^>]+>/g, "").slice(0, 75) || "Toot"
    const snippet = item.content?.replace(/<[^>]+>/g, "").slice(0, 300) || ""
    const publishedDate = item.created_at ? new Date(item.created_at).getTime() : undefined

    pos++
    results.push(
      makeSearchResult({
        title,
        url: item.url,
        snippet,
        engine: "tootfinder",
        position: pos,
        publishedDate,
        category: "social",
      }),
    )
  }

  return results
}

export * as TootfinderEngine from "./tootfinder"
