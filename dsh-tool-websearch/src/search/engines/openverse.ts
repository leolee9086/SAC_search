/**
 * Openverse 开放媒体搜索引擎适配器
 *
 * 搜索 Creative Commons 开放授权的图片。
 * API: https://api.openverse.org/v1/images/?q=QUERY
 *
 * 参考 SearXNG: searx/engines/openverse.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.openverse.org/v1/images/"
const USER_AGENT = "opencode-search/1.0"

export function makeOpenverse(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchOpenverse(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchOpenverse(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      page_size: String(Math.min(numResults, 50)),
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

    return parseOpenverseResults(raw, numResults)
  })
}

interface OpenverseEntry {
  title?: string
  foreign_landing_url?: string
  url?: string
  creator?: string
  license?: string
  license_version?: string
  source?: string
  created_on?: string
}

function parseOpenverseResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { results?: OpenverseEntry[] }
  const entries = data?.results
  if (!Array.isArray(entries)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const entry of entries) {
    if (results.length >= maxResults) break
    if (!entry.foreign_landing_url) continue

    const parts: string[] = []
    if (entry.creator) parts.push(`by ${entry.creator}`)
    if (entry.license) parts.push(entry.license)
    if (entry.source) parts.push(entry.source)

    pos++
    results.push(
      makeSearchResult({
        title: entry.title || "Openverse image",
        url: entry.foreign_landing_url,
        snippet: parts.join(" · ") || "Creative Commons image",
        engine: "openverse",
        position: pos,
        publishedDate: entry.created_on ? new Date(entry.created_on).getTime() : undefined,
        category: "image",
      }),
    )
  }

  return results
}

export * as OpenverseEngine from "./openverse"
