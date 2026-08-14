/**
 * 搜索模块
 *
 * 提供多引擎并发搜索、结果聚合去重、智能排序功能。
 * 借鉴 SearXNG 的元搜索引擎架构。
 *
 * 使用方式：
 * ```ts
 * import { Search } from "@/search"
 *
 * const engines = Search.Selector.selectEngines({ brave: true })
 * const state = new Search.Executor.ExecutorState()
 * const opts = Search.Engine.makeSearchOptions({ numResults: 8 })
 * const result = yield* Search.Executor.executeAll(engines, http, query, opts, state)
 * const aggregated = Search.Aggregator.aggregate(result.results, {
 *   weights: new Map([["duckduckgo", 1.0], ["brave", 1.2]]),
 *   maxResults: 8,
 * })
 * const output = Search.Aggregator.formatResults(aggregated, query)
 * ```
 */
import * as Aggregator from "./aggregator"
import * as Executor from "./executor"
import * as Selector from "./selector"
import * as Engine from "./engine"
import * as Cache from "./cache"
import * as QueryIntentModule from "./query-intent"
import * as PriceCompareModule from "./price-compare"
import * as RateLimiterModule from "./rate-limiter"

export { Aggregator, Executor, Selector, Engine, Cache, QueryIntentModule as QueryIntent, PriceCompareModule as PriceCompare, RateLimiterModule as RateLimiter }
export * as Search from "."
