/**
 * Reuters 新闻搜索引擎适配器
 *
 * 搜索 Reuters 上的新闻。
 * API: https://www.reuters.com/pf/api/v3/content/fetch/articles-by-search-v2
 *
 * 参考 SearXNG: searx/engines/reuters.py
 * 风险较低：公开 JSON API
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.reuters.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeReuters(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchReuters(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchReuters(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const args = {
      keyword: query,
      offset: 0,
      orderby: "relevance",
      size: Math.min(numResults, 20),
      website: "reuters",
    }

    const params = new URLSearchParams({
      query: JSON.stringify(args),
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/pf/api/v3/content/fetch/articles-by-search-v2?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseReutersResults(raw, numResults)
  })
}

interface ReutersArticle {
  canonical_url?: string
  web?: string
  description?: string
  display_time?: string
  kicker?: { name?: string }
  thumbnail?: { resizer_url?: string }
}

function parseReutersResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { result?: { articles?: ReutersArticle[] } }
  const articles = data?.result?.articles
  if (!Array.isArray(articles)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const article of articles) {
    if (results.length >= maxResults) break
    if (!article.canonical_url || !article.web) continue

    const url = `${BASE_URL}${article.canonical_url}`
    const metadata = article.kicker?.name || ""

    pos++
    results.push(
      makeSearchResult({
        title: article.web,
        url,
        snippet: article.description || metadata || "Reuters news",
        engine: "reuters",
        position: pos,
        publishedDate: article.display_time ? new Date(article.display_time).getTime() : undefined,
        category: "news",
      }),
    )
  }

  return results
}

export * as ReutersEngine from "./reuters"
