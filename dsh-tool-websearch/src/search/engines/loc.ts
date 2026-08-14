/**
 * LOC 美国国会图书馆搜索引擎适配器
 *
 * 搜索 Library of Congress 的照片、印刷品和绘画藏品。
 * API: https://www.loc.gov/photos/?q=QUERY&fo=json
 *
 * 参考 SearXNG: searx/engines/loc.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.loc.gov"
const USER_AGENT = "opencode-search/1.0"

export function makeLoc(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchLoc(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchLoc(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query, fo: "json" })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/photos/?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseLocResults(raw, numResults)
  })
}

interface LocItem {
  link?: string
  created_published_date?: string
  summary?: string[]
  notes?: string[]
  part_of?: string[]
}

interface LocCreator {
  title?: string
}

interface LocResult {
  title?: string
  item?: LocItem
  image_url?: string[]
}

export function parseLocResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { results?: LocResult[] }
  const results_arr = data?.results
  if (!Array.isArray(results_arr)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const result of results_arr) {
    if (results.length >= maxResults) break
    const url = result?.item?.link
    if (!url) continue

    const title = (result.title || "").replace(/^\[/, "").replace(/\]$/, "")
    const item = result.item
    const parts = [
      item?.created_published_date,
      item?.summary?.[0],
      item?.notes?.[0],
      item?.part_of?.[0],
    ].filter(Boolean)
    const snippet = parts.join(" / ") || "Library of Congress image"

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet.slice(0, 300),
        engine: "loc",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as LocEngine from "./loc"
