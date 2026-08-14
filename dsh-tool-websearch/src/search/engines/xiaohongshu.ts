/**
 * 小红书直连搜索引擎适配器
 *
 * 直接搜索小红书平台上的笔记内容。
 * URL: https://www.xiaohongshu.com/search_result?keyword=QUERY
 *
 * 相比 site-scoped 的 DuckDuckGo 间接搜索，直连方式能获取更丰富的信息
 *（笔记标题、摘要、作者、点赞数等）。
 *
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.xiaohongshu.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeXiaohongshu(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchXiaohongshu(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchXiaohongshu(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `${BASE_URL}/search_result?keyword=${encodeURIComponent(query)}&source=web_search_result_notes`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
          "Accept-Language": "zh-CN,zh;q=0.9",
          Referer: `${BASE_URL}/explore`,
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseXiaohongshuResults(html, numResults)
  })
}

export function parseXiaohongshuResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 模式 1：搜索结果的笔记卡片
  const pattern1 = /<a[^>]*class="[^"]*[Nn]ote[Ii]tem[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>[\s\S]*?(?:<span[^>]*class="[^"]*[Ll]ikes?[^"]*"[^>]*>([^<]*)<)?[\s\S]*?<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = pattern1.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const title = match[2].trim()
    const likes = match[4]?.trim() || ""

    if (!title || !href) continue

    // 处理相对 URL
    if (href.startsWith("/")) href = `${BASE_URL}${href}`
    else if (!href.startsWith("http")) href = `${BASE_URL}/${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url: href,
        snippet: likes ? `❤️ ${likes}` : "小红书笔记",
        engine: "xiaohongshu",
        position: pos,
        category: "social",
      }),
    )
  }

  // 模式 2：搜索结果中的通用链接结构
  const pattern2 = /<a[^>]*href="(\/explore\/[^"]*|\/discovery\/[^"]*|\/search_result\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi

  if (results.length === 0) {
    while ((match = pattern2.exec(html)) !== null) {
      if (results.length >= maxResults) break

      let href = match[1].trim()
      const title = match[2].replace(/<[^>]+>/g, "").trim()

      if (!title) continue
      if (href.startsWith("/")) href = `${BASE_URL}${href}`

      pos++
      results.push(
        makeSearchResult({
          title,
          url: href,
          snippet: "小红书内容",
          engine: "xiaohongshu",
          position: pos,
          category: "social",
        }),
      )
    }
  }

  return results
}

export * as XiaohongshuEngine from "./xiaohongshu"
