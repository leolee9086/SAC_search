/**
 * Mastodon 社交搜索引擎适配器
 *
 * 搜索 Mastodon 上的用户。
 * API: https://mastodon.social/api/v2/search?q=QUERY&type=accounts
 *
 * 参考 SearXNG: searx/engines/mastodon.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://mastodon.social/api/v2/search"
const USER_AGENT = "opencode-search/1.0"

export function makeMastodon(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMastodon(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMastodon(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      resolve: "false",
      type: "accounts",
      limit: String(Math.min(numResults, 40)),
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseMastodonResults(raw, numResults)
  })
}

interface MastodonAccount {
  uri?: string
  username?: string
  display_name?: string
  followers_count?: number
  note?: string
  avatar?: string
  created_at?: string
}

function parseMastodonResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { accounts?: MastodonAccount[] }
  const accounts = data?.accounts
  if (!Array.isArray(accounts)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const account of accounts) {
    if (results.length >= maxResults) break
    if (!account.uri || !account.username) continue

    const displayName = account.display_name || account.username
    const followers = account.followers_count || 0

    pos++
    results.push(
      makeSearchResult({
        title: `${displayName} (${followers} followers)`,
        url: account.uri,
        snippet: account.note?.replace(/<[^>]+>/g, "").trim() || "Mastodon account",
        engine: "mastodon",
        position: pos,
        publishedDate: account.created_at ? new Date(account.created_at).getTime() : undefined,
        category: "social",
      }),
    )
  }

  return results
}

export * as MastodonEngine from "./mastodon"
