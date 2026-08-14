/**
 * Flaticon 图标搜索引擎适配器
 *
 * 搜索 Flaticon 上的免费图标。
 * URL: https://www.flaticon.com/search?word=QUERY
 *
 * 参考 SearXNG: searx/engines/flaticon.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.flaticon.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeFlaticon(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchFlaticon(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchFlaticon(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ word: query })

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

    return parseFlaticonResults(html, numResults)
  })
}

export function parseFlaticonResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配图标卡片
  const itemRegex = /<a[^>]*class="[^"]*icon--[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi
  // 兜底匹配更通用的图标元素
  const fallbackRegex = /<img[^>]*src="[^"]*flaticon[^"]*"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<a[^>]*href="(\/[^"]*)"[^>]*>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const alt = match[3].trim()

    if (!alt) continue

    if (href.startsWith("/")) href = `${BASE_URL}${href}`
    else if (!href.startsWith("http")) href = `${BASE_URL}/${href}`

    pos++
    results.push(
      makeSearchResult({
        title: alt,
        url: href,
        snippet: `Flaticon icon: ${alt}`,
        engine: "flaticon",
        position: pos,
        category: "image",
      }),
    )
  }

  // 兜底尝试
  if (results.length === 0) {
    let fMatch: RegExpExecArray | null
    while ((fMatch = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break
      const fAlt = fMatch[1].trim()
      if (!fAlt) continue
      const fHref = fMatch[2].startsWith("http") ? fMatch[2] : `${BASE_URL}${fMatch[2]}`
      pos++
      results.push(
        makeSearchResult({
          title: fAlt,
          url: fHref,
          snippet: `Flaticon icon`,
          engine: "flaticon",
          position: pos,
          category: "image",
        }),
      )
    }
  }

  return results
}

export * as FlaticonEngine from "./flaticon"
