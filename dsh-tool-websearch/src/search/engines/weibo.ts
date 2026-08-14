/**
 * 微博搜索引擎适配器
 *
 * 直接请求微博搜索，不依赖第三方搜索引擎。
 * 国内直连可达，无需代理。
 * https://s.weibo.com/weibo?q=KEYWORD
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://s.weibo.com/weibo"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeWeibo(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWeibo(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchWeibo(
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
          Referer: "https://s.weibo.com/",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseWeiboResults(html, numResults)
  })
}

export function parseWeiboResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 微博搜索结果: div.card-wrap > div.card
  const itemRegex = /<div[^>]*class="[^"]*card-wrap[^"]*"[^>]*>[\s\S]*?<p[^>]*class="[^"]*txt[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
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
      engine: "weibo", position: pos, category: "social",
    }))
  }

  return results
}

export * as Weibo from "./weibo"
