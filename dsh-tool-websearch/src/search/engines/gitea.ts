/**
 * Gitea/Forgejo 仓库搜索引擎适配器
 *
 * 搜索 Gitea 或 Forgejo 实例上的代码仓库。
 * API: {base_url}/api/v1/repos/search?q=QUERY
 *
 * 参考 SearXNG: searx/engines/gitea.py
 * 零风险：公开 API，无需 key（受速率限制）
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const USER_AGENT = "opencode-search/1.0"

export function makeGitea(config: EngineConfig, baseUrl: string = "https://gitea.com"): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGitea(http, query, opts.numResults || config.maxResults, config.timeout, baseUrl),
  }
}

function searchGitea(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
  baseUrl: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(numResults, 50)),
      sort: "updated",
      order: "desc",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${baseUrl}/api/v1/repos/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseGiteaResults(raw, numResults, baseUrl)
  })
}

interface GiteaRepo {
  id: number
  full_name?: string
  name?: string
  description?: string
  html_url?: string
  stars_count?: number
  forks_count?: number
  language?: string
  owner?: { username?: string; avatar_url?: string }
  topics?: string[]
  updated_at?: string
  created_at?: string
}

export function parseGiteaResults(raw: string, maxResults: number, baseUrl: string): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { data?: GiteaRepo[] }
  const items = data?.data
  if (!Array.isArray(items)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of items) {
    if (results.length >= maxResults) break

    const name = item.full_name || item.name || ""
    const url = item.html_url || `${baseUrl}/${item.full_name || item.name || ""}`
    if (!name) continue

    const parts: string[] = []
    if (item.language) parts.push(item.language)
    if (item.stars_count) parts.push(`★${item.stars_count}`)
    if (item.forks_count) parts.push(`⑂${item.forks_count}`)
    if (item.topics?.length) parts.push(item.topics.slice(0, 3).join(", "))

    const repoName = item.full_name || item.name || ""
    pos++
    results.push(
      makeSearchResult({
        title: `${item.stars_count ? `★${item.stars_count} ` : ""}${repoName}`,
        url,
        snippet: parts.length > 0
          ? `[${parts.join(" · ")}] ${item.description || ""}`.trim()
          : item.description || `Gitea repository: ${repoName}`,
        engine: "gitea",
        position: pos,
        publishedDate: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
        category: "code",
      }),
    )
  }

  return results
}

export * as GiteaEngine from "./gitea"
