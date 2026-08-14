/**
 * Google Play 应用搜索引擎适配器
 *
 * 搜索 Google Play 上的应用和游戏。
 * 使用 HTML 页面解析（无官方 API）。
 * URL: https://play.google.com/store/search?q=QUERY&c=apps
 *
 * 参考 SearXNG: searx/engines/google_play.py
 * 风险较低：Google Play 页面相对宽松
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://play.google.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeGooglePlay(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGooglePlay(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGooglePlay(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query, c: "apps" })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/store/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseGooglePlayResults(html, numResults)
  })
}

function parseGooglePlayResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配应用链接: /store/apps/details?id=PACKAGE_ID
  // 和标题: <span class="..." ...>App Name</span>
  // Google Play 页面结构经常变化，使用多种模式尝试

  // 模式1: 匹配应用列表项
  const appLinkRegex = /href="\/store\/apps\/details\?id=([^"&]+)[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi
  let match: RegExpExecArray | null

  const seen = new Set<string>()

  while ((match = appLinkRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const appId = match[1]
    const title = match[2].trim()

    if (!appId || !title || seen.has(appId)) continue
    seen.add(appId)

    const url = `${BASE_URL}/store/apps/details?id=${appId}`

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: `Google Play · ${appId}`,
        engine: "google-play",
        position: pos,
        category: "apps",
      }),
    )
  }

  // 模式2: 匹配 JSON-LD 结构化数据（备用）
  if (results.length === 0) {
    const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    while ((match = jsonLdRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break
      try {
        const data = JSON.parse(match[1]) as { name?: string; url?: string; description?: string }
        if (data.name && data.url) {
          pos++
          results.push(
            makeSearchResult({
              title: data.name,
              url: data.url.startsWith("http") ? data.url : `${BASE_URL}${data.url}`,
              snippet: data.description || "Google Play",
              engine: "google-play",
              position: pos,
              category: "apps",
            }),
          )
        }
      } catch { /* ignore parse errors */ }
    }
  }

  // 模式3: 通用正则匹配 store/apps/details 链接
  if (results.length === 0) {
    const genericRegex = /\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g
    while ((match = genericRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break
      const appId = match[1]
      if (seen.has(appId)) continue
      seen.add(appId)

      pos++
      results.push(
        makeSearchResult({
          title: appId,
          url: `${BASE_URL}/store/apps/details?id=${appId}`,
          snippet: "Google Play App",
          engine: "google-play",
          position: pos,
          category: "apps",
        }),
      )
    }
  }

  return results
}

export * as GooglePlayEngine from "./google-play"
