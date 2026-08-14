/**
 * Astrophysics Data System (ADS) 学术搜索引擎适配器
 *
 * 搜索 NASA ADS 上的天体物理学论文。
 * API: https://ui.adsabs.harvard.edu/help/api/
 * 需要免费注册获取 API key
 * 参考 SearXNG: searx/engines/astrophysics_data_system.py
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeAds(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchAds(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchAds(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const key = process.env.ADS_API_KEY || ""
    const url = `https://api.adsabs.harvard.edu/v1/search/query?q=${encodeURIComponent(query)}&rows=${Math.min(numResults, 20)}&fl=title,bibcode,abstract,author,pubdate,citation_count`
    const headers: Record<string, string> = { Accept: "application/json" }
    if (key) headers["Authorization"] = `Bearer ${key}`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(HttpClientRequest.setHeaders(headers)),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseAdsResults(raw, numResults)
  })
}

interface AdsDoc {
  title?: string[]
  bibcode?: string
  abstract?: string
  author?: string[]
  pubdate?: string
  citation_count?: number
}

function parseAdsResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as { response?: { docs?: AdsDoc[] } }
  if (!data?.response?.docs) return []
  return data.response.docs.slice(0, max).map((d, i) => {
    const authors = (d.author || []).slice(0, 3).join(", ") + (d.author && d.author.length > 3 ? " et al." : "")
    return makeSearchResult({
      title: (d.title || ["Untitled"])[0],
      url: `https://ui.adsabs.harvard.edu/abs/${d.bibcode || ""}/abstract`,
      snippet: `${authors} · ${d.pubdate || ""} · ${d.citation_count || 0} citations`,
      engine: "ads",
      position: i + 1,
      category: "academic",
      publishedDate: d.pubdate ? new Date(d.pubdate).getTime() : undefined,
    })
  })
}

export * as AdsEngine from "./ads"
