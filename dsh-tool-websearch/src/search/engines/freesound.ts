/**
 * Freesound 音频搜索引擎适配器
 *
 * 搜索 Freesound 上的音频样本。
 * API: https://freesound.org/apiv2/search/text/?query=QUERY&fields=id,name,description,url,duration,username
 *
 * 参考 SearXNG: searx/engines/freesound.py
 * 风险较低：公开 API，无需 key（有限额）
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://freesound.org/apiv2/search/text/"
const USER_AGENT = "opencode-search/1.0"

export function makeFreesound(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchFreesound(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchFreesound(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      fields: "id,name,description,url,duration,username,created",
      page_size: String(Math.min(numResults, 50)),
      page: "1",
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

    return parseFreesoundResults(raw, numResults)
  })
}

interface FreesoundSound {
  id?: number
  name?: string
  description?: string
  url?: string
  duration?: number
  username?: string
  created?: string
}

interface FreesoundResponse {
  results?: FreesoundSound[]
}

function parseFreesoundResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as FreesoundResponse
  const sounds = data?.results
  if (!Array.isArray(sounds)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const sound of sounds) {
    if (results.length >= maxResults) break
    if (!sound.name || !sound.id) continue

    const name = sound.name
    const author = sound.username || ""
    const description = (sound.description || "").replace(/<[^>]+>/g, "").trim()
    const duration = sound.duration
      ? `${Math.floor(sound.duration / 60)}:${String(Math.floor(sound.duration % 60)).padStart(2, "0")}`
      : ""

    const parts: string[] = []
    if (author) parts.push(author)
    if (duration) parts.push(duration)

    const snippet = parts.length > 0
      ? `[${parts.join(" · ")}] ${description}`.trim()
      : description || "Freesound audio"

    pos++
    results.push(
      makeSearchResult({
        title: name,
        url: sound.url || `https://freesound.org/s/${sound.id}/`,
        snippet: snippet.slice(0, 300),
        engine: "freesound",
        position: pos,
        publishedDate: sound.created ? new Date(sound.created).getTime() : undefined,
        category: "music",
      }),
    )
  }

  return results
}

export * as FreesoundEngine from "./freesound"
