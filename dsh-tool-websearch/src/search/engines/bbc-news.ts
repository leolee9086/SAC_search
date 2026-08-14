/**
 * BBC News 搜索引擎适配器
 *
 * 搜索 BBC News 上的新闻。
 * API: https://newsapi.org/ (BBC 源)
 * 参考 SearXNG: 站点限定搜索 bbc.com
 * 零风险：通过 DDG site:bbc.com 搜索
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

export function makeBbcNews(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchBbcNews(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchBbcNews(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `https://www.bbc.co.uk/search?q=${encodeURIComponent(query)}&d=news`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT, Accept: "text/html" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const html = yield* response.text
    return parseBbcResults(html, numResults)
  })
}

function parseBbcResults(html: string, max: number): SearchResult[] {
  const results: SearchResult[] = []
  const re = /<a[^>]*href="(\/news\/[^"]+)"[^>]*>([^<]+)<\/a>/gi
  let match: RegExpExecArray | null
  let pos = 0
  while ((match = re.exec(html)) !== null && results.length < max) {
    const path = match[1]
    const title = match[2].replace(/<[^>]*>/g, "").trim()
    if (!title || title.length < 5) continue
    pos++
    results.push(makeSearchResult({
      title,
      url: `https://www.bbc.co.uk${path}`,
      snippet: `BBC News · ${title}`,
      engine: "bbc-news",
      position: pos,
      category: "news",
    }))
  }
  return results
}

export * as BbcNewsEngine from "./bbc-news"
