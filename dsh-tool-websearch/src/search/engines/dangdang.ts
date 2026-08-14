/**
 * 当当网 (Dangdang.com) 商品搜索引擎适配器
 *
 * 搜索 Dangdang.com 上的商品信息（图书、数码等）。
 * 采用双策略回退机制降低反爬阻塞风险。
 */
import { Effect } from "effect"
import { HttpClient } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { searchSiteWithFallback } from "./site-search"

const DOMAIN = "dangdang.com"

export function makeDangdang(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchDangdang(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchDangdang(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return searchSiteWithFallback(http, DOMAIN, query, "价格", numResults, timeout, "dangdang", "当当")
}

export * as DangdangEngine from "./dangdang"
