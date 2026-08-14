/**
 * React 文档搜索引擎适配器
 *
 * 搜索 React 官方文档 (react.dev)。
 * URL: https://react.dev/search?q=QUERY
 *
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://react.dev/search"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeReactDocs(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchReactDocs(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchReactDocs(
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

    return parseReactDocsResults(html, numResults)
  })
}

/**
 * 解析 React 搜索结果
 * react.dev 使用 Algolia 搜索，结果在 JSON 数据块中
 */
export function parseReactDocsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 尝试从 Algolia JSON 数据中提取
  const jsonMatch = html.match(/window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});/)
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      const searchResults = data?.props?.pageProps?.searchResults
      if (Array.isArray(searchResults)) {
        for (const item of searchResults) {
          if (results.length >= maxResults) break
          const title = item.title || item._highlightResult?.title?.value?.replace(/<[^>]+>/g, "") || ""
          const url = item.url || `https://react.dev${item.path || ""}`
          const snippet = item._highlightResult?.content?.value?.replace(/<[^>]+>/g, "") || item.content || ""
          if (!title) continue
          pos++
          results.push(makeSearchResult({ title, url, snippet: snippet.slice(0, 300), engine: "react-docs", position: pos, category: "general" }))
        }
        return results
      }
    } catch { /* fallthrough to HTML parsing */ }
  }

  // HTML 解析备用
  const itemRegex = /<a[^>]*class="[^"]*search-result[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const url = match[1].startsWith("/") ? `https://react.dev${match[1]}` : match[1]
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3]?.replace(/<[^>]+>/g, "").trim() || ""
    if (!title || !url) continue
    pos++
    results.push(makeSearchResult({ title, url, snippet: snippet.slice(0, 300), engine: "react-docs", position: pos, category: "general" }))
  }

  return results
}

export * as ReactDocsEngine from "./react-docs"
