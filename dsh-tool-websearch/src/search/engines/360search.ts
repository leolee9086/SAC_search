/**
 * 360 搜索引擎适配器
 *
 * 参考 SearXNG 的 360search.py
 * 解析 so.com 的 HTML 搜索结果
 * https://www.so.com/s?q=KEYWORD
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://www.so.com/s"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function make360Search(config: EngineConfig): SearchEngine {
  return { name: config.name, config, search: (http, q, opts) => search360(http, q, opts.numResults || config.maxResults, config.timeout) }
}

function search360(http: HttpClient.HttpClient, query: string, numResults: number, timeout: number): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT, "Accept-Language": "zh-CN,zh", Accept: "text/html" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []
    return parse360Results(html, numResults)
  })
}

export function parse360Results(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配结果块: <li class="res-list"> 或 <div class="result">
  const blockRegex = /<(?:li|div)[^>]*class="(?:res-list|result)[^"]*"[^>]*>[\s\S]*?<\/(?:li|div)>/gi
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const block = match[0]

    const aMatch = block.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!aMatch) continue
    let url = aMatch[1]
    const title = aMatch[2].replace(/<[^>]*>/g, "").trim()
    if (!title || !url) continue

    // 摘要
    const pMatch = block.match(/<p[^>]*class="[^"]*res-desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
    const snippet = pMatch ? pMatch[1].replace(/<[^>]*>/g, "").trim() : ""

    pos++
    results.push(makeSearchResult({ title, url, snippet: snippet.slice(0, 300), engine: "360search", position: pos }))
  }
  return results
}

export * as Search360 from "./360search"
