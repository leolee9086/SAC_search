/**
 * Fyyd 播客搜索引擎适配器
 *
 * 搜索 fyyd.de 上的播客节目。
 * API: https://api.fyyd.de/0.2/search/podcast
 *
 * 参考 SearXNG: searx/engines/fyyd.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.fyyd.de/0.2/search/podcast"
const USER_AGENT = "opencode-search/1.0"

export function makeFyyd(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchFyyd(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchFyyd(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      term: query,
      count: String(Math.min(numResults, 20)),
      page: "0",
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

    return parseFyydResults(raw, numResults)
  })
}

interface FyydPodcast {
  htmlURL?: string
  title?: string
  description?: string
  smallImageURL?: string
  rank?: number
  episode_count?: number
  status_since?: string
}

export function parseFyydResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { data?: FyydPodcast[] }
  const podcasts = data?.data
  if (!Array.isArray(podcasts)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const podcast of podcasts) {
    if (results.length >= maxResults) break
    if (!podcast.title || !podcast.htmlURL) continue

    const epCount = podcast.episode_count ? `${podcast.episode_count} episodes` : ""
    const rank = podcast.rank ? `Rank: ${podcast.rank}` : ""
    const snippet = [rank, epCount, podcast.description?.slice(0, 200)].filter(Boolean).join(" || ")

    pos++
    results.push(
      makeSearchResult({
        title: podcast.title,
        url: podcast.htmlURL,
        snippet: snippet.slice(0, 300),
        engine: "fyyd",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as FyydEngine from "./fyyd"
