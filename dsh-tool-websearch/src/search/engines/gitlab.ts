/**
 * GitLab 仓库搜索引擎适配器
 *
 * 使用 GitLab REST API v4 搜索项目。
 * API: https://docs.gitlab.com/ee/api/projects.html
 *
 * 参考 SearXNG: searx/engines/gitlab.py
 * 零风险：公开 API，未认证 60次/分钟
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const USER_AGENT = "opencode-search/1.0"

export function makeGitLab(config: EngineConfig, baseUrl: string = "https://gitlab.com"): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGitLab(http, query, opts.numResults || config.maxResults, config.timeout, baseUrl),
  }
}

function searchGitLab(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
  baseUrl: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      per_page: String(Math.min(numResults, 50)),
      order_by: "stars",
      sort: "desc",
    })

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    }
    // 如果有 GITLAB_TOKEN，使用认证调用提高额度
    const token = process.env.GITLAB_TOKEN
    if (token) headers["PRIVATE-TOKEN"] = token

    const response = yield* http.execute(
      HttpClientRequest.get(`${baseUrl}/api/v4/projects?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders(headers),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseGitLabResults(raw, numResults)
  })
}

interface GitLabProject {
  id: number
  name: string
  path_with_namespace: string
  web_url: string
  description?: string
  star_count: number
  forks_count: number
  default_branch?: string
  last_activity_at?: string
  created_at?: string
  topics?: string[]
  namespace?: { name: string; full_path: string }
}

function parseGitLabResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const items = parsed as GitLabProject[]
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break

    const url = item.web_url
    const name = item.path_with_namespace || item.name
    if (!url || !name) continue

    const parts: string[] = []
    if (item.star_count) parts.push(`${item.star_count} stars`)
    if (item.forks_count) parts.push(`${item.forks_count} forks`)
    if (item.topics?.length) parts.push(item.topics.slice(0, 3).join(", "))

    const snippet = parts.length > 0
      ? `[${parts.join(" · ")}] ${item.description || ""}`.trim()
      : item.description || ""

    pos++
    results.push(
      makeSearchResult({
        title: `⭐${item.star_count || 0} ${name}`,
        url,
        snippet: snippet.slice(0, 300),
        engine: "gitlab",
        position: pos,
        publishedDate: item.last_activity_at ? new Date(item.last_activity_at).getTime() : undefined,
        category: "code",
      }),
    )
  }

  return results
}

export * as GitLabEngine from "./gitlab"
