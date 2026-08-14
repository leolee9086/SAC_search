/**
 * DuckDuckGo 搜索引擎适配器
 *
 * 借鉴 SearXNG 的 DDG 引擎实现
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import { Parser } from "htmlparser2"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult, parseRelativeDate, stripHtml } from "../engine"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
const DDG_HTML_URL = "https://html.duckduckgo.com/html/"

const vqdCache = new Map<string, { vqd: string; expires: number }>()

export function makeDuckDuckGo(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWithFallback(http, query, opts),
  }
}

/**
 * 构建 DDG 区域参数
 *
 * 根据 lang 设置合适的 kl 参数：
 * - "zh-CN" → "cn-zh"
 * - "zh-TW" → "tw-zh"
 * - "ja" → "jp-jp"
 * - "en" → "us-en"
 * - 默认 → "wt-wt"（不指定区域）
 */
export function langToKl(lang?: string): string {
  if (!lang) return "wt-wt"
  const map: Record<string, string> = {
    "zh-CN": "cn-zh",
    "zh-TW": "tw-zh",
    "zh": "cn-zh",
    "ja": "jp-jp",
    "ko": "kr-kr",
    "en": "us-en",
    "en-US": "us-en",
    "en-GB": "uk-en",
    "fr": "fr-fr",
    "de": "de-de",
    "es": "es-es",
    "pt": "br-pt",
    "it": "it-it",
    "ru": "ru-ru",
  }
  return map[lang] ?? map[lang?.split("-")[0]] ?? "wt-wt"
}

/**
 * 根据 timeRange 构建 DDG 的 df 参数（日期过滤）
 */
export function timeRangeToDf(timeRange?: "day" | "week" | "month" | "year"): string {
  if (!timeRange) return ""
  const map: Record<string, string> = {
    day: "d",
    week: "w",
    month: "m",
    year: "y",
  }
  return map[timeRange] ?? ""
}

function searchWithFallback(
  http: HttpClient.HttpClient,
  query: string,
  opts: SearchOptions,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  const numResults = opts.numResults || 8

  // 并行发起三种 DDG 搜索策略，取首个返回非空结果者
  // 原实现是串行 fallback（最差 45s），改为 race 后最快路径通常 2-3s 即可返回
  const safeHtml = searchHtmlPost(http, query, numResults, opts).pipe(
    Effect.catchIf(() => true, () => Effect.succeed([] as readonly SearchResult[])),
  )
  const safeJson = searchJsonApi(http, query, numResults).pipe(
    Effect.catchIf(() => true, () => Effect.succeed([] as readonly SearchResult[])),
  )
  const safeLite = searchLite(http, query, numResults).pipe(
    Effect.catchIf(() => true, () => Effect.succeed([] as readonly SearchResult[])),
  )

  return Effect.gen(function* () {
    // 并行 race：最先返回非空结果的赢，空结果不淘汰其他候选
    const [html, json, lite] = yield* Effect.all(
      [safeHtml, safeJson, safeLite],
      { concurrency: "unbounded" },
    )
    // 优先级：HTML POST（含时间过滤和拼写建议）> JSON API > Lite
    if (html.length > 0) return html
    if (json.length > 0) return json
    return lite
  })
}

function searchHtmlPost(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  opts: SearchOptions,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const formData = new URLSearchParams({ q: query, b: "", kl: langToKl(opts.lang) })
    const df = timeRangeToDf(opts.timeRange)
    if (df) formData.set("df", df)

    const response = yield* http.execute(
      HttpClientRequest.post(DDG_HTML_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": opts.lang ? `${opts.lang},en;q=0.9` : "en-US,en;q=0.9",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          Referer: "https://html.duckduckgo.com/",
        }),
        HttpClientRequest.bodyText(formData.toString()),
      ),
    ).pipe(Effect.timeout("15 seconds"))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    // SearXNG 参考: DDG 可能返回空/极小响应或验证码页
    if (html.length < 500) return []
    if (html.includes('id="challenge-form"') || html.includes('id="captcha"')) return []
    if (response.status === 303 || response.status === 403) return []

    const vqdMatch = html.match(/<input[^>]*name=["']vqd["'][^>]*value=["']([^"']+)["']/i)
    if (vqdMatch?.[1]) vqdCache.set(`${query}//${USER_AGENT}`, { vqd: vqdMatch[1], expires: Date.now() + 3600_000 })

    const results = parseHtmlResults(html, numResults)

    // 尝试提取拼写建议（"Did you mean"）并附加到第一条结果上
    const suggestion = extractSuggestion(html)
    if (suggestion && results.length > 0) {
      const augmented = [...results]
      augmented[0] = makeSearchResult({ ...augmented[0], suggestion })
      return augmented
    }

    return results
  })
}

/**
 * 从 DDG HTML 响应中提取拼写建议
 *
 * DDG 在搜索结果页上显示 "Showing results for X" 或 "Did you mean: X"
 * 我们提取修正后的查询词，供聚合器展示给 LLM。
 */
function extractSuggestion(html: string): string | undefined {
  // DDG 的 "Showing results for" 模式
  const showingMatch = html.match(
    /class=["'][^"']*spelling[^"']*["'][^>]*>.*?class=["'][^"']*result__suggestion[^"']*["'][^>]*>([^<]+)/i,
  )
  if (showingMatch?.[1]) return stripHtml(showingMatch[1])

  // 备选模式：<a class="result__suggestion" ...>
  const linkMatch = html.match(/class=["'][^"']*result__suggestion[^"']*["'][^>]*>([^<]+)/i)
  if (linkMatch?.[1]) return stripHtml(linkMatch[1])

  // "Did you mean" 文本模式
  const didYouMean = html.match(/did\s+you\s+mean[:\s]+([^<.]+)/i)
  if (didYouMean?.[1]) return stripHtml(didYouMean[1])

  return undefined
}

function searchJsonApi(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout("15 seconds"))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    const vqd = html.match(/vqd\s*=\s*["']([^"']+)["']/)?.[1]
    if (!vqd) return []

    const jsonUrl = new URL("https://links.duckduckgo.com/d.js")
    jsonUrl.searchParams.set("q", query); jsonUrl.searchParams.set("vqd", vqd)
    jsonUrl.searchParams.set("kl", "wt-wt"); jsonUrl.searchParams.set("l", "wt-wt")
    jsonUrl.searchParams.set("o", "json"); jsonUrl.searchParams.set("sp", "0"); jsonUrl.searchParams.set("ex", "-1")

    const jsonResponse = yield* http.execute(
      HttpClientRequest.get(jsonUrl.toString()).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT, Accept: "application/json, text/plain, */*",
          Referer: "https://duckduckgo.com/",
        }),
      ),
    ).pipe(Effect.timeout("15 seconds"))

    if (jsonResponse.status < 200 || jsonResponse.status >= 400) return []
    const text: string = yield* jsonResponse.text
    let data: any
    try { data = JSON.parse(text) } catch { return [] }

    const results: SearchResult[] = []
    let pos = 0
    for (const row of (data?.results ?? [])) {
      if (results.length >= numResults) break
      const href = row.u; const title = stripHtml(row.t ?? "")
      if (!href || !title) continue
      pos++
      results.push(makeSearchResult({ title, url: extractUrl(href), snippet: stripHtml(row.a ?? ""), engine: "duckduckgo", position: pos }))
    }
    return results
  })
}

function searchLite(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout("15 seconds"))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    return parseLiteResults(html, numResults)
  })
}

function extractUrl(href: string): string {
  if (!href) return ""
  const uddgMatch = href.match(/[?&]uddg=([^&]+)/)
  if (uddgMatch) { try { return decodeURIComponent(uddgMatch[1]) } catch { } }
  if (href.startsWith("http://") || href.startsWith("https://")) return href
  if (href.startsWith("//")) return `https:${href}`
  return href
}

export function parseHtmlResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let current: { title?: string; url?: string; snippet?: string; dateText?: string; type?: string } = {}
  let inResult = false, depth = 0, inTitle = false, inSnippet = false, inDate = false, inType = false, textBuf = "", pos = 0

  const parser = new Parser({
    onopentag(name, attrs) {
      const cls = attrs.class ?? ""
      if (name === "div") {
        const classes = cls.split(/\s+/)
        if (classes.includes("result") && !classes.includes("results") && !inResult) {
          current = {}; inResult = true; depth = 1; return
        }
        if (inResult) depth++; return
      }
      if (!inResult) return
      if (name === "a" && cls === "result__a") { inTitle = true; textBuf = ""; current.url = extractUrl(attrs.href ?? "") }
      if (name === "a" && cls === "result__snippet") { inSnippet = true; textBuf = "" }
      // DuckDuckGo 结果中的日期元素：<span class="result__date">...</span> 或 <span class="result__timestamp">...</span>
      if ((name === "span" || name === "div") && (cls.includes("result__date") || cls.includes("result__timestamp") || cls.includes("result__extras__date"))) {
        inDate = true; textBuf = ""
      }
      // 内容类型徽章：<span class="result__type">PDF</span> 等
      if (name === "span" && (cls.includes("result__type") || cls.includes("result__badge"))) {
        inType = true; textBuf = ""
      }
    },
    ontext(text) {
      if (inTitle || inSnippet || inDate || inType) textBuf += text
    },
    onclosetag(name) {
      if (!inResult) return

      // 处理日期文本
      if (inDate && (name === "span" || name === "div")) {
        current.dateText = (current.dateText ?? "") + textBuf.trim()
        inDate = false; textBuf = ""
        return
      }
      // 处理类型徽章
      if (inType && name === "span") {
        current.type = (current.type ?? "") + textBuf.trim()
        inType = false; textBuf = ""
        return
      }

      if (name === "div") {
        depth--; if (depth <= 0) {
          if (current.title && current.url) {
            pos++
            const publishedDate = current.dateText ? parseRelativeDate(current.dateText) : undefined
            results.push(makeSearchResult({
              title: current.title, url: current.url,
              snippet: current.snippet ?? "", engine: "duckduckgo",
              position: pos, publishedDate, category: current.type,
            }))
            if (results.length >= maxResults) { parser.reset(); return }
          }
          current = {}; inResult = false
        }
        return
      }
      if (name === "a") {
        if (inTitle) { current.title = (current.title ?? "") + textBuf.trim(); inTitle = false }
        if (inSnippet) { current.snippet = (current.snippet ?? "") + textBuf.trim(); inSnippet = false }
        textBuf = ""
      }
    },
  })

  parser.write(html); parser.end()
  if (inResult && current.title && current.url && results.length < maxResults) {
    pos++
    const publishedDate = current.dateText ? parseRelativeDate(current.dateText) : undefined
    results.push(makeSearchResult({
      title: current.title, url: current.url,
      snippet: current.snippet ?? "", engine: "duckduckgo",
      position: pos, publishedDate, category: current.type,
    }))
  }
  return results
}

export function parseLiteResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  const seen = new Set<string>(); let pos = 0
  const tableRegex = /<tr[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/gi
  let m: RegExpExecArray | null
  while ((m = tableRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const url = extractUrl(m[1]); if (!url || seen.has(url)) continue; seen.add(url); pos++
    results.push(makeSearchResult({ title: stripHtml(m[2]), url, snippet: stripHtml(m[3]), engine: "duckduckgo", position: pos }))
  }
  if (results.length > 0) return results
  const divRegex = /<div[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
  while ((m = divRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const url = extractUrl(m[1]); if (!url || seen.has(url)) continue; seen.add(url); pos++
    results.push(makeSearchResult({ title: stripHtml(m[2]), url, snippet: stripHtml(m[3]), engine: "duckduckgo", position: pos }))
  }
  return results
}

export * as DuckDuckGoEngine from "./duckduckgo"
