/**
 * Yandex 搜索引擎适配器
 *
 * 参考 SearXNG 的 yandex.py (4.6KB)
 * 通过 HTTP 抓取 Yandex 搜索结果 HTML，无需 API key。
 *
 * 端点: https://yandex.com/search/site/?text=KEYWORD
 * CAPTCHA 检测: x-yandex-captcha 响应头
 * 解析: li.serp-item 条目
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://yandex.com/search/site"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeYandex(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchYandex(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchYandex(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      text: query,
      tmpl_version: "releases",
      web: "1",
      frame: "1",
      searchid: "3131712",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/xhtml+xml",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []

    // Yandex CAPTCHA: x-yandex-captcha 响应头
    const captchaHeader = response.headers?.["x-yandex-captcha"]
    if (captchaHeader === "captcha") return []

    const html: string = yield* response.text
    if (!html) return []

    return parseYandexResults(html, numResults)
  })
}

/**
 * 解析 Yandex 搜索结果 HTML
 *
 * 参考 SearXNG:
 * - li.serp-item
 * - a.b-serp-item__title-link = URL
 * - h3.b-serp-item__title > a > span = 标题
 * - div.b-serp-item__text = 摘要
 */
export function parseYandexResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 serp-item 条目
  const itemRegex = /<li[^>]*class="[^"]*serp-item[^"]*"[^>]*>[\s\S]*?<\/li>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const block = match[0]

    // URL
    const urlMatch = block.match(/<a[^>]*class="[^"]*b-serp-item__title-link[^"]*"[^>]*href="([^"]*)"[^>]*>/i)
    if (!urlMatch) continue
    const url = urlMatch[1]
    if (!url) continue

    // 标题
    let title = ""
    const titleMatch = block.match(/<span[^>]*>([\s\S]*?)<\/span>\s*<\/a>/i)
    if (titleMatch) title = titleMatch[1].replace(/<[^>]*>/g, "").trim()

    if (!title) continue

    // 摘要
    let snippet = ""
    const snippetMatch = block.match(/<div[^>]*class="[^"]*b-serp-item__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    if (snippetMatch) snippet = snippetMatch[1].replace(/<[^>]*>/g, "").trim()

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet.slice(0, 300),
        engine: "yandex",
        position: pos,
      }),
    )
  }

  return results
}

export * as Yandex from "./yandex"
