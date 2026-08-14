/**
 * Lemmy 社交搜索引擎适配器
 *
 * 搜索 Lemmy 上的社区、用户、帖子和评论。
 * API: https://lemmy.ml/api/v3/search
 *
 * 参考 SearXNG: searx/engines/lemmy.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://lemmy.ml/api/v3/search"
const USER_AGENT = "opencode-search/1.0"

export function makeLemmy(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchLemmy(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchLemmy(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      type_: "Posts",
      limit: String(Math.min(numResults, 50)),
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

    return parseLemmyResults(raw, numResults)
  })
}

interface LemmyPost {
  post?: {
    ap_id?: string
    name?: string
    body?: string
    published?: string
    thumbnail_url?: string
  }
  creator?: {
    name?: string
    display_name?: string
  }
  community?: {
    title?: string
  }
  counts?: {
    upvotes?: number
    downvotes?: number
    comments?: number
  }
}

export function parseLemmyResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { posts?: LemmyPost[] }
  const posts = data?.posts
  if (!Array.isArray(posts)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of posts) {
    if (results.length >= maxResults) break
    if (!item.post?.ap_id || !item.post?.name) continue

    const author = item.creator?.display_name || item.creator?.name || ""
    const community = item.community?.title || ""
    const upvotes = item.counts?.upvotes || 0
    const downvotes = item.counts?.downvotes || 0
    const comments = item.counts?.comments || 0

    const parts: string[] = []
    if (author) parts.push(`by ${author}`)
    if (community) parts.push(community)
    parts.push(`▲${upvotes} ▼${downvotes}`)
    if (comments > 0) parts.push(`${comments} comments`)

    pos++
    results.push(
      makeSearchResult({
        title: item.post.name,
        url: item.post.ap_id,
        snippet: parts.join(" · "),
        engine: "lemmy",
        position: pos,
        publishedDate: item.post.published ? new Date(item.post.published).getTime() : undefined,
        category: "social",
      }),
    )
  }

  return results
}

export * as LemmyEngine from "./lemmy"
