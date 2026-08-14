/**
 * 百度搜索引擎适配器
 *
 * 参考 SearXNG 的 baidu.py
 * 调用百度搜索的 JSON API (https://www.baidu.com/s?tn=json)
 * 无需 API key。
 *
 * 端点: https://www.baidu.com/s?tn=json&wd=KEYWORD&rn=COUNT&pn=OFFSET
 * 返回: JSON { feed: { entry: [...] } }
 *
 * 注意：百度对非浏览器请求有反爬机制（WAP 验证码），
 * 引擎会优雅降级（返回空结果），不会重试触发封禁。
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://www.baidu.com/s"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeBaidu(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBaidu(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchBaidu(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      wd: query,
      rn: String(Math.min(numResults, 50)),
      pn: "0",
      tn: "json", // 百度 JSON API 模式
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "zh-CN,zh;q=0.9",
          Referer: "https://www.baidu.com/",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    // 百度反爬会重定向到 wappass.baidu.com
    if (response.status === 302 || response.status === 303) return []

    const raw: string = yield* response.text
    if (!raw || raw.includes("wappass") || raw.includes("captcha")) return []

    return parseBaiduResults(raw, numResults)
  })
}

/**
 * 解析百度 JSON API 响应
 *
 * 参考 SearXNG: data["feed"]["entry"] → [{ title, url, abs, time }]
 * title 和 content 需要 unescape HTML 实体
 */
export function parseBaiduResults(raw: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  let parsed: { feed?: { entry?: unknown[] } }
  try {
    parsed = JSON.parse(raw) as { feed?: { entry?: unknown[] } }
  } catch {
    return []
  }

  const entries = parsed?.feed?.entry
  if (!entries || !Array.isArray(entries)) return []

  let pos = 0
  for (const entry of entries) {
    if (results.length >= maxResults) break
    if (typeof entry !== "object" || !entry) continue

    const record = entry as Record<string, unknown>
    const title = typeof record.title === "string" ? unescapeHtml(record.title).trim() : ""
    const url = typeof record.url === "string" ? record.url : ""
    const snippet = typeof record.abs === "string" ? unescapeHtml(record.abs).trim() : ""
    const time = typeof record.time === "number" ? record.time : undefined

    if (!title || !url) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet.slice(0, 300),
        engine: "baidu",
        position: pos,
        publishedDate: time ? time * 1000 : undefined, // Baidu 返回秒级
      }),
    )
  }

  return results
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
}

export * as BaiduEngine from "./baidu"
