/**
 * Mwmbl 社区搜索引擎适配器
 *
 * 搜索 Mwmbl 社区驱动的搜索引擎。
 * API: https://api.mwmbl.me/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/mwmbl.py
 * 零风险：公开 JSON API，无需 key
 * 特点：开源、社区驱动、隐私友好
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.mwmbl.me/search"
const USER_AGENT = "opencode-search/1.0"

export function makeMwmbl(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMwmbl(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMwmbl(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
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

    return parseMwmblResults(raw, numResults)
  })
}

interface MwmblItem {
  title?: string
  url?: string
  snippet?: string
  score?: number
}

interface MwmblResponse {
  results?: MwmblItem[]
}

function parseMwmblResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as MwmblResponse
  const items = data?.results
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.title || !item.url) continue

    const title = item.title
    const url = item.url
    const snippet = (item.snippet || "").replace(/<[^>]+>/g, "").trim()

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet.slice(0, 300),
        engine: "mwmbl",
        position: pos,
      }),
    )
  }

  return results
}

export * as MwmblEngine from "./mwmbl"
