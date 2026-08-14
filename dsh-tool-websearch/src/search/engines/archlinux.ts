/**
 * Arch Linux Wiki 搜索引擎适配器
 *
 * 搜索 Arch Linux Wiki 上的文档。
 * URL: https://wiki.archlinux.org/index.php?search=QUERY
 *
 * 参考 SearXNG: searx/engines/archlinux.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://wiki.archlinux.org"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeArchLinux(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchArchLinux(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchArchLinux(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      title: "Special:Search",
      limit: "20",
      offset: "0",
      profile: "default",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/index.php?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseArchLinuxResults(html, numResults)
  })
}

export function parseArchLinuxResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果列表
  const itemRegex = /<li[^>]*class="[^"]*mw-search-result[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*mw-search-result-heading[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*searchresult[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const content = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !href) continue

    const url = href.startsWith("http") ? href : `${BASE_URL}${href}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: content || "Arch Linux Wiki",
        engine: "archlinux",
        position: pos,
        category: "code",
      }),
    )
  }

  return results
}

export * as ArchLinuxEngine from "./archlinux"
