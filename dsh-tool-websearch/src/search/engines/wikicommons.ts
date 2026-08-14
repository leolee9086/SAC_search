/**
 * Wikimedia Commons 媒体文件搜索引擎适配器
 *
 * 搜索 Wikimedia Commons 上的媒体文件。
 * API: https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=QUERY
 *
 * 参考 SearXNG: searx/engines/wikicommons.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://commons.wikimedia.org/w/api.php"
const USER_AGENT = "opencode-search/1.0"

export function makeWikimediaCommons(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchWikimediaCommons(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchWikimediaCommons(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query,
      srlimit: String(Math.min(numResults, 50)),
      format: "json",
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

    return parseWikimediaCommonsResults(raw, numResults)
  })
}

interface CommonsEntry {
  pageid?: number
  title?: string
  snippet?: string
  timestamp?: string
}

function parseWikimediaCommonsResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as {
    query?: {
      search?: CommonsEntry[]
    }
  }
  const entries = data?.query?.search
  if (!Array.isArray(entries)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const entry of entries) {
    if (results.length >= maxResults) break
    if (!entry.title) continue

    const url = `https://commons.wikimedia.org/wiki/${encodeURIComponent(entry.title)}`
    const snippet = entry.snippet?.replace(/<[^>]+>/g, "").trim() || ""

    pos++
    results.push(
      makeSearchResult({
        title: entry.title,
        url,
        snippet: snippet || "Wikimedia Commons media",
        engine: "wikicommons",
        position: pos,
        publishedDate: entry.timestamp ? new Date(entry.timestamp).getTime() : undefined,
        category: "image",
      }),
    )
  }

  return results
}

export * as WikimediaCommonsEngine from "./wikicommons"
