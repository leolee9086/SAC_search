/**
 * iQiyi 视频搜索引擎适配器
 *
 * 搜索爱奇艺视频平台上的内容。
 * URL: https://so.iqiyi.com/so/q_QUERY
 *
 * 参考 SearXNG: searx/engines/iqiyi.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://so.iqiyi.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeIqiyi(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchIqiyi(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchIqiyi(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `${BASE_URL}/so/q_${encodeURIComponent(query)}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
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

    return parseIqiyiResults(html, numResults)
  })
}

export function parseIqiyiResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配视频卡片：查找包含视频信息的链接和图片
  const itemRegex = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*[Ss]earch-[Rr]esult[Ii]tem[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?(?:<[^>]+class="[^"]*[Dd]uration[^"]*"[^>]*>([^<]+)<)?[\s\S]*?<\/a>/gi

  // 兜底正则：匹配更通用的视频链接
  const fallbackRegex = /<a[^>]*href="(\/video\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const title = match[3].trim()
    const duration = match[4]?.trim() || ""

    if (!title || !href) continue
    if (href.startsWith("//")) href = `https:${href}`
    else if (href.startsWith("/")) href = `https:${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url: href,
        snippet: duration ? `[${duration}] iQiyi video` : "iQiyi video",
        engine: "iqiyi",
        position: pos,
        category: "video",
      }),
    )
  }

  // 兜底
  if (results.length === 0) {
    let fMatch: RegExpExecArray | null
    while ((fMatch = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break
      let fHref = fMatch[1].trim()
      const fTitle = fMatch[3].trim()
      if (!fTitle) continue
      if (fHref.startsWith("//")) fHref = `https:${fHref}`
      else if (fHref.startsWith("/")) fHref = `https:${fHref}`

      pos++
      results.push(
        makeSearchResult({
          title: fTitle,
          url: fHref,
          snippet: "iQiyi video",
          engine: "iqiyi",
          position: pos,
          category: "video",
        }),
      )
    }
  }

  return results
}

export * as IqiyiEngine from "./iqiyi"
