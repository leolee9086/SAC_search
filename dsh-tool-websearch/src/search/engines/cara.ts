/**
 * Cara 艺术社区搜索引擎适配器
 *
 * 搜索 Cara.app 上的艺术作品和创作者。
 * API: https://cara.app/api/search/portfolio-posts?q=QUERY
 *
 * 参考 SearXNG: searx/engines/cara.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://cara.app"
const IMAGES_URL = "https://images.cara.app"
const USER_AGENT = "opencode-search/1.0"

export function makeCara(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchCara(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchCara(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      sortBy: "Top",
      take: String(Math.min(numResults, 24)),
      skip: "0",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/api/search/portfolio-posts?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseCaraResults(raw, numResults)
  })
}

interface CaraImage {
  src?: string
  isCoverImg?: boolean
}

interface CaraPost {
  id?: string
  title?: string
  content?: string
  name?: string
  images?: CaraImage[]
}

export function parseCaraResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const items = parsed as CaraPost[]
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.id) continue

    // 找封面图和缩略图
    let thumbnail: CaraImage | undefined
    let img: CaraImage | undefined

    if (item.images) {
      for (const i of item.images) {
        if (!thumbnail || i.isCoverImg) thumbnail = i
        if (!img || !i.isCoverImg) img = i
      }
    }

    const author = item.name || ""
    const title = item.title || "Untitled"
    const description = item.content || ""

    const parts: string[] = []
    if (author) parts.push(`by ${author}`)
    if (img?.src) parts.push("has image")

    pos++
    results.push(
      makeSearchResult({
        title,
        url: `${BASE_URL}/post/${item.id}`,
        snippet: parts.length > 0
          ? `[${parts.join(" · ")}] ${description}`.trim()
          : description || "Cara art post",
        engine: "cara",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as CaraEngine from "./cara"
