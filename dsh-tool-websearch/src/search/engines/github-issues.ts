/**
 * GitHub Issues/PR 搜索引擎适配器
 *
 * 搜索 GitHub 上的 Issues 和 Pull Requests。
 * 端点: GET /search/issues?q=QUERY
 *
 * 与 github.ts（仓库搜索）和 github-code.ts（代码搜索）互补。
 * 此引擎搜索 issues、PRs、discussions。
 *
 * 特点：
 * - 可指定 repo:owner/name、is:issue、is:pr、state:open 等 qualifier
 * - 返回标题、状态、标签、评论数等
 * - 支持 GITHUB_TOKEN 提高 API 额度
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_BASE = "https://api.github.com"
const USER_AGENT = "opencode-search/1.0"

export function makeGitHubIssues(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGitHubIssues(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGitHubIssues(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 50)),
      sort: "relevance",
      order: "desc",
    })

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github.v3+json",
    }
    const token = process.env.GITHUB_TOKEN
    if (token) headers["Authorization"] = `Bearer ${token}`

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_BASE}/search/issues?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders(headers),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseGitHubIssuesResults(raw, numResults)
  })
}

interface GitHubIssueItem {
  title?: string
  html_url?: string
  state?: string
  pull_request?: unknown
  labels?: Array<{ name?: string; color?: string }>
  comments?: number
  created_at?: string
  updated_at?: string
  user?: { login?: string }
  repository_url?: string
  body?: string
  score?: number
}

interface GitHubIssuesResponse {
  total_count?: number
  items?: GitHubIssueItem[]
}

export function parseGitHubIssuesResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: GitHubIssuesResponse
  try { parsed = JSON.parse(raw) as GitHubIssuesResponse } catch { return [] }

  const items = parsed?.items
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item.title || !item.html_url) continue

    const isPR = !!item.pull_request
    const type = isPR ? "PR" : "Issue"
    const state = item.state === "open" ? "🟢" : "🔴"
    const labels = item.labels?.map((l) => l.name).filter(Boolean).join(", ") || ""
    const author = item.user?.login || ""
    const repoName = item.repository_url?.split("/").slice(-2).join("/") || ""
    const comments = item.comments ?? 0
    const bodyPreview = item.body
      ? item.body.replace(/<[^>]*>/g, "").slice(0, 150).trim()
      : ""

    const parts: string[] = [
      state,
      type,
      repoName ? `in ${repoName}` : "",
      author ? `by @${author}` : "",
      labels ? `[${labels}]` : "",
      `${comments} comments`,
    ].filter(Boolean)

    pos++
    results.push(
      makeSearchResult({
        title: `${isPR ? "🔀" : "❓"} ${item.title}`,
        url: item.html_url,
        snippet: parts.join(" · ") + (bodyPreview ? `\n${bodyPreview}` : ""),
        engine: "github-issues",
        position: pos,
        publishedDate: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
        category: "code",
      }),
    )
  }

  return results
}

export * as GitHubIssuesEngine from "./github-issues"
