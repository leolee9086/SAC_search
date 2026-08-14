/**
 * 搜狗图片搜索引擎适配器
 *
 * 搜索搜狗图片平台上的图片。
 * URL: https://pic.sogou.com/pics?query=QUERY
 *
 * 参考 SearXNG: searx/engines/sogou_images.py
 * 零风险：公开 HTML 页面解析，从 __INITIAL_STATE__ 提取 JSON 数据
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://pic.sogou.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeSogouImages(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSogouImages(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSogouImages(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      start: "0",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/pics?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
          Referer: `${BASE_URL}/`,
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseSogouImagesResults(html, numResults)
  })
}

interface SogouImageItem {
  url?: string
  picUrl?: string
  title?: string
  content_major?: string
  ch_site_name?: string
}

export function parseSogouImagesResults(html: string, maxResults: number): SearchResult[] {
  // 从 window.__INITIAL_STATE__ 提取 JSON
  const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/s)
  if (!stateMatch) return []

  let parsed: unknown
  try { parsed = JSON.parse(stateMatch[1]) } catch { return [] }

  const data = parsed as { searchList?: { searchList?: SogouImageItem[] } }
  const items = data?.searchList?.searchList
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.url || !item.picUrl) continue

    const source = item.ch_site_name || ""
    const description = item.content_major || ""

    pos++
    results.push(
      makeSearchResult({
        title: item.title || `Image ${pos}`,
        url: item.url,
        snippet: [source, description].filter(Boolean).join(" · ") || "Sogou image",
        engine: "sogou-images",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as SogouImagesEngine from "./sogou-images"
