/**
 * Niconico 日本视频搜索引擎适配器
 *
 * 搜索 Niconico 上的日本视频。
 * URL: https://www.nicovideo.jp/search/QUERY
 *
 * 参考 SearXNG: searx/engines/niconico.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.nicovideo.jp"
const EMBED_URL = "https://embed.nicovideo.jp"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeNiconico(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchNiconico(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchNiconico(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search/${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseNiconicoResults(html, numResults)
  })
}

function parseNiconicoResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配视频列表项: data-video-item 属性
  const itemRegex = /<li[^>]*data-video-item[^>]*>[\s\S]*?<a[^>]*class="[^"]*itemThumbWrap[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*videoLength[^"]*"[^>]*>([\d:]+)<\/span>[\s\S]*?<p[^>]*class="[^"]*itemTitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<img[^>]*class="[^"]*thumb[^"]*"[^>]*src="([^"]*)"/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const relativeUrl = match[1].trim()
    const videoLength = match[2].trim()
    const title = match[3].replace(/<[^>]+>/g, "").trim()
    const thumbnail = match[4].trim()

    if (!title || !relativeUrl) continue

    // 从 URL 中提取视频 ID
    const videoIdMatch = relativeUrl.match(/\/watch\/([a-z0-9]+)/i)
    const videoId = videoIdMatch?.[1] || relativeUrl.split("/").pop() || ""

    const url = `${BASE_URL}/watch/${videoId}`
    const embedSrc = `${EMBED_URL}/watch/${videoId}`

    pos++
    results.push(
      makeSearchResult({
        title: `${title}${videoLength ? ` (${videoLength})` : ""}`,
        url,
        snippet: `Niconico · ${videoLength}`,
        engine: "niconico",
        position: pos,
        category: "video",
      }),
    )
  }

  // 备用模式
  if (results.length === 0) {
    const fallbackRegex = /href="\/watch\/([a-z0-9]+)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const videoId = match[1]
      const title = match[2].trim()

      if (!title) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url: `${BASE_URL}/watch/${videoId}`,
          snippet: "Niconico video",
          engine: "niconico",
          position: pos,
          category: "video",
        }),
      )
    }
  }

  return results
}

export * as NiconicoEngine from "./niconico"
