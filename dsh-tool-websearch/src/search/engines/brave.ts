/**
 * Brave Search 搜索引擎适配器
 *
 * 参考 SearXNG: searx/engines/brave.py
 * 零风险：公开 JSON API，无需 key（设置 BRAVE_API_KEY 可提升限额）
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BRAVE_API = "https://api.search.brave.com/res/v1/web/search"

export function makeBrave(config: EngineConfig): SearchEngine {
  const apiKey = process.env.BRAVE_API_KEY

  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      Effect.gen(function* () {
        const params = new URLSearchParams({
          q: query,
          count: String(opts.numResults || config.maxResults),
          safesearch: String(opts.safesearch ?? 1),
        })

        const headers: Record<string, string> = {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
        }
        if (apiKey) headers["X-Subscription-Token"] = apiKey

        const response = yield* http.execute(
          HttpClientRequest.get(`${BRAVE_API}?${params.toString()}`).pipe(
            HttpClientRequest.setHeaders(headers),
          ),
        ).pipe(Effect.timeout(config.timeout))

        const status = response.status
        if (status === 429 || status < 200 || status >= 400) return []

        const text: string = yield* response.text
        return parseBraveResults(text)
      }),
  }
}

interface BraveWebResult {
  title?: string
  url?: string
  description?: string
  snippet?: string
}

interface BraveWebResponse {
  web?: { results?: BraveWebResult[] }
  results?: BraveWebResult[]
}

export function parseBraveResults(raw: string): SearchResult[] {
  let data: unknown
  try { data = JSON.parse(raw) } catch { return [] }

  const parsed = data as BraveWebResponse
  const webResults = parsed?.web?.results ?? parsed?.results ?? []
  return webResults.map((r: BraveWebResult, i: number) =>
    makeSearchResult({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.description ?? r.snippet ?? "",
      engine: "brave",
      position: i + 1,
      category: "general",
    }),
  )
}

export * as BraveEngine from "./brave"
