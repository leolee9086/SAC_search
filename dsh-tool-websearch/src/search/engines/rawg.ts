/**
 * RAWG 游戏数据库搜索引擎适配器
 *
 * 搜索 RAWG 上的游戏数据。
 * API: https://rawg.io/apidocs
 * 需要免费注册获取 API key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeRawg(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchRawg(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchRawg(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const key = process.env.RAWG_API_KEY || ""
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&page_size=${Math.min(numResults, 20)}${key ? `&key=${key}` : ""}`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseRawgResults(raw, numResults)
  })
}

interface RawgGame {
  id?: number
  name?: string
  released?: string
  rating?: number
  metacritic?: number
  genres?: Array<{ name: string }>
  platforms?: Array<{ platform: { name: string } }>
}

function parseRawgResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as { results?: RawgGame[] }
  if (!data?.results) return []
  return data.results.slice(0, max).map((g, i) => {
    const genres = g.genres?.map((x) => x.name).join(", ") || ""
    const platforms = g.platforms?.map((p) => p.platform.name).slice(0, 3).join(", ") || ""
    return makeSearchResult({
      title: g.name || `Game ${g.id}`,
      url: `https://rawg.io/games/${g.id || g.name?.toLowerCase().replace(/\s+/g, "-")}`,
      snippet: `${g.released || ""} · ⭐${g.rating?.toFixed(1) || "?"} · Metacritic ${g.metacritic || "?"} · ${genres} · ${platforms}`,
      engine: "rawg",
      position: i + 1,
      category: "game",
      publishedDate: g.released ? new Date(g.released).getTime() : undefined,
    })
  })
}

export * as RawgEngine from "./rawg"
