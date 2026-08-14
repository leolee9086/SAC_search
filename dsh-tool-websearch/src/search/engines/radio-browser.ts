/**
 * Radio Browser 电台搜索引擎适配器
 *
 * 搜索全球广播电台数据库。
 * API: https://de1.api.radio-browser.info/json/stations
 *
 * 参考 SearXNG: searx/engines/radio_browser.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_BASE = "https://de1.api.radio-browser.info/json/stations"
const USER_AGENT = "opencode-search/1.0"

export function makeRadioBrowser(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchRadioBrowser(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchRadioBrowser(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      order: "clickcount",
      reverse: "true",
      limit: String(Math.min(numResults, 30)),
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_BASE}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseRadioBrowserResults(raw, numResults)
  })
}

interface RadioStation {
  stationuuid?: string
  name?: string
  url?: string
  homepage?: string
  tags?: string
  country?: string
  language?: string
  codec?: string
  bitrate?: number
  clickcount?: number
  favicon?: string
}

export function parseRadioBrowserResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const stations = parsed as RadioStation[]
  if (!Array.isArray(stations)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const station of stations) {
    if (results.length >= maxResults) break
    if (!station.name || !station.url) continue

    const tags = (station.tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3).join(", ")
    const parts = [
      tags,
      station.country,
      station.language,
      station.codec,
      station.bitrate ? `${station.bitrate}kbps` : "",
    ].filter(Boolean)
    const snippet = parts.join(" · ")

    pos++
    results.push(
      makeSearchResult({
        title: station.name,
        url: station.homepage || station.url,
        snippet: snippet || "Radio station",
        engine: "radio-browser",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as RadioBrowserEngine from "./radio-browser"
