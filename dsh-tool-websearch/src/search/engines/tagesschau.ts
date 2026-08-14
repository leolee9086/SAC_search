/**
 * Tagesschau 新闻搜索引擎适配器
 *
 * 搜索德国 Tagesschau 新闻。
 * API: https://www.tagesschau.de/api2u/search?searchText=QUERY
 *
 * 参考 SearXNG: searx/engines/tagesschau.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.tagesschau.de"
const USER_AGENT = "opencode-search/1.0"

export function makeTagesschau(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchTagesschau(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchTagesschau(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      searchText: query,
      pageSize: String(Math.min(numResults, 10)),
      resultPage: "0",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/api2u/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseTagesschauResults(raw, numResults)
  })
}

interface TagesschauItem {
  type?: string
  title?: string
  date?: string
  firstSentence?: string
  shareURL?: string
  detailsweb?: string
  teaserImage?: { imageVariants?: { "16x9-256"?: string } }
  streams?: { h264s?: string; h264m?: string; h264l?: string }
  sophoraId?: string
}

export function parseTagesschauResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { searchResults?: TagesschauItem[] }
  const items = data?.searchResults
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.title) continue

    const itemType = item.type || "story"
    const url = item.shareURL || item.detailsweb || `${BASE_URL}/`
    const publishedDate = item.date ? new Date(item.date).getTime() : undefined

    pos++
    results.push(
      makeSearchResult({
        title: item.title,
        url,
        snippet: `[${itemType === "video" ? "VIDEO" : "NEWS"}] ${item.firstSentence || ""}`.trim(),
        engine: "tagesschau",
        position: pos,
        publishedDate,
        category: "news",
      }),
    )
  }

  return results
}

export * as TagesschauEngine from "./tagesschau"
