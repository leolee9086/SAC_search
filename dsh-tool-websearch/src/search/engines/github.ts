/**
 * GitHub 仓库搜索引擎适配器
 *
 * 使用 GitHub REST API
 * https://api.github.com/search/repositories?q=KEYWORD&per_page=N
 *
 * 零风险：公开 API，未认证 60次/小时，认证后 5000次/小时
 * 参考 SearXNG: searx/engines/github.py
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://api.github.com/search/repositories"
const USER_AGENT = "opencode-search/1.0"

export function makeGitHub(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchGitHub(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchGitHub(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      per_page: String(Math.min(numResults, 50)),
      sort: "stars",
      order: "desc",
    })

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github.v3+json",
    }
    // 如果有 GITHUB_TOKEN，使用认证调用提高额度
    const token = process.env.GITHUB_TOKEN
    if (token) headers["Authorization"] = `Bearer ${token}`

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders(headers),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseGitHubResults(raw, numResults)
  })
}

export function parseGitHubResults(raw: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  let parsed: { items?: Array<{
    full_name?: string
    html_url?: string
    description?: string
    stargazers_count?: number
    language?: string
    updated_at?: string
  }> }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const items = parsed?.items
  if (!items || !Array.isArray(items)) return []

  let pos = 0
  for (const item of items) {
    if (results.length >= maxResults) break

    const name = item.full_name
    const url = item.html_url
    const desc = item.description?.trim() || ""
    const stars = item.stargazers_count ?? 0
    const lang = item.language || ""
    const updated = item.updated_at

    if (!name || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title: `${name} ⭐${stars}`,
        url,
        snippet: lang ? `[${lang}] ${desc.slice(0, 250)}` : desc.slice(0, 250),
        engine: "github",
        position: pos,
        publishedDate: updated ? new Date(updated).getTime() : undefined,
        category: "code",
      }),
    )
  }

  return results
}

export * as GitHubEngine from "./github"
