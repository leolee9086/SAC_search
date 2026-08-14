/**
 * 搜狗搜索引擎适配器
 *
 * 参考 SearXNG 的 sogou.py
 * 解析 sogou.com 的 HTML 搜索结果
 * https://www.sogou.com/web?query=KEYWORD&page=1
 *
 * 无需 API key，注意反爬（返回 302 跳转 antispider 时静默降级）
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://www.sogou.com/web"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeSogou(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSogou(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSogou(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ query, page: "1" })

    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Accept-Language": "zh-CN,zh;q=0.9",
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    // 搜狗反爬：302 跳转到 antispider
    if (response.status === 302 || response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html || html.includes("antispider")) return []

    return parseSogouResults(html, numResults)
  })
}

/**
 * 解析搜狗搜索结果 HTML
 *
 * 参考 SearXNG:
 * - div.rb 或 div.vrwrap（非 special-wrap）
 * - h3.pt > a = 标题 + URL
 * - div.ft = 摘要
 * - cite = 日期
 */
export function parseSogouResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配结果块：div.rb 或 div.vrwrap
  const blockRegex = /<div[^>]*class="(?:rb|vrwrap[^"]*)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const block = match[0]

    // 排除 special-wrap
    if (block.includes('special-wrap')) continue

    // 标题 + URL (两种结构)
    let title = "", url = ""
    const h3aMatch = block.match(/<h3[^>]*class="pt"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
    const vrTitleMatch = block.match(/<h3[^>]*class="[^"]*vr-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)

    if (h3aMatch) { url = h3aMatch[1]; title = h3aMatch[2].replace(/<[^>]*>/g, "").trim() }
    else if (vrTitleMatch) { url = vrTitleMatch[1]; title = vrTitleMatch[2].replace(/<[^>]*>/g, "").trim() }
    else continue

    if (!title || !url) continue

    // 处理搜狗跳转链接
    if (url.startsWith("/link?url=")) {
      const dataUrlMatch = block.match(/data-url="([^"]+)"/)
      url = dataUrlMatch ? dataUrlMatch[1] : `https://www.sogou.com${url}`
    }

    // 摘要
    let snippet = ""
    const ftMatch = block.match(/<div[^>]*class="ft"[^>]*>([\s\S]*?)<\/div>/i)
    if (ftMatch) snippet = ftMatch[1].replace(/<[^>]*>/g, "").trim()

    // 日期
    let publishedDate: number | undefined
    const citeMatch = block.match(/<cite[^>]*>([^<]*)<\/cite>/i)
    if (citeMatch) {
      const dateText = citeMatch[1].trim()
      const d = dateText.match(/(\d{4}-\d{1,2}-\d{1,2})/)
      if (d) publishedDate = new Date(d[1]).getTime()
    }

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet.slice(0, 300),
        engine: "sogou",
        position: pos,
        publishedDate,
      }),
    )
  }

  return results
}

export * as Sogou from "./sogou"
