/**
 * 拼多多 (Pinduoduo) / 多多买菜 商品搜索引擎适配器
 *
 * 搜索拼多多上的商品信息。
 *
 * 采用 DuckDuckGo site: 语法查询，降低反爬风险。
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
const DDG_HTML_URL = "https://html.duckduckgo.com/html/"

export function makePdd(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchPdd(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchPdd(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const scopedQuery = `site:pinduoduo.com OR site:yangkeduo.com ${query} 价格`
    const formData = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" })

    const response = yield* http.execute(
      HttpClientRequest.post(DDG_HTML_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }),
        HttpClientRequest.bodyText(formData.toString()),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (html.includes('id="challenge-form"')) return []

    return parsePddResults(html, numResults)
  })
}

function parsePddResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let url = match[1].trim()
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/)
    if (uddgMatch) {
      try { url = decodeURIComponent(uddgMatch[1]) } catch { }
    }

    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue
    if (!url.includes("pinduoduo.com") && !url.includes("yangkeduo.com")) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet ? `${snippet} · 拼多多` : "拼多多",
        engine: "pdd",
        position: pos,
        category: "shopping",
      }),
    )
  }

  return results
}

export * as PddEngine from "./pdd"
