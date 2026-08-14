/**
 * Qwant 搜索引擎适配器
 *
 * 使用 Qwant API v3 实现网页搜索。
 * API: https://api.qwant.com/v3/search/web
 *
 * 参考 SearXNG: searx/engines/qwant.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.qwant.com/v3/search/web"
const USER_AGENT = "opencode-search/1.0"

export function makeQwant(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchQwant(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchQwant(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      count: String(Math.min(numResults, 20)),
      locale: "en_US",
      offset: "0",
      device: "desktop",
      safesearch: "0",
      tgp: "1",
      display: "true",
      llm: "true",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseQwantResults(raw, numResults)
  })
}

interface QwantItem {
  title?: string
  url?: string
  desc?: string
  date?: number
  thumbnail?: string
}

function parseQwantResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as {
    data?: {
      result?: {
        items?: {
          mainline?: Array<{
            type?: string
            items?: QwantItem[]
          }>
        }
      }
    }
  }

  const mainline = data?.data?.result?.items?.mainline
  if (!Array.isArray(mainline)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const section of mainline) {
    if (section.type !== "web") continue
    const items = section.items
    if (!Array.isArray(items)) continue

    for (const item of items) {
      if (results.length >= maxResults) break
      if (!item.title || !item.url) continue

      const publishedDate = item.date ? new Date(item.date * 1000).getTime() : undefined

      pos++
      results.push(
        makeSearchResult({
          title: item.title,
          url: item.url,
          snippet: item.desc || "",
          engine: "qwant",
          position: pos,
          publishedDate,
          category: "general",
        }),
      )
    }
  }

  return results
}

export * as QwantEngine from "./qwant"
