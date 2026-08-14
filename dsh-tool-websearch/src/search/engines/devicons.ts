/**
 * Devicons 开发者图标搜索引擎适配器
 *
 * 搜索 devicon.dev 上的开发技术栈图标。
 * API: https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.json
 *
 * 参考 SearXNG: searx/engines/devicons.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const CDN_URL = "https://cdn.jsdelivr.net/gh/devicons/devicon@latest"
const USER_AGENT = "opencode-search/1.0"

export function makeDevicons(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDevicons(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchDevicons(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${CDN_URL}/devicon.json`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseDeviconsResults(raw, query, numResults)
  })
}

interface DeviconItem {
  name?: string
  altnames?: string[]
  tags?: string[]
  color?: string
  versions?: { svg?: string[] }
}

export function parseDeviconsResults(raw: string, query: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const items = parsed as DeviconItem[]
  if (!Array.isArray(items)) return []

  const queryParts = query.toLowerCase().split(/\s+/)
  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (!item.name) continue

    // 匹配查询
    const name = item.name.toLowerCase()
    const altnames = (item.altnames || []).map((a) => a.toLowerCase())
    const tags = (item.tags || []).map((t) => t.toLowerCase())

    const match = queryParts.some(
      (part) => name.includes(part) ||
        altnames.some((a) => a.includes(part)) ||
        tags.some((t) => t.includes(part)),
    )
    if (!match) continue

    const svgVersions = item.versions?.svg || []
    for (const version of svgVersions) {
      if (results.length >= maxResults) break
      const imgSrc = `${CDN_URL}/icons/${item.name}/${item.name}-${version}.svg`

      pos++
      results.push(
        makeSearchResult({
          title: item.name,
          url: imgSrc,
          snippet: `Devicon · ${item.color || ""}`.trim(),
          engine: "devicons",
          position: pos,
          category: "image",
        }),
      )
    }
    if (results.length >= maxResults) break
  }

  return results
}

export * as DeviconsEngine from "./devicons"
