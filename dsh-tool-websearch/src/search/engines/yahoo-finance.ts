/**
 * Yahoo Finance 搜索引擎适配器
 *
 * 搜索 Yahoo Finance 上的股票和财经信息。
 * API: https://query2.finance.yahoo.com/v1/finance/search
 * 公开 JSON API，无需 key
 * 参考 SearXNG: 未直接收录，Yahoo 引擎模式参考
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

export function makeYahooFinance(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchYF(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchYF(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${numResults}&newsCount=0`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT, Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseYfResults(raw, numResults)
  })
}

interface YfQuote {
  symbol?: string
  shortname?: string
  longname?: string
  exchange?: string
  quoteType?: string
}

function parseYfResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as { quotes?: YfQuote[] }
  if (!data?.quotes) return []
  return data.quotes.slice(0, max).map((q, i) => {
    const symbol = q.symbol || ""
    return makeSearchResult({
      title: `${q.shortname || q.longname || symbol} (${symbol})`,
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`,
      snippet: `${q.exchange || ""} · ${q.quoteType || ""}`,
      engine: "yahoo-finance",
      position: i + 1,
      category: "finance",
    })
  })
}

export * as YahooFinanceEngine from "./yahoo-finance"
