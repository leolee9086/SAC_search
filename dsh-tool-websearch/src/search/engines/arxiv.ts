/**
 * Arxiv 学术论文搜索引擎适配器
 *
 * 使用 Arxiv 公开 API (arxiv.org)
 * http://export.arxiv.org/api/query?search_query=all:KEYWORD&max_results=N
 *
 * 零风险：Arxiv API 是公开的学术服务，无速率限制要求
 * 参考 SearXNG: searx/engines/arxiv.py
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "http://export.arxiv.org/api/query"
const USER_AGENT = "opencode-search/1.0 (metasearch engine)"

export function makeArxiv(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchArxiv(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchArxiv(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search_query: `all:${query}`,
      max_results: String(Math.min(numResults, 50)),
      sortBy: "relevance",
      sortOrder: "descending",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/xml, text/xml",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseArxivResults(raw, numResults)
  })
}

/**
 * 解析 Arxiv Atom XML 响应
 *
 * 参考 SearXNG: 使用 lxml 解析 Atom feed
 * entry → { title, id, summary, published, author }
 */
export function parseArxivResults(raw: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  // 简化的 XML 正则解析（避免引入 XML 解析器依赖）
  const entryRegex = /<entry>[\s\S]*?<\/entry>/gi
  let entryMatch: RegExpExecArray | null
  let pos = 0

  while ((entryMatch = entryRegex.exec(raw)) !== null) {
    if (results.length >= maxResults) break
    const entry = entryMatch[0]

    const title = extractXmlValue(entry, "title")
    const id = extractXmlValue(entry, "id")
    const summary = extractXmlValue(entry, "summary")
    const published = extractXmlValue(entry, "published")
    const author = extractXmlValue(entry, "name")

    if (!title || !id) continue

    // Arxiv URL 格式: http://arxiv.org/abs/XXXX.XXXXX
    const url = id.replace("http://", "https://")

    pos++
    results.push(
      makeSearchResult({
        title: title.trim(),
        url,
        snippet: (author ? `${author}: ` : "") + (summary ? summary.replace(/<[^>]*>/g, "").trim().slice(0, 250) : ""),
        engine: "arxiv",
        position: pos,
        publishedDate: published ? new Date(published).getTime() : undefined,
        category: "academic",
      }),
    )
  }

  return results
}

function extractXmlValue(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return match ? match[1].trim() : undefined
}

export * as Arxiv from "./arxiv"
