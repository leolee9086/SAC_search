/**
 * Dictzone 词典搜索引擎适配器
 *
 * 搜索 Dictzone 上的翻译结果。
 * URL: https://dictzone.com/{from_lang}-{to_lang}-dictionary/{QUERY}
 *
 * 参考 SearXNG: searx/engines/dictzone.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://dictzone.com"
const USER_AGENT = "opencode-search/1.0"

// 语言映射：语言代码 -> Dictzone 使用的名称
const LANG_MAP: Record<string, string> = {
  en: "english",
  de: "german",
  fr: "french",
  es: "spanish",
  it: "italian",
  pt: "portuguese",
  nl: "dutch",
  pl: "polish",
  ru: "russian",
  sv: "swedish",
  da: "danish",
  no: "norwegian",
  fi: "finnish",
  cs: "czech",
  hu: "hungarian",
  ro: "romanian",
  bg: "bulgarian",
  el: "greek",
  la: "latin",
}

function getLangName(code: string): string {
  return LANG_MAP[code.toLowerCase()] || code.toLowerCase()
}

export function makeDictzone(config: EngineConfig, fromLang: string = "english", toLang: string = "german"): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDictzone(http, query, opts.numResults || config.maxResults, config.timeout, fromLang, toLang, opts.lang),
  }
}

function searchDictzone(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
  fromLang: string,
  toLang: string,
  lang?: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const fl = lang ? getLangName(lang) : fromLang
    const tl = toLang

    const url = `${BASE_URL}/${fl}-${tl}-dictionary/${encodeURIComponent(query)}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseDictzoneResults(html, numResults, query, fl, tl)
  })
}

export function parseDictzoneResults(
  html: string,
  maxResults: number,
  query: string,
  fromLang: string,
  toLang: string,
): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配翻译表格行：<table id="r"> 中的 <tr>
  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*class="[^"]*e[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*class="[^"]*t[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi

  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const sourceText = match[1].replace(/<[^>]+>/g, "").trim()
    const targetHtml = match[2]

    if (!sourceText || !targetHtml) continue

    // 提取翻译文本和同义词
    const translations: string[] = []
    const synMatch = targetHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi)
    if (synMatch) {
      for (const p of synMatch) {
        const text = p.replace(/<[^>]+>/g, "").trim()
        if (text) translations.push(text)
      }
    }

    const snippet = translations.length > 0
      ? `${sourceText} → ${translations.join("; ")}`
      : `${sourceText} → ${targetHtml.replace(/<[^>]+>/g, "").trim()}`

    pos++
    results.push(
      makeSearchResult({
        title: `${query} - ${fromLang} to ${toLang}`,
        url: `${BASE_URL}/${fromLang}-${toLang}-dictionary/${encodeURIComponent(query)}`,
        snippet: snippet.slice(0, 300),
        engine: "dictzone",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as DictzoneEngine from "./dictzone"
