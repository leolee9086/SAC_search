/**
 * Yahoo News 搜索引擎适配器
 *
 * 搜索 Yahoo 上的新闻。
 * URL: https://news.search.yahoo.com/search?p=QUERY
 *
 * 参考 SearXNG: searx/engines/yahoo_news.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://news.search.yahoo.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeYahooNews(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchYahooNews(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchYahooNews(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ p: query })

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

    return parseYahooNewsResults(html, numResults)
  })
}

function parseYahooNewsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配新闻列表项
  const itemRegex = /<li[^>]*>[\s\S]*?<h4[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const content = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: content,
        engine: "yahoo-news",
        position: pos,
        category: "news",
      }),
    )
  }

  return results
}

export * as YahooNewsEngine from "./yahoo-news"
