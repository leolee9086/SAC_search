/**
 * Vimeo 视频搜索引擎适配器
 *
 * 使用 Vimeo 搜索页面 HTML 解析。
 * https://vimeo.com/search?q=KEYWORD
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://vimeo.com/search"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

export function makeVimeo(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchVimeo(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchVimeo(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT, Accept: "text/html" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []
    return parseVimeoResults(html, numResults)
  })
}

export function parseVimeoResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0
  const itemRegex = /<a[^>]*href="(\/[\d]+)"[^>]*class="[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const url = `https://vimeo.com${match[1]}`
    const title = match[2].replace(/<[^>]*>/g, "").trim()
    if (!title) continue
    pos++
    results.push(makeSearchResult({ title, url, snippet: "", engine: "vimeo", position: pos, category: "video" }))
  }
  return results
}

export * as Vimeo from "./vimeo"
