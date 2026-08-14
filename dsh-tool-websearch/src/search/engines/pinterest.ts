/**
 * Pinterest 图片搜索引擎适配器
 *
 * 搜索 Pinterest 上的图片。
 * API: https://www.pinterest.com/resource/BaseSearchResource/get/
 *
 * 参考 SearXNG: searx/engines/pinterest.py
 * 风险较低：公开 JSON API
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.pinterest.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makePinterest(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchPinterest(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchPinterest(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const args = {
      options: {
        query,
        bookmarks: [""],
      },
      context: {},
    }

    const response = yield* http.execute(
      HttpClientRequest.get(
        `${BASE_URL}/resource/BaseSearchResource/get/?data=${encodeURIComponent(JSON.stringify(args))}`,
      ).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "X-Pinterest-AppState": "active",
          "X-Pinterest-Source-Url": "/ideas/",
          "X-Pinterest-PWS-Handler": "www/ideas.js",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parsePinterestResults(raw, numResults)
  })
}

interface PinterestPin {
  id: string
  type?: string
  link?: string
  title?: string
  grid_title?: string
  images?: {
    orig?: { url: string; width: number; height: number }
    "236x"?: { url: string }
  }
  rich_summary?: { display_description?: string; site_name?: string }
  pinner?: { full_name?: string; username?: string }
}

function parsePinterestResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as {
    resource_response?: {
      data?: {
        results?: PinterestPin[]
      }
    }
  }
  const pins = data?.resource_response?.data?.results
  if (!Array.isArray(pins)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const pin of pins) {
    if (results.length >= maxResults) break
    if (pin.type === "story") continue // skip ads

    const url = pin.link || `${BASE_URL}/pin/${pin.id}/`
    const title = pin.title || pin.grid_title || ""
    const description = pin.rich_summary?.display_description || ""
    const author = pin.pinner?.full_name || ""

    const parts: string[] = []
    if (author) parts.push(`by ${author}`)
    if (pin.rich_summary?.site_name) parts.push(pin.rich_summary.site_name)

    pos++
    results.push(
      makeSearchResult({
        title: title || `Pinterest pin ${pin.id}`,
        url,
        snippet: parts.join(" · ") || description || "Pinterest",
        engine: "pinterest",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as PinterestEngine from "./pinterest"
