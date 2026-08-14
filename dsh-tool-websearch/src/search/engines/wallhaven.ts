/**
 * Wallhaven 壁纸搜索引擎适配器
 *
 * 搜索高质量壁纸。
 * API: https://wallhaven.cc/api/v1/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/wallhaven.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://wallhaven.cc/api/v1/search"
const USER_AGENT = "opencode-search/1.0"

export function makeWallhaven(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchWallhaven(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchWallhaven(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      purity: "110", // SFW + Sketchy (no NSFW)
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

    return parseWallhavenResults(raw, numResults)
  })
}

interface WallhavenEntry {
  id: string
  url: string
  path: string
  category: string
  purity: string
  resolution: string
  file_type: string
  file_size: number
  created_at: string
  thumbs: { small: string; large: string }
}

function parseWallhavenResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { data?: WallhavenEntry[] }
  const entries = data?.data
  if (!Array.isArray(entries)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const entry of entries) {
    if (results.length >= maxResults) break
    if (!entry.url) continue

    const sizeKB = entry.file_size ? (entry.file_size / 1024).toFixed(1) : ""

    pos++
    results.push(
      makeSearchResult({
        title: `${entry.category} · ${entry.resolution} · ${entry.file_type}`,
        url: entry.url,
        snippet: `${entry.category} / ${entry.purity} · ${sizeKB} KB`,
        engine: "wallhaven",
        position: pos,
        publishedDate: entry.created_at ? new Date(entry.created_at).getTime() : undefined,
        category: "image",
      }),
    )
  }

  return results
}

export * as WallhavenEngine from "./wallhaven"
