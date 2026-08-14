/**
 * Genius 歌词搜索引擎适配器
 *
 * 搜索 Genius 上的歌词和音乐信息。
 * API: https://genius.com/api/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/genius.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://genius.com/api/search"
const USER_AGENT = "opencode-search/1.0"

export function makeGenius(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGenius(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGenius(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 20)),
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}/multi?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseGeniusResults(raw, numResults)
  })
}

interface GeniusHit {
  type?: string
  result?: {
    url?: string
    full_title?: string
    title_with_featured?: string
    song_art_image_thumbnail_url?: string
    image_url?: string
    lyrics_updated_at?: number
    api_path?: string
    name?: string
    name_with_artist?: string
    cover_art_url?: string
    release_date_components?: { year?: number }
  }
  highlights?: Array<{ value?: string }>
}

function parseGeniusResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { response?: { sections?: Array<{ hits?: GeniusHit[] }> } }
  const sections = data?.response?.sections
  if (!Array.isArray(sections)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const section of sections) {
    const hits = section.hits
    if (!Array.isArray(hits)) continue

    for (const hit of hits) {
      if (results.length >= maxResults) break

      const result = hit.result
      if (!result?.url) continue

      let title = ""
      let content = ""
      let thumbnail = ""

      if (hit.type === "lyric" || hit.type === "song") {
        title = result.full_title || ""
        content = hit.highlights?.[0]?.value || result.title_with_featured || ""
        thumbnail = result.song_art_image_thumbnail_url || ""
      } else if (hit.type === "artist") {
        title = result.name || ""
        content = "Artist"
        thumbnail = result.image_url || ""
      } else if (hit.type === "album") {
        title = result.full_title || ""
        content = result.name_with_artist || ""
        thumbnail = result.cover_art_url || ""
      }

      if (!title) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url: result.url,
          snippet: content || `Genius ${hit.type || "result"}`,
          engine: "genius",
          position: pos,
          publishedDate: result.lyrics_updated_at
            ? new Date(result.lyrics_updated_at * 1000).getTime()
            : undefined,
          category: "music",
        }),
      )
    }
  }

  return results
}

export * as GeniusEngine from "./genius"
