/**
 * OpenAlex 学术论文搜索引擎适配器
 *
 * 搜索 OpenAlex 上的学术论文。
 * API: https://api.openalex.org/works?search=QUERY
 *
 * 参考 SearXNG: searx/engines/openalex.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.openalex.org/works"
const USER_AGENT = "opencode-search/1.0 (mailto:search@opencode.ai)"

export function makeOpenAlex(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchOpenAlex(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchOpenAlex(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      per_page: String(Math.min(numResults, 50)),
      sort: "relevance_score:desc",
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

    return parseOpenAlexResults(raw, numResults)
  })
}

interface OpenAlexWork {
  id?: string
  title?: string
  doi?: string
  publication_date?: string
  cited_by_count?: number
  authorships?: Array<{ author?: { display_name?: string } }>
  primary_location?: { landing_page_url?: string; pdf_url?: string }
  open_access?: { oa_url?: string }
  concepts?: Array<{ display_name?: string }>
  type?: string
}

function reconstructAbstract(invertedIndex: Record<string, number[]> | undefined): string {
  if (!invertedIndex) return ""
  const positionToToken: Record<number, string> = {}
  let maxIndex = -1

  for (const [token, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      positionToToken[pos] = token
      maxIndex = Math.max(maxIndex, pos)
    }
  }

  if (maxIndex < 0) return ""
  const tokens: string[] = []
  for (let i = 0; i <= maxIndex; i++) {
    const t = positionToToken[i]
    if (t) tokens.push(t)
  }
  return tokens.join(" ")
}

function parseOpenAlexResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { results?: OpenAlexWork[] }
  const works = data?.results
  if (!Array.isArray(works)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const work of works) {
    if (results.length >= maxResults) break
    if (!work.title) continue

    const url = work.primary_location?.landing_page_url || work.open_access?.oa_url || work.id || ""
    if (!url) continue

    const authors = work.authorships?.slice(0, 3).map(a => a.author?.display_name || "").filter(Boolean) || []
    const doi = work.doi?.replace("https://doi.org/", "") || ""
    const concepts = work.concepts?.slice(0, 3).map(c => c.display_name || "").filter(Boolean) || []

    const parts: string[] = []
    if (authors.length) parts.push(authors.join(", "))
    if (doi) parts.push(`DOI: ${doi}`)
    if (work.cited_by_count) parts.push(`${work.cited_by_count} citations`)

    pos++
    results.push(
      makeSearchResult({
        title: work.title,
        url,
        snippet: parts.join(" · ") || "OpenAlex academic paper",
        engine: "openalex",
        position: pos,
        publishedDate: work.publication_date ? new Date(work.publication_date).getTime() : undefined,
        category: "academic",
      }),
    )
  }

  return results
}

export * as OpenAlexEngine from "./openalex"
