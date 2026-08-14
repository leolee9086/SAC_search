/**
 * Alpine Linux 包搜索引擎适配器
 *
 * 搜索 Alpine Linux 上的软件包。
 * URL: https://pkgs.alpinelinux.org/packages?name=QUERY
 *
 * 参考 SearXNG: searx/engines/alpinelinux.py
 * 风险较低：公开 HTML 页面解析
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://pkgs.alpinelinux.org"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export function makeAlpineLinux(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchAlpineLinux(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchAlpineLinux(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      name: `*${query}*`,
      arch: "x86_64",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/packages?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseAlpineLinuxResults(html, numResults)
  })
}

export function parseAlpineLinuxResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 匹配表格行
  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*class="[^"]*package[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/td>[\s\S]*?<td[^>]*class="[^"]*version[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi

  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const href = match[1].trim()
    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const version = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !href) continue

    const url = href.startsWith("http") ? href : `${BASE_URL}${href}`

    pos++
    results.push(
      makeSearchResult({
        title: `${title} v${version}`,
        url,
        snippet: `Alpine Linux package · v${version}`,
        engine: "alpinelinux",
        position: pos,
        category: "code",
      }),
    )
  }

  return results
}

export * as AlpineLinuxEngine from "./alpinelinux"
