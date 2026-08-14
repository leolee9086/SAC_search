/**
 * 货币转换搜索引擎适配器
 *
 * 使用 DuckDuckGo 的货币转换 API。
 * API: https://duckduckgo.com/js/spice/currency/1/USD/CNY
 *
 * 支持格式：
 *   - "100 USD to CNY" / "100 usd to cny"
 *   - "USD to CNY"
 *   - "USD CNY"
 *   - "1 USD in CNY"
 *
 * 参考 SearXNG: searx/engines/currency_convert.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://duckduckgo.com/js/spice/currency"
const USER_AGENT = "opencode-search/1.0"

export function makeCurrencyConvert(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchCurrencyConvert(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchCurrencyConvert(
  http: HttpClient.HttpClient,
  query: string,
  _numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    // 解析查询: "100 USD to/=> CNY", "USD to/=> CNY", "USD CNY", "100 USD in CNY"
    const currencyMatch = query.match(
      /^(?:(\d+\.?\d*)\s*)?([A-Za-z]{3})\s+(?:to|in|=>|→)\s+([A-Za-z]{3})$|^(\d+\.?\d*)\s+([A-Za-z]{3})\s+([A-Za-z]{3})$|^([A-Za-z]{3})\s+([A-Za-z]{3})$/,
    )
    if (!currencyMatch) return []

    // 从各个捕获组提取
    const amount = parseFloat(
      currencyMatch[1] || currencyMatch[4] || "1",
    )
    const from = (currencyMatch[2] || currencyMatch[5] || currencyMatch[7]).toUpperCase()
    const to = (currencyMatch[3] || currencyMatch[6] || currencyMatch[8]).toUpperCase()

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/1/${from}/${to}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseCurrencyResults(raw, `${amount} ${from}`, from, to, amount)
  })
}

interface CurrencyData {
  to?: Array<{ mid?: number; fq?: string }>
}

export function parseCurrencyResults(
  raw: string,
  query: string,
  from: string,
  to: string,
  amount: number = 1,
): SearchResult[] {
  // DuckDuckGo 返回 JSONP 格式：callback_name(<json>);
  // 提取第一个 { 到最后一个 } 之间的 JSON 内容
  const firstBrace = raw.indexOf("{")
  const lastBrace = raw.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace <= firstBrace) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1))
  } catch {
    return []
  }

  const data = parsed as CurrencyData
  const rate = data.to?.[0]?.mid
  if (!rate) return []

  const result = amount * rate
  const answer = `${query} = ${result.toFixed(2)} ${to} (1 ${from} : ${rate.toFixed(4)} ${to})`

  return [
    makeSearchResult({
      title: `${from} to ${to} Exchange Rate`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(`${from}+to+${to}`)}`,
      snippet: answer,
      engine: "currency-convert",
      position: 1,
      category: "general",
    }),
  ]
}

export * as CurrencyConvertEngine from "./currency-convert"
