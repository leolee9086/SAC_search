/**
 * Repology 包版本搜索引擎适配器
 *
 * 搜索 Repology 上的软件包版本信息。
 * API: https://repology.org/api/v1/project/QUERY
 *
 * 参考 SearXNG: searx/engines/repology.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://repology.org/api/v1/project"
const WEB_URL = "https://repology.org/projects"
const USER_AGENT = "opencode-search/1.0"

export function makeRepology(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchRepology(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchRepology(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ search: query })

    const response = yield* http.execute(
      HttpClientRequest.get(`${WEB_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseRepologyResults(raw, query, numResults)
  })
}

interface RepologyPackage {
  repo?: string
  version?: string
  status?: string
  summary?: string
}

export function parseRepologyResults(raw: string, query: string, maxResults: number): SearchResult[] {
  const projects: Record<string, RepologyPackage[]> = {}
  try { Object.assign(projects, JSON.parse(raw)) } catch { return [] }

  const names = Object.keys(projects).slice(0, maxResults)
  if (names.length === 0) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const name of names) {
    if (results.length >= maxResults) break
    const pkgs = projects[name]
    if (!pkgs?.length) continue

    const newest = pkgs.find((p) => p.status === "newest") || pkgs[0]
    const uniqueRepos = [...new Set(pkgs.map((p) => p.repo).filter(Boolean))]
    const summary = pkgs.find((p) => p.summary)?.summary || ""

    pos++
    results.push(
      makeSearchResult({
        title: name,
        url: `https://repology.org/project/${encodeURIComponent(name)}`,
        snippet: `${newest.version || "?"} · ${uniqueRepos.length} repos · ${summary}`.slice(0, 300),
        engine: "repology",
        position: pos,
        category: "code",
      }),
    )
  }

  return results
}

export * as RepologyEngine from "./repology"
