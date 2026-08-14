/**
 * Moviepilot 电影搜索引擎适配器
 *
 * 搜索 Moviepilot（德国电影数据库）上的电影信息。
 * API: https://www.moviepilot.de/api/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/moviepilot.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.moviepilot.de"
const USER_AGENT = "opencode-search/1.0"

export function makeMoviepilot(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMoviepilot(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMoviepilot(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      page: "1",
      type: "suggest",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/api/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseMoviepilotResults(raw, numResults)
  })
}

interface MoviepilotItem {
  title?: string
  url?: string
  image?: string
  class?: string
  info?: string
  more?: string
}

export function parseMoviepilotResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const items = parsed as MoviepilotItem[]
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.title) continue

    const url = item.url?.startsWith("http") ? item.url : `${BASE_URL}${item.url || ""}`
    const info = [item.class, item.info, item.more].filter(Boolean).join(", ")

    pos++
    results.push(
      makeSearchResult({
        title: item.title,
        url,
        snippet: info || "Moviepilot entry",
        engine: "moviepilot",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as MoviepilotEngine from "./moviepilot"
