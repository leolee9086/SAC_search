/**
 * Vue.js 文档搜索引擎适配器
 *
 * 搜索 Vue.js 官方文档 (vuejs.org)。
 * URL: https://vuejs.org/search?q=QUERY
 *
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://vuejs.org/search"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeVueDocs(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchVueDocs(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchVueDocs(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query })

    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseVueDocsResults(html, numResults)
  })
}

export function parseVueDocsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // Algolia 搜索结果在 JSON-LD 或 specific div 中
  const itemRegex = /<a[^>]*class="[^"]*search-result[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<p[^>]*class="[^"]*excerpt[^"]*"[^>]*>([\s\S]*?)<\/p>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const url = match[1].startsWith("/") ? `https://vuejs.org${match[1]}` : match[1]
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3]?.replace(/<[^>]+>/g, "").trim() || ""
    if (!title || !url) continue
    pos++
    results.push(makeSearchResult({ title, url, snippet: snippet.slice(0, 300), engine: "vue-docs", position: pos, category: "general" }))
  }

  return results
}

export * as VueDocsEngine from "./vue-docs"
