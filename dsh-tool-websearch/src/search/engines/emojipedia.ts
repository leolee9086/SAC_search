/**
 * Emojipedia 表情符号搜索引擎适配器
 *
 * 搜索 Emojipedia 上的表情符号。
 * URL: https://emojipedia.org/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/emojipedia.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://emojipedia.org"
const USER_AGENT = "opencode-search/1.0"

export function makeEmojipedia(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchEmojipedia(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchEmojipedia(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseEmojipediaResults(html, numResults)
  })
}

export function parseEmojipediaResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 EmojisList 中的 a 标签
  const itemRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  const containerRegex = /<div[^>]*class="[^"]*EmojisList[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  const containerMatch = html.match(containerRegex)
  const searchHtml = containerMatch ? containerMatch[1] : html

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(searchHtml)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()

    if (!title || !href || href === "#") continue

    if (href.startsWith("/")) href = `${BASE_URL}${href}`
    else if (!href.startsWith("http")) href = `${BASE_URL}/${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url: href,
        snippet: `Emoji: ${title}`,
        engine: "emojipedia",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as EmojipediaEngine from "./emojipedia"
