/**
 * Wikidata 知识图谱搜索引擎适配器
 *
 * 搜索 Wikidata 上的知识条目。
 * API: https://www.wikidata.org/w/api.php?action=wbsearchentities&search=QUERY
 *
 * 参考 SearXNG: searx/engines/wikidata.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://www.wikidata.org/w/api.php"
const USER_AGENT = "opencode-search/1.0"

export function makeWikidata(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchWikidata(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchWikidata(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      search: query,
      language: "en",
      limit: String(Math.min(numResults, 50)),
      format: "json",
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

    return parseWikidataResults(raw, numResults)
  })
}

interface WikidataEntry {
  id?: string
  label?: string
  description?: string
  url?: string
  concepturi?: string
}

function parseWikidataResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { search?: WikidataEntry[] }
  const entries = data?.search
  if (!Array.isArray(entries)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const entry of entries) {
    if (results.length >= maxResults) break
    if (!entry.id || !entry.label) continue

    const url = entry.url || `https://www.wikidata.org/wiki/${entry.id}`

    pos++
    results.push(
      makeSearchResult({
        title: `${entry.label} (${entry.id})`,
        url,
        snippet: entry.description || "Wikidata entry",
        engine: "wikidata",
        position: pos,
        category: "academic",
      }),
    )
  }

  return results
}

export * as WikidataEngine from "./wikidata"
