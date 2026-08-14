/**
 * 知乎直连搜索引擎适配器
 *
 * 直接搜索知乎平台上的问题和内容。
 * URL: https://www.zhihu.com/search?q=QUERY
 *
 * 相比 site-scoped 的 DuckDuckGo 间接搜索，直连方式能获取更丰富的信息
 *（标题、摘要、回答数、赞同数等）。
 *
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult, stripHtml } from "../engine"

const BASE_URL = "https://www.zhihu.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeZhihu(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchZhihu(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchZhihu(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      type: "content",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Referer: `${BASE_URL}/`,
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseZhihuResults(html, numResults)
  })
}

export function parseZhihuResults(html: string, maxResults: number): SearchResult[] {
  // 多种匹配模式依次尝试，第一个产生结果的模式胜出
  const patterns = [
    // 模式 1：搜索结果的通用结构
    {
      regex: /<a[^>]*class="[^"]*[Ee]ntry[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*class="[^"]*[Rr]ich[Cc]ontent[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
      extract(m: RegExpExecArray) {
        const href = m[1].trim()
        const title = stripHtml(m[2])
        const snippet = stripHtml(m[3] ?? "")
        if (!title || !href) return null
        return { title, href: normalizeZhihuUrl(href), snippet: snippet || "知乎内容" }
      },
    },
    // 模式 2：搜索结果卡片（知乎新版页面）
    {
      regex: /<div[^>]*class="[^"]*[Ss]earch[_-][Rr]esult[_-][Ii]tem[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*[Rr]ich[Ww]ord[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/a>/gi,
      extract(m: RegExpExecArray) {
        const href = m[1].trim()
        const title = stripHtml(m[2])
        if (!title || !href) return null
        return { title, href: normalizeZhihuUrl(href), snippet: "知乎回答" }
      },
    },
    // 模式 3：兜底——任何带知乎链接和标题的 a 标签
    {
      regex: /<a[^>]*href="(\/question\/[^"]*|\/answer\/[^"]*|\/people\/[^"]*|\/p\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      extract(m: RegExpExecArray) {
        const href = m[1].trim()
        const title = stripHtml(m[2])
        if (!title) return null
        return { title, href: `${BASE_URL}${href}`, snippet: "知乎内容" }
      },
    },
  ]

  for (const { regex, extract } of patterns) {
    const results = tryParsePattern(html, maxResults, regex, extract)
    if (results.length > 0) return results
  }
  return []
}

function tryParsePattern(
  html: string,
  maxResults: number,
  pattern: RegExp,
  extract: (m: RegExpExecArray) => { title: string; href: string; snippet: string } | null,
): SearchResult[] {
  const results: SearchResult[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const parsed = extract(match)
    if (!parsed) continue
    results.push(makeZhihuResult(parsed.title, parsed.href, parsed.snippet, results.length + 1))
  }
  return results
}


function normalizeZhihuUrl(href: string): string {
  if (href.startsWith("/")) return `${BASE_URL}${href}`
  if (!href.startsWith("http")) return `${BASE_URL}/${href}`
  return href
}

function makeZhihuResult(title: string, url: string, snippet: string, position: number): SearchResult {
  return makeSearchResult({
    title,
    url,
    snippet,
    engine: "zhihu",
    position,
    category: "social",
  })
}

export * as ZhihuEngine from "./zhihu"
