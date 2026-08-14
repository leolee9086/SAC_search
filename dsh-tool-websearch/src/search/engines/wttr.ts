/**
 * wttr.in 天气搜索引擎适配器
 *
 * 搜索天气信息。
 * API: https://wttr.in/QUERY?format=j1
 *
 * 参考 SearXNG: searx/engines/wttr.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://wttr.in"
const USER_AGENT = "opencode-search/1.0"

export function makeWttr(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchWttr(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchWttr(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      format: "j1",
      lang: "en",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}/${encodeURIComponent(query)}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseWttrResults(raw, query, numResults)
  })
}

interface WttrCondition {
  temp_C?: string
  FeelsLikeC?: string
  weatherCode?: string
  humidity?: string
  windspeedKmph?: string
  winddirDegree?: string
  pressure?: string
  cloudcover?: string
  weatherDesc?: Array<{ value?: string }>
}

interface WttrData {
  current_condition?: WttrCondition[]
  weather?: Array<{
    date?: string
    hourly?: WttrCondition[]
  }>
}

const WEATHER_CODES: Record<string, string> = {
  "113": "Clear sky",
  "116": "Partly cloudy",
  "119": "Cloudy",
  "122": "Overcast",
  "143": "Mist",
  "176": "Light rain showers",
  "179": "Light snow showers",
  "200": "Thunderstorm",
  "227": "Light snow",
  "230": "Heavy snow",
  "248": "Fog",
  "263": "Light drizzle",
  "266": "Moderate drizzle",
  "293": "Light rain",
  "296": "Moderate rain",
  "299": "Heavy rain",
  "302": "Heavy rain",
  "305": "Very heavy rain",
  "308": "Torrential rain",
  "323": "Light snow",
  "326": "Moderate snow",
  "329": "Heavy snow",
  "332": "Heavy snow",
  "335": "Very heavy snow",
  "338": "Blizzard",
  "353": "Light rain shower",
  "356": "Heavy rain shower",
  "359": "Violent rain shower",
  "386": "Thunderstorm with light rain",
  "389": "Thunderstorm with heavy rain",
}

function parseWttrResults(raw: string, query: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as WttrData
  const current = data.current_condition?.[0]
  if (!current) return []

  const results: SearchResult[] = []
  let pos = 0

  const tempC = current.temp_C || ""
  const feelsLike = current.FeelsLikeC || ""
  const condition = WEATHER_CODES[current.weatherCode || ""] || current.weatherDesc?.[0]?.value || "Unknown"
  const humidity = current.humidity || ""
  const windSpeed = current.windspeedKmph || ""
  const pressure = current.pressure || ""

  const snippet = `${tempC}°C (feels like ${feelsLike}°C) · ${condition} · Humidity: ${humidity}% · Wind: ${windSpeed} km/h`

  pos++
  results.push(
    makeSearchResult({
      title: `Weather in ${query}: ${tempC}°C - ${condition}`,
      url: `https://wttr.in/${encodeURIComponent(query)}`,
      snippet,
      engine: "wttr",
      position: pos,
      category: "weather",
    }),
  )

  // 添加未来几天的预报
  const weather = data.weather
  if (Array.isArray(weather)) {
    for (const day of weather.slice(0, Math.min(maxResults - 1, 3))) {
      if (results.length >= maxResults) break
      if (!day.date) continue

      const dayCondition = day.hourly?.[4] || day.hourly?.[0]
      if (!dayCondition) continue

      const dayTemp = dayCondition.temp_C || ""
      const dayWeather = WEATHER_CODES[dayCondition.weatherCode || ""] || dayCondition.weatherDesc?.[0]?.value || ""

      pos++
      results.push(
        makeSearchResult({
          title: `${day.date}: ${dayTemp}°C - ${dayWeather}`,
          url: `https://wttr.in/${encodeURIComponent(query)}`,
          snippet: `Forecast for ${day.date}`,
          engine: "wttr",
          position: pos,
          category: "weather",
        }),
      )
    }
  }

  return results
}

export * as WttrEngine from "./wttr"
