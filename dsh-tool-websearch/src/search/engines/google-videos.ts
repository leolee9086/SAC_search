/**
 * Google 视频搜索引擎适配器
 *
 * 搜索 Google 视频结果。
 * URL: https://www.google.com/search?q=QUERY&tbm=vid
 *
 * 参考 SearXNG: searx/engines/google_videos.py
 * 风险：Google 可能触发 CAPTCHA
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeGoogleVideos(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGoogleVideos(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGoogleVideos(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      tbm: "vid",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`https://www.google.com/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: "CONSENT=YES+",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    // CAPTCHA 检测
    if (html.includes("/sorry/") || html.length < 2000) return []

    return parseGoogleVideosResults(html, numResults)
  })
}

function parseGoogleVideosResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配视频结果
  const videoRegex = /<div[^>]*class="[^"]*MjjYud[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>[\s\S]*?<div[^>]*class="[^"]*ITZIwc[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

  let match: RegExpExecArray | null
  while ((match = videoRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const content = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue

    // 清理 Google 跟踪 URL
    if (url.startsWith("/url?q=")) {
      const urlMatch = url.match(/\/url\?q=([^&]+)/)
      if (urlMatch) url = decodeURIComponent(urlMatch[1])
    }

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: content,
        engine: "google-videos",
        position: pos,
        category: "video",
      }),
    )
  }

  return results
}

export * as GoogleVideosEngine from "./google-videos"
