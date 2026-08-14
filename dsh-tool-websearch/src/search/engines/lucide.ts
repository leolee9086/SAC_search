/**
 * Lucide 图标搜索引擎适配器
 *
 * 搜索 Lucide 开源图标库。
 * API: https://cdn.jsdelivr.net/npm/lucide-static/tags.json
 *
 * 参考 SearXNG: searx/engines/lucide.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const CDN_URL = "https://cdn.jsdelivr.net/npm/lucide-static"
const USER_AGENT = "opencode-search/1.0"

export function makeLucide(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchLucide(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchLucide(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${CDN_URL}/tags.json`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseLucideResults(raw, query, numResults)
  })
}

export function parseLucideResults(raw: string, query: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as Record<string, string[]>
  const queryParts = query.toLowerCase().split(/\s+/)
  const results: SearchResult[] = []
  let pos = 0

  for (const [iconName, tags] of Object.entries(data)) {
    if (results.length >= maxResults) break

    const match = queryParts.some(
      (part) => iconName.includes(part) || tags.some((t) => t.includes(part)),
    )
    if (!match) continue

    const imgSrc = `${CDN_URL}/icons/${iconName}.svg`
    pos++
    results.push(
      makeSearchResult({
        title: iconName,
        url: imgSrc,
        snippet: `Lucide icon · ${tags.slice(0, 3).join(", ")}`,
        engine: "lucide",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as LucideEngine from "./lucide"
