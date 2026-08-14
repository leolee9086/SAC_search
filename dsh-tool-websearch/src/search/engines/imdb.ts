/**
 * IMDb 电影/电视剧搜索引擎适配器
 *
 * 使用 IMDb 公开 suggestion API 搜索。
 * API: https://v2.sg.media-imdb.com/suggestion/{letter}/{query}.json
 *
 * 参考 SearXNG: searx/engines/imdb.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SUGGESTION_URL = "https://v2.sg.media-imdb.com/suggestion"
const USER_AGENT = "opencode-search/1.0"

export function makeIMDb(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchIMDb(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchIMDb(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const normalizedQuery = query.replace(/\s+/g, "_").toLowerCase()
    const letter = normalizedQuery[0] || "a"

    const response = yield* http.execute(
      HttpClientRequest.get(`${SUGGESTION_URL}/${letter}/${encodeURIComponent(normalizedQuery)}.json`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseIMDbResults(raw, numResults)
  })
}

/** IMDb 搜索类别映射 */
const CATEGORY_MAP: Record<string, string> = {
  nm: "name",
  tt: "title",
  kw: "keyword",
  co: "company",
  ep: "episode",
}

interface IMDbEntry {
  id: string
  l: string // title
  q?: string // quality/type (e.g. "feature", "TV series")
  y?: number // year
  s?: string // stars/description
  rank?: number
  i?: { imageUrl: string }
}

function parseIMDbResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { d?: IMDbEntry[] }
  const entries = data?.d
  if (!Array.isArray(entries)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const entry of entries) {
    if (results.length >= maxResults) break

    const entryId = entry.id
    const category = CATEGORY_MAP[entryId?.substring(0, 2)]
    if (!category) continue // skip unknown category tags

    let title = entry.l || ""
    if (entry.q) title += ` (${entry.q})`
    if (!title) continue

    const parts: string[] = []
    if (entry.rank) parts.push(`#${entry.rank}`)
    if (entry.y) parts.push(String(entry.y))
    if (entry.s) parts.push(entry.s)

    const url = `https://www.imdb.com/${category}/${entryId}`

    // 获取缩略图 URL
    let thumbnail: string | undefined
    if (entry.i?.imageUrl) {
      const baseUrl = entry.i.imageUrl.replace(/\._V1_.*$/, "")
      thumbnail = `${baseUrl}._V1_UX280_CR0,0,280,414_.jpg`
    }

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: parts.join(" · "),
        engine: "imdb",
        position: pos,
        publishedDate: entry.y ? new Date(`${entry.y}-01-01`).getTime() : undefined,
        category: "video",
      }),
    )
  }

  return results
}

export * as IMDbEngine from "./imdb"
