/**
 * Zenodo 学术开放数据搜索引擎适配器
 *
 * 搜索 Zenodo 上的研究数据和论文。
 * API: https://developers.zenodo.org/
 * 公开 API，无需 key
 * 参考 SearXNG: 未直接收录，CORE 模式参考
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeZenodo(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchZenodo(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchZenodo(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `https://zenodo.org/api/records?q=${encodeURIComponent(query)}&size=${Math.min(numResults, 20)}&sort=bestmatch`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseZenodoResults(raw, numResults)
  })
}

interface ZenodoHit {
  id?: number
  title?: string
  links?: { self_html?: string; doi?: string }
  metadata?: {
    title?: string
    description?: string
    publication_date?: string
    creators?: Array<{ name?: string }>
  }
}

function parseZenodoResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as { hits?: { hits?: ZenodoHit[] } }
  const hits = data?.hits?.hits
  if (!Array.isArray(hits)) return []
  return hits.slice(0, max).map((h, i) => {
    const title = h.metadata?.title || h.title || `ID ${h.id}`
    const creators = h.metadata?.creators?.map((c) => c.name).join(", ") || ""
    return makeSearchResult({
      title,
      url: h.links?.doi || h.links?.self_html || "",
      snippet: `${creators} · ${h.metadata?.description?.slice(0, 120) || ""}`,
      engine: "zenodo",
      position: i + 1,
      category: "academic",
      publishedDate: h.metadata?.publication_date ? new Date(h.metadata.publication_date).getTime() : undefined,
    })
  })
}

export * as ZenodoEngine from "./zenodo"
