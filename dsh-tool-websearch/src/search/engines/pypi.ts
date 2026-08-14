/**
 * PyPI Python 包搜索引擎适配器
 *
 * 搜索 Python 包。
 * URL: https://pypi.org/search/?q=QUERY
 *
 * 参考 SearXNG: searx/engines/pypi.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://pypi.org"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makePyPIHtml(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchPyPI(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchPyPI(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query })

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

    return parsePyPIResults(html, numResults)
  })
}

function parsePyPIResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 package-snippet 链接: <a class="package-snippet" href="/project/PKG/">
  const snippetRegex = /<a[^>]*class="[^"]*package-snippet[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*package-snippet__name[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*class="[^"]*package-snippet__version[^"]*"[^>]*>([^<]+)<\/span>[\s\S]*?<p[^>]*>([^<]*)<\/p>/gi

  let match: RegExpExecArray | null
  while ((match = snippetRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const name = match[2].trim()
    const version = match[3].trim()
    const description = match[4].trim()

    if (!name) continue

    const url = href.startsWith("/") ? `${BASE_URL}${href}` : href

    pos++
    results.push(
      makeSearchResult({
        title: `${name} v${version}`,
        url,
        snippet: description || "PyPI package",
        engine: "pypi",
        position: pos,
        category: "code",
      }),
    )
  }

  // 备用模式：更宽松的匹配
  if (results.length === 0) {
    const fallbackRegex = /href="\/project\/([^/"]+)\/"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const packageName = match[1]
      const name = match[2].trim()
      const version = match[3].trim()

      if (!name || !packageName) continue

      pos++
      results.push(
        makeSearchResult({
          title: `${name} v${version}`,
          url: `${BASE_URL}/project/${packageName}/`,
          snippet: "PyPI Python package",
          engine: "pypi",
          position: pos,
          category: "code",
        }),
      )
    }
  }

  return results
}

export * as PyPIHtmlEngine from "./pypi"
