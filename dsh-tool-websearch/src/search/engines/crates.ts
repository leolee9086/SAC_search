/**
 * crates.io Rust 包搜索引擎适配器
 *
 * 搜索 Rust crate（包）。
 * API: https://crates.io/api/v1/crates?q=QUERY&per_page=N
 *
 * 参考 SearXNG: searx/engines/crates.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://crates.io/api/v1/crates"
const USER_AGENT = "opencode-search/1.0"

export function makeCrates(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchCrates(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchCrates(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 50)),
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

    return parseCratesResults(raw, numResults)
  })
}

interface CratesEntry {
  name: string
  description?: string
  newest_version?: string
  max_version?: string
  max_stable_version?: string
  keywords?: string[]
  updated_at?: string
  downloads?: number
  homepage?: string
  documentation?: string
  repository?: string
}

function parseCratesResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { crates?: CratesEntry[] }
  const crates = data?.crates
  if (!Array.isArray(crates)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const crate of crates) {
    if (results.length >= maxResults) break
    if (!crate.name) continue

    const version = crate.newest_version || crate.max_version || crate.max_stable_version || ""
    const parts: string[] = []
    if (version) parts.push(`v${version}`)
    if (crate.downloads) parts.push(`${crate.downloads.toLocaleString()} downloads`)
    if (crate.keywords?.length) parts.push(crate.keywords.slice(0, 3).join(", "))

    const snippet = parts.length > 0
      ? `[${parts.join(" · ")}] ${crate.description || ""}`.trim()
      : crate.description || ""

    pos++
    results.push(
      makeSearchResult({
        title: `${crate.name}${version ? ` v${version}` : ""}`,
        url: `https://crates.io/crates/${crate.name}`,
        snippet: snippet.slice(0, 300),
        engine: "crates",
        position: pos,
        publishedDate: crate.updated_at ? new Date(crate.updated_at).getTime() : undefined,
        category: "code",
      }),
    )
  }

  return results
}

export * as CratesEngine from "./crates"
