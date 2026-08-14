/**
 * Ars Technica 科技新闻搜索引擎适配器
 *
 * 通过 DDG site:arstechnica.com 搜索。
 * 参考 SearXNG: 站点限定搜索模式
 * 零风险：不直接请求目标站点
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult, parseRelativeDate } from "../engine"

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

export function makeArsTechnica(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchArs(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchArs(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:arstechnica.com ${query}`)}`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT, Accept: "text/html" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const html = yield* response.text
    return parseDdgResults(html, numResults)
  })
}

function parseDdgResults(html: string, max: number): SearchResult[] {
  const results: SearchResult[] = []
  const resultRe = /class="result__body"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*class="result__a"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)</gi
  let match: RegExpExecArray | null
  let pos = 0
  while ((match = resultRe.exec(html)) !== null && results.length < max) {
    pos++
    results.push(makeSearchResult({
      title: match[2].trim(),
      url: match[1],
      snippet: match[3].trim() || "Ars Technica",
      engine: "arstechnica",
      position: pos,
      category: "news",
    }))
  }
  return results
}

export * as ArsTechnicaEngine from "./arstechnica"
