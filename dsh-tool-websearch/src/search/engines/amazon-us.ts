/**
 * Amazon.com (US) 商品搜索引擎适配器
 *
 * 搜索 Amazon.com 上的商品信息和价格。
 *
 * 采用 DuckDuckGo site: 语法查询，降低反爬风险。
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
const DDG_HTML_URL = "https://html.duckduckgo.com/html/"

export function makeAmazonUs(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchAmazonUs(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchAmazonUs(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 通过 DuckDuckGo site: 语法搜索 Amazon.com
    const scopedQuery = `site:amazon.com ${query} -site:amazon.cn -site:amazon.de -site:amazon.co.uk -site:amazon.co.jp -site:amazon.in -site:amazon.it -site:amazon.es -site:amazon.fr -site:amazon.ca -site:amazon.com.au -site:amazon.com.br -site:amazon.com.mx`
    const formData = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" })

    const response = yield* http.execute(
      HttpClientRequest.post(DDG_HTML_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8",
        }),
        HttpClientRequest.bodyText(formData.toString()),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (html.includes('id="challenge-form"')) return []

    return parseAmazonUsResults(html, numResults)
  })
}

function parseAmazonUsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 DDG 结果条目中的 Amazon.com 链接
  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let url = match[1].trim()
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/)
    if (uddgMatch) {
      try { url = decodeURIComponent(uddgMatch[1]) } catch { }
    }

    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3].replace(/<[^>]+>/g, "").trim()

    // 只保留 Amazon.com 商品链接，排除其他国家分站
    if (!title || !url) continue
    if (!url.includes("amazon.com")) continue
    if (url.includes("amazon.cn") || url.includes("amazon.co.") ||
        url.includes("amazon.de") || url.includes("amazon.in") ||
        url.includes("amazon.it") || url.includes("amazon.es") ||
        url.includes("amazon.fr") || url.includes("amazon.ca") ||
        url.includes("amazon.com.au") || url.includes("amazon.com.br") ||
        url.includes("amazon.com.mx") || url.includes("amazon.co.jp")) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet ? `${snippet} · Amazon.com` : "Amazon.com",
        engine: "amazon-us",
        position: pos,
        category: "shopping",
      }),
    )
  }

  return results
}

export * as AmazonUsEngine from "./amazon-us"
