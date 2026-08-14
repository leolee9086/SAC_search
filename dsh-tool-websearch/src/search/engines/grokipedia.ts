/**
 * Grokipedia 技术百科搜索引擎适配器
 *
 * 搜索 Grokipedia 上的技术概念和教程。
 * API: https://grokipedia.com/api/full-text-search
 *
 * 参考 SearXNG: searx/engines/grokipedia.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://grokipedia.com/api/full-text-search"
const USER_AGENT = "opencode-search/1.0"

export function makeGrokipedia(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGrokipedia(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGrokipedia(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      limit: String(Math.min(numResults, 20)),
      offset: "0",
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

    return parseGrokipediaResults(raw, numResults)
  })
}

interface GrokipediaItem {
  slug?: string
  title?: string
  snippet?: string
}

export function parseGrokipediaResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { results?: GrokipediaItem[] }
  const items = data?.results
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.slug || !item.title) continue

    pos++
    results.push(
      makeSearchResult({
        title: item.title,
        url: `https://grokipedia.com/page/${item.slug}`,
        snippet: item.snippet?.replace(/<[^>]+>/g, "").slice(0, 300) || "",
        engine: "grokipedia",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as GrokipediaEngine from "./grokipedia"
