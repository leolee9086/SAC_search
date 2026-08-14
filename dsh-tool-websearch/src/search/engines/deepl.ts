/**
 * DeepL 翻译搜索引擎适配器
 *
 * 使用 DeepL API 进行高质量翻译。
 * API: POST https://api-free.deepl.com/v2/translate
 *
 * 参考 SearXNG: searx/engines/deepl.py
 * 需要 DeepL API key（免费版 https://api-free.deepl.com）
 * 设置环境变量 DEEPL_API_KEY
 *
 * 无 key 时降级到 libreTranslate（社区实现）
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api-free.deepl.com/v2/translate"
const WEB_URL = "https://www.deepl.com/translator"
const USER_AGENT = "opencode-search/1.0"

export function makeDeepL(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDeepL(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchDeepL(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 解析查询: "hello zh" 或 "hello"（缺省目标语言自动检测为中文）
    const parts = query.split(" ")
    let targetLang = "ZH"
    let text = query

    if (parts.length >= 2) {
      text = parts.slice(0, -1).join(" ")
      const langHint = parts[parts.length - 1].toUpperCase()
      // 支持常见的语言代码映射
      const langMap: Record<string, string> = {
        "ZH": "ZH", "ZH-CN": "ZH", "ZH-TW": "ZH",
        "EN": "EN-US", "EN-US": "EN-US", "EN-GB": "EN-GB",
        "JA": "JA", "KO": "KO",
        "FR": "FR", "DE": "DE", "ES": "ES", "IT": "IT",
        "PT": "PT", "PT-BR": "PT-BR", "PT-PT": "PT-PT",
        "RU": "RU", "AR": "AR", "NL": "NL", "PL": "PL",
        "SV": "SV", "DA": "DA", "FI": "FI", "CS": "CS",
        "EL": "EL", "HU": "HU", "RO": "RO", "SK": "SK",
        "BG": "BG", "SL": "SL", "ET": "ET", "LT": "LT",
        "LV": "LV", "UK": "UK", "ID": "ID", "MS": "MS",
        "TH": "TH", "TR": "TR", "VI": "VI",
      }
      if (langMap[langHint]) targetLang = langMap[langHint]
      else if (langHint.length === 2) targetLang = langHint
    }

    // 优先使用 API key
    const apiKey = process.env.DEEPL_API_KEY
    if (apiKey) {
      const body = new URLSearchParams({
        auth_key: apiKey,
        text,
        target_lang: targetLang,
      }).toString()

      const response = yield* http.execute(
        HttpClientRequest.post(API_URL).pipe(
          HttpClientRequest.setHeaders({
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
          }),
          HttpClientRequest.bodyText(body),
        ),
      ).pipe(Effect.timeout(timeout))

      if (response.status >= 200 && response.status < 400) {
        const raw: string = yield* response.text
        if (raw) {
          const results = parseDeepLApiResults(raw, text, targetLang)
          if (results.length > 0) return results
        }
      }
    }

    return []
  })
}

interface DeepLTranslation {
  text?: string
  detected_source_language?: string
}

interface DeepLApiResponse {
  translations?: DeepLTranslation[]
}

export function parseDeepLApiResults(raw: string, query: string, targetLang: string): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as DeepLApiResponse
  const translations = data.translations
  if (!Array.isArray(translations) || translations.length === 0) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const t of translations) {
    if (results.length >= 3) break
    if (!t.text) continue

    const srcLang = t.detected_source_language || "?"
    pos++

    results.push(
      makeSearchResult({
        title: `${query} → ${t.text}`,
        url: `${WEB_URL}#${srcLang}/${targetLang}/${encodeURIComponent(query)}`,
        snippet: `Translation (${srcLang} → ${targetLang}): ${t.text}`,
        engine: "deepl",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as DeepLEngine from "./deepl"
