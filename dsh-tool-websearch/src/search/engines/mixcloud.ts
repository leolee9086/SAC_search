/**
 * Mixcloud 音乐搜索引擎适配器
 *
 * 搜索 Mixcloud 上的音乐。
 * API: https://api.mixcloud.com/search/?q=QUERY&type=cloudcast
 *
 * 参考 SearXNG: searx/engines/mixcloud.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.mixcloud.com/search/"
const USER_AGENT = "opencode-search/1.0"

export function makeMixcloud(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMixcloud(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMixcloud(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      type: "cloudcast",
      limit: String(Math.min(numResults, 10)),
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

    return parseMixcloudResults(raw, numResults)
  })
}

interface MixcloudItem {
  url?: string
  name?: string
  created_time?: string
  user?: { name?: string }
  pictures?: { medium?: string }
}

function parseMixcloudResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { data?: MixcloudItem[] }
  const items = data?.data
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.url || !item.name) continue

    const author = item.user?.name || ""

    pos++
    results.push(
      makeSearchResult({
        title: item.name,
        url: item.url,
        snippet: author ? `by ${author} · Mixcloud` : "Mixcloud",
        engine: "mixcloud",
        position: pos,
        publishedDate: item.created_time ? new Date(item.created_time).getTime() : undefined,
        category: "music",
      }),
    )
  }

  return results
}

export * as MixcloudEngine from "./mixcloud"
