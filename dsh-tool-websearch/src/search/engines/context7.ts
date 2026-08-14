/**
 * Context7 文档搜索引擎适配器
 *
 * Context7 是一个 MCP 服务，提供最新的库/框架文档和代码示例。
 * API: https://context7.com/api
 *
 * 工作流程：
 * 1. searchLibs(query, libraryName) → 解析库名称为 Context7 库 ID
 * 2. queryDocs(libraryId, query) → 获取文档内容
 *
 * 需要 CONTEXT7_API_KEY 环境变量。
 * 免费 API key 可在此获取: https://context7.com/dashboard
 */
import { Effect, Schema } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_BASE = "https://api.context7.com"
const USER_AGENT = "opencode-search/1.0"

const SearchResultSchema = Schema.Struct({
  libraryId: Schema.String,
  name: Schema.String,
  description: Schema.String,
  snippetCount: Schema.Number,
  benchmarkScore: Schema.Number,
  versions: Schema.optional(Schema.Array(Schema.String)),
})

type LibraryResult = Schema.Schema.Type<typeof SearchResultSchema>

export function makeContext7(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchContext7(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchContext7(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return (Effect.gen(function* () {
    const apiKey = process.env.CONTEXT7_API_KEY
    if (!apiKey) return [] as readonly SearchResult[]

    const libName = extractLibraryName(query)

    // 搜索库
    const searchUrl = new URL(`${API_BASE}/v2/libs/search`)
    searchUrl.searchParams.set("query", query)
    if (libName) searchUrl.searchParams.set("libraryName", libName)

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    }

    const searchResponse = yield* http.execute(
      HttpClientRequest.get(searchUrl.toString()).pipe(HttpClientRequest.setHeaders(headers)),
    ).pipe(Effect.timeout(timeout))

    if (searchResponse.status < 200 || searchResponse.status >= 400) return []
    const searchRaw: string = yield* searchResponse.text
    if (!searchRaw) return []

    const searchData = JSON.parse(searchRaw) as { results?: LibraryResult[]; error?: string }

    if (!searchData.results?.length) return []

    // Step 3: 对每个匹配的库获取文档
    const results: SearchResult[] = []
    let pos = 0

    for (const lib of searchData.results.slice(0, Math.min(numResults, 3))) {
      if (results.length >= numResults) break
      if (!lib.libraryId) continue

      const docUrl = new URL(`${API_BASE}/v2/context`)
      docUrl.searchParams.set("query", query)
      docUrl.searchParams.set("libraryId", lib.libraryId)

      const docResponse = yield* http.execute(
        HttpClientRequest.get(docUrl.toString()).pipe(HttpClientRequest.setHeaders(headers)),
      ).pipe(
        Effect.timeout(timeout),
        Effect.catch(() => Effect.succeed({ status: 0 } as any)),
      )

      if (docResponse.status >= 200 && docResponse.status < 400) {
        const docRaw: string = yield* docResponse.text
        if (docRaw) {
          const snippet = docRaw.length > 500 ? docRaw.slice(0, 500) + "..." : docRaw
          pos++
          results.push(
            makeSearchResult({
              title: `📚 ${lib.name} — ${lib.description || "Documentation"}`,
              url: `https://context7.com/library${lib.libraryId}`,
              snippet: `[Score: ${lib.benchmarkScore}/100 · ${lib.snippetCount} snippets] ${snippet}`.slice(0, 500),
              engine: "context7",
              position: pos,
              category: "general",
            }),
          )
        }
      }

      // 即使文档获取失败，也添加库信息作为结果
      if (results.length === 0) {
        pos++
        results.push(
          makeSearchResult({
            title: `📦 ${lib.name}`,
            url: `https://context7.com/library${lib.libraryId}`,
            snippet: `${lib.description || "No description"} · Score: ${lib.benchmarkScore}/100 · ${lib.snippetCount} snippets` +
              (lib.versions?.length ? ` · Versions: ${lib.versions.join(", ")}` : ""),
            engine: "context7",
            position: pos,
            category: "general",
          }),
        )
      }
    }

    return results
  }) as Effect.Effect<readonly SearchResult[], unknown, never>)
}

/**
 * 从查询中提取库名称
 *
 * 支持格式:
 * - "react docs" → "react"
 * - "how to use express middleware" → "express"
 * - "/vercel/next.js" → "/vercel/next.js"
 * - "@nestjs/cache-module" → "@nestjs/cache-module"
 */
function extractLibraryName(query: string): string | undefined {
  const trimmed = query.trim()
  if (!trimmed) return undefined

  // 精确的 library ID 格式
  const libIdMatch = trimmed.match(/^(\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)?)/)
  if (libIdMatch) return libIdMatch[1]

  // @scope/package 格式
  const scopeMatch = trimmed.match(/^(@[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/)
  if (scopeMatch) return scopeMatch[1]

  // 通用库名称（第一个单词）
  const firstWord = trimmed.split(/\s+/)[0]
  if (firstWord && firstWord.length >= 2 && !["how", "what", "why", "when", "where", "the", "a", "an", "is", "are", "do", "does", "can", "will"].includes(firstWord.toLowerCase())) {
    return firstWord
  }

  return undefined
}

export * as Context7Engine from "./context7"
