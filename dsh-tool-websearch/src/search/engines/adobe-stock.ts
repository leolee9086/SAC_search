/**
 * Adobe Stock 图片搜索引擎适配器
 *
 * 搜索 Adobe Stock 上的免版税图片。
 * API: https://stock.adobe.com/de/Ajax/Search?k=QUERY
 *
 * 参考 SearXNG: searx/engines/adobe_stock.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://stock.adobe.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeAdobeStock(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchAdobeStock(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchAdobeStock(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      k: query,
      limit: String(Math.min(numResults, 20)),
      order: "relevance",
      search_page: "1",
      search_type: "pagination",
      "filters[content_type:photo]": "1",
      "filters[content_type:illustration]": "1",
      "filters[content_type:zip_vector]": "1",
      "filters[content_type:template]": "0",
      "filters[content_type:3d]": "0",
      "filters[content_type:image]": "1",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/de/Ajax/Search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.5",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseAdobeStockResults(raw, numResults)
  })
}

interface AdobeStockItem {
  title?: string
  content_url?: string
  thumbnail_url?: string
  content_thumb_extra_large_url?: string
  content_original_width?: number
  content_original_height?: number
  format?: string
  author?: string
  asset_type?: string
}

export function parseAdobeStockResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { items?: Record<string, AdobeStockItem> }
  const items = data?.items
  if (!items || typeof items !== "object") return []

  const results: SearchResult[] = []
  let pos = 0

  for (const key of Object.keys(items)) {
    if (results.length >= maxResults) break
    const item = items[key]
    if (!item?.content_url || !item.title) continue

    const resolution = item.content_original_width && item.content_original_height
      ? `${item.content_original_width}x${item.content_original_height}`
      : ""
    const assetType = item.asset_type || ""
    const author = item.author || ""
    const format = item.format || ""

    const parts = [assetType, resolution, format, author].filter(Boolean)
    const snippet = parts.join(" · ")

    pos++
    results.push(
      makeSearchResult({
        title: item.title,
        url: item.content_url,
        snippet: snippet || "Adobe Stock image",
        engine: "adobe-stock",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as AdobeStockEngine from "./adobe-stock"
