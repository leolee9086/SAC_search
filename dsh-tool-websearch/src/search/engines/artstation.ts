/**
 * ArtStation 艺术作品搜索引擎适配器
 *
 * 搜索 ArtStation 上的艺术作品。
 * URL: https://www.artstation.com/search?query=QUERY
 *
 * 参考 SearXNG: searx/engines/artstation.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.artstation.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeArtStation(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchArtStation(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchArtStation(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ query })

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

    return parseArtStationResults(html, numResults)
  })
}

function parseArtStationResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配艺术作品项目
  // ArtStation 使用 React 渲染，数据在 script 标签中
  const scriptRegex = /<script[^>]*>.*?window\.__NEXT_DATA__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      const artworks = data?.props?.pageProps?.searchResults?.data || []

      for (const artwork of artworks) {
        if (results.length >= maxResults) break

        const title = artwork.title || ""
        const url = artwork.permalink ? `${BASE_URL}${artwork.permalink}` : ""
        const description = artwork.description || ""
        const user = artwork.user?.full_name || artwork.user?.username || ""

        if (!title || !url) continue

        pos++
        results.push(
          makeSearchResult({
            title,
            url,
            snippet: user ? `by ${user} · ${description.slice(0, 100)}` : description.slice(0, 100),
            engine: "artstation",
            position: pos,
            category: "images",
          }),
        )
      }
    } catch {
      // JSON 解析失败，继续
    }
  }

  // 如果没有找到 __NEXT_DATA__，尝试其他解析方式
  if (results.length === 0) {
    // 匹配作品链接
    const itemRegex = /<a[^>]*href="(\/artwork-?[a-z0-9-]+)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*>/gi
    while ((match = itemRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const path = match[1]
      const title = match[2]
      const url = `${BASE_URL}${path}`

      if (!title || !url) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: `ArtStation artwork`,
          engine: "artstation",
          position: pos,
          category: "images",
        }),
      )
    }
  }

  return results
}

export * as ArtStationEngine from "./artstation"