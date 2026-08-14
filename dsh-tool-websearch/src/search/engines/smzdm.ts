/**
 * 什么值得买 (SMZDM) 价格/优惠搜索引擎适配器
 *
 * 搜索 smzdm.com 上的商品优惠信息。
 * URL: https://www.smzdm.com/
 *
 * 采用 DuckDuckGo site: 语法 + 直接页面抓取双策略。
 * 风险较低：公开页面解析 + DDG 中继。
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult, parseRelativeDate } from "../engine"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
const SMZDM_SEARCH_URL = "https://search.smzdm.com"
const DDG_HTML_URL = "https://html.duckduckgo.com/html/"

export function makeSmzdm(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSmzdm(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSmzdm(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 策略 1：通过 DuckDuckGo site: 搜索（稳定可靠但可能不是最新价格）
    const ddgResults = yield* searchViaDdg(http, query, numResults, timeout)

    // 策略 2：直接搜索 SMZDM 站内（获取最新优惠）
    const directResults = yield* searchDirectSmzdm(http, query, numResults, timeout)

    // 合并结果（DDG = 通用，direct = 最新优惠）
    const combined = [...directResults]
    const seenUrls = new Set(combined.map((r) => r.url))
    for (const r of ddgResults) {
      if (!seenUrls.has(r.url) && combined.length < numResults) {
        seenUrls.add(r.url)
        combined.push(r)
      }
    }

    return combined.slice(0, numResults)
  })
}

/** 通过 DuckDuckGo site: 语法搜索 */
function searchViaDdg(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const scopedQuery = `site:smzdm.com ${query} 优惠`
    const formData = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" })

    const response = yield* http.execute(
      HttpClientRequest.post(DDG_HTML_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }),
        HttpClientRequest.bodyText(formData.toString()),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (html.includes('id="challenge-form"')) return []

    return parseDdgResults(html, Math.ceil(numResults / 2), "smzdm-ddg")
  })
}

/** 直接搜索 SMZDM 站内 */
function searchDirectSmzdm(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      c: "home",
      v: "home",
      s: query,
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${SMZDM_SEARCH_URL}/cate-home/0/0/0/0/0/0/0/0/0/0_0_0_0_0_0_0_0_0_0/0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0/0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0_0/0_0_0_?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Referer: "https://www.smzdm.com/",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html || html.length < 100) return []

    return parseSmzdmDirectResults(html, Math.ceil(numResults / 2))
  }).pipe(
    Effect.catchIf(() => true, () => Effect.succeed([] as readonly SearchResult[])),
  )
}

/** 解析 DDG site: 搜索结果 */
function parseDdgResults(html: string, maxResults: number, engineName: string): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 DDG 结果条目
  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let url = match[1].trim()
    // 从 DDG 重定向中提取真实 URL
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/)
    if (uddgMatch) {
      try { url = decodeURIComponent(uddgMatch[1]) } catch { }
    }

    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: `${snippet} · 什么值得买`,
        engine: engineName,
        position: pos,
        category: "shopping",
      }),
    )
  }

  return results
}

/** 解析 SMZDM 直接搜索结果 */
function parseSmzdmDirectResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 SMZDM 商品列表项（feed-list 中的条目）
  const itemRegex = /<li[^>]*class="[^"]*feed-list-item[^"]*"[^>]*data-articleid="(\d+)"[^>]*>[\s\S]*?<h5[^>]*class="[^"]*feed-block-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*z-highlight[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const articleId = match[1]
    let url = match[2].trim()
    const title = match[3].replace(/<[^>]+>/g, "").trim()
    const priceBlock = match[5]?.replace(/<[^>]+>/g, "").trim() ?? ""

    if (!url.startsWith("http")) {
      url = `https://www.smzdm.com${url.startsWith("/") ? "" : "/"}${url}`
    }

    if (!title) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: priceBlock ? `${priceBlock} · 什么值得买` : "什么值得买",
        engine: "smzdm",
        position: pos,
        category: "shopping",
        publishedDate: articleId ? parseInt(articleId, 10) : undefined,
      }),
    )
  }

  // 备用模式：简化匹配
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]*smzdm\.com[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const url = match[1]
      const title = match[2].replace(/<[^>]+>/g, "").trim()

      if (!title || title.length < 5) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "什么值得买",
          engine: "smzdm",
          position: pos,
          category: "shopping",
        }),
      )
    }
  }

  return results
}

export * as SmzdmEngine from "./smzdm"
