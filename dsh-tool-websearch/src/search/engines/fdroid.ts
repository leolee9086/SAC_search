/**
 * F-Droid 开源应用搜索引擎适配器
 *
 * 搜索 F-Droid 上的 Android 应用。
 * URL: https://search.f-droid.org/?q=QUERY
 *
 * 参考 SearXNG: searx/engines/fdroid.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://search.f-droid.org"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeFDroid(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchFDroid(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchFDroid(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      lang: "",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseFDroidResults(html, numResults)
  })
}

function parseFDroidResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配应用列表项
  const itemRegex = /<a[^>]*class="[^"]*package-header[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<h4[^>]*class="[^"]*package-name[^"]*"[^>]*>([\s\S]*?)<\/h4>[\s\S]*?<span[^>]*class="[^"]*package-summary[^"]*"[^>]*>([\s\S]*?)<\/span>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const summary = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !href) continue

    const url = href.startsWith("http") ? href : href

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: summary || "F-Droid open source app",
        engine: "fdroid",
        position: pos,
        category: "apps",
      }),
    )
  }

  return results
}

export * as FDroidEngine from "./fdroid"
