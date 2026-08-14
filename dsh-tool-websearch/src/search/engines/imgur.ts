/**
 * Imgur 图片搜索引擎适配器
 *
 * 搜索 Imgur 上的图片。
 * URL: https://imgur.com/search/score/all?q=QUERY
 *
 * 参考 SearXNG: searx/engines/imgur.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://imgur.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeImgur(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchImgur(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchImgur(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      qs: "thumbs",
      p: "0",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search/score/all?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseImgurResults(html, numResults)
  })
}

function parseImgurResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配图片帖子
  const postRegex = /<div[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = postRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const title = match[2].trim()
    const thumbnail = match[3].trim()

    if (!href || thumbnail.length < 25) continue // 跳过太小的缩略图

    const url = href.startsWith("http") ? href : `${BASE_URL}${href}`
    // 获取完整尺寸图片
    const imgSrc = thumbnail.replace(/\.(.+)$/, ".png")

    pos++
    results.push(
      makeSearchResult({
        title: title || "Imgur image",
        url,
        snippet: "Imgur image",
        engine: "imgur",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as ImgurEngine from "./imgur"
