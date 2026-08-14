/**
 * docs.rs Rust 文档搜索引擎适配器
 *
 * 搜索 Rust 包文档 (docs.rs) 上的 API 文档。
 * URL: https://docs.rs/releases/search?query=QUERY
 *
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://docs.rs/releases/search"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeDocsRs(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDocsRs(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchDocsRs(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ query })

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

    return parseDocsRsResults(html, numResults)
  })
}

/**
 * 解析 docs.rs 搜索结果 HTML
 *
 * 页面结构:
 * - <li class="release"> 条目
 * - <a class="release-name"> 包名和版本
 * - <span class="release-description"> 描述
 */
export function parseDocsRsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  const itemRegex = /<li[^>]*class="release"[^>]*>[\s\S]*?<a[^>]*class="release-name"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<span[^>]*class="release-description"[^>]*>([\s\S]*?)<\/span>)?/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const name = match[2].replace(/<[^>]+>/g, "").trim()
    const description = match[3]?.replace(/<[^>]+>/g, "").trim() || ""

    if (!name || !href) continue

    const url = href.startsWith("http") ? href : `https://docs.rs${href}`

    pos++
    results.push(
      makeSearchResult({
        title: name,
        url,
        snippet: description || "Rust crate documentation",
        engine: "docsrs",
        position: pos,
        category: "code",
      }),
    )
  }

  return results
}

export * as DocsRsEngine from "./docsrs"
