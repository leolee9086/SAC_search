/**
 * FRED (Federal Reserve Economic Data) 搜索引擎适配器
 *
 * 搜索美联储经济数据库。
 * API: https://fred.stlouisfed.org/docs/api/fred/
 * 需要免费注册获取 API key，但无 key 也可搜索
 * 参考 SearXNG: destatis 模式（政府统计 API）
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeFred(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchFred(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchFred(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const key = process.env.FRED_API_KEY || ""
    const keyParam = key ? `&api_key=${key}` : ""
    const url = `https://api.stlouisfed.org/fred/series/search?search_text=${encodeURIComponent(query)}&limit=${numResults}&file_type=json${keyParam}`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseFredResults(raw, numResults)
  })
}

interface FredSeries {
  id?: string
  title?: string
  frequency?: string
  units?: string
  seasonal_adjustment?: string
  observation_start?: string
  observation_end?: string
}

function parseFredResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as { seriess?: FredSeries[] }
  if (!data?.seriess) return []
  return data.seriess.slice(0, max).map((s, i) =>
    makeSearchResult({
      title: `${s.id}: ${s.title || "Untitled"}`,
      url: `https://fred.stlouisfed.org/series/${s.id || ""}`,
      snippet: `Frequency: ${s.frequency || "N/A"} · Units: ${s.units || "N/A"} · ${s.seasonal_adjustment || ""}`,
      engine: "fred",
      position: i + 1,
      category: "finance",
    }))
}

export * as FredEngine from "./fred"
