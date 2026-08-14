/**
 * Open Meteo 天气搜索引擎适配器
 *
 * 搜索天气信息。
 * API: https://api.open-meteo.com/v1/forecast
 *
 * 参考 SearXNG: searx/engines/open_meteo.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const GEO_URL = "https://geocoding-api.open-meteo.com"
const API_URL = "https://api.open-meteo.com"
const USER_AGENT = "opencode-search/1.0"

export function makeOpenMeteo(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchOpenMeteo(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchOpenMeteo(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 先地理编码获取坐标
    const geoParams = new URLSearchParams({
      name: query,
      count: "1",
      language: "en",
      format: "json",
    })

    const geoResponse = yield* http.execute(
      HttpClientRequest.get(`${GEO_URL}/v1/search?${geoParams.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (geoResponse.status < 200 || geoResponse.status >= 400) return []
    const geoRaw: string = yield* geoResponse.text
    if (!geoRaw) return []

    let geoParsed: unknown
    try { geoParsed = JSON.parse(geoRaw) } catch { return [] }

    const geoData = geoParsed as { results?: Array<{ latitude?: number; longitude?: number; name?: string }> }
    const location = geoData.results?.[0]
    if (!location?.latitude || !location?.longitude) return []

    // 获取天气数据
    const weatherParams = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      timeformat: "unixtime",
      timezone: "auto",
      format: "json",
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
      forecast_days: "3",
    })

    const weatherResponse = yield* http.execute(
      HttpClientRequest.get(`${API_URL}/v1/forecast?${weatherParams.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (weatherResponse.status < 200 || weatherResponse.status >= 400) return []
    const weatherRaw: string = yield* weatherResponse.text
    if (!weatherRaw) return []

    return parseOpenMeteoResults(weatherRaw, location.name || query, numResults)
  })
}

const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
}

interface WeatherData {
  current?: {
    temperature_2m?: number
    apparent_temperature?: number
    relative_humidity_2m?: number
    weather_code?: number
    wind_speed_10m?: number
  }
}

export function parseOpenMeteoResults(raw: string, location: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as WeatherData
  const current = data.current
  if (!current) return []

  const results: SearchResult[] = []
  let pos = 0

  const temp = current.temperature_2m || 0
  const feelsLike = current.apparent_temperature || 0
  const humidity = current.relative_humidity_2m || 0
  const windSpeed = current.wind_speed_10m || 0
  const weatherCode = current.weather_code || 0
  const condition = WMO_CODES[weatherCode] || "Unknown"

  const snippet = `${temp}°C (feels like ${feelsLike}°C) · ${condition} · Humidity: ${humidity}% · Wind: ${windSpeed} km/h`

  pos++
  results.push(
    makeSearchResult({
      title: `Weather in ${location}: ${temp}°C - ${condition}`,
      url: `https://open-meteo.com/en/docs#latitude=${location}`,
      snippet,
      engine: "open-meteo",
      position: pos,
      category: "weather",
    }),
  )

  return results
}

export * as OpenMeteoEngine from "./open-meteo"
