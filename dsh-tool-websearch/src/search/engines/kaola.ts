/**
 * 考拉海购 (Kaola.com) 商品搜索引擎适配器
 *
 * 搜索 Kaola.com 上的跨境商品信息和价格。
 * 采用双策略回退机制降低反爬阻塞风险。
 */
import { Effect } from "effect"
import { HttpClient } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { searchSiteWithFallback } from "./site-search"

const DOMAIN = "kaola.com"

export function makeKaola(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchKaola(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchKaola(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return searchSiteWithFallback(http, DOMAIN, query, "价格", numResults, timeout, "kaola", "考拉海购")
}

export * as KaolaEngine from "./kaola"
