/**
 * TechCrunch 科技新闻搜索引擎适配器
 *
 * 搜索 TechCrunch 上的科技新闻。
 * API: https://techcrunch.com/wp-json/wp/v2/posts
 * 公开 WordPress REST API，无需 key
 * 参考 SearXNG: 未直接收录，但同类模式通用
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeTechCrunch(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchTechCrunch(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchTechCrunch(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `https://techcrunch.com/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=${Math.min(numResults, 20)}&_embed`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    if (!raw) return []
    return parseWpResults(raw, numResults)
  })
}

interface WpPost {
  title?: { rendered?: string }
  link?: string
  excerpt?: { rendered?: string }
  date?: string
  _embedded?: { "wp:term"?: Array<Array<{ name?: string }>> }
}

function parseWpResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(parsed)) return []
  return (parsed as WpPost[]).slice(0, max).map((p, i) => {
    const categories = p._embedded?.["wp:term"]?.[0]?.map((t) => t.name).join(", ") || ""
    return makeSearchResult({
      title: p.title?.rendered?.replace(/<[^>]*>/g, "") || "Untitled",
      url: p.link || "",
      snippet: `${p.excerpt?.rendered?.replace(/<[^>]*>/g, "").slice(0, 150) || ""} · ${categories}`,
      engine: "techcrunch",
      position: i + 1,
      category: "news",
      publishedDate: p.date ? new Date(p.date).getTime() : undefined,
    })
  })
}

export * as TechCrunchEngine from "./techcrunch"
