/**
 * Bing News 搜索引擎适配器
 *
 * 参考 SearXNG 的 bing_news.py 实现
 * 端点: https://www.bing.com/news/infinitescrollajax?q=<query>&InfiniteScroll=1&first=1&SFX=0&form=PTFTNR
 *
 * 响应 HTML 结构中的每条新闻:
 * - <div class="newsitem">
 *   - <a class="title" href="URL">标题</a>
 *   - <div class="snippet">摘要</div>
 *   - <div class="source"><span aria-label="来源">发布时间</span></div>
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BING_NEWS_URL = "https://www.bing.com/news/infinitescrollajax"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeBingNews(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBingNews(http, query, opts, config.timeout, config.maxResults),
  }
}

function searchBingNews(
  http: HttpClient.HttpClient,
  query: string,
  opts: SearchOptions,
  timeout: number,
  maxResults: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      InfiniteScroll: "1",
      first: "1",
      SFX: "0",
      form: "PTFTNR",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BING_NEWS_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/xhtml+xml",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []

    const html: string = yield* response.text
    return parseBingNewsResults(html, opts.numResults || maxResults)
  })
}

/**
 * 解析 Bing News 响应
 *
 * 参考 SearXNG: //div[contains(@class, "newsitem")]
 * - <a class="title" href="URL">标题</a>
 * - <div class="snippet">摘要</div>
 * - <div class="source"><span aria-label="来源">...</span></div>
 */
export function parseBingNewsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  const seen = new Set<string>()
  let pos = 0

  // 每条新闻在 <div class="newsitem"> 中
  const itemRegex = /<div[^>]*class="newsitem"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const block = match[0]

    // 标题和URL: <a class="title" href="URL">标题</a>
    const titleMatch = block.match(/<a[^>]*class="title"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue

    const url = titleMatch[1]
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim()
    if (!title || !url || seen.has(url)) continue
    seen.add(url)

    // 摘要: <div class="snippet">...</div>
    const snippetMatch = block.match(/<div[^>]*class="snippet"[^>]*>([\s\S]*?)<\/div>/i)
    const snippet = snippetMatch?.[1]?.replace(/<[^>]*>/g, "").trim() ?? ""

    // 来源/日期: <span aria-label="来源名">日期文本</span>
    const sourceMatch = block.match(/<span[^>]*aria-label="([^"]*)"[^>]*>([\s\S]*?)<\/span>/i)
    const source = sourceMatch?.[1] ?? ""

    pos++
    results.push(makeSearchResult({
      title,
      url,
      snippet: source ? `[${source}] ${snippet}` : snippet,
      engine: "bing-news",
      position: pos,
      category: "news",
    }))
  }

  return results
}

export * as BingNewsEngine from "./bing-news"
