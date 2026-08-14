/**
 * Material Icons 图标搜索引擎适配器
 *
 * 搜索 Google Material Icons 图标库。
 * API: https://fonts.google.com/metadata/icons
 *
 * 参考 SearXNG: searx/engines/material_icons.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://fonts.google.com/metadata/icons?key=material_symbols&incomplete=true"
const IMG_URL = "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

export function makeMaterialIcons(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMaterialIcons(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMaterialIcons(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(SEARCH_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          Referer: "https://fonts.google.com/",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseMaterialIconsResults(raw, query, numResults)
  })
}

interface MaterialIcon {
  name?: string
  tags?: string[]
  categories?: string[]
}

export function parseMaterialIconsResults(raw: string, query: string, maxResults: number): SearchResult[] {
  // Google Fonts 返回 JSONP: `)]}' \n { ... }`
  const jsonStart = raw.indexOf("{")
  if (jsonStart === -1) return []

  let parsed: unknown
  try { parsed = JSON.parse(raw.slice(jsonStart)) } catch { return [] }

  const data = parsed as { icons?: MaterialIcon[] }
  const icons = data?.icons
  if (!Array.isArray(icons)) return []

  const queryParts = query.toLowerCase().split(/\s+/)
  const results: SearchResult[] = []
  let pos = 0

  for (const icon of icons) {
    if (results.length >= maxResults) break
    if (!icon.name) continue

    const name = icon.name.toLowerCase()
    const tags = (icon.tags || []).map((t) => t.toLowerCase())
    const categories = (icon.categories || []).map((c) => c.toLowerCase())

    const match = queryParts.some(
      (part) => name.includes(part) ||
        tags.some((t) => t.includes(part)) ||
        categories.some((c) => c.includes(part)),
    )
    if (!match) continue

    const imgSrc = `${IMG_URL}/${icon.name}/default/24px.svg`
    pos++
    results.push(
      makeSearchResult({
        title: icon.name,
        url: `https://fonts.google.com/icons?icon.query=${encodeURIComponent(icon.name)}&selected=Material+Symbols+Outlined:${icon.name}:FILL@0;wght@400;GRAD@0;opsz@24`,
        snippet: tags.slice(0, 3).join(", ") || "Material Icon",
        engine: "material-icons",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as MaterialIconsEngine from "./material-icons"
