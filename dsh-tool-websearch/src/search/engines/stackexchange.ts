/**
 * StackExchange 搜索引擎适配器
 *
 * 使用 StackExchange API 2.3
 * https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle=KEYWORD&site=stackoverflow
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.stackexchange.com/2.3/search"
const USER_AGENT = "opencode-search/1.0"

export function makeStackExchange(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchStackExchange(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchStackExchange(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      order: "desc",
      sort: "relevance",
      intitle: query,
      site: "stackoverflow",
      pagesize: String(Math.min(numResults, 20)),
      filter: "withbody",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT, Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []
    return parseStackExchangeResults(raw, numResults)
  })
}

export function parseStackExchangeResults(raw: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  let data: { items?: Array<{ title: string; link: string; score: number; answer_count: number; view_count: number; creation_date: number; tags?: string[] }> }
  try { data = JSON.parse(raw) } catch { return [] }

  const items = data?.items
  if (!items || !Array.isArray(items)) return []

  let pos = 0
  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.title || !item.link) continue

    pos++
    results.push(makeSearchResult({
      title: item.title.replace(/<[^>]*>/g, ""),
      url: item.link,
      snippet: `⭐${item.score} · 💬${item.answer_count} · 👁${item.view_count}${item.tags?.length ? " · 🏷" + item.tags.slice(0, 3).join(",") : ""}`,
      engine: "stackexchange",
      position: pos,
      publishedDate: item.creation_date ? item.creation_date * 1000 : undefined,
      category: "code",
    }))
  }
  return results
}

export * as StackExchange from "./stackexchange"
