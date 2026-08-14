/**
 * 搜狗微信搜索引擎适配器
 *
 * 参考 SearXNG 的 sogou_wechat.py
 * 通过搜狗搜索获取微信公众号文章，无需 API key。
 *
 * 端点: https://weixin.sogou.com/weixin
 * 参数: query, type=2 (文章), page
 * 返回: HTML, 解析 <li id="sogou_vr_..."> 条目
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://weixin.sogou.com"
const SEARCH_URL = `${BASE_URL}/weixin`
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeSogouWeChat(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSogouWeChat(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSogouWeChat(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      type: "2",
      page: "1",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9",
          Referer: BASE_URL,
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html || html.includes("antispider")) return []

    return parseSogouWeChatResults(html, numResults)
  })
}

/**
 * 解析搜狗微信搜索结果 HTML
 *
 * 参考 SearXNG: lxml xpath '//li[contains(@id, "sogou_vr_")]'
 * 提取: h3/a (标题+URL), p.txt-info (摘要)
 */
export function parseSogouWeChatResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 逐块匹配 <li id="sogou_vr_..."> (ID 格式: sogou_vr_数字 或 sogou_vr_数字_数字)
  const itemRegex = /<li[^>]*id="sogou_vr_[\d_]+"[^>]*>[\s\S]*?<\/li>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const block = match[0]

    // 标题 + URL
    const titleMatch = block.match(/<h3>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    let url = titleMatch[1]
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim()
    if (!title || !url) continue

    // 处理相对 URL
    if (url.startsWith("/link?url=")) url = `${BASE_URL}${url}`
    else if (url.startsWith("//")) url = `https:${url}`

    // 摘要
    let snippet = ""
    const snippetMatch = block.match(/<p[^>]*class="txt-info"[^>]*>([\s\S]*?)<\/p>/i)
    if (snippetMatch) snippet = snippetMatch[1].replace(/<[^>]*>/g, "").trim()

    // 发布日期（搜狗用 timeConvert 脚本）
    let publishedDate: number | undefined
    const timeMatch = block.match(/timeConvert\('(\d+)'\)/)
    if (timeMatch) {
      const ts = parseInt(timeMatch[1], 10)
      if (!isNaN(ts)) publishedDate = ts * 1000
    }

    // 公众号名称
    const accountMatch = block.match(/<div[^>]*class="account"[^>]*>([\s\S]*?)<\/div>/i)
    const account = accountMatch ? accountMatch[1].replace(/<[^>]*>/g, "").trim() : ""

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet || account,
        engine: "sogou-wechat",
        position: pos,
        publishedDate,
        category: "news",
      }),
    )
  }

  return results
}

export * as SogouWeChat from "./sogou-wechat"
