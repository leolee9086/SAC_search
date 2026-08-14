/**
 * Yandex Music 音乐搜索引擎适配器
 *
 * 搜索 Yandex Music 上的音乐。
 * API: https://music.yandex.ru/handlers/music-search.jsx
 *
 * 参考 SearXNG: searx/engines/yandex_music.py
 * 风险较低：公开 JSON API
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://music.yandex.ru"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeYandexMusic(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchYandexMusic(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchYandexMusic(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      text: query,
      page: "0",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/handlers/music-search.jsx?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseYandexMusicResults(raw, numResults)
  })
}

interface YandexTrack {
  id?: number
  title?: string
  type?: string
  albums?: Array<{ id?: number; title?: string }>
  artists?: Array<{ name?: string }>
}

export function parseYandexMusicResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { tracks?: { items?: YandexTrack[] } }
  const tracks = data?.tracks?.items
  if (!Array.isArray(tracks)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const track of tracks) {
    if (results.length >= maxResults) break
    if (track.type !== "music" || !track.title) continue

    const trackId = track.id
    const albumId = track.albums?.[0]?.id
    if (!trackId || !albumId) continue

    const url = `${BASE_URL}/album/${albumId}/track/${trackId}`
    const album = track.albums?.[0]?.title || ""
    const artist = track.artists?.[0]?.name || ""
    const content = `[${album}] ${artist} - ${track.title}`

    pos++
    results.push(
      makeSearchResult({
        title: track.title,
        url,
        snippet: content,
        engine: "yandex-music",
        position: pos,
        category: "music",
      }),
    )
  }

  return results
}

export * as YandexMusicEngine from "./yandex-music"
