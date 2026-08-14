/**
 * Discourse 论坛搜索引擎适配器
 *
 * 搜索 Discourse 论坛上的帖子。
 * API: {base_url}/search.json?q=QUERY
 *
 * 参考 SearXNG: searx/engines/discourse.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const USER_AGENT = "opencode-search/1.0"

export function makeDiscourse(config: EngineConfig, baseUrl: string = "https://meta.discourse.org"): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDiscourse(http, query, opts.numResults || config.maxResults, config.timeout, baseUrl),
  }
}

function searchDiscourse(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
  baseUrl: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: `${query} order:latest`,
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${baseUrl}/search.json?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseDiscourseResults(raw, numResults, baseUrl)
  })
}

interface DiscoursePost {
  id?: number
  topic_id?: number
  username?: string
  blurb?: string
  avatar_template?: string
}

interface DiscourseTopic {
  id?: number
  title?: string
  posts_count?: number
  created_at?: string
  closed?: boolean
  has_accepted_answer?: boolean
}

export function parseDiscourseResults(raw: string, maxResults: number, baseUrl: string): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { topics?: DiscourseTopic[]; posts?: DiscoursePost[] }
  const posts = data?.posts
  const topics = data?.topics
  if (!Array.isArray(posts)) return []

  // 创建 topic 映射
  const topicMap = new Map<number, DiscourseTopic>()
  if (Array.isArray(topics)) {
    for (const topic of topics) {
      if (topic.id) topicMap.set(topic.id, topic)
    }
  }

  const results: SearchResult[] = []
  let pos = 0

  for (const post of posts) {
    if (results.length >= maxResults) break
    if (!post.id || !post.topic_id) continue

    const topic = topicMap.get(post.topic_id)
    const title = topic?.title || `Post #${post.id}`
    const url = `${baseUrl}/p/${post.id}`
    const author = post.username || ""
    const comments = topic?.posts_count || 0
    const status = topic?.closed ? "closed" : "open"

    const parts: string[] = []
    if (author) parts.push(`@${author}`)
    if (comments > 1) parts.push(`${comments} comments`)
    if (topic?.has_accepted_answer) parts.push("answered")
    else if (comments > 1) parts.push(status)

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: post.blurb || parts.join(" · ") || "Discourse post",
        engine: "discourse",
        position: pos,
        publishedDate: topic?.created_at ? new Date(topic.created_at).getTime() : undefined,
        category: "social",
      }),
    )
  }

  return results
}

export * as DiscourseEngine from "./discourse"
