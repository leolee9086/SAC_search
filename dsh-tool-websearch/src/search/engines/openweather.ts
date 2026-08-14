/**
 * OpenWeatherMap 天气搜索引擎适配器
 *
 * 搜索城市天气数据。
 * API: https://openweathermap.org/api
 * 需要免费注册获取 API key（60次/分钟免费）
 * 参考 SearXNG: searx/engines/open_meteo.py
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeOpenWeather(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchOwm(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchOwm(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const key = process.env.OPENWEATHER_API_KEY || ""
    if (!key) return []
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${key}&units=metric&lang=zh_cn`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseOwmResults(raw, numResults)
  })
}

interface OwmResponse {
  name?: string
  sys?: { country?: string }
  weather?: Array<{ description?: string; icon?: string }>
  main?: { temp?: number; feels_like?: number; humidity?: number; temp_min?: number; temp_max?: number }
  wind?: { speed?: number }
}

function parseOwmResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as OwmResponse
  if (!data?.name) return []
  const weather = data.weather?.[0]
  const main = data.main
  return [makeSearchResult({
    title: `${data.name}, ${data.sys?.country || ""} · ${weather?.description || ""}`,
    url: `https://openweathermap.org/city/${encodeURIComponent(data.name)}`,
    snippet: `🌡 ${main?.temp?.toFixed(0) || "?"}°C (feels ${main?.feels_like?.toFixed(0) || "?"}°) · Min ${main?.temp_min?.toFixed(0) || "?"}° / Max ${main?.temp_max?.toFixed(0) || "?"}° · Humidity ${main?.humidity || "?"}% · Wind ${data.wind?.speed || "?"} m/s`,
    engine: "openweather",
    position: 1,
    category: "weather",
  })].slice(0, max)
}

export * as OpenWeatherEngine from "./openweather"
