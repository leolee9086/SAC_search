/**
 * Google News 搜索引擎适配器
 *
 * 参考 SearXNG 的 google_news.py 实现
 * - 使用 Google News HTML 解析
 * - 支持 ceid 地区参数
 * - 检测 CAPTCHA (sorry page)
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"
import { isGoogleCaptcha } from "./google-traits"

export function makeGoogleNews(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGoogleNews(http, query, opts.numResults || config.maxResults, opts.lang),
  }
}

function searchGoogleNews(
  http: HttpClient.HttpClient,
  query: string,
  maxResults: number,
  lang?: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const ceid = getCeid(lang)
    const params = new URLSearchParams({
      q: query,
      hl: getHl(lang),
      gl: ceid.split(":")[0],
      ceid,
      tbm: "nws",
    })

    const url = `https://news.google.com/search?${params.toString()}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
          "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
          Accept: "text/html",
          Cookie: "CONSENT=YES+",
        }),
      ),
    )

    if (response.status < 200 || response.status >= 400) return []
    const html = yield* response.text
    if (!html) return []

    // CAPTCHA 检测
    if (isGoogleCaptcha(response.status, html, url)) return []

    return parseGoogleNewsResults(html, maxResults)
  })
}

/**
 * 解析 Google News HTML 结果
 *
 * 参考 SearXNG google_news.py:
 * - 查找 <div jslog> 元素
 * - 从 jslog 属性提取真实 URL（base64 编码）
 * - 标题在 <h4> 中
 * - 日期在 <time> 中
 * - 来源在 class="vr1PYe" 的 div 中
 */
function parseGoogleNewsResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  // 正则匹配 jslog 元素
  const elementRegex = /<div[^>]*jslog[^>]*data-n-tid[^>]*>[\s\S]*?<\/div>/gi
  let match: RegExpExecArray | null

  while ((match = elementRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break

    const block = match[0]

    // 提取 URL（从 <a target="_blank" href="...">）
    const hrefMatch = block.match(/<a[^>]*target="_blank"[^>]*href="([^"]*)"[^>]*>/)
    if (!hrefMatch) continue

    let url = hrefMatch[1]
    if (url.startsWith("./")) {
      url = "https://news.google.com" + url.slice(1)
    }

    // 尝试从 jslog 提取真实 URL
    const jslogMatch = block.match(/jslog="([^"]*)"/)
    if (jslogMatch) {
      try {
        const parts = jslogMatch[1].split(";")
        if (parts.length > 1) {
        const b64Data = parts[1].split(":").pop()?.trim()
        if (!b64Data) continue
        const padded = b64Data + "=".repeat((4 - (b64Data.length % 4)) % 4)
          const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"))
          if (Array.isArray(decoded) && typeof decoded[decoded.length - 1] === "string" && decoded[decoded.length - 1].startsWith("http")) {
            url = decoded[decoded.length - 1]
          }
        }
      } catch {
        // 保留原始 URL
      }
    }

    // 提取标题（<h4>）
    const titleMatch = block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : ""
    if (!title) continue

    // 提取来源和日期
    const pubDateMatch = block.match(/<time[^>]*>([\s\S]*?)<\/time>/)
    const pubOriginMatch = block.match(/<div[^>]*class="vr1PYe"[^>]*>([\s\S]*?)<\/div>/)
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : ""
    const pubOrigin = pubOriginMatch ? pubOriginMatch[1].trim() : ""
    const snippet = [pubOrigin, pubDate].filter(Boolean).join(" / ")

    // 提取缩略图
    const thumbnailMatch = block.match(/<figure><img[^>]*src="([^"]*)"[^>]*>/)
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : ""
    if (thumbnail && thumbnail.startsWith("/")) {
      thumbnail = "https://news.google.com" + thumbnail
    }

    results.push(
      makeSearchResult({
        title,
        url,
        snippet: snippet || "",
        engine: "google-news",
        position: results.length + 1,
        category: "news",
        publishedDate: pubDate ? parseGoogleNewsDate(pubDate) : undefined,
      }),
    )
  }

  return results
}

function parseGoogleNewsDate(dateStr: string): number | undefined {
  // Google News 日期格式多样："3 hours ago", "2 days ago", "Jun 5, 2026" 等
  const relative = /(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i.exec(dateStr)
  if (relative) {
    const num = parseInt(relative[1])
    const unit = relative[2]
    const now = Date.now()
    const multipliers: Record<string, number> = {
      minute: 60000,
      hour: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000,
      year: 31536000000,
    }
    return now - num * (multipliers[unit] || 0)
  }

  // 尝试解析绝对日期
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) return parsed.getTime()

  return undefined
}

// ceid 列表（参考 SearXNG google_news.py）
const CEID_LIST: Record<string, string> = {
  zh: "CN:zh-Hans",
  en: "US:en",
  ja: "JP:ja",
  ko: "KR:ko",
  de: "DE:de",
  fr: "FR:fr",
  es: "ES:es",
  pt: "BR:pt-419",
  it: "IT:it",
  ru: "RU:ru",
  ar: "SA:ar",
}

function getCeid(lang?: string): string {
  if (!lang) return "US:en"
  const shortLang = lang.split("-")[0].split("_")[0]
  return CEID_LIST[shortLang] || "US:en"
}

function getHl(lang?: string): string {
  if (!lang) return "en"
  return lang.split("_")[0].replace("-", "-")
}
