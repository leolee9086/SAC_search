/**
 * Hex 包搜索引擎适配器
 *
 * 搜索 Hex.pm 上的 Erlang/Elixir 软件包。
 * API: https://hex.pm/api/packages?search=QUERY
 *
 * 参考 SearXNG: searx/engines/hex.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://hex.pm/api/packages"
const USER_AGENT = "opencode-search/1.0"

export function makeHex(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchHex(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchHex(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      per_page: String(Math.min(numResults, 20)),
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

    return parseHexResults(raw, numResults)
  })
}

interface HexPackage {
  name?: string
  url?: string
  latest_version?: string
  meta?: { description?: string }
  inserted_at?: string
  downloads?: { all?: number }
}

export function parseHexResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const items = parsed as HexPackage[]
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.name) continue

    const version = item.latest_version || ""
    const description = item.meta?.description || ""
    const downloads = item.downloads?.all || 0

    pos++
    results.push(
      makeSearchResult({
        title: `${item.name}${version ? ` v${version}` : ""}`,
        url: `https://hex.pm/packages/${item.name}`,
        snippet: description
          ? `[${downloads.toLocaleString()} downloads] ${description}`.trim()
          : `Hex package: ${item.name}`,
        engine: "hex",
        position: pos,
        publishedDate: item.inserted_at ? new Date(item.inserted_at).getTime() : undefined,
        category: "code",
      }),
    )
  }

  return results
}

export * as HexEngine from "./hex"
