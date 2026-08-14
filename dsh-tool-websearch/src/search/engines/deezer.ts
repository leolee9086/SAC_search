/**
 * Deezer 音乐搜索引擎适配器
 *
 * 搜索 Deezer 上的音乐。
 * API: https://api.deezer.com/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/deezer.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.deezer.com/search"
const USER_AGENT = "opencode-search/1.0"

export function makeDeezer(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDeezer(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchDeezer(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(numResults, 25)),
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

    return parseDeezerResults(raw, numResults)
  })
}

interface DeezerTrack {
  id?: number
  type?: string
  title?: string
  link?: string
  artist?: { name?: string }
  album?: { title?: string }
  duration?: number
}

function parseDeezerResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { data?: DeezerTrack[] }
  const tracks = data?.data
  if (!Array.isArray(tracks)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const track of tracks) {
    if (results.length >= maxResults) break
    if (track.type !== "track" || !track.title) continue

    const url = track.link?.replace("http://", "https://") || ""
    if (!url) continue

    const artist = track.artist?.name || ""
    const album = track.album?.title || ""
    const content = `${artist} - ${album} - ${track.title}`

    pos++
    results.push(
      makeSearchResult({
        title: track.title,
        url,
        snippet: content,
        engine: "deezer",
        position: pos,
        category: "music",
      }),
    )
  }

  return results
}

export * as DeezerEngine from "./deezer"
