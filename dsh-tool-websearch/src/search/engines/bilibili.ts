/**
 * Bilibili 搜索引擎适配器
 *
 * 参考 SearXNG 的 Bilibili 引擎实现 (searx/engines/bilibili.py)
 * 调用 Bilibili 未公开的内部 JSON API，无需 API key。
 *
 * Bilibili API 细节：
 * - 端点: GET https://api.bilibili.com/x/web-interface/search/type
 * - 参数: keyword, search_type=video, page, page_size=20
 * - 必须: Referer + Accept headers + buvid3 cookie
 * - 返回: { data: { result: [...] } }
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.bilibili.com/x/web-interface/search/type"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

/**
 * 生成 Bilibili 所需的 buvid3 cookie 值
 * 格式：16 个随机十六进制字符 + "infoc"
 * 参考 SearXNG: ''.join(random.choice(string.hexdigits) for _ in range(16)) + 'infoc'
 */
function generateBuvid3(): string {
  const hex = "0123456789abcdefABCDEF"
  let result = ""
  for (let i = 0; i < 16; i++) {
    result += hex[Math.floor(Math.random() * hex.length)]
  }
  return result + "infoc"
}

/**
 * 清理 Bilibili API 返回的标题文本
 *
 * Bilibili 的 title 字段包含 HTML 实体 + 搜索高亮 <em> 标签。
 * 参考 SearXNG: utils.html_to_text() — 先解码实体，再剥掉标签。
 */
function sanitizeTitle(text: string): string {
  // 1. 解码 HTML 实体
  const decoded = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
  // 2. 剥掉 <em>、<span> 等所有 HTML 标签
  return decoded.replace(/<[^>]*>/g, "").trim()
}

export function makeBilibili(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBilibili(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

/**
 * 调用 Bilibili 搜索 API
 *
 * 策略（与 SearXNG 一致）：
 * 1. 构造带 keyword 和 search_type=video 的查询参数
 * 2. 设置 Referer + Accept 头部（B 站需要验证来源）
 * 3. 设置 buvid3 cookie（B 站身份标识）
 * 4. 解析 JSON 响应中的 data.result 数组
 */
function searchBilibili(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      keyword: query,
      search_type: "video",
      page: "1",
      page_size: String(Math.min(numResults, 50)),
      single_column: "0",
      __refresh__: "true",
      platform: "web",
    })

    const url = `${API_URL}?${params.toString()}`
    const buvid3 = generateBuvid3()

    const cookies = [
      `buvid3=${buvid3}`,
      "innersign=0",
      "i-wanna-go-back=-1",
      "b_ut=7",
      "FEED_LIVE_VERSION=V8",
      "header_theme_version=undefined",
      "home_feed_column=4",
    ]

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Referer: "https://www.bilibili.com/",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Cookie: cookies.join("; "),
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    if (response.status === 412) return [] // Bilibili 的反爬拦截

    const raw: string = yield* response.text
    if (!raw) return []

    return parseBilibiliResults(raw, numResults)
  })
}

/**
 * 解析 Bilibili 搜索 API 的 JSON 响应
 *
 * 参考 SearXNG 的 response() 函数：
 * search_res.get("data", {}).get("result", []) → items
 * 返回字段：title, arcurl, pic, description, author, aid, pubdate, duration
 */
export function parseBilibiliResults(raw: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  let parsed: { data?: { result?: unknown[] } }
  try {
    parsed = JSON.parse(raw) as { data?: { result?: unknown[] } }
  } catch {
    return []
  }

  const items = parsed?.data?.result
  if (!items || !Array.isArray(items)) return []

  let pos = 0
  for (const item of items) {
    if (results.length >= maxResults) break
    if (typeof item !== "object" || !item) continue

    const record = item as Record<string, unknown>
    const title = typeof record.title === "string" ? sanitizeTitle(record.title) : ""
    const url = typeof record.arcurl === "string" ? record.arcurl : ""
    const description = typeof record.description === "string" ? record.description.trim() : ""
    const pubdate = typeof record.pubdate === "number" ? record.pubdate : undefined

    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: description.slice(0, 300), // 控制片段长度
        engine: "bilibili",
        position: pos,
        publishedDate: pubdate ? pubdate * 1000 : undefined, // Bilibili 返回秒级时间戳
        category: "video",
      }),
    )
  }

  return results
}

export * as BilibiliEngine from "./bilibili"
