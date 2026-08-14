/**
 * Duden 德语词典搜索引擎适配器
 *
 * 搜索 Duden 德语词典。
 * URL: https://www.duden.de/suchen/dudenonline/{QUERY}
 *
 * 参考 SearXNG: searx/engines/duden.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.duden.de"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeDuden(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDuden(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchDuden(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `${BASE_URL}/suchen/dudenonline/${encodeURIComponent(query)}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    if (response.status === 404) return [] // 未找到
    const html: string = yield* response.text
    if (!html) return []

    return parseDudenResults(html, numResults)
  })
}

export function parseDudenResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果：<section> 包含 <h2><a href="...">
  const sectionRegex = /<section[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?[\s\S]*?<\/section>/gi

  let match: RegExpExecArray | null
  while ((match = sectionRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const content = match[3] ? match[3].replace(/<[^>]+>/g, "").trim() : ""

    if (!title || !href) continue

    // 确保 href 是完整 URL
    if (href.startsWith("/")) href = `${BASE_URL}${href}`
    else if (!href.startsWith("http")) href = `${BASE_URL}/${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url: href,
        snippet: content || `Duden dictionary: ${title}`,
        engine: "duden",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as DudenEngine from "./duden"
