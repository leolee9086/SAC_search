/**
 * UXWing 图标搜索引擎适配器
 *
 * 搜索 UXWing 上的免费图标。
 * URL: https://uxwing.com/?s=QUERY
 *
 * 参考 SearXNG: searx/engines/uxwing.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://uxwing.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeUxwing(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchUxwing(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchUxwing(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseUxwingResults(html, numResults)
  })
}

export function parseUxwingResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 <article id="post-..."> 元素
  const itemRegex = /<article[^>]*id="[^"]*post[^"]*"[^>]*class="([^"]*)"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<\/article>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const classes = match[1]
    const href = match[2].trim()
    const imgSrc = match[3].trim()
    const alt = match[4].trim()

    if (!alt || !href) continue

    // 从 class 中提取标签
    const tags: string[] = []
    for (const cls of classes.split(/\s+/)) {
      const catMatch = cls.match(/^(?:category|tag)(.+)/)
      if (catMatch) {
        tags.push(catMatch[1].replace(/-/g, " "))
      }
    }

    pos++
    results.push(
      makeSearchResult({
        title: alt,
        url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        snippet: tags.length > 0 ? `Icon: ${tags.join(", ")}` : "UXWing icon",
        engine: "uxwing",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as UxwingEngine from "./uxwing"
