/**
 * Microsoft Learn 文档搜索引擎适配器
 *
 * 搜索 Microsoft Learn 上的技术文档。
 * API: https://learn.microsoft.com/api/search?search=QUERY
 *
 * 参考 SearXNG: searx/engines/microsoft_learn.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://learn.microsoft.com/api/search"
const USER_AGENT = "opencode-search/1.0"

export function makeMicrosoftLearn(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMicrosoftLearn(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMicrosoftLearn(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      locale: "en-us",
      $top: String(Math.min(numResults, 10)),
      $skip: "0",
      partnerId: "LearnSite",
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

    return parseMicrosoftLearnResults(raw, numResults)
  })
}

interface LearnResult {
  url?: string
  title?: string
  description?: string
}

export function parseMicrosoftLearnResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { results?: LearnResult[] }
  const items = data?.results
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.url || !item.title) continue

    pos++
    results.push(
      makeSearchResult({
        title: item.title,
        url: item.url,
        snippet: item.description || "Microsoft Learn documentation",
        engine: "microsoft-learn",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as MicrosoftLearnEngine from "./microsoft-learn"
