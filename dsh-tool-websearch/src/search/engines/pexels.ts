/**
 * Pexels 图片搜索引擎适配器
 *
 * 搜索 Pexels 上的高质量免费图片。
 * URL: https://www.pexels.com/en-us/search/QUERY
 *
 * 参考 SearXNG: searx/engines/pexels.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.pexels.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makePexels(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchPexels(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchPexels(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/en-us/search/${encodeURIComponent(query)}/`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parsePexelsResults(html, numResults)
  })
}

function parsePexelsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配图片链接: /photo/SLUG-ID/
  const photoRegex = /href="\/en-us\/photo\/([^"]*)"[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"/gi

  let match: RegExpExecArray | null
  while ((match = photoRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const slug = match[1].trim()
    const title = match[2].trim()
    const thumbnail = match[3].trim()

    if (!slug) continue

    const url = `${BASE_URL}/en-us/photo/${slug}`

    pos++
    results.push(
      makeSearchResult({
        title: title || "Pexels photo",
        url,
        snippet: "Free stock photo · Pexels",
        engine: "pexels",
        position: pos,
        category: "image",
      }),
    )
  }

  // 备用模式
  if (results.length === 0) {
    const fallbackRegex = /href="(https:\/\/www\.pexels\.com\/photo\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const url = match[1]
      const title = match[2].trim()

      if (!title) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "Stock photo · Pexels",
          engine: "pexels",
          position: pos,
          category: "image",
        }),
      )
    }
  }

  return results
}

export * as PexelsEngine from "./pexels"
