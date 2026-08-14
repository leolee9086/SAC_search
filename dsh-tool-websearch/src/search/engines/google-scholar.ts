/**
 * Google Scholar 搜索引擎适配器
 *
 * 参考 SearXNG 的 google_scholar.py 实现
 * - 使用 Google Scholar HTML 解析
 * - 支持语言和地区参数
 * - 包含引用数、作者、年份等学术信息
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"
import { isGoogleCaptcha } from "./google-traits"

export function makeGoogleScholar(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGoogleScholar(http, query, opts.numResults || config.maxResults, opts.lang),
  }
}

function searchGoogleScholar(
  http: HttpClient.HttpClient,
  query: string,
  maxResults: number,
  lang?: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const hl = lang?.split("-")[0].split("_")[0] || "en"
    const params = new URLSearchParams({
      q: query,
      hl,
      num: String(Math.min(maxResults, 10)),
      as_sdt: "0",
      scisbd: "1",
    })

    const url = `https://scholar.google.com/scholar?${params.toString()}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
          "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
          Accept: "text/html",
          Cookie: "CONSENT=YES+",
        }),
      ),
    )

    if (response.status < 200 || response.status >= 400) return []
    const html = yield* response.text
    if (!html) return []

    if (isGoogleCaptcha(response.status, html, url)) return []

    return parseGoogleScholarResults(html, maxResults)
  })
}

/**
 * 解析 Google Scholar 搜索结果 HTML
 *
 * Google Scholar 结构:
 * - 每个结果在 class="gs_ri" 的 div 中
 * - 标题在 <h3><a> 中
 * - 作者和年份在 class="gs_a" 的 div 中
 * - 摘要在 class="gs_rs" 的 div 中
 * - 引用数、相关文章等在 class="gs_fl" 中
 */
function parseGoogleScholarResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  // 匹配 gs_ri 结果块
  const blockRegex = /<div[^>]*class="gs_ri"[^>]*>[\s\S]*?(?=<div[^>]*class="gs_ri"|$)/g
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const block = match[0]

    // 提取标题和 URL
    const titleMatch = block.match(/<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue

    const url = titleMatch[1]
    const title = titleMatch[2].replace(/<[^>]*>/g, "").trim()
    if (!title || !url) continue

    // 提取作者和年份（class="gs_a"）
    const authorMatch = block.match(/<div[^>]*class="gs_a"[^>]*>([\s\S]*?)<\/div>/i)
    const authorInfo = authorMatch ? authorMatch[1].replace(/<[^>]*>/g, "").trim() : ""

    // 提取摘要（class="gs_rs"）
    const snippetMatch = block.match(/<div[^>]*class="gs_rs"[^>]*>([\s\S]*?)<\/div>/i)
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : ""

    // 提取引用数（class="gs_fl"）
    const citationsMatch = block.match(/Cited by (\d+)/)
    const citations = citationsMatch ? citationsMatch[1] : ""

    // 构建摘要
    const parts = [authorInfo, snippet].filter(Boolean)
    if (citations) parts.push(`被引用: ${citations}`)
    const fullSnippet = parts.join(" | ").slice(0, 300)

    // 提取发布年份
    const yearMatch = authorInfo.match(/(\d{4})/)
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined
    const publishedDate = year && year > 1900 && year < 2100
      ? new Date(year, 0, 1).getTime()
      : undefined

    results.push(
      makeSearchResult({
        title,
        url,
        snippet: fullSnippet,
        engine: "google-scholar",
        position: results.length + 1,
        category: "academic",
        publishedDate,
      }),
    )
  }

  return results
}
