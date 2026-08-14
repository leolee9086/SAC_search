/**
 * Jisho 日英词典搜索引擎适配器
 *
 * 搜索 Jisho.org 上的日语单词和释义。
 * API: https://jisho.org/api/v1/search/words?keyword=QUERY
 *
 * 参考 SearXNG: searx/engines/jisho.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://jisho.org/api/v1/search/words"
const BASE_URL = "https://jisho.org/word/"
const USER_AGENT = "opencode-search/1.0"

export function makeJisho(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchJisho(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchJisho(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ keyword: query })

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

    return parseJishoResults(raw, numResults)
  })
}

interface JishoSense {
  parts_of_speech?: string[]
  english_definitions?: string[]
  tags?: string[]
  info?: string[]
  restrictions?: string[]
}

interface JishoJapanese {
  word?: string
  reading?: string
}

interface JishoEntry {
  slug: string
  japanese: JishoJapanese[]
  senses: JishoSense[]
}

interface JishoResponse {
  data: JishoEntry[]
}

export function parseJishoResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as JishoResponse
  const entries = data?.data
  if (!Array.isArray(entries)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const entry of entries) {
    if (results.length >= maxResults) break
    if (!entry.slug) continue

    // 构建替代形式（汉字/假名）
    const altForms = entry.japanese.map((j) => {
      if (!j.word) return j.reading || ""
      return j.reading ? `${j.word} (${j.reading})` : j.word
    }).filter(Boolean)
    const title = altForms.join(", ")
    if (!title) continue

    // 提取英文释义
    const definitions = entry.senses.flatMap((s) => s.english_definitions || []).join("; ")
    if (!definitions) continue

    const url = `${BASE_URL}${entry.slug}`
    pos++

    results.push(
      makeSearchResult({
        title: title.slice(0, 200),
        url,
        snippet: definitions.slice(0, 300),
        engine: "jisho",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as JishoEngine from "./jisho"
