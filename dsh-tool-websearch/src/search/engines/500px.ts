/**
 * 500px 摄影搜索引擎适配器
 *
 * 搜索 500px 上的摄影作品。
 * 使用 500px GraphQL API 搜索图片。
 *
 * 参考 SearXNG: searx/engines/500px.py
 * 风险较低：公开 API，无需认证
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.500px.com/v1/graphql"
const USER_AGENT = "opencode-search/1.0"

export function make500px(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      search500px(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function search500px(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 使用 500px 的公开搜索 API
    const params = new URLSearchParams({
      q: query,
      image_size: "400",
      rpp: String(Math.min(numResults, 50)),
      page: "1",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`https://500px.com/api/resources/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parse500pxResults(raw, numResults)
  })
}

interface Photo500px {
  id?: number
  name?: string
  description?: string
  user?: {
    fullname?: string
    username?: string
  }
  images?: Array<{
    url?: string
    size?: number
  }>
  created_at?: string
  category?: number
}

interface Response500px {
  photos?: Photo500px[]
}

function parse500pxResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as Response500px
  const photos = data?.photos
  if (!Array.isArray(photos)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const photo of photos) {
    if (results.length >= maxResults) break
    if (!photo.name || !photo.id) continue

    const name = photo.name
    const author = photo.user?.fullname || photo.user?.username || ""
    const description = photo.description || ""

    const parts: string[] = []
    if (author) parts.push(author)

    const snippet = parts.length > 0
      ? `[${parts.join(" · ")}] ${description}`.trim()
      : description || "500px photography"

    pos++
    results.push(
      makeSearchResult({
        title: name,
        url: `https://500px.com/photo/${photo.id}`,
        snippet: snippet.slice(0, 300),
        engine: "500px",
        position: pos,
        publishedDate: photo.created_at ? new Date(photo.created_at).getTime() : undefined,
        category: "image",
      }),
    )
  }

  return results
}

export * as FiveHundredPxEngine from "./500px"
