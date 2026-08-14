/**
 * ANSA 新闻搜索引擎适配器
 *
 * 搜索意大利 ANSA 通讯社新闻。
 * URL: https://www.ansa.it/ricerca?q=QUERY
 *
 * 参考 SearXNG: searx/engines/ansa.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.ansa.it"
const USER_AGENT = "opencode-search/1.0"

export function makeAnsa(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchAnsa(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchAnsa(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/ricerca?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseAnsaResults(html, numResults)
  })
}

export function parseAnsaResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配新闻卡片
  const itemRegex = /<article[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/article>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const title = match[3].trim()
    const snippet = match[4].replace(/<[^>]+>/g, "").trim()

    if (!title || !href) continue
    if (href.startsWith("/")) href = `${BASE_URL}${href}`
    else if (!href.startsWith("http")) href = `${BASE_URL}/${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url: href,
        snippet: snippet || "ANSA news",
        engine: "ansa",
        position: pos,
        category: "news",
      }),
    )
  }

  return results
}

export * as AnsaEngine from "./ansa"
