/**
 * 唯品会 (Vip.com) 商品搜索引擎适配器
 *
 * 搜索 Vip.com 上的商品信息和价格。
 * 采用双策略回退机制降低反爬阻塞风险。
 */
import { Effect } from "effect"
import { HttpClient } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { searchSiteWithFallback } from "./site-search"

const DOMAIN = "vip.com"

export function makeVip(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchVip(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchVip(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return searchSiteWithFallback(http, DOMAIN, query, "价格", numResults, timeout, "vip", "唯品会")
}

export * as VipEngine from "./vip"
