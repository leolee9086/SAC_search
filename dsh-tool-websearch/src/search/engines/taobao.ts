/**
 * 淘宝 (Taobao.com) / 天猫 (Tmall.com) 商品搜索引擎适配器
 *
 * 搜索淘宝和天猫上的商品信息。
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

export function makeTaobao(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchTaobao(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchTaobao(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 同时搜索淘宝和天猫
    const queries = [
      `site:taobao.com ${query} 价格`,
      `site:tmall.com ${query} 价格`,
    ]

    const allResults: SearchResult[] = []
    const seenUrls = new Set<string>()

    for (const scopedQuery of queries) {
      const formData = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" })

      // 执行搜索，超时/网络错误时返回空 HTML
      const html = yield* fetchDdgHtml(http, formData, timeout).pipe(
        Effect.catchIf(() => true, () => Effect.succeed("")),
      )
      if (!html || html.includes('id="challenge-form"')) continue

      const parsed = parseTaobaoResults(html, Math.ceil(numResults / 2))
      for (const r of parsed) {
        if (!seenUrls.has(r.url) && allResults.length < numResults) {
          seenUrls.add(r.url)
          allResults.push(r)
        }
      }
    }

    return allResults.slice(0, numResults)
  })
}

/** 执行一次 DDG HTML 搜索，返回 HTML 文本 */
function fetchDdgHtml(
  http: HttpClient.HttpClient,
  formData: URLSearchParams,
  timeout: number,
): Effect.Effect<string, unknown, never> {
  return Effect.gen(function* () {
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

    if (response.status < 200 || response.status >= 400) return ""
    return yield* response.text
  })
}

function parseTaobaoResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配 DDG 结果条目中的淘宝/天猫链接
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
    if (!url.includes("taobao.com") && !url.includes("tmall.com") && !url.includes("taobao.")) continue

    pos++
    const engine = url.includes("tmall.com") ? "tmall" : "taobao"
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet ? `${snippet} · ${engine === "tmall" ? "天猫" : "淘宝"}` : engine === "tmall" ? "天猫" : "淘宝",
        engine,
        position: pos,
        category: "shopping",
      }),
    )
  }

  return results
}

export * as TaobaoEngine from "./taobao"
