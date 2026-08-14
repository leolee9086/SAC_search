/**
 * GMX 搜索引擎适配器
 *
 * 搜索 GMX（德国搜索引擎）。
 * URL: https://suche.gmx.net/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/gmx.py
 * 风险较低：公开 HTML 页面解析
 * 特点：德国主要搜索引擎，代理 Bing 结果
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://suche.gmx.net"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeGmx(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGmx(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGmx(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "de,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseGmxResults(html, numResults)
  })
}

function parseGmxResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果块（GMX 使用 Bing 结果格式）
  const resultRegex = /<div[^>]*class="[^"]*algo[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*fz-ms[^"]*"[^>]*>([\s\S]*?)<\/p>/gi

  let match: RegExpExecArray | null
  while ((match = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const url = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
        snippet: snippet.slice(0, 300),
        engine: "gmx",
        position: pos,
      }),
    )
  }

  // 备用模式：更宽松的匹配
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      const url = match[1].trim()
      const title = match[2].replace(/<[^>]+>/g, "").trim()

      if (!title || !url || url.includes("gmx.net")) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "",
          engine: "gmx",
          position: pos,
        }),
      )
    }
  }

  return results
}

export * as GmxEngine from "./gmx"
