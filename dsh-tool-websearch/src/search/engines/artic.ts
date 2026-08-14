/**
 * Artic 芝加哥艺术博物馆搜索引擎适配器
 *
 * 搜索芝加哥艺术博物馆的藏品。
 * API: https://api.artic.edu/api/v1/artworks/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/artic.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.artic.edu/api/v1/artworks/search"
const IMAGE_URL = "https://www.artic.edu/iiif/2"
const USER_AGENT = "opencode-search/1.0"

export function makeArtic(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchArtic(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchArtic(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(numResults, 20)),
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

    return parseArticResults(raw, numResults)
  })
}

interface ArticArtwork {
  id?: number
  title?: string
  artist_title?: string
  date_display?: string
  medium_display?: string
  image_id?: string
  api_link?: string
}

interface ArticConfig {
  iiif_url?: string
}

interface ArticResponse {
  data?: ArticArtwork[]
  config?: ArticConfig
}

export function parseArticResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const response = parsed as ArticResponse
  const artworks = response?.data
  if (!Array.isArray(artworks)) return []

  const iiifBase = response?.config?.iiif_url || IMAGE_URL

  const results: SearchResult[] = []
  let pos = 0

  for (const artwork of artworks) {
    if (results.length >= maxResults) break
    if (!artwork.title || !artwork.id) continue

    const artist = artwork.artist_title || "Unknown artist"
    const date = artwork.date_display || ""
    const medium = artwork.medium_display || ""
    const snippet = [artist, date, medium].filter(Boolean).join(" · ")

    pos++
    results.push(
      makeSearchResult({
        title: artwork.title,
        url: `https://www.artic.edu/artworks/${artwork.id}`,
        snippet: snippet || "Artwork from Art Institute of Chicago",
        engine: "artic",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as ArticEngine from "./artic"
