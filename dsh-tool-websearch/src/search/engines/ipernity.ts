/**
 * Ipernity 图片搜索引擎适配器
 *
 * 搜索 Ipernity 上的摄影作品。
 * URL: https://www.ipernity.com/search/photo/@/page:1:10?q=QUERY
 *
 * 参考 SearXNG: searx/engines/ipernity.py
 * 零风险：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.ipernity.com"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeIpernity(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchIpernity(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchIpernity(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `${BASE_URL}/search/photo/@/page:1:10?q=${encodeURIComponent(query)}`

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

    return parseIpernityResults(html, numResults)
  })
}

export function parseIpernityResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 查找 <a href="/doc/..."> 中的图片，以及内嵌 JS 数据
  const imgRegex = /<a[^>]*href="(\/doc\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/gi
  const jsRegex = /searchResults\[\s*\d+\s*\]\s*=\s*({[\s\S]*?});/g

  // 收集图片 URL 和文档 URL
  const imgEntries: Array<{ href: string; thumbUrl: string }> = []
  let imgMatch: RegExpExecArray | null
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    imgEntries.push({
      href: imgMatch[1].trim(),
      thumbUrl: imgMatch[2].trim(),
    })
  }

  // 收集 JS 中的数据
  const jsEntries: Array<Record<string, string>> = []
  let jsMatch: RegExpExecArray | null
  while ((jsMatch = jsRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsMatch[1])
      jsEntries.push(data)
    } catch { /* skip malformed JSON */ }
  }

  // 合并数据
  const maxLen = Math.min(imgEntries.length, Math.max(jsEntries.length || imgEntries.length, maxResults))
  for (let i = 0; i < maxLen; i++) {
    if (results.length >= maxResults) break

    const img = imgEntries[i]
    const info = jsEntries[i] || {}

    if (!img?.href) continue

    const title = info?.title || "Ipernity photo"
    const docUrl = `${BASE_URL}${img.href}`
    const imgUrl = img.thumbUrl.replace("240.jpg", "640.jpg")
    const author = info?.user_name || ""

    pos++
    results.push(
      makeSearchResult({
        title: title as string,
        url: docUrl,
        snippet: author ? `by ${author}` : "Ipernity photo",
        engine: "ipernity",
        position: pos,
        publishedDate: info?.posted_at ? new Date((info.posted_at as unknown as number) * 1000).getTime() : undefined,
        category: "image",
      }),
    )
  }

  return results
}

export * as IpernityEngine from "./ipernity"
