/**
 * Bing Videos 搜索引擎适配器
 *
 * 参考 SearXNG 的 bing_videos.py
 * 解析 Bing Videos 异步 HTML 结果页
 * https://www.bing.com/videos/asyncv2?q=KEYWORD&async=content
 *
 * 参数: 每个结果由 div#mc_vtvc_video 表示
 * 元数据: JSON 隐藏在 div.vrhdata/@vrhm 属性中
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://www.bing.com/videos/asyncv2"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeBingVideos(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBingVideos(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchBingVideos(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      async: "content",
      first: "1",
      count: String(Math.min(numResults, 35)),
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html || html.includes("captcha")) return []

    return parseBingVideosResults(html, numResults)
  })
}

/**
 * 解析 Bing Videos 结果
 *
 * 参考 SearXNG:
 * - div#mc_vtvc_video → 每个视频
 * - div.vrhdata/@vrhm → JSON 元数据 { murl, vt, du }
 * - div.mc_vtvc_meta_block//span → 信息（来源+时长）
 * - img.rms/@data-src-hq → 缩略图
 */
export function parseBingVideosResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  const itemRegex = /<div[^>]*id="mc_vtvc_video[^"]*"[^>]*>[\s\S]*?<div[^>]*class="vrhdata"[^>]*vrhm="([^"]*)"[\s\S]*?<\/div>\s*<\/div>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const block = match[0]
    const metadataRaw = match[1]

    let meta: any
    try {
      meta = JSON.parse(metadataRaw.replace(/&quot;/g, '"'))
    } catch {
      continue
    }

    const title = meta?.vt?.trim()
    const url = meta?.murl
    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: meta.du ? `时长: ${meta.du}` : "",
        engine: "bing-videos",
        position: pos,
        category: "video",
      }),
    )
  }

  return results
}

export * as BingVideos from "./bing-videos"
