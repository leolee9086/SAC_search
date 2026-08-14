/**
 * Selfhst 自托管图标搜索引擎适配器
 *
 * 搜索 selfh.st/icons 上的自托管仪表盘图标。
 * API: https://cdn.jsdelivr.net/gh/selfhst/icons/index.json
 *
 * 参考 SearXNG: searx/engines/selfhst.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const CDN_URL = "https://cdn.jsdelivr.net/gh/selfhst/icons"
const USER_AGENT = "opencode-search/1.0"

export function makeSelfhst(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSelfhst(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSelfhst(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${CDN_URL}/index.json`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseSelfhstResults(raw, query, numResults)
  })
}

interface SelfhstItem {
  Reference?: string
  Name?: string
  SVG?: string
  PNG?: string
  WebP?: string
  CreatedAt?: string
}

export function parseSelfhstResults(raw: string, query: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const items = parsed as SelfhstItem[]
  if (!Array.isArray(items)) return []

  const queryParts = query.toLowerCase().split(/\s+/)
  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    const keyword = (item.Reference || "").toLowerCase()
    if (!queryParts.some((part) => keyword.includes(part))) continue

    const imgFormat = item.SVG === "Yes" ? "svg" : item.PNG === "Yes" ? "png" : item.WebP === "Yes" ? "webp" : null
    if (!imgFormat || !item.Reference) continue

    const imgSrc = `${CDN_URL}/${imgFormat.toUpperCase()}/${item.Reference}.${imgFormat}`

    pos++
    results.push(
      makeSearchResult({
        title: item.Name || item.Reference,
        url: imgSrc,
        snippet: `Selfhst icon · ${imgFormat.toUpperCase()}`,
        engine: "selfhst",
        position: pos,
        publishedDate: item.CreatedAt ? new Date(item.CreatedAt).getTime() : undefined,
        category: "image",
      }),
    )
  }

  return results
}

export * as SelfhstEngine from "./selfhst"
