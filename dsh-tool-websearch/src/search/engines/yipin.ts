/**
 * 1688 (1688.com) 商品搜索引擎适配器
 *
 * 搜索 1688.com 上的商品信息和价格（阿里巴巴批发平台）。
 * 采用双策略回退机制降低反爬阻塞风险。
 */
import { Effect } from "effect"
import { HttpClient } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { searchSiteWithFallback } from "./site-search"

const DOMAIN = "1688.com"

export function makeYipin(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchYipin(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchYipin(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return searchSiteWithFallback(http, DOMAIN, query, "价格", numResults, timeout, "1688", "1688批发")
}

export * as YipinEngine from "./yipin"
