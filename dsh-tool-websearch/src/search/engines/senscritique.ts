/**
 * SensCritique 评论搜索引擎适配器
 *
 * 搜索 SensCritique 上的电影、游戏、书籍评论。
 * URL: https://www.senscritique.com/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/senscritique.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.senscritique.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

export function makeSensCritique(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSensCritique(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSensCritique(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseSensCritiqueResults(html, numResults)
  })
}

export function parseSensCritiqueResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果项
  const itemRegex = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*[Ee]lla[Ii]tem[^"]*"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>[\s\S]*?(?:<div[^>]*class="[^"]*[Tt]ext[^"]*"[^>]*>([\s\S]*?)<\/div>)?[\s\S]*?<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const title = match[2].trim()
    const snippet = match[3] ? match[3].replace(/<[^>]+>/g, "").trim() : ""

    if (!title || !href) continue
    if (href.startsWith("/")) href = `${BASE_URL}${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url: href,
        snippet: snippet || "SensCritique review",
        engine: "senscritique",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as SensCritiqueEngine from "./senscritique"
