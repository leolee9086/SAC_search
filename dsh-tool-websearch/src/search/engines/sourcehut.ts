/**
 * SourceHut 项目搜索引擎适配器
 *
 * 搜索 SourceHut 上的公开项目。
 * URL: https://sr.ht/projects?search=QUERY
 *
 * 参考 SearXNG: searx/engines/sourcehut.py
 * 风险较低：公开 HTML 页面解析，需 User-Agent 绕过 bot 检测
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://sr.ht/projects"
const USER_AGENT = "opencode-search/1.0 (bot; +https://opencode.ai)"

export function makeSourceHut(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchSourceHut(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSourceHut(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      sort: "recently-updated",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseSourceHutResults(html, numResults)
  })
}

export function parseSourceHutResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配项目卡片：<div class="event-list"> 中的 <div class="event"> 元素
  // 格式：<div class="event"> <h4><a href="/~user">~user</a> <a href="/~user/proj">proj</a></h4> ...
  const eventRegex = /<div[^>]*class="[^"]*event[^"]*"[^>]*>[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?[\s\S]*?<\/div>\s*<\/div>/gi

  let match: RegExpExecArray | null
  while ((match = eventRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const headerHtml = match[1]

    // 提取用户名和项目名
    const userMatch = headerHtml.match(/<a[^>]*href="\/([^"]+)"[^>]*>[^<]*<\/a>\s*<a[^>]*href="\/(?:[^"]+)"[^>]*>([^<]+)<\/a>/)
    if (!userMatch) continue

    const username = userMatch[1].replace(/^~/, "")
    const projectName = userMatch[2].trim()
    if (!projectName) continue

    const url = `https://sr.ht/~${username}/${projectName}`
    const description = match[2] ? match[2].replace(/<[^>]+>/g, "").trim() : ""

    // 提取标签
    const tags: string[] = []
    const tagRegex = /<a[^>]*>#([^<]+)<\/a>/g
    let tagMatch: RegExpExecArray | null
    while ((tagMatch = tagRegex.exec(match[0])) !== null) {
      tags.push(tagMatch[1].trim())
    }

    pos++
    results.push(
      makeSearchResult({
        title: `~${username}/${projectName}`,
        url,
        snippet: tags.length > 0
          ? `[${tags.join(", ")}] ${description}`
          : description || `SourceHut project by ~${username}`,
        engine: "sourcehut",
        position: pos,
        category: "code",
      }),
    )
  }

  // 兜底：如果正则没有匹配到，尝试简单的项目名提取
  if (results.length === 0) {
    const fallbackRegex = /<a[^>]*href="\/(~[^"]+)"[^>]*>([^<]+)<\/a>/gi
    let fallbackMatch: RegExpExecArray | null
    while ((fallbackMatch = fallbackRegex.exec(html)) !== null) {
      if (results.length >= maxResults) break
      const href = fallbackMatch[1].trim()
      const title = fallbackMatch[2].trim()
      if (!title || href === "~" || title === "sr.ht") continue

      pos++
      results.push(
        makeSearchResult({
          title: `${href} - ${title}`,
          url: `https://sr.ht/${href}`,
          snippet: `SourceHut project`,
          engine: "sourcehut",
          position: pos,
          category: "code",
        }),
      )
    }
  }

  return results
}

export * as SourceHutEngine from "./sourcehut"
