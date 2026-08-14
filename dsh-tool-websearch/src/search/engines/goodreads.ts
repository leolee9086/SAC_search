/**
 * Goodreads 图书搜索引擎适配器
 *
 * 搜索 Goodreads 上的书籍。
 * 使用 HTML 页面解析（Goodreads 无公开 API）。
 * URL: https://www.goodreads.com/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/goodreads.py
 * 风险较低：Goodreads 页面相对宽松
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://www.goodreads.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeGoodreads(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGoodreads(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGoodreads(
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

    return parseGoodreadsResults(html, numResults)
  })
}

function parseGoodreadsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配书籍行: 包含 bookTitle 链接和 authorName
  // Goodreads 搜索结果使用 <tr> 行布局
  const rowRegex = /<tr[^>]*>[\s\S]*?<a[^>]*class="[^"]*bookTitle[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*authorName[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/tr>/gi

  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let bookUrl = match[1].trim()
    const titleRaw = match[2].replace(/<[^>]+>/g, "").trim()
    const author = match[3].replace(/<[^>]+>/g, "").trim()

    if (!titleRaw) continue

    // 确保 URL 是完整 URL
    if (bookUrl.startsWith("/")) bookUrl = `${BASE_URL}${bookUrl}`

    // 提取图片缩略图
    const thumbMatch = match[0].match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*bookCover[^"]*"/i)
    const thumbnail = thumbMatch?.[1]

    pos++
    results.push(
      makeSearchResult({
        title: titleRaw,
        url: bookUrl,
        snippet: author ? `by ${author}` : "",
        engine: "goodreads",
        position: pos,
        category: "books",
      }),
    )
  }

  // 备用模式: 匹配更宽松的 bookTitle 链接
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*class="[^"]*bookTitle[^"]*"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break

      let bookUrl = match[1].trim()
      const title = match[2].trim()

      if (!title) continue
      if (bookUrl.startsWith("/")) bookUrl = `${BASE_URL}${bookUrl}`

      pos++
      results.push(
        makeSearchResult({
          title,
          url: bookUrl,
          snippet: "Goodreads",
          engine: "goodreads",
          position: pos,
          category: "books",
        }),
      )
    }
  }

  return results
}

export * as GoodreadsEngine from "./goodreads"
