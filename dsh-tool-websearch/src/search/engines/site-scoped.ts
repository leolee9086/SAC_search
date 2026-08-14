/**
 * 站点限定搜索引擎适配器
 *
 * 通过 DuckDuckGo 的 site: 语法搜索特定平台的内容。
 * 借鉴 SearXNG 的引擎适配器模式：同一套搜索逻辑，不同配置（query 变换）。
 *
 * 支持的站点：
 * - xiaohongshu.com — 小红书
 * - zhihu.com — 知乎
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult, parseRelativeDate } from "../engine"
import { Parser } from "htmlparser2"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
const DDG_HTML_URL = "https://html.duckduckgo.com/html/"

/**
 * 创建站点限定搜索引擎
 *
 * 搜索原理：将查询改为 `site:{domain} {query}` 提交给 DuckDuckGo HTML 搜索，
 * 将结果标记为指定引擎名称，供聚合器合并去重。
 * 这比直接抓取目标站点更稳定（DDG 处理反爬），且无需额外 API key。
 *
 * @param domain - 目标站点域名（如 "xiaohongshu.com"）
 * @param name - 引擎名称（如 "xiaohongshu"）
 * @param config - 引擎配置
 */
export function makeSiteScopedEngine(domain: string, name: string, config: EngineConfig): SearchEngine {
  return {
    name,
    config,
    search: (http: HttpClient.HttpClient, query: string, opts: SearchOptions) =>
      searchSiteScoped(http, domain, query, opts.numResults || config.maxResults, name, config.timeout),
  }
}

function searchSiteScoped(
  http: HttpClient.HttpClient,
  domain: string,
  query: string,
  numResults: number,
  engineName: string,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 构造 site: 限定查询
    const scopedQuery = `site:${domain} ${query}`
    const formData = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" })

    const response = yield* http.execute(
      HttpClientRequest.post(DDG_HTML_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          Referer: "https://html.duckduckgo.com/",
        }),
        HttpClientRequest.bodyText(formData.toString()),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (html.includes('id="challenge-form"')) return []

    return parseHtmlResults(html, numResults, engineName)
  })
}

function parseHtmlResults(html: string, maxResults: number, engineName: string): SearchResult[] {
  const results: SearchResult[] = []
  let current: { title?: string; url?: string; snippet?: string; dateText?: string } = {}
  let inResult = false, depth = 0, inTitle = false, inSnippet = false, inDate = false, textBuf = "", pos = 0

  const parser = new Parser({
    onopentag(name, attrs) {
      const cls = attrs.class ?? ""
      if (name === "div") {
        const classes = cls.split(/\s+/)
        if (classes.includes("result") && !classes.includes("results") && !inResult) {
          current = {}; inResult = true; depth = 1; return
        }
        if (inResult) depth++; return
      }
      if (!inResult) return
      if (name === "a" && cls === "result__a") { inTitle = true; textBuf = ""; current.url = extractUrl(attrs.href ?? "") }
      if (name === "a" && cls === "result__snippet") { inSnippet = true; textBuf = "" }
      // 日期元素
      if ((name === "span" || name === "div") && (cls.includes("result__date") || cls.includes("result__timestamp"))) {
        inDate = true; textBuf = ""
      }
    },
    ontext(text) { if (inTitle || inSnippet || inDate) textBuf += text },
    onclosetag(name) {
      if (!inResult) return
      if (inDate && (name === "span" || name === "div")) {
        current.dateText = (current.dateText ?? "") + textBuf.trim()
        inDate = false; textBuf = ""
        return
      }
      if (name === "div") {
        depth--; if (depth <= 0) {
          if (current.title && current.url) {
            pos++
            results.push(makeSearchResult({
              title: current.title, url: current.url,
              snippet: current.snippet ?? "", engine: engineName, position: pos,
              publishedDate: current.dateText ? parseRelativeDate(current.dateText) : undefined,
            }))
            if (results.length >= maxResults) { parser.reset(); return }
          }
          current = {}; inResult = false
        }
        return
      }
      if (name === "a") {
        if (inTitle) { current.title = (current.title ?? "") + textBuf.trim(); inTitle = false }
        if (inSnippet) { current.snippet = (current.snippet ?? "") + textBuf.trim(); inSnippet = false }
        textBuf = ""
      }
    },
  })

  parser.write(html); parser.end()
  if (inResult && current.title && current.url && results.length < maxResults) {
    pos++
    results.push(makeSearchResult({
      title: current.title, url: current.url,
      snippet: current.snippet ?? "", engine: engineName, position: pos,
      publishedDate: current.dateText ? parseRelativeDate(current.dateText) : undefined,
    }))
  }
  return results
}

function extractUrl(href: string): string {
  if (!href) return ""
  const uddgMatch = href.match(/[?&]uddg=([^&]+)/)
  if (uddgMatch) { try { return decodeURIComponent(uddgMatch[1]) } catch { } }
  if (href.startsWith("http://") || href.startsWith("https://")) return href
  if (href.startsWith("//")) return `https:${href}`
  return href
}

export * as SiteScopedEngine from "./site-scoped"
