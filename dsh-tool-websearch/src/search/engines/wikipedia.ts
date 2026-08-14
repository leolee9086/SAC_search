/**
 * Wikipedia 搜索引擎适配器
 *
 * 使用 Wikipedia 公开 API (MediaWiki Action API)
 * https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=KEYWORD&format=json
 *
 * 零风险：严格遵循 API 使用条款，低频调用
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://en.wikipedia.org/w/api.php"
const USER_AGENT = "opencode-search/1.0 (metasearch engine)"

export function makeWikipedia(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWikipedia(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchWikipedia(
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
      origin: "*",
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

    return parseWikipediaResults(raw, numResults)
  })
}

export function parseWikipediaResults(raw: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  let parsed: { query?: { search?: Array<{ title: string; pageid: number; snippet: string; timestamp: string }> } }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const searchResults = parsed?.query?.search
  if (!searchResults || !Array.isArray(searchResults)) return []

  let pos = 0
  for (const item of searchResults) {
    if (results.length >= maxResults) break

    const title = item.title?.trim()
    const pageid = item.pageid
    const snippet = item.snippet?.replace(/<[^>]*>/g, "").trim() || ""
    const timestamp = item.timestamp

    if (!title || !pageid) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
        snippet: snippet.slice(0, 300),
        engine: "wikipedia",
        position: pos,
        publishedDate: timestamp ? new Date(timestamp).getTime() : undefined,
        category: "encyclopedia",
      }),
    )
  }

  return results
}

export * as Wikipedia from "./wikipedia"
