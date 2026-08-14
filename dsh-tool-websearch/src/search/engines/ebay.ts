/**
 * eBay 购物搜索引擎适配器
 *
 * 搜索 eBay 上的商品。
 * URL: https://www.ebay.com/sch/i.html?_nkw=QUERY
 *
 * 参考 SearXNG: searx/engines/ebay.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.ebay.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeEbay(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchEbay(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchEbay(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      _nkw: query,
      _sacat: "0",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/sch/i.html?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseEbayResults(html, numResults)
  })
}

function parseEbayResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配商品列表项
  const itemRegex = /<li[^>]*class="[^"]*s-item[^"]*"[^>]*>[\s\S]*?<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([\s\S]*?)<\/span>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const price = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url || title === "Shop on eBay") continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: price ? `${price} · eBay` : "eBay",
        engine: "ebay",
        position: pos,
        category: "shopping",
      }),
    )
  }

  // 备用模式
  if (results.length === 0) {
    const fallbackRegex = /href="(https:\/\/www\.ebay\.com\/itm\/[^"]*)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const url = match[1]
      const title = match[2].trim()

      if (!title) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "eBay item",
          engine: "ebay",
          position: pos,
          category: "shopping",
        }),
      )
    }
  }

  return results
}

export * as EbayEngine from "./ebay"
