/**
 * Naver 搜索引擎适配器
 *
 * 参考 SearXNG 的 naver.py (6.2KB)
 * 解析 search.naver.com 的 HTML 搜索结果
 * https://search.naver.com/search.naver?where=web&query=KEYWORD
 *
 * 支持：通用网页搜索
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://search.naver.com/search.naver"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeNaver(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchNaver(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchNaver(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      where: "web",
      query,
      start: "1",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseNaverResults(html, numResults)
  })
}

/**
 * 解析 Naver 搜索结果 HTML
 *
 * 参考 SearXNG:
 * - ul.lst_total > li.bx > a.link_tit = 标题+URL
 * - div.total_dsc_wrap > a.api_txt_lines = 摘要
 */
export function parseNaverResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 li.bx 条目
  const itemRegex = /<li[^>]*class="[^"]*bx[^"]*"[^>]*>[\s\S]*?<\/li>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const block = match[0]

    // 标题 + URL
    const titleMatch = block.match(/<a[^>]*class="[^"]*link_tit[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue
    const url = titleMatch[1]
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim()
    if (!title || !url) continue

    // 摘要
    let snippet = ""
    const snipMatch = block.match(/<a[^>]*class="[^"]*api_txt_lines[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
    if (snipMatch) snippet = snipMatch[1].replace(/<[^>]*>/g, "").trim()

    pos++
    results.push(makeSearchResult({
      title, url,
      snippet: snippet.slice(0, 300),
      engine: "naver", position: pos,
    }))
  }

  return results
}

export * as Naver from "./naver"
