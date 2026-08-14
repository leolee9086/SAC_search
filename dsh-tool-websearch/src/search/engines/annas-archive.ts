/**
 * Anna's Archive 图书搜索引擎适配器（多镜像站版）
 *
 * 顺序尝试多个 Anna's Archive 镜像站，使用最先返回的有效结果。
 *
 * 参考 SearXNG: searx/engines/annas_archive.py
 * 镜像来自 SearXNG base_url 配置
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

/** Anna's Archive 镜像站列表（来自 SearXNG base_url） */
const MIRRORS = [
  "https://annas-archive.gl",
  "https://annas-archive.vg",
  "https://annas-archive.pk",
  "https://annas-archive.gd",
] as const

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeAnnasArchive(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchAnnasArchive(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchAnnasArchive(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  const searchLoop = (idx: number): Effect.Effect<readonly SearchResult[], unknown, never> =>
    Effect.gen(function* () {
      if (idx >= MIRRORS.length) return []
      const results = yield* tryMirror(http, MIRRORS[idx], query, numResults, timeout).pipe(
        Effect.catchIf(() => true, () => Effect.succeed([] as readonly SearchResult[])),
      )
      if (results.length > 0) return results
      return yield* searchLoop(idx + 1)
    })
  return searchLoop(0)
}

function tryMirror(
  http: HttpClient.HttpClient,
  baseUrl: string,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query, page: "1" })
    const response = yield* http.execute(
      HttpClientRequest.get(`${baseUrl}/search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT, Accept: "text/html" }),
      ),
    ).pipe(Effect.timeout(timeout * 0.8))

    if (response.status < 200 || response.status >= 400) return []
    const html = yield* response.text.pipe(Effect.catchIf(() => true, () => Effect.succeed("")))
    if (!html) return []

    return parseAnnasArchiveResults(html, numResults, baseUrl)
  })
}

function parseAnnasArchiveResults(html: string, maxResults: number, baseUrl: string): readonly SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  const itemRegex = /<div[^>]*class="[^"]*flex[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<a[^>]*class="[^"]*js-vim-focus[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<div[^>]*class="[^"]*line-clamp[^"]*"[^>]*>([\s\S]*?)<\/div>)?[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi

  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let href = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const content = match[3] ? match[3].replace(/<[^>]+>/g, "").trim() : ""

    if (!title || !href) continue
    if (href.startsWith("/")) href = `${baseUrl}${href}`

    pos++
    results.push(makeSearchResult({
      title,
      url: href,
      snippet: content || "Anna's Archive book",
      engine: "annas-archive",
      position: pos,
      category: "general",
    }))
  }

  return results
}

export * as AnnasArchiveEngine from "./annas-archive"
