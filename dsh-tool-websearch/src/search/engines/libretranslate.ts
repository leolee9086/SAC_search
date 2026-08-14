/**
 * LibreTranslate 翻译搜索引擎适配器
 *
 * 使用 LibreTranslate 进行翻译。
 * API: https://libretranslate.com/translate
 *
 * 参考 SearXNG: searx/engines/libretranslate.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://libretranslate.com/translate"
const USER_AGENT = "opencode-search/1.0"

export function makeLibreTranslate(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchLibreTranslate(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchLibreTranslate(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 解析查询: "hello en zh" 或 "hello"
    const parts = query.split(" ")
    let fromLang = "en"
    let toLang = "zh"
    let text = query

    if (parts.length >= 3) {
      text = parts.slice(0, -2).join(" ")
      fromLang = parts[parts.length - 2]
      toLang = parts[parts.length - 1]
    } else if (parts.length === 2) {
      text = parts[0]
      toLang = parts[1]
    }

    const body = JSON.stringify({
      q: text,
      source: fromLang,
      target: toLang,
      alternatives: 3,
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

    return parseLibreTranslateResults(raw, text, fromLang, toLang)
  })
}

interface LibreTranslateResponse {
  translatedText?: string
  alternatives?: string[]
}

export function parseLibreTranslateResults(raw: string, query: string, fromLang: string, toLang: string): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as LibreTranslateResponse
  const translation = data.translatedText
  if (!translation) return []

  const results: SearchResult[] = []

  // 主翻译结果
  results.push(
    makeSearchResult({
      title: `${query} → ${translation}`,
      url: `https://libretranslate.com/?source=${fromLang}&target=${toLang}&q=${encodeURIComponent(query)}`,
      snippet: `Translation (${fromLang} → ${toLang}): ${translation}`,
      engine: "libretranslate",
      position: 1,
      category: "general",
    }),
  )

  // 添加替代翻译（如果有）
  const alternatives = data.alternatives
  if (alternatives) {
    let pos = 2
    for (const alt of alternatives) {
      if (pos > 5) break
      results.push(
        makeSearchResult({
          title: `Alternative: ${alt}`,
          url: `https://libretranslate.com/?source=${fromLang}&target=${toLang}&q=${encodeURIComponent(query)}`,
          snippet: `Alternative translation`,
          engine: "libretranslate",
          position: pos,
          category: "general",
        }),
      )
      pos++
    }
  }

  return results
}

export * as LibreTranslateEngine from "./libretranslate"
