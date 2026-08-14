/**
 * OpenFoodFacts 食品数据库搜索引擎适配器
 *
 * 搜索 OpenFoodFacts 上的食品数据。
 * API: https://world.openfoodfacts.org/api/v2/
 * 公开 API，无需 key
 * 参考 SearXNG: 未直接收录，API 模式通用
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

export function makeOpenFoodFacts(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchOff(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchOff(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&page_size=${Math.min(numResults, 20)}&json=1`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseOffResults(raw, numResults)
  })
}

interface OffProduct {
  code?: string
  product_name?: string
  brands?: string
  nutriscore_grade?: string
  categories_tags?: string[]
}

function parseOffResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as { products?: OffProduct[] }
  if (!data?.products) return []
  return data.products.slice(0, max).map((p, i) => {
    const categories = (p.categories_tags || []).map((t) => t.replace(/^en:/, "")).slice(0, 3).join(", ")
    return makeSearchResult({
      title: p.product_name || `Product ${p.code || ""}`,
      url: `https://world.openfoodfacts.org/product/${p.code || ""}`,
      snippet: `${p.brands || "Unknown brand"} · Nutri-Score: ${p.nutriscore_grade?.toUpperCase() || "N/A"} · ${categories}`,
      engine: "openfoodfacts",
      position: i + 1,
      category: "general",
    })
  })
}

export * as OpenFoodFactsEngine from "./openfoodfacts"
