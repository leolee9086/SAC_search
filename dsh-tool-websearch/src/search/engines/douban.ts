/**
 * 豆瓣搜索引擎适配器
 *
 * 直接请求豆瓣搜索，不依赖第三方搜索引擎。
 * 国内直连可达，无需代理。
 * https://www.douban.com/search?q=KEYWORD
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://www.douban.com/search"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeDouban(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchDouban(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchDouban(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Accept-Language": "zh-CN,zh;q=0.9",
          Accept: "text/html",
          Referer: "https://www.douban.com/",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseDoubanResults(html, numResults)
  })
}

/**
 * 解析豆瓣搜索结果 HTML
 *
 * 结果结构: <div class="result"> → <div class="title"> → <a>
 */
export function parseDoubanResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  const itemRegex = /<div[^>]*class="result"[^>]*>[\s\S]*?<div[^>]*class="title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    let url = match[1]
    const title = match[2].replace(/<[^>]*>/g, "").trim()
    if (!title || !url) continue
    if (url.startsWith("//")) url = `https:${url}`

    pos++
    results.push(makeSearchResult({
      title, url, snippet: "",
      engine: "douban", position: pos,
    }))
  }

  return results
}

export * as Douban from "./douban"
