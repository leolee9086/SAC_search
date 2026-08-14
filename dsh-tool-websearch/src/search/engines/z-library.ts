/**
 * Z-Library 书籍搜索引擎适配器（多镜像站版）
 *
 * 顺序尝试多个 Z-Library 镜像站，第一个返回有效结果的即止。
 * Z-Library 域名经常被封锁，通过多镜像提高可用性。
 *
 * 参考 SearXNG: searx/engines/zlibrary.py
 * 镜像来源：https://github.com/z-libraryopp/z-libraryopp.github.io
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

/** Z-Library 镜像站列表（API 优先，按可靠性排序） */
const MIRRORS = [
  { name: "z-lib.gs", url: "https://api.z-lib.gs" },
  { name: "z-lib.su", url: "https://z-lib.su" },
  { name: "z-library-is", url: "https://z-library.is" },
  { name: "z-library-sk", url: "https://z-library.sk" },
  { name: "z-lib-gd", url: "https://zh.z-lib.gd" },
  { name: "zh-z-library-sk", url: "https://zh.z-library.sk" },
] as const

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

export function makeZLibrary(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchZLibrary(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchZLibrary(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  const searchLoop = (idx: number): Effect.Effect<readonly SearchResult[], unknown, never> =>
    Effect.gen(function* () {
      if (idx >= MIRRORS.length) return []
      const mirror = MIRRORS[idx]
      const results = yield* tryMirror(http, mirror, query, numResults, timeout).pipe(
        Effect.catchIf(() => true, () => Effect.succeed([] as readonly SearchResult[])),
      )
      if (results.length > 0) return results
      return yield* searchLoop(idx + 1)
    })
  return searchLoop(0)
}

function tryMirror(
  http: HttpClient.HttpClient,
  mirror: typeof MIRRORS[number],
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `${mirror.url}/search?q=${encodeURIComponent(query)}&limit=${numResults}`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT, Accept: "application/json, text/html" }),
      ),
    ).pipe(Effect.timeout(timeout * 0.8))

    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text.pipe(Effect.catchIf(() => true, () => Effect.succeed("")))
    if (!raw) return []

    // 先尝试 JSON 解析
    const json = parseZLibJson(raw, numResults, mirror.name)
    if (json.length > 0) return json

    // 失败则尝试 HTML 解析
    return parseZLibHtml(raw, numResults)
  })
}

function parseZLibJson(raw: string, max: number, _source: string): readonly SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as Record<string, unknown>
  const books = (data.books as Array<Record<string, unknown>> | undefined)
    || (data.items as Array<Record<string, unknown>> | undefined)
    || (data.data as Array<Record<string, unknown>> | undefined)
    || []
  if (!Array.isArray(books)) return []
  return books.slice(0, max).map((b, i) =>
    makeSearchResult({
      title: (b.title as string) || "Untitled",
      url: (b.url as string) || "",
      snippet: `${(b.author as string) || ""} · ${(b.year as string || "")} — ${((b.description as string) || "").slice(0, 100)}`.trim(),
      engine: "z-library", position: i + 1, category: "book",
    }))
}

function parseZLibHtml(html: string, max: number): readonly SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0
  const itemRe = /<a[^>]*href="(\/[^"]+)"[^>]*>([^<]+)<\/a>/gi
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = itemRe.exec(html)) !== null && results.length < max) {
    const path = match[1]
    const title = match[2].replace(/<[^>]*>/g, "").trim()
    if (!title || title.length < 3 || seen.has(path) || !path.includes("/book")) continue
    seen.add(path)
    pos++
    results.push(makeSearchResult({
      title,
      url: `https://singlelogin.re${path}`,
      snippet: "Z-Library book",
      engine: "z-library", position: pos, category: "book",
    }))
  }
  return results
}

export * as ZLibraryEngine from "./z-library"
