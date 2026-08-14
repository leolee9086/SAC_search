/**
 * pkg.go.dev Go 包搜索引擎适配器
 *
 * 搜索 Go 语言包。
 * URL: https://pkg.go.dev/search?q=QUERY&m=package
 *
 * 参考 SearXNG: searx/engines/pkg_go_dev.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://pkg.go.dev"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makePkgGoDev(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchPkgGoDev(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchPkgGoDev(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      m: "package",
    })

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

    return parsePkgGoDevResults(html, numResults)
  })
}

function parsePkgGoDevResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果: SearchSnippet 容器
  const snippetRegex = /<div[^>]*class="[^"]*SearchSnippet[^"]*"[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>[\s\S]*?<p[^>]*class="[^"]*SearchSnippet-synopsis[^"]*"[^>]*>([\s\S]*?)<\/p>/gi

  let match: RegExpExecArray | null
  while ((match = snippetRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const titleRaw = match[2].replace(/<[^>]+>/g, "").trim()
    const synopsis = match[3].replace(/<[^>]+>/g, "").trim()

    if (!titleRaw || !href) continue

    const url = href.startsWith("http") ? href : `${BASE_URL}${href}`

    pos++
    results.push(
      makeSearchResult({
        title: titleRaw,
        url,
        snippet: synopsis || "Go package",
        engine: "pkg-go-dev",
        position: pos,
        category: "code",
      }),
    )
  }

  return results
}

export * as PkgGoDevEngine from "./pkg-go-dev"
