/**
 * DuckDuckGo 搜索引擎适配器
 *
 * 借鉴 SearXNG 的 DDG 引擎实现
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import { Parser } from "htmlparser2"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { AccessDeniedError, CaptchaError, makeSearchResult, parseRelativeDate, stripHtml } from "../engine"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
const DDG_HTML_URL = "https://html.duckduckgo.com/html/"

/**
 * 查询串长度上限。
 *
 * SearXNG：`if len(query) >= 500: params["url"] = None`（注释：DDG does not accept
 * queries with more than 499 chars）。超长时直接不发请求 —— 发出去也是白费，
 * 而且这种畸形请求只会进一步降低本机 IP 的信誉。
 */
const MAX_QUERY_LENGTH = 499

const vqdCache = new Map<string, { vqd: string; expires: number }>()

export function makeDuckDuckGo(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchWithFallback(http, query, opts, config.name),
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

/**
 * 三路探测里记录的「硬失效」信号。
 *
 * 为什么需要它：三种策略各自用 catchIf 把异常吞成空数组（那是为了不让
 * 单条路径失败拖垮整体），但**验证墙/拒绝访问不能被吞** ——
 * 它们意味着「这个引擎现在用不了」，必须让 executor 知道并暂停引擎。
 * 所以这里把硬失效记账下来，三路都跑完后统一判定。
 */
interface HardFailure {
  kind: 'captcha' | 'denied'
  message: string
}

/** 三路共同的返回值：结果 + 本次是否碰到硬失效 */
type Attempt = { results: readonly SearchResult[]; failure?: HardFailure }

const EMPTY_ATTEMPT = (): Attempt => ({ results: [] })

/**
 * 识别 DuckDuckGo 的反爬验证墙。
 *
 * 判据对齐 SearXNG（searx/engines/duckduckgo.py 的 is_ddg_captcha）：
 *   "In case of CAPTCHA ddg response its own *not a Robot* dialog and is not
 *    redirected to a CAPTCHA page."
 * 它以 `//form[@id='challenge-form']` 作为**唯一**判据，连状态码都不看。
 *
 * 2026-09 本机实测：无头请求 html.duckduckgo.com 返回 202 + 该表单：
 *   <form id="challenge-form" action="//duckduckgo.com/anomaly.js?...">
 *   <div class="anomaly-modal__title">Unfortunately, bots use DuckDuckGo too.</div>
 *
 * 注意判据要**窄**：`anomaly.js` 只是表单的 action，它出现在异常页里；
 * 但把它单独当判据会误伤（表单 action 之外也可能出现该字符串）。
 * 所以主判据是 challenge-form / anomaly-modal 这种结构特征，文案只作补充。
 */
function detectChallenge(html: string): HardFailure | undefined {
  if (html.includes('id="challenge-form"') || html.includes("id='challenge-form'")) {
    return { kind: 'captcha', message: 'challenge-form' }
  }
  if (html.includes('anomaly-modal')) {
    return { kind: 'captcha', message: 'anomaly-modal' }
  }
  if (html.includes('id="captcha"') || html.includes("id='captcha'")) {
    return { kind: 'captcha', message: 'captcha' }
  }
  return undefined
}

function searchWithFallback(
  http: HttpClient.HttpClient,
  query: string,
  opts: SearchOptions,
  engineName: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  const numResults = opts.numResults || 8

  // 并行发起三种 DDG 搜索策略，取首个返回非空结果者
  // 原实现是串行 fallback（最差 45s），改为 race 后最快路径通常 2-3s 即可返回
  const safeHtml = searchHtmlPost(http, query, numResults, opts).pipe(
    Effect.catchIf(() => true, () => Effect.succeed(EMPTY_ATTEMPT())),
  )
  const safeJson = searchJsonApi(http, query, numResults).pipe(
    Effect.catchIf(() => true, () => Effect.succeed(EMPTY_ATTEMPT())),
  )
  const safeLite = searchLite(http, query, numResults).pipe(
    Effect.catchIf(() => true, () => Effect.succeed(EMPTY_ATTEMPT())),
  )

  return Effect.gen(function* () {
    // 并行 race：最先返回非空结果的赢，空结果不淘汰其他候选
    const [html, json, lite] = yield* Effect.all(
      [safeHtml, safeJson, safeLite],
      { concurrency: "unbounded" },
    )

    // 优先级：HTML POST（含时间过滤和拼写建议）> JSON API > Lite
    const picked = html.results.length > 0 ? html
      : json.results.length > 0 ? json
        : lite
    if (picked.results.length > 0) return picked.results

    // 三路都没结果。若其中任一碰到了验证墙/拒绝访问，就把硬失效抛出去 ——
    // 让 executor 记失败，而不是伪装成「成功但没结果」。
    const failure = html.failure ?? json.failure ?? lite.failure
    if (failure !== undefined) {
      // suspendedTime: 0 —— 按 SearXNG 的结论，DDG 的验证墙**不暂停引擎**。
      // 它的原注释：`set suspend time to zero is OK --> ddg does not block the IP`，
      // 即验证墙只表示「这次查询没通过」，IP 并未被封；停掉整个引擎会让其它
      // 正常查询也一起失败。这与「真被封」的引擎（不传时长、走默认长暂停）是两回事。
      if (failure.kind === 'denied') {
        throw new AccessDeniedError({ engine: engineName, message: failure.message, suspendedTime: 0 })
      }
      throw new CaptchaError({ engine: engineName, message: failure.message, suspendedTime: 0 })
    }
    return []
  })
}

/**
 * 构造 Accept-Language。格式对齐 SearXNG：
 *   f"{ui_lang},{ui_lang}-{ui_lang.upper()};q=0.7"
 * 例：zh-CN → "zh-CN,zh-CN;q=0.7"；未指定时给一个中性的英文值。
 *
 * 为什么值得改：DDG 的 no-JS 页面没有语言选择界面，它会**从 Accept-Language 猜**
 * 用户语言。格式不规整会影响它的判定。
 */
function acceptLanguageFor(lang?: string): string {
  if (!lang) return "en-US,en;q=0.9"
  return `${lang},${lang}-${lang.toUpperCase()};q=0.7`
}

function searchHtmlPost(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  opts: SearchOptions,
): Effect.Effect<Attempt, unknown, never> {
  return Effect.gen(function* () {
    // 超长查询直接不发：DDG 不接受超过 499 字符（SearXNG 同样在此处 return）
    if (query.length > MAX_QUERY_LENGTH) return EMPTY_ATTEMPT()
    const kl = langToKl(opts.lang)
    const df = timeRangeToDf(opts.timeRange)

    // 用 GET 而不是 POST —— 这是本引擎最关键的一处实现选择。
    //
    // 实测（2026-09，同一台机器同一个出口）：
    //   GET  https://html.duckduckgo.com/html/?q=…        → 200，含 result__a/snippet/url 各 10 条
    //   POST https://html.duckduckgo.com/html/（带完整浏览器头 + Cookie） → 202 + 验证墙
    //   GET  https://lite.duckduckgo.com/lite/?q=…        → 202 + 验证墙
    // 即：**同一个端点上，GET 通、POST 被判定为自动化**。
    //
    // 这里与 SearXNG 不同（它用 POST）。原因不是我们抄错，而是它跑在大量不同出口上、
    // 实测 POST 可行；而本机环境下 POST 稳定被拦。GET 是两边都成立的那种写法 ——
    // 优先选「在当前环境里真的能拿到结果」的那条路，并在注释里留证，方便日后复核。
    const url = new URL(DDG_HTML_URL)
    url.searchParams.set("q", query)
    if (kl !== "wt-wt") url.searchParams.set("kl", kl)
    if (df) url.searchParams.set("df", df)

    const response = yield* http.execute(
      HttpClientRequest.get(url.toString()).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          // 语言格式对齐 SearXNG：`{lang},{lang}-{LANG};q=0.7`，
          // 且 DDG 的 no-JS 页面会用它猜用户语言（没有语言选择界面）
          "Accept-Language": acceptLanguageFor(opts.lang),
        }),
      ),
    ).pipe(Effect.timeout("15 seconds"))

    // 403/401 等直接拒绝：报给上层，别伪装成空结果
    if (response.status === 403 || response.status === 401) {
      return { results: [], failure: { kind: "denied" as const, message: `http ${response.status}` } }
    }
    // 303 按 SearXNG 的处理：它当正常空结果返回（`if resp.status_code == 303: return res`），
    // 不是拒绝访问 —— 原实现把 303 与 403 一起当拒绝，那是错的。
    if (response.status === 303) return EMPTY_ATTEMPT()
    if (response.status < 200 || response.status >= 400) return EMPTY_ATTEMPT()

    const html: string = yield* response.text

    // 先判风控：正常页长度远大于 500，长度异常也可能是被拦
    const challenge = detectChallenge(html)
    if (challenge !== undefined) return { results: [], failure: challenge }
    if (html.length < 500) return EMPTY_ATTEMPT()

    const vqdMatch = html.match(/<input[^>]*name=["']vqd["'][^>]*value=["']([^"']+)["']/i)
    if (vqdMatch?.[1]) vqdCache.set(`${query}//${USER_AGENT}`, { vqd: vqdMatch[1], expires: Date.now() + 3600_000 })

    const results = parseHtmlResults(html, numResults)

    // 尝试提取拼写建议（"Did you mean"）并附加到第一条结果上
    const suggestion = extractSuggestion(html)
    if (suggestion && results.length > 0) {
      const augmented = [...results]
      augmented[0] = makeSearchResult({ ...augmented[0], suggestion })
      return { results: augmented }
    }

    return { results }
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
): Effect.Effect<Attempt, unknown, never> {
  return Effect.gen(function* () {
    // 超长查询直接不发：DDG 不接受超过 499 字符（SearXNG 同样在此处 return）
    if (query.length > MAX_QUERY_LENGTH) return EMPTY_ATTEMPT()
    const response = yield* http.execute(
      HttpClientRequest.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout("15 seconds"))

    if (response.status === 403 || response.status === 401) {
      return { results: [], failure: { kind: "denied" as const, message: `http ${response.status}` } }
    }
    // 303 按 SearXNG 的处理：它当正常空结果返回（`if resp.status_code == 303: return res`），
    // 不是拒绝访问 —— 原实现把 303 与 403 一起当拒绝，那是错的。
    if (response.status === 303) return EMPTY_ATTEMPT()
    if (response.status < 200 || response.status >= 400) return EMPTY_ATTEMPT()
    const html: string = yield* response.text

    // 首页也可能直接给风控页（拿不到 vqd 就是这条路走不通的原因之一）
    const challenge = detectChallenge(html)
    if (challenge !== undefined) return { results: [], failure: challenge }

    const vqd = html.match(/vqd\s*=\s*["']([^"']+)["']/)?.[1]
    if (!vqd) return EMPTY_ATTEMPT()

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

    if (jsonResponse.status < 200 || jsonResponse.status >= 400) return EMPTY_ATTEMPT()
    const text: string = yield* jsonResponse.text
    let data: any
    try { data = JSON.parse(text) } catch { return EMPTY_ATTEMPT() }

    const results: SearchResult[] = []
    let pos = 0
    for (const row of (data?.results ?? [])) {
      if (results.length >= numResults) break
      const href = row.u; const title = stripHtml(row.t ?? "")
      if (!href || !title) continue
      pos++
      results.push(makeSearchResult({ title, url: extractUrl(href), snippet: stripHtml(row.a ?? ""), engine: "duckduckgo", position: pos }))
    }
    return { results }
  })
}

function searchLite(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
): Effect.Effect<Attempt, unknown, never> {
  return Effect.gen(function* () {
    // 超长查询直接不发：DDG 不接受超过 499 字符（SearXNG 同样在此处 return）
    if (query.length > MAX_QUERY_LENGTH) return EMPTY_ATTEMPT()
    const response = yield* http.execute(
      HttpClientRequest.get(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout("15 seconds"))

    if (response.status === 403 || response.status === 401) {
      return { results: [], failure: { kind: "denied" as const, message: `http ${response.status}` } }
    }
    // 303 按 SearXNG 的处理：它当正常空结果返回（`if resp.status_code == 303: return res`），
    // 不是拒绝访问 —— 原实现把 303 与 403 一起当拒绝，那是错的。
    if (response.status === 303) return EMPTY_ATTEMPT()
    if (response.status < 200 || response.status >= 400) return EMPTY_ATTEMPT()
    const html: string = yield* response.text

    // lite 端点同样会被风控（实测也返回 202）
    const challenge = detectChallenge(html)
    if (challenge !== undefined) return { results: [], failure: challenge }

    return { results: parseLiteResults(html, numResults) }
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
