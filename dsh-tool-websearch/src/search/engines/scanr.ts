/**
 * ScanR 法国科研机构搜索引擎适配器
 *
 * 搜索法国高等教育和研究机构。
 * API: POST https://scanr.enseignementsup-recherche.gouv.fr/api/structures/search
 *
 * 参考 SearXNG: searx/engines/scanr_structures.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://scanr.enseignementsup-recherche.gouv.fr/api/structures/search"
const WEB_URL = "https://scanr.enseignementsup-recherche.gouv.fr"
const USER_AGENT = "opencode-search/1.0"

export function makeScanr(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchScanr(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchScanr(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const body = JSON.stringify({
      query,
      searchField: "ALL",
      sortDirection: "ASC",
      sortOrder: "RELEVANCY",
      page: 1,
      pageSize: Math.min(numResults, 20),
    })

    const response = yield* http.execute(
      HttpClientRequest.post(API_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        HttpClientRequest.bodyText(body),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseScanrResults(raw, numResults)
  })
}

interface ScanrResult {
  id?: string
  label?: string
  logo?: string
  highlights?: Array<{ value?: string }>
}

export function parseScanrResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { results?: ScanrResult[]; total?: number }
  const results_arr = data?.results
  if (!Array.isArray(results_arr) || (data.total ?? 0) < 1) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of results_arr) {
    if (results.length >= maxResults) break
    if (!item.id || !item.label) continue

    const snippet = item.highlights?.[0]?.value?.replace(/<[^>]+>/g, "").slice(0, 300) || "French research structure"

    pos++
    results.push(
      makeSearchResult({
        title: item.label,
        url: `${WEB_URL}structure/${item.id}`,
        snippet,
        engine: "scanr",
        position: pos,
        category: "academic",
      }),
    )
  }

  return results
}

export * as ScanrEngine from "./scanr"
