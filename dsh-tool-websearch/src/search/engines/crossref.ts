/**
 * Crossref 学术论文搜索引擎适配器
 *
 * 搜索学术论文 DOI、期刊文章等。
 * API: https://api.crossref.org/works?query=QUERY
 *
 * 参考 SearXNG: searx/engines/crossref.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.crossref.org/works"
const USER_AGENT = "opencode-search/1.0 (mailto:search@opencode.ai)"

export function makeCrossRef(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchCrossRef(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchCrossRef(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      rows: String(Math.min(numResults, 50)),
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

    return parseCrossRefResults(raw, numResults)
  })
}

interface CrossRefItem {
  DOI?: string
  title?: string[]
  "container-title"?: string[]
  author?: Array<{ given?: string; family?: string }>
  published?: { "date-parts"?: number[][] }
  type?: string
  publisher?: string
  URL?: string
  subject?: string[]
  abstract?: string
}

function parseCrossRefResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { message?: { items?: CrossRefItem[] } }
  const items = data?.message?.items
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (item.type === "component") continue // skip file attachments

    const title = item.title?.[0] || item["container-title"]?.[0] || ""
    const doi = item.DOI || ""
    const journal = item["container-title"]?.[0] || ""
    if (!title) continue

    const authors = item.author?.slice(0, 3).map(a => `${a.given || ""} ${a.family || ""}`).join(", ") || ""

    const parts: string[] = []
    if (authors) parts.push(authors)
    if (journal) parts.push(journal)
    if (item.type) parts.push(item.type)
    if (doi) parts.push(`DOI: ${doi}`)

    const url = item.URL || (doi ? `https://doi.org/${doi}` : "")
    if (!url) continue

    let publishedDate: number | undefined
    if (item.published?.["date-parts"]?.[0]) {
      const dateParts = item.published["date-parts"][0]
      try {
        const year = dateParts[0]
        const month = dateParts[1] || 1
        const day = dateParts[2] || 1
        publishedDate = new Date(year, month - 1, day).getTime()
      } catch { /* ignore */ }
    }

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: parts.join(" · "),
        engine: "crossref",
        position: pos,
        publishedDate,
        category: "academic",
      }),
    )
  }

  return results
}

export * as CrossRefEngine from "./crossref"
