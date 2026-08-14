/**
 * GitHub Code Search 搜索引擎适配器
 *
 * 搜索 GitHub 仓库内的源代码。
 * 端点: GET /search/code?q=QUERY+repo:owner/name
 *
 * 参考 opencode 内置的 github-code-search 工具实现。
 * 与 github.ts（仓库搜索）不同，此引擎搜索代码片段而非仓库。
 *
 * 特点：
 * - 可指定 repo:owner/name 限定仓库
 * - 支持 path:、language: 等 qualifier
 * - 支持 GITHUB_TOKEN 环境变量提高额度
 * - 返回代码片段和上下文行
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_BASE = "https://api.github.com"
const USER_AGENT = "opencode-search/1.0"

export function makeGitHubCode(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGitHubCode(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGitHubCode(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 50)),
      sort: "indexed",
      order: "desc",
    })

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github.v3.text-match+json",
    }
    const token = process.env.GITHUB_TOKEN
    if (token) headers["Authorization"] = `Bearer ${token}`

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_BASE}/search/code?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders(headers),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseGitHubCodeResults(raw, numResults)
  })
}

interface GitHubCodeItem {
  name?: string
  path?: string
  html_url?: string
  repository?: {
    full_name?: string
    html_url?: string
  }
  text_matches?: Array<{
    fragment?: string
    object_url?: string
  }>
  language?: string
}

interface GitHubCodeResponse {
  total_count?: number
  items?: GitHubCodeItem[]
}

export function parseGitHubCodeResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: GitHubCodeResponse
  try { parsed = JSON.parse(raw) as GitHubCodeResponse } catch { return [] }

  const items = parsed?.items
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break

    const repoName = item.repository?.full_name || ""
    const filePath = item.path || ""
    const fileUrl = item.html_url || ""
    const lang = item.language || ""
    const repoUrl = item.repository?.html_url || ""

    if (!repoName || !filePath) continue

    // 提取代码片段（text_matches 提供上下文行）
    const fragments = item.text_matches
      ?.map((m) => m.fragment || "")
      .filter(Boolean) ?? []
    const snippet = fragments.length > 0
      ? fragments.join("\n...\n").slice(0, 400)
      : `File in ${repoName}`

    const title = `${repoName}: ${filePath}`
    const url = fileUrl

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: lang ? `[${lang}] ${snippet}` : snippet,
        engine: "github-code",
        position: pos,
        category: "code",
      }),
    )
  }

  return results
}

export * as GitHubCodeEngine from "./github-code"
