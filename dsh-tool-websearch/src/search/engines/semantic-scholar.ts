/**
 * Semantic Scholar 学术搜索引擎适配器
 *
 * 使用 Semantic Scholar API (graph API)
 * https://api.semanticscholar.org/graph/v1/paper/search?query=KEYWORD&limit=N
 *
 * 零风险：公开 API，无需 API key（但有速率限制，引擎内置熔断器）
 * 参考 SearXNG: searx/engines/semantic_scholar.py
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.semanticscholar.org/graph/v1/paper/search"
const USER_AGENT = "opencode-search/1.0 (metasearch engine)"

export function makeSemanticScholar(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSemanticScholar(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSemanticScholar(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      query,
      limit: String(Math.min(numResults, 50)),
      fields: "title,url,publicationDate,authors,abstract,externalIds",
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
    if (response.status === 429) return [] // rate limited

    const raw: string = yield* response.text
    if (!raw) return []

    return parseSemanticScholarResults(raw, numResults)
  })
}

export function parseSemanticScholarResults(raw: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  let parsed: { data?: Array<{
    title?: string
    url?: string
    publicationDate?: string
    abstract?: string
    authors?: Array<{ name: string }>
    externalIds?: Record<string, string>
  }> }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const papers = parsed?.data
  if (!papers || !Array.isArray(papers)) return []

  let pos = 0
  for (const paper of papers) {
    if (results.length >= maxResults) break
    if (!paper) continue

    const title = paper.title?.trim()
    const url = paper.url || (paper.externalIds?.ArXiv ? `https://arxiv.org/abs/${paper.externalIds.ArXiv}` : "")
    const abstract = paper.abstract?.trim() || ""
    const date = paper.publicationDate
    const author = paper.authors?.map((a) => a.name).join(", ") || ""

    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: author ? `${author} - ${abstract.slice(0, 200)}` : abstract.slice(0, 250),
        engine: "semantic-scholar",
        position: pos,
        publishedDate: date ? new Date(date).getTime() : undefined,
        category: "academic",
      }),
    )
  }

  return results
}

export * as SemanticScholar from "./semantic-scholar"
