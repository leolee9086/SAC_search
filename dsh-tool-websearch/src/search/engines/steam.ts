/**
 * Steam 游戏搜索引擎适配器
 *
 * 搜索 Steam 上的游戏。
 * API: https://store.steampowered.com/api/storesearch/?term=QUERY
 *
 * 参考 SearXNG: searx/engines/steam.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://store.steampowered.com/api/storesearch/"
const USER_AGENT = "opencode-search/1.0"

export function makeSteam(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSteam(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSteam(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      term: query,
      cc: "us",
      l: "en",
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

    return parseSteamResults(raw, numResults)
  })
}

interface SteamItem {
  id?: number
  name?: string
  tiny_image?: string
  price?: { currency?: string; final?: number }
  platforms?: Record<string, boolean>
}

function parseSteamResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { items?: SteamItem[] }
  const items = data?.items
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.id || !item.name) continue

    const price = item.price?.final ? (item.price.final / 100).toFixed(2) : ""
    const currency = item.price?.currency || "USD"
    const platforms = item.platforms
      ? Object.entries(item.platforms)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ")
      : ""

    const parts: string[] = []
    if (price) parts.push(`$${price} ${currency}`)
    if (platforms) parts.push(platforms)

    pos++
    results.push(
      makeSearchResult({
        title: item.name,
        url: `https://store.steampowered.com/app/${item.id}`,
        snippet: parts.join(" · ") || "Steam game",
        engine: "steam",
        position: pos,
        category: "video",
      }),
    )
  }

  return results
}

export * as SteamEngine from "./steam"
