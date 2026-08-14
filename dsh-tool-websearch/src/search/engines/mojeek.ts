/**
 * Mojeek 隐私搜索引擎适配器
 *
 * Mojeek 是一个独立的隐私搜索引擎，拥有自己的索引。
 * API: https://www.mojeek.com/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/mojeek.py
 * 零风险：公开 HTML 页面解析，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.mojeek.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeMojeek(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMojeek(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMojeek(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query, s: "6" }) // s=6 → 每页更多结果

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

    return parseMojeekResults(html, numResults)
  })
}

export function parseMojeekResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果项：<h2 class="title"> or <a class="title" ...>
  const itemRegex = /<a[^>]*class="[^"]*title[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*class="[^"]*teaser[^"]*"[^>]*>([\s\S]*?)<\/p>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue
    if (url.startsWith("/")) url = `${BASE_URL}${url}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet || "Mojeek search result",
        engine: "mojeek",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as MojeekEngine from "./mojeek"
