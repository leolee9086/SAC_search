/**
 * FindThatMeme 表情包搜索引擎适配器
 *
 * 搜索网络上的表情包和迷因图片。
 * API: POST https://findthatmeme.com/api/v1/search
 *
 * 参考 SearXNG: searx/engines/findthatmeme.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://findthatmeme.com/api/v1/search"
const USER_AGENT = "opencode-search/1.0"

export function makeFindThatMeme(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchFindThatMeme(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchFindThatMeme(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const body = JSON.stringify({ search: query, offset: 0 })

    const response = yield* http.execute(
      HttpClientRequest.post(API_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        HttpClientRequest.bodyText(body),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseFindThatMemeResults(raw, numResults)
  })
}

interface MemeItem {
  image_path?: string
  thumbnail?: string
  source_page_url?: string
  source_site?: string
  type?: string
  meme_file_size?: number
  updated_at?: string
}

export function parseFindThatMemeResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const items = parsed as MemeItem[]
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.source_page_url) continue

    const title = item.source_site || "Meme"
    const size = item.meme_file_size ? formatBytes(item.meme_file_size) : ""

    pos++
    results.push(
      makeSearchResult({
        title,
        url: item.source_page_url,
        snippet: size ? `Size: ${size}` : "FindThatMeme",
        engine: "findthatmeme",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export * as FindThatMemeEngine from "./findthatmeme"
