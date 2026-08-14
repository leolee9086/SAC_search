/**
 * JSON API 搜索引擎工厂
 *
 * 通用工厂，用于快速创建各种基于 JSON REST API 的搜索引擎。
 * 只需要提供 API 配置和解析函数即可。
 *
 * 使用示例:
 * ```ts
 * const engine = makeJsonApiEngine({
 *   name: "unsplash",
 *   url: (q, n) => `https://api.unsplash.com/search/photos?query=${q}&per_page=${n}`,
 *   parse: (json) => json.results.map(...)
 * })
 * ```
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export interface JsonApiEngineConfig {
  /** 引擎名称 */
  name: string
  /** 搜索结果分类 */
  category?: string
  /** 是否需要 API key */
  requiresKey?: boolean
  /** API key 的环境变量名 */
  apiKeyEnv?: string
  /** API key 的请求头名称 (默认 "Authorization") */
  apiKeyHeader?: string
  /** API key 的值前缀 (默认 "Bearer ") */
  apiKeyPrefix?: string
  /** User-Agent */
  userAgent?: string
  /** URL 构造器: (query, numResults) => URL 字符串 */
  url: (query: string, numResults: number) => string
  /** 响应解析器: (json: any, maxResults: number) => SearchResult[] */
  parse: (json: unknown, maxResults: number) => SearchResult[]
  /** 额外请求头 */
  headers?: Record<string, string>
  /** 用于调试的标签 */
  debugLabel?: string
}

export function makeJsonApiEngine(cfg: JsonApiEngineConfig): (config: EngineConfig) => SearchEngine {
  const label = cfg.debugLabel || cfg.name
  return (config: EngineConfig): SearchEngine => ({
    name: config.name,
    config,
    search: (http, query, opts) => searchJsonApi(http, query, opts.numResults || config.maxResults, config.timeout, cfg),
  })
}

function searchJsonApi(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
  cfg: JsonApiEngineConfig,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = cfg.url(query, Math.min(numResults, 50))
    const headers: Record<string, string> = {
      "User-Agent": cfg.userAgent || "opencode-search/1.0",
      Accept: "application/json",
      ...cfg.headers,
    }

    // API Key 注入
    if (cfg.requiresKey && cfg.apiKeyEnv) {
      const key = process.env[cfg.apiKeyEnv]
      if (key) {
        const header = cfg.apiKeyHeader || "Authorization"
        const prefix = cfg.apiKeyPrefix || "Bearer "
        headers[header] = `${prefix}${key}`
      }
    }

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders(headers),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    if (response.status === 429 || response.status === 403) return []

    const raw: string = yield* response.text
    if (!raw) return []

    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { return [] }

    return cfg.parse(parsed, numResults)
  })
}

// ── 引擎实现 ───────────────────────────────────────────

// 可复用的搜索函数，直接供 makeXxx 调用
export { makeSearchResult }
