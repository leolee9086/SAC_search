/**
 * TVMaze 电视节目搜索引擎适配器
 *
 * 搜索 TVMaze 上的电视节目数据。
 * API: https://www.tvmaze.com/api
 * 公开 API，无需 key
 * 参考 SearXNG: 未直接收录，IMDb 模式参考
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeTvMaze(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchTvMaze(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchTvMaze(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseTvMazeResults(raw, numResults)
  })
}

interface TvMazeItem {
  score?: number
  show?: {
    id?: number
    name?: string
    url?: string
    summary?: string
    premiered?: string
    status?: string
    genres?: string[]
    rating?: { average?: number }
    network?: { name?: string }
    webChannel?: { name?: string }
  }
}

function parseTvMazeResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(parsed)) return []
  return (parsed as TvMazeItem[]).slice(0, max).map((item, i) => {
    const show = item.show
    if (!show) return makeSearchResult({ title: "", url: "", snippet: "", engine: "tvmaze", position: 0, category: "entertainment" })
    const network = show.network?.name || show.webChannel?.name || ""
    const genres = show.genres?.join(", ") || ""
    return makeSearchResult({
      title: show.name || "Unknown",
      url: show.url || `https://www.tvmaze.com/shows/${show.id || ""}`,
      snippet: `${network} · ${show.status || ""} · ${genres} · ⭐${show.rating?.average?.toFixed(1) || "?"} · ${show.premiered || ""}`,
      engine: "tvmaze",
      position: i + 1,
      category: "entertainment",
      publishedDate: show.premiered ? new Date(show.premiered).getTime() : undefined,
    })
  })
}

export * as TvMazeEngine from "./tvmaze"
