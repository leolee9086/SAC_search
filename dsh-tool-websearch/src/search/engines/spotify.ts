/**
 * Spotify 音乐搜索引擎适配器
 *
 * 搜索 Spotify 上的音乐内容（歌曲、专辑、艺术家）。
 * API: https://api.spotify.com/v1/search?q=QUERY&type=track,album,artist
 *
 * 参考 SearXNG: searx/engines/spotify.py
 * 风险较低：需要 Spotify API key（client credentials）
 *
 * 无 key 时通过 HTML 解析公开搜索页面作为降级方案
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.spotify.com/v1/search"
const WEB_URL = "https://open.spotify.com/search"
const USER_AGENT = "opencode-search/1.0"

export function makeSpotify(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSpotify(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSpotify(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 优先使用 API（如果有 token）
    const token = process.env.SPOTIFY_ACCESS_TOKEN
    if (token) {
      const params = new URLSearchParams({
        q: query,
        type: "track,album,artist",
        limit: String(Math.min(numResults, 50)),
        market: "US",
      })

      const response = yield* http.execute(
        HttpClientRequest.get(`${API_URL}?${params.toString()}`).pipe(
          HttpClientRequest.setHeaders({
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          }),
        ),
      ).pipe(Effect.timeout(timeout))

      if (response.status >= 200 && response.status < 400) {
        const raw: string = yield* response.text
        if (raw) return parseSpotifyApiResults(raw, numResults)
      }
    }

    // 降级：HTML 解析公开搜索页面
    const response = yield* http.execute(
      HttpClientRequest.get(`${WEB_URL}/${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseSpotifyHtmlResults(html, numResults)
  })
}

interface SpotifyItem {
  id?: string
  name?: string
  type?: string
  artists?: Array<{ name?: string }>
  album?: { name?: string }
  external_urls?: { spotify?: string }
  href?: string
}

interface SpotifyApiResponse {
  tracks?: { items?: SpotifyItem[] }
  albums?: { items?: SpotifyItem[] }
  artists?: { items?: SpotifyItem[] }
}

function parseSpotifyApiResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as SpotifyApiResponse
  const results: SearchResult[] = []
  let pos = 0

  // 合并 tracks, albums, artists
  const allItems: Array<{ item: SpotifyItem; type: string }> = []
  if (data.tracks?.items) {
    for (const item of data.tracks.items) allItems.push({ item, type: "track" })
  }
  if (data.albums?.items) {
    for (const item of data.albums.items) allItems.push({ item, type: "album" })
  }
  if (data.artists?.items) {
    for (const item of data.artists.items) allItems.push({ item, type: "artist" })
  }

  for (const { item, type } of allItems) {
    if (results.length >= maxResults) break
    if (!item.name) continue

    const name = item.name
    const artist = item.artists?.map((a) => a.name).filter(Boolean).join(", ") || ""
    const album = item.album?.name || ""
    const url = item.external_urls?.spotify || item.href || `https://open.spotify.com/search/${encodeURIComponent(name)}`

    const parts: string[] = []
    if (type === "track" && artist) parts.push(artist)
    if (type === "track" && album) parts.push(album)
    parts.push(type)

    const snippet = parts.length > 0
      ? `[${parts.join(" · ")}]` : type

    pos++
    results.push(
      makeSearchResult({
        title: name,
        url,
        snippet: snippet.slice(0, 300),
        engine: "spotify",
        position: pos,
        category: "music",
      }),
    )
  }

  return results
}

function parseSpotifyHtmlResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果链接
  const linkRegex = /<a[^>]*href="(https:\/\/open\.spotify\.com\/(track|album|artist)\/[^"]+)"[^>]*>[\s\S]*?<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = linkRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const url = match[1]
    const type = match[2]
    const title = match[0].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title: title.slice(0, 100),
        url,
        snippet: `Spotify ${type}`,
        engine: "spotify",
        position: pos,
        category: "music",
      }),
    )
  }

  return results
}

export * as SpotifyEngine from "./spotify"
