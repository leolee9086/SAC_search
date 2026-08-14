/**
 * Dailymotion 视频搜索引擎适配器
 *
 * 参考 SearXNG 的 dailymotion.py (7.2KB)
 * 使用 Dailymotion 官方 REST API，无需 API key。
 * https://api.dailymotion.com/videos?search=KEYWORD
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.dailymotion.com/videos"
const USER_AGENT = "opencode-search/1.0"

export function makeDailymotion(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDailymotion(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchDailymotion(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      sort: "relevance",
      limit: String(Math.min(numResults, 50)),
      fields: "title,url,description,created_time,duration,thumbnail_360_url",
      family_filter: "false",
      password_protected: "false",
      private: "false",
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

    return parseDailymotionResults(raw, numResults)
  })
}

export function parseDailymotionResults(raw: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  let data: { list?: Array<{ title: string; url: string; description?: string; created_time?: number; duration?: number; thumbnail_360_url?: string }> }
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }

  const items = data?.list
  if (!items || !Array.isArray(items)) return []

  let pos = 0
  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.title || !item.url) continue

    const desc = item.description?.replace(/<[^>]*>/g, "").trim() || ""
    const duration = item.duration || 0
    const durStr = duration > 3600
      ? `${Math.floor(duration / 3600)}:${String(Math.floor((duration % 3600) / 60)).padStart(2, "0")}:${String(duration % 60).padStart(2, "0")}`
      : `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`

    pos++
    results.push(
      makeSearchResult({
        title: item.title,
        url: item.url,
        snippet: `${durStr} — ${desc.slice(0, 200)}`,
        engine: "dailymotion",
        position: pos,
        publishedDate: item.created_time ? item.created_time * 1000 : undefined,
        category: "video",
      }),
    )
  }

  return results
}

export * as Dailymotion from "./dailymotion"
