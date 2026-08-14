/**
 * Lingva 翻译搜索引擎适配器
 *
 * 使用 Lingva Translate 进行翻译。
 * API: https://lingva.ml/api/v1/{from}/{to}/{query}
 *
 * 参考 SearXNG: searx/engines/lingva.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://lingva.ml"
const USER_AGENT = "opencode-search/1.0"

export function makeLingva(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchLingva(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchLingva(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 解析查询: "hello en zh" 或 "hello"
    const parts = query.split(" ")
    let fromLang = "auto"
    let toLang = "en"
    let text = query

    if (parts.length >= 3) {
      text = parts.slice(0, -2).join(" ")
      fromLang = parts[parts.length - 2]
      toLang = parts[parts.length - 1]
    } else if (parts.length === 2) {
      text = parts[0]
      toLang = parts[1]
    }

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/api/v1/${fromLang}/${toLang}/${encodeURIComponent(text)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseLingvaResults(raw, text, fromLang, toLang)
  })
}

interface LingvaResponse {
  translation?: string
  info?: {
    typo?: string
    definitions?: Array<{
      list?: Array<{
        definition?: string
        example?: string
        synonyms?: string[]
      }>
    }>
  }
}

export function parseLingvaResults(raw: string, query: string, fromLang: string, toLang: string): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as LingvaResponse
  const translation = data.translation
  if (!translation) return []

  const results: SearchResult[] = []

  // 主翻译结果
  results.push(
    makeSearchResult({
      title: `${query} → ${translation}`,
      url: `${BASE_URL}/${fromLang}/${toLang}/${encodeURIComponent(query)}`,
      snippet: `Translation (${fromLang} → ${toLang}): ${translation}`,
      engine: "lingva",
      position: 1,
      category: "general",
    }),
  )

  // 添加定义（如果有）
  const definitions = data.info?.definitions
  if (definitions) {
    let pos = 2
    for (const def of definitions) {
      if (pos > 5) break
      for (const item of def.list || []) {
        if (pos > 5) break
        if (item.definition) {
          results.push(
            makeSearchResult({
              title: `Definition: ${item.definition}`,
              url: `${BASE_URL}/${fromLang}/${toLang}/${encodeURIComponent(query)}`,
              snippet: item.example || "",
              engine: "lingva",
              position: pos,
              category: "general",
            }),
          )
          pos++
        }
      }
    }
  }

  return results
}

export * as LingvaEngine from "./lingva"
