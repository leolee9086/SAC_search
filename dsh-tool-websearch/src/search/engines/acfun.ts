/**
 * AcFun 视频搜索引擎适配器
 *
 * 搜索 AcFun 上的视频。
 * URL: https://www.acfun.cn/search?keyword=QUERY
 *
 * 参考 SearXNG: searx/engines/acfun.py
 * 风险较低：公开 HTML 页面解析，中文视频平台
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.acfun.cn"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeAcfun(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchAcfun(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchAcfun(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      keyword: query,
      pCursor: "1",
    })

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

    return parseAcfunResults(html, numResults)
  })
}

export function parseAcfunResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 bigPipe.onPageletArrive 中的 JSON 数据
  const pipeRegex = /bigPipe\.onPageletArrive\((\{[\s\S]*?\})\);/gi
  let pipeMatch: RegExpExecArray | null

  while ((pipeMatch = pipeRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let parsed: unknown
    try {
      parsed = JSON.parse(pipeMatch[1])
    } catch {
      continue
    }

    const pagelet = parsed as { html?: string }
    const rawHtml = pagelet?.html
    if (!rawHtml) continue

    // 提取视频块
    const videoRegex = /<div[^>]*class="[^"]*search-video[^"]*"[^>]*data-exposure-log='([^']+)'[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
    let videoMatch: RegExpExecArray | null

    while ((videoMatch = videoRegex.exec(rawHtml)) !== null) {
      if (results.length >= maxResults) break

      // 解析 data-exposure-log 中的 JSON 数据
      let exposureData: unknown
      try {
        exposureData = JSON.parse(videoMatch[1])
      } catch {
        continue
      }

      const data = exposureData as { content_id?: string; title?: string }
      if (!data.content_id || !data.title) continue

      const contentId = data.content_id
      const title = data.title
      const url = `${BASE_URL}/v/ac${contentId}`

      // 提取缩略图和时长
      const blockHtml = videoMatch[2]
      const thumbMatch = blockHtml.match(/<img[^>]*src="([^"]*)"[^>]*>/)
      const durationMatch = blockHtml.match(/duration[^>]*>([^<]+)</)
      const introMatch = blockHtml.match(/intro[^>]*>([^<]+)</)
      const timeMatch = blockHtml.match(/create-time[^>]*>([^<]+)</)

      const thumbnail = thumbMatch?.[1] || ""
      const duration = durationMatch?.[1]?.trim() || ""
      const description = introMatch?.[1]?.trim() || ""
      const createTime = timeMatch?.[1]?.trim() || ""

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: [duration, createTime, description].filter(Boolean).join(" · ") || "AcFun video",
          engine: "acfun",
          position: pos,
          publishedDate: createTime ? new Date(createTime).getTime() : undefined,
          category: "video",
        }),
      )
    }
  }

  return results
}

export * as AcfunEngine from "./acfun"
