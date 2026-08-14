/**
 * ChinaSo 搜索引擎适配器
 *
 * 搜索中国互联网内容。
 * URL: https://www.chinaso.com/search/?q=QUERY
 *
 * 参考 SearXNG: searx/engines/chinaso.py
 * 风险较低：公开 HTML 页面解析
 * 特点：中文搜索，专注国内内容
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.chinaso.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeChinaso(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchChinaso(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchChinaso(
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
      HttpClientRequest.get(`${BASE_URL}/search/?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseChinasoResults(html, numResults)
  })
}

function parseChinasoResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配搜索结果块
  const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/p>/gi

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
        engine: "chinaso",
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

      if (!title || !url || url.includes("chinaso.com")) continue

      pos++
      results.push(
        makeSearchResult({
          title,
          url,
          snippet: "",
          engine: "chinaso",
          position: pos,
        }),
      )
    }
  }

  return results
}

export * as ChinasoEngine from "./chinaso"
