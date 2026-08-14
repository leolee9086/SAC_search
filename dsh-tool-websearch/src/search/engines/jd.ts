/**
 * 京东 (JD.com) 商品搜索引擎适配器
 *
 * 搜索 JD.com 上的商品信息和价格。
 * 采用双策略回退机制（DDG site: → DDG 通用 → 词序变换），
 * 降低反爬阻塞导致的空结果概率。
 */
import { Effect } from "effect"
import { HttpClient } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { searchSiteWithFallback } from "./site-search"

const DOMAIN = "jd.com"

export function makeJd(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchJd(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchJd(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return searchSiteWithFallback(http, DOMAIN, query, "价格", numResults, timeout, "jd", "京东")
}

export * as JdEngine from "./jd"
