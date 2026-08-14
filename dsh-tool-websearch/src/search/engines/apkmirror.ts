/**
 * APKMirror APK 文件搜索引擎适配器
 *
 * 搜索 APKMirror 上的 Android APK 文件。
 * URL: https://www.apkmirror.com/?post_type=app_release&searchtype=apk&s=QUERY
 *
 * 参考 SearXNG: searx/engines/apkmirror.py
 * 风险较低：公开 HTML 页面解析，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.apkmirror.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeApkMirror(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchApkMirror(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchApkMirror(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      post_type: "app_release",
      searchtype: "apk",
      s: query,
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

    return parseApkMirrorResults(html, numResults)
  })
}

export function parseApkMirrorResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 appRow 中的结果条目
  const itemRegex = /<div[^>]*class="[^"]*appRow[^"]*"[^>]*>[\s\S]*?<h5><a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const _thumbnail = match[3]

    if (!title || !href) continue
    if (href.startsWith("/")) href = `${BASE_URL}${href}#downloads`

    pos++
    results.push(
      makeSearchResult({
        title,
        url: href,
        snippet: "Android APK download",
        engine: "apkmirror",
        position: pos,
        category: "general",
      }),
    )
  }

  return results
}

export * as ApkMirrorEngine from "./apkmirror"
