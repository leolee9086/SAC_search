/**
 * Pixiv 插画搜索引擎适配器
 *
 * 搜索 Pixiv 上的插画作品。
 * API: https://www.pixiv.net/ajax/search/illustrations/QUERY
 *
 * 参考 SearXNG: searx/engines/pixiv.py
 * 风险较低：需要特定请求头
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.pixiv.net"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makePixiv(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchPixiv(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchPixiv(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      word: query,
      order: "date_d",
      mode: "all",
      p: "1",
      s_mode: "s_tag_full",
      type: "illust_and_ugoira",
      lang: "en",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/ajax/search/illustrations/${encodeURIComponent(query)}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          Referer: `${BASE_URL}/`,
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parsePixivResults(raw, numResults)
  })
}

interface PixivIllust {
  title?: string
  url?: string
  alt?: string
  userName?: string
  userId?: string
  illustId?: string
}

function parsePixivResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as {
    body?: {
      illust?: {
        data?: PixivIllust[]
      }
    }
  }
  const illusts = data?.body?.illust?.data
  if (!Array.isArray(illusts)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const illust of illusts) {
    if (results.length >= maxResults) break
    if (!illust.title) continue

    const url = `https://www.pixiv.net/artworks/${illust.illustId || ""}`
    const author = illust.userName || ""

    pos++
    results.push(
      makeSearchResult({
        title: illust.title,
        url,
        snippet: author ? `by ${author} · Pixiv` : "Pixiv illustration",
        engine: "pixiv",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as PixivEngine from "./pixiv"
