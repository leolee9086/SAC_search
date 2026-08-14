/**
 * Python 官方文档搜索引擎适配器
 *
 * 搜索 Python 官方文档 (docs.python.org)。
 * URL: https://docs.python.org/3/search.html?q=QUERY
 *
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://docs.python.org/3/search.html"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makePythonDocs(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchPythonDocs(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchPythonDocs(
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
          "Accept-Language": "en-US,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parsePythonDocsResults(html, numResults)
  })
}

export function parsePythonDocsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // Python 文档搜索结果在 <ul class="search-results"> 中
  const itemRegex = /<li[^>]*class="search-result"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<span[^>]*class="description"[^>]*>([\s\S]*?)<\/span>)?/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    let url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3]?.replace(/<[^>]+>/g, "").trim() || ""
    if (!title || !url) continue
    if (url.startsWith("/")) url = `https://docs.python.org${url}`
    // 清理标题中的版本号（如 "3.14.0a0"）
    const cleanTitle = title.replace(/^\d+\.\d+(\.\d+[a-z]?\d*)?\s+/, "").trim()
    pos++
    results.push(makeSearchResult({ title: cleanTitle, url, snippet: snippet.slice(0, 300), engine: "python-docs", position: pos, category: "general" }))
  }

  return results
}

export * as PythonDocsEngine from "./python-docs"
