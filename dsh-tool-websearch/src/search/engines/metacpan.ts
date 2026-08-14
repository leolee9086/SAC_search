/**
 * MetaCPAN Perl 包搜索引擎适配器
 *
 * 搜索 Perl 模块（CPAN 发行版）。
 * API: https://fastapi.metacpan.org/v1/module/_search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/metacpan.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://fastapi.metacpan.org/v1/module/_search"
const USER_AGENT = "opencode-search/1.0"

export function makeMetacpan(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMetacpan(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMetacpan(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      size: String(Math.min(numResults, 50)),
      from: "0",
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

    return parseMetacpanResults(raw, numResults)
  })
}

interface MetacpanHit {
  _source?: {
    author?: string
    version?: string
    description?: string
    name?: string
    abstract?: string
    distribution?: string
    date?: string
  }
}

interface MetacpanResponse {
  hits?: {
    hits?: MetacpanHit[]
  }
}

function parseMetacpanResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as MetacpanResponse
  const hits = data?.hits?.hits
  if (!Array.isArray(hits)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const hit of hits) {
    if (results.length >= maxResults) break

    const source = hit._source
    if (!source?.name) continue

    const name = source.name
    const version = source.version || ""
    const author = source.author || ""
    const description = source.abstract || source.description || ""
    const distribution = source.distribution || name

    const parts: string[] = []
    if (version) parts.push(`v${version}`)
    if (author) parts.push(author)

    const snippet = parts.length > 0
      ? `[${parts.join(" · ")}] ${description}`.trim()
      : description || "Perl module"

    pos++
    results.push(
      makeSearchResult({
        title: `${name}${version ? ` v${version}` : ""}`,
        url: `https://metacpan.org/pod/${distribution}`,
        snippet: snippet.slice(0, 300),
        engine: "metacpan",
        position: pos,
        publishedDate: source.date ? new Date(source.date).getTime() : undefined,
        category: "code",
      }),
    )
  }

  return results
}

export * as MetacpanEngine from "./metacpan"
