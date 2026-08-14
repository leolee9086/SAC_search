/**
 * Void Linux 包搜索引擎适配器
 *
 * 搜索 Void Linux 上的软件包。
 * API: https://xq-api.voidlinux.org/v1/query/x86_64?q=QUERY
 *
 * 参考 SearXNG: searx/engines/voidlinux.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://xq-api.voidlinux.org/v1/query/x86_64"
const USER_AGENT = "opencode-search/1.0"

export function makeVoidLinux(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchVoidLinux(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchVoidLinux(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({ q: query })

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

    return parseVoidLinuxResults(raw, numResults)
  })
}

interface VoidPackage {
  name?: string
  short_desc?: string
  version?: string
  revision?: string
  repository?: string
}

export function parseVoidLinuxResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { data?: VoidPackage[] }
  const packages = data?.data
  if (!Array.isArray(packages)) return []

  const results: SearchResult[] = []
  let pos = 0

  // 合并相同 URL 的包
  const packageMap = new Map<string, VoidPackage[]>()
  for (const pkg of packages) {
    if (!pkg.name) continue
    const githubSlug = pkg.name.replace(/-(32bit|dbg)$/, "")
    const url = `https://github.com/void-linux/void-packages/tree/master/srcpkgs/${githubSlug}`
    const existing = packageMap.get(url) || []
    existing.push(pkg)
    packageMap.set(url, existing)
  }

  for (const [url, pkgs] of packageMap) {
    if (results.length >= maxResults) break

    const names = pkgs.map(p => p.name).join(" | ")
    const version = pkgs[0]?.version || ""
    const revision = pkgs[0]?.revision || ""
    const description = pkgs[0]?.short_desc || ""

    pos++
    results.push(
      makeSearchResult({
        title: names,
        url,
        snippet: `${description} · v${version}_${revision}`,
        engine: "voidlinux",
        position: pos,
        category: "code",
      }),
    )
  }

  return results
}

export * as VoidLinuxEngine from "./voidlinux"
