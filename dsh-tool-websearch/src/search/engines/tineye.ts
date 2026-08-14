/**
 * TinEye 反向图片搜索引擎适配器
 *
 * 使用 TinEye 搜索相似图片。
 * API: https://tineye.com/api/v1/result_json/?url=QUERY
 *
 * 参考 SearXNG: searx/engines/tineye.py
 * 风险较低：公开 JSON API
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://tineye.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeTinEye(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchTinEye(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchTinEye(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      url: query,
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/api/v1/result_json/?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseTinEyeResults(raw, numResults)
  })
}

interface TinEyeMatch {
  image_url?: string
  domain?: string
  score?: number
  width?: number
  height?: number
  backlinks?: Array<{
    url?: string
    backlink?: string
    crawl_date?: string
  }>
}

export function parseTinEyeResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { matches?: TinEyeMatch[] }
  const matches = data?.matches
  if (!Array.isArray(matches)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const match of matches) {
    if (results.length >= maxResults) break
    if (!match.backlinks?.length) continue

    const backlink = match.backlinks[0]
    const url = backlink?.backlink || ""
    if (!url) continue

    const score = match.score || 0
    const domain = match.domain || ""

    pos++
    results.push(
      makeSearchResult({
        title: `TinEye match (${score}% similarity)`,
        url,
        snippet: domain ? `Found on ${domain}` : "TinEye reverse image search",
        engine: "tineye",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as TinEyeEngine from "./tineye"
