/**
 * NVD 国家漏洞数据库搜索引擎适配器
 *
 * 搜索 National Vulnerability Database 中的 CVE 漏洞信息。
 * API: https://nvd.nist.gov/extensions/nudp/services/json/nvd/cve/search/results
 *
 * 参考 SearXNG: searx/engines/nvd.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://nvd.nist.gov/extensions/nudp/services/json/nvd/cve/search/results"
const USER_AGENT = "opencode-search/1.0"

export function makeNvd(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchNvd(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchNvd(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      resultType: "records",
      keyword: query,
      rowCount: String(Math.min(numResults, 20)),
      offset: "0",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          Referer: "https://nvd.nist.gov/vuln/search",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseNvdResults(raw, numResults)
  })
}

interface NvdCveItem {
  cve?: {
    id?: string
    descriptions?: Array<{ value?: string }>
    published?: string
    metrics?: {
      cvssMetricV31?: Array<{
        cvssData?: { baseSeverity?: string; baseScore?: number }
      }>
    }
  }
}

export function parseNvdResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { response?: Array<{ grid?: { vulnerabilities?: NvdCveItem[] } }> }
  const vulns = data?.response?.[0]?.grid?.vulnerabilities
  if (!Array.isArray(vulns)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const item of vulns) {
    if (results.length >= maxResults) break
    const cve = item?.cve
    if (!cve?.id) continue

    const cveId = cve.id
    const description = cve.descriptions?.[0]?.value || ""
    const published = cve.published ? new Date(cve.published).getTime() : undefined

    const cvss = cve.metrics?.cvssMetricV31?.[0]?.cvssData
    const severity = cvss?.baseSeverity || ""
    const score = cvss?.baseScore
    const meta = score ? `CVSS ${score} ${severity}` : severity

    pos++
    results.push(
      makeSearchResult({
        title: cveId,
        url: `https://nvd.nist.gov/vuln/detail/${cveId}`,
        snippet: [meta, description].filter(Boolean).join(" — ").slice(0, 300),
        engine: "nvd",
        position: pos,
        publishedDate: published,
        category: "general",
      }),
    )
  }

  return results
}

export * as NvdEngine from "./nvd"
