/**
 * YouTube 搜索引擎适配器
 *
 * 使用 YouTube 内部搜索 API（无需 API key）
 * - 通过 YouTube 搜索页面 HTML 解析结果
 * - 支持语言和地区参数
 * - 包含视频时长、上传日期、频道名等信息
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"
import { parseRelativeDate } from "../engine"

export function makeYouTube(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchYouTube(http, query, opts.numResults || config.maxResults, opts.timeRange, opts.lang),
  }
}

function searchYouTube(
  http: HttpClient.HttpClient,
  query: string,
  maxResults: number,
  timeRange?: "day" | "week" | "month" | "year",
  lang?: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const searchParams = new URLSearchParams({
      search_query: query,
      sp: getTimeRangeParam(timeRange),
    })

    if (lang) {
      searchParams.set("gl", lang.split("-")[0].split("_")[0])
    }

    const url = `https://www.youtube.com/results?${searchParams.toString()}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
          "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
          Accept: "text/html",
          Cookie: "CONSENT=YES+",
        }),
      ),
    )

    if (response.status < 200 || response.status >= 400) return []
    const html = yield* response.text
    if (!html) return []

    return parseYouTubeResults(html, maxResults)
  })
}

/**
 * 解析 YouTube 搜索结果 HTML
 *
 * YouTube 搜索结果在 JSON 数据块中（var ytInitialData）
 * 也支持从 DOM 结构中提取
 */
export function parseYouTubeResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  // 方法1: 从 ytInitialData JSON 中提取
  const jsonMatch = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/)
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents
      if (contents && Array.isArray(contents)) {
        for (const item of contents) {
          if (results.length >= maxResults) break
          const videoRenderer = item.videoRenderer
          if (!videoRenderer) continue

          const videoId = videoRenderer.videoId
          const title = videoRenderer.title?.runs?.[0]?.text || ""
          const channelName = videoRenderer.ownerText?.runs?.[0]?.text || ""
          const viewCount = videoRenderer.viewCountText?.simpleText || ""
          const publishedTime = videoRenderer.publishedTimeText?.simpleText || ""
          const durationText = videoRenderer.lengthText?.simpleText || ""

          if (!title || !videoId) continue

          const url = `https://www.youtube.com/watch?v=${videoId}`
          const snippet = [
            channelName,
            viewCount,
            publishedTime,
            durationText,
          ].filter(Boolean).join(" · ")

          results.push(
            makeSearchResult({
              title,
              url,
              snippet,
              engine: "youtube",
              position: results.length + 1,
              category: "video",
              publishedDate: publishedTime ? parseRelativeDate(publishedTime) : undefined,
            }),
          )
        }
        return results.slice(0, maxResults)
      }
    } catch {
      // JSON 解析失败，继续尝试 HTML 解析
    }
  }

  // 方法2: 从 HTML 标签中提取（备用）
  const videoRegex = /<a[^>]*href="\/watch\?v=([a-zA-Z0-9_-]{11})"[^>]*>[\s\S]*?<\/a>/g
  const seen = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = videoRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const videoId = match[1]
    if (seen.has(videoId)) continue
    seen.add(videoId)

    // 提取标题
    const titleMatch = match[0].match(/aria-label="([^"]+)"/)
    const title = titleMatch ? titleMatch[1].trim() : ""

    if (!title) continue

    const url = `https://www.youtube.com/watch?v=${videoId}`

    results.push(
      makeSearchResult({
        title,
        url,
        snippet: "",
        engine: "youtube",
        position: results.length + 1,
        category: "video",
      }),
    )
  }

  return results
}

export function getTimeRangeParam(timeRange?: string): string {
  switch (timeRange) {
    case "day":
      return "EgIIBQ%3D%3D"
    case "week":
      return "EgIIBA%3D%3D"
    case "month":
      return "EgIIAw%3D%3D"
    case "year":
      return "EgIIAg%3D%3D"
    default:
      return ""
  }
}
