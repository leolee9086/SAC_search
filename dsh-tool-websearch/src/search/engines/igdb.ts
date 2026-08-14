/**
 * IGDB (Internet Game Database) 搜索引擎适配器
 *
 * 搜索 IGDB 上的游戏数据。
 * API: https://api-docs.igdb.com/
 * 需要 Twitch Client ID + Secret（免费注册）
 * 参考 SearXNG: 未直接收录，steam 模式参考
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeIgdb(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchIgdb(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchIgdb(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const clientId = process.env.TWITCH_CLIENT_ID || ""
    const accessToken = process.env.TWITCH_ACCESS_TOKEN || ""
    if (!clientId || !accessToken) return []
    const url = "https://api.igdb.com/v4/games"
    const body = `search "${query}"; fields name,summary,url,first_release_date,rating; limit ${numResults};`
    const response = yield* http.execute(
      HttpClientRequest.post(url).pipe(
        HttpClientRequest.setHeaders({
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        }),
        // @ts-expect-error: setBody api
        HttpClientRequest.setBody(body),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseIgdbResults(raw, numResults)
  })
}

interface IgdbGame {
  id?: number
  name?: string
  summary?: string
  url?: string
  first_release_date?: number
  rating?: number
}

function parseIgdbResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(parsed)) return []
  return (parsed as IgdbGame[]).slice(0, max).map((g, i) => {
    const release = g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : ""
    return makeSearchResult({
      title: g.name || `Game ${g.id}`,
      url: g.url || `https://www.igdb.com/games/${g.id || ""}`,
      snippet: `${g.summary?.slice(0, 120) || ""} · ${release} · ⭐${g.rating?.toFixed(0) || "?"}/100`,
      engine: "igdb",
      position: i + 1,
      category: "game",
      publishedDate: g.first_release_date ? g.first_release_date * 1000 : undefined,
    })
  })
}

export * as IgdbEngine from "./igdb"
