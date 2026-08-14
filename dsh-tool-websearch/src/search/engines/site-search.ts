/**
 * 站点限定搜索工具
 *
 * 为购物搜索引擎提供带双策略回退的 DDG site: 搜索：
 * 1. 主策略: `site:domain.com {query} 价格`（精确站点限定）
 * 2. 回退策略: `{query} site:domain.com`（不同词序避免缓存封禁）
 * 3. 备用回退: `{query}` 无站点限定 + 域名后过滤（DDG 完全不配合时）
 *
 * 减少每个购物引擎单独实现 DDG 搜索的重复代码。
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
const DDG_HTML_URL = "https://html.duckduckgo.com/html/"

// ── DDG site: 搜索（主策略）────────────────────────────

/**
 * 通过 DuckDuckGo site: 语法搜索指定域名
 */
export function searchSiteViaDdg(
  http: HttpClient.HttpClient,
  domain: string,
  query: string,
  suffix: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const scopedQuery = `site:${domain} ${query} ${suffix}`
    const formData = new URLSearchParams({ q: scopedQuery, b: "", kl: "wt-wt" })

    const response = yield* http.execute(
      HttpClientRequest.post(DDG_HTML_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }),
        HttpClientRequest.bodyText(formData.toString()),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (html.includes('id="challenge-form"')) return []

    return parseDdgSiteResults(html, numResults, domain)
  })
}

// ── DDG 通用搜索 + 域名后过滤（回退策略）────────────────

/**
 * 通过 DuckDuckGo 通用搜索 + 结果后过滤域名
 * 当 site: 语法被封时作为备用方案
 */
export function searchSiteViaDdgGeneric(
  http: HttpClient.HttpClient,
  domain: string,
  query: string,
  suffix: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const genericQuery = `${query} ${suffix}`
    const formData = new URLSearchParams({ q: genericQuery, b: "", kl: "cn-zh" })

    const response = yield* http.execute(
      HttpClientRequest.post(DDG_HTML_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }),
        HttpClientRequest.bodyText(formData.toString()),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (html.includes('id="challenge-form"')) return []

    return parseDdgSiteResults(html, numResults, domain)
  })
}

// ── 带回退的双策略搜索 ─────────────────────────────────

/**
 * 带双策略回退的站点限定搜索
 *
 * 执行顺序：
 * 1. `site:domain query 价格`（主策略）
 * 2. 结果不足时 → `query site:domain`（不同词序重试）
 * 3. 仍不足时 → `query 价格` + 后过滤（完全备用）
 */
export function searchSiteWithFallback(
  http: HttpClient.HttpClient,
  domain: string,
  query: string,
  suffix: string,
  numResults: number,
  timeout: number,
  engine: string,
  label: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 策略 1: site:domain query 后缀（精确站点限定）
    const primary = yield* searchSiteViaDdg(http, domain, query, suffix, numResults, timeout)
    if (primary.length >= numResults) {
      return [...primary].map(labelResult(engine, label))
    }

    // 合并已获取的结果
    const combined = [...primary]
    const seen = new Set(combined.map((r) => r.url))

    // 策略 2: 不同词序 site: 查询
    const altResults = yield* searchAltSiteOrder(http, domain, query, suffix, numResults, timeout)

    for (const r of altResults) {
      if (!seen.has(r.url) && combined.length < numResults) {
        seen.add(r.url)
        combined.push(r)
      }
    }
    if (combined.length >= numResults) {
      return combined.map(labelResult(engine, label))
    }

    // 策略 3: 通用搜索 + 后过滤
    const genericResults = yield* searchSiteViaDdgGeneric(
      http, domain, query, suffix, numResults, timeout,
    )

    for (const r of genericResults) {
      if (!seen.has(r.url) && combined.length < numResults) {
        seen.add(r.url)
        combined.push(r)
      }
    }

    return combined.map(labelResult(engine, label))
  })
}

/**
 * 不同词序的 site: 搜索（策略 2）
 * `{query} site:domain 价格`
 */
function searchAltSiteOrder(
  http: HttpClient.HttpClient,
  domain: string,
  query: string,
  suffix: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const altQuery = `${query} site:${domain} ${suffix}`
    const formData = new URLSearchParams({ q: altQuery, b: "", kl: "wt-wt" })

    const response = yield* http.execute(
      HttpClientRequest.post(DDG_HTML_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }),
        HttpClientRequest.bodyText(formData.toString()),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (html.includes('id="challenge-form"')) return []

    return parseDdgSiteResults(html, numResults, domain)
  })
}

// ── 解析与标记 ─────────────────────────────────────────

function parseDdgSiteResults(
  html: string,
  maxResults: number,
  domain: string,
): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  const resultRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi

  let match: RegExpExecArray | null
  while ((match = resultRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    let url = match[1].trim()
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/)
    if (uddgMatch) {
      try { url = decodeURIComponent(uddgMatch[1]) } catch { }
    }

    const title = match[2].replace(/<[^>]+>/g, "").trim()
    const snippet = match[3].replace(/<[^>]+>/g, "").trim()

    if (!title || !url) continue
    if (!url.includes(domain)) continue

    pos++
    const result = makeSearchResult({
      title,
      url,
      snippet,
      engine: "",
      position: pos,
      category: "shopping",
    })
    results.push(result)
  }

  return results
}

/** 为搜索结果设置 engine 和 snippet 标签 */
function labelResult(engine: string, label: string): (r: SearchResult) => SearchResult {
  return (r) => ({
    ...r,
    engine,
    snippet: r.snippet ? `${r.snippet} · ${label}` : label,
  })
}

export * as SiteSearch from "./site-search"
