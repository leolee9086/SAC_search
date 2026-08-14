/**
 * Twitter/X 搜索引擎适配器
 *
 * 使用 Nitter（Twitter 的开源前端）或 Twitter 搜索页面 HTML 解析
 * 支持多种 Nitter 实例作为备份
 * 包含推文内容、作者、日期、转发数等信息
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"
import { parseRelativeDate } from "../engine"

// Nitter 实例列表（公开可用的 Twitter 前端代理）
const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
]

export function makeTwitter(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchTwitter(http, query, opts.numResults || config.maxResults, opts.timeRange),
  }
}

function searchTwitter(
  http: HttpClient.HttpClient,
  query: string,
  maxResults: number,
  timeRange?: "day" | "week" | "month" | "year",
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 尝试多个 Nitter 实例
    for (const instance of NITTER_INSTANCES) {
      const result = yield* tryNitterSearch(http, instance, query, maxResults, timeRange)
      if (result.length > 0) return result
    }

    // 如果 Nitter 不可用，使用 Twitter 直接搜索
    return yield* tryTwitterDirect(http, query, maxResults)
  })
}

function tryNitterSearch(
  http: HttpClient.HttpClient,
  instance: string,
  query: string,
  maxResults: number,
  timeRange?: "day" | "week" | "month" | "year",
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      f: "tweets",
    })

    if (timeRange) {
      params.set("f", "tweets")
    }

    const url = `${instance}/search?${params.toString()}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
        }),
      ),
    )

    if (response.status < 200 || response.status >= 400) return []
    const html = yield* response.text
    if (!html) return []

    return parseNitterResults(html, maxResults)
  })
}

/**
 * 解析 Nitter 搜索结果 HTML
 *
 * Nitter 结构:
 * - 每个推文在 class="timeline-item" 的 div 中
 * - 用户名在 class="username" 的 span 中
 * - 推文内容在 class="tweet-content" 的 div 中
 * - 日期在 class="tweet-date" 的 a 标签中
 * - 互动数据在 class="tweet-stat" 中
 */
function parseNitterResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  const itemRegex = /<div[^>]*class="timeline-item"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const block = match[0]

    // 提取用户名
    const userMatch = block.match(/<span[^>]*class="username"[^>]*>([\s\S]*?)<\/span>/i)
    const username = userMatch ? userMatch[1].trim().replace("@", "") : ""

    // 提取推文内容
    const contentMatch = block.match(/<div[^>]*class="tweet-content"[^>]*>([\s\S]*?)<\/div>/i)
    const content = contentMatch ? contentMatch[1].replace(/<[^>]*>/g, "").trim() : ""

    // 提取推文链接
    const linkMatch = block.match(/<a[^>]*href="\/[\w]+\/status\/(\d+)"[^>]*>/i)
    if (!linkMatch) continue
    const tweetId = linkMatch[1]

    // 提取日期
    const dateMatch = block.match(/<a[^>]*class="tweet-date"[^>]*>[\s\S]*?<\/a>/i)
    const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]*>/g, "").trim() : ""

    // 提取互动数据
    const statsMatch = block.match(/<div[^>]*class="tweet-stat"[^>]*>[\s\S]*?<\/div>/gi)
    const stats = statsMatch
      ? statsMatch.map((s) => s.replace(/<[^>]*>/g, "").trim()).join(" ")
      : ""

    const title = username ? `@${username}` : "Tweet"
    const snippet = [content, dateStr, stats].filter(Boolean).join(" | ")
    const url = `https://x.com/${username}/status/${tweetId}`

    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet.slice(0, 300),
        engine: "twitter",
        position: results.length + 1,
        category: "social",
        publishedDate: dateStr ? parseRelativeDate(dateStr) : undefined,
      }),
    )
  }

  return results
}

/**
 * 直接搜索 Twitter（作为 Nitter 不可用时的备用）
 * 使用 Twitter 搜索页面的 HTML
 */
function tryTwitterDirect(
  http: HttpClient.HttpClient,
  query: string,
  maxResults: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      src: "typed_query",
      f: "live",
    })

    const url = `https://x.com/search?${params.toString()}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html",
          Cookie: "guest_id=; gt=1",
        }),
      ),
    )

    if (response.status < 200 || response.status >= 400) return []
    const html = yield* response.text
    if (!html) return []

    return parseTwitterDirectResults(html, maxResults)
  })
}

/**
 * 解析 Twitter 直接搜索结果
 * Twitter 搜索页面需要登录，这里作为备用
 */
function parseTwitterDirectResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  // 尝试从 Twitter 的 JSON 数据块中提取
  const jsonMatch = html.match(/"globalObjects"\s*:\s*(\{[\s\S]*?\})\s*[,}]?\s*\}/)
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      const tweets = data.tweets
      if (tweets && typeof tweets === "object") {
        const tweetList = Object.values(tweets) as Array<{
          full_text?: string
          user_screen_name?: string
          id_str?: string
          created_at?: string
        }>
        for (const t of tweetList.slice(0, maxResults)) {
          if (!t.full_text) continue

          const username = t.user_screen_name || ""
          const url = `https://x.com/${username}/status/${t.id_str}`
          const title = username ? `@${username}` : "Tweet"
          const snippet = t.full_text.slice(0, 300)

          results.push(
            makeSearchResult({
              title,
              url,
              snippet,
              engine: "twitter",
              position: results.length + 1,
              category: "social",
              publishedDate: t.created_at ? new Date(t.created_at).getTime() : undefined,
            }),
          )
        }
      }
    } catch {
      // JSON 解析失败
    }
  }

  return results
}
