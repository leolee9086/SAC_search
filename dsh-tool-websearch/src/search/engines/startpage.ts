/**
 * Startpage 搜索引擎适配器
 *
 * Startpage 是一个隐私优先的搜索引擎，代理 Google 搜索结果。
 * URL: https://www.startpage.com/do/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/startpage.py
 * 风险较低：公开 HTML 页面解析
 * 特点：Google 结果质量 + 隐私保护
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.startpage.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeStartpage(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchStartpage(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchStartpage(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      cat: "web",
      language: "english",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/do/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseStartpageResults(html, numResults)
  })
}

function parseStartpageResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // Startpage 的搜索结果结构
  // 匹配 w-gl__result 样式的结果块
  const resultRegex = /<div[^>]*class="[^"]*w-gl__result[^"]*"[^>]*>[\s\S]*?<a[^>]*class="[^"]*w-gl__result-url[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*w-gl__result-title[^"]*"[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*w-gl__description[^"]*"[^>]*>([\s\S]*?)<\/p>/gi

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
        url,
        snippet: snippet.slice(0, 300),
        engine: "startpage",
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

      if (!title || !url || url.includes("startpage.com")) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "",
          engine: "startpage",
          position: pos,
        }),
      )
    }
  }

  return results
}

export * as StartpageEngine from "./startpage"
