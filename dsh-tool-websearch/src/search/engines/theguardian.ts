/**
 * The Guardian 新闻搜索引擎适配器
 *
 * 搜索 The Guardian 上的新闻。
 * API: https://open-platform.theguardian.com/documentation/
 * 公开 API，无需 key 但有限速（5000次/天）
 * 参考 SearXNG: 类似引擎模式
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeTheGuardian(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGuardian(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGuardian(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const key = process.env.GUARDIAN_API_KEY || "test"
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(query)}&page-size=${Math.min(numResults, 20)}&api-key=${key}&show-fields=trailText,byline,publication`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    if (!raw) return []
    return parseGuardianResults(raw, numResults)
  })
}

interface GuardianResult {
  webTitle?: string
  webUrl?: string
  webPublicationDate?: string
  fields?: { trailText?: string; byline?: string }
}

function parseGuardianResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as { response?: { results?: GuardianResult[] } }
  if (!data?.response?.results) return []
  return data.response.results.slice(0, max).map((r, i) =>
    makeSearchResult({
      title: r.webTitle || "Untitled",
      url: r.webUrl || "",
      snippet: r.fields?.trailText || r.fields?.byline || "The Guardian",
      engine: "theguardian",
      position: i + 1,
      category: "news",
      publishedDate: r.webPublicationDate ? new Date(r.webPublicationDate).getTime() : undefined,
    }))
}

export * as TheGuardianEngine from "./theguardian"
