/**
 * MDN Web Docs 搜索引擎适配器
 *
 * 搜索 MDN Web Docs (developer.mozilla.org) 上的 Web 开发文档。
 * URL: https://developer.mozilla.org/en-US/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/mdn.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://developer.mozilla.org/en-US/search"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeMDN(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMDN(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMDN(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseMDNResults(html, numResults)
  })
}

/**
 * 解析 MDN 搜索结果 HTML
 *
 * MDN 搜索页面结构:
 * - <div class="result-item"> 包含每个结果
 * - <a class="result-item-link"> 标题和 URL
 * - <p class="result-item-summary"> 摘要
 * - <span class="result-item-tag"> 标签
 */
export function parseMDNResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配结果条目
  const itemRegex = /<div[^>]*class="result-item"[^>]*>[\s\S]*?<a[^>]*class="result-item-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*class="result-item-summary"[^>]*>([\s\S]*?)<\/p>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3]?.replace(/<[^>]+>/g, "").trim() || ""

    if (!title || !url) continue

    // 补全相对 URL
    if (url.startsWith("/")) url = `https://developer.mozilla.org${url}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet.slice(0, 300),
        engine: "mdn",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as MDNEngine from "./mdn"
