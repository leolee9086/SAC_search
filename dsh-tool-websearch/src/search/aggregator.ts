/**
 * 搜索结果聚合器
 *
 * 借鉴 SearXNG 的 ResultContainer 设计，实现去重、合并、评分、排序。
 */
import type { AggregatedResult, SearchResult } from "./engine"
import { makeAggregatedResult } from "./engine"
import { segmentCjk } from "./zh-cn"

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.protocol = "https:"
    if (u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1)
    ;["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "source"]
      .forEach((p) => u.searchParams.delete(p))
    u.searchParams.sort()
    return u.toString()
  } catch { return url }
}

/**
 * 把搜索引擎的**跳转链接**还原成真实 URL。
 *
 * 两个理由，第二个比第一个重要得多：
 *
 * 1. **可读性**：`bing.com/ck/a?...&u=a1aHR0cHM6...` 这种链接，
 *    模型（和我）看不出目标站点、也无法判断这条结果值不值得打开。
 * 2. **去重**：同一个页面经不同引擎返回时，外层跳转链接各不相同 ——
 *    不还原就是两条独立结果，于是"多引擎共识"这个最重要的排序信号被稀释。
 *    所以解包必须发生在**去重之前**。
 *
 * 只做**能纯解码**的（Bing、Google）；百度/搜狗的 `link?url=` 是不透明参数，
 * 需要额外发请求才能还原 —— 那会给每次搜索加一轮网络往返，
 * 收益不抵开销，保持原样即可。
 */
export function unwrapRedirectUrl(url: string): string {
  /*
   * 运行时保护：url 可能真的是 undefined。
   *
   * `url: string` 只是 TypeScript 的承诺，而**引擎解析出来的数据不受它约束**。
   * 实测复现过：某个引擎返回了一条没有 url 的结果，而下面那行 `.replace()`
   * 原本写在 `try` **外面**，于是**一条脏数据就让整次聚合抛错** ——
   * 页签里看到的就是 `Cannot read properties of undefined (reading 'replace')`。
   */
  if (typeof url !== "string") return url
  /*
   * 先把 HTML 实体还原成真正的字符。
   *
   * 为什么必须做：有些引擎（实测 bing）返回的 URL 里 `&` 被转义成 `&amp;`。
   * 而 `new URL("...&amp;u=xxx")` 解析出来的参数名是 **`amp;u`** 而不是 `u`，
   * 于是 `searchParams.get("u")` 永远返回 null —— **解包静默失效**。
   *
   * 这个坑特别隐蔽：解包函数本身不报错、不抛异常，只是永远拿不到东西，
   * 看起来"已实现"其实一条都没解开。所以这里先还原再解析。
   */
  const cleaned = url.replace(/&amp;/gi, "&").replace(/&#0?38;/g, "&")
  try {
    const u = new URL(cleaned)
    const host = u.hostname.replace(/^www\./, "")

    // Bing: /ck/a?...&u=a1<base64>   （a1 是它加的标记，不是 base64 内容）
    if (host === "bing.com" && u.pathname.startsWith("/ck/a")) {
      const raw = u.searchParams.get("u")
      if (raw !== null && raw.startsWith("a1")) {
        const b64 = raw.slice(2).replace(/-/g, "+").replace(/_/g, "/")
        const decoded = Buffer.from(b64, "base64").toString("utf8")
        if (/^https?:\/\//.test(decoded)) return decoded
      }
    }

    // Google: /url?q=<urlencoded>&sa=...  （这个 q 本身就是明文，只是被编码了）
    if (host.endsWith("google.com") && u.pathname === "/url") {
      const q = u.searchParams.get("q") ?? u.searchParams.get("url")
      if (q !== null && /^https?:\/\//.test(q)) return q
    }

    // 没解包成功也返回还原过实体的版本 —— 至少 URL 本身是干净可用的
    return cleaned
  } catch {
    return cleaned
  }
}

function levenshtein(a: string, b: string): number {
  const m = a.length; const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  // 滚动数组：只用两行替代 m×n 二维数组，空间 O(n)
  let prev = new Array<number>(n + 1)
  let curr = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : Math.min(prev[j], curr[j - 1], prev[j - 1]) + 1
    }
    [prev, curr] = [curr, prev]
  }
  return prev[n]
}

function isSimilarTitle(a: string, b: string): boolean {
  // 快速路径：完全相同直接返回
  if (a === b) return true
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return true
  // 快速路径：长度差异超过 30% 直接跳过
  const minLen = Math.min(a.length, b.length)
  if (minLen > 0 && (maxLen - minLen) / maxLen > 0.3) return false
  return levenshtein(a, b) / maxLen < 0.2
}

/**
 * 把查询切成可匹配的词项。
 *
 * 为什么要专门处理 CJK：`split(/\s+/)` 对中文**完全失效** ——
 * 「向上滚动自动加载」会被当成一个词，跟任何文本都匹配不上，
 * 于是中文查询的相关性恒为 0，相关性这一维等于没有。
 *
 * 这里对 CJK 用 **bigram**（相邻两字成词），这是 CJK 检索的标准做法：
 * 不需要词典，召回过得去、精度也够用（「向上滚动」→ 向上/上滚/滚动）。
 * 英文与数字按连续字母数字切分，长度 < 2 的丢掉（单字母噪声太大）。
 */
/**
 * 把查询切成词项。
 *
 * 中文优先用**结巴词典分词**（`segmentCjk`，见 `zh-cn.ts`）；
 * 词典不可用时退回 bigram（相邻两字成词）。
 *
 * 为什么换掉 bigram：「设计师兼程序员怎么赚钱」按 bigram 会被切成 10 个碎片
 * （设计/计师/师兼/兼程/程序/序员/员怎/怎么/么赚/赚钱），
 * 一条明显相关的结果常常只命中一两个 → 相关性算出来只有 0.11~0.2，
 * 和完全无关的 0 拉不开差距。用真分词切出来是
 * 「设计师 / 程序员 / 赚钱」，命中就是实打实的命中。
 *
 * bigram 仍保留作降级路径：它不依赖任何数据文件，永远不会失效。
 */
export function queryTerms(query: string): string[] {
  // 按查询缓存：relevance() 对每条结果都会调到这里，
  // 不缓存的话一次搜索会对同一个查询重复分词几十上百遍
  if (query === cachedQuery) return cachedTerms
  cachedTerms = computeTerms(query)
  cachedQuery = query
  return cachedTerms
}

let cachedQuery: string | undefined
let cachedTerms: string[] = []

function computeTerms(query: string): string[] {
  const terms: string[] = []
  const lower = query.toLowerCase()
  // 英文与数字：按连续字母数字切分，长度 < 2 的丢掉（单字母噪声太大）
  for (const m of lower.matchAll(/[a-z0-9]{2,}/g)) terms.push(m[0])

  const cjkRuns = query.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g) ?? []

  let segmented = false
  for (const run of cjkRuns) {
    const words = segmentCjk(run)
    if (words !== null) {
      segmented = true
      for (const w of words) terms.push(w)
    }
  }

  // 词典不可用、或整条查询都是停用词（比如就问「怎么办」）→ 退回 bigram，
  // 否则词项为空会让所有结果的相关性一起归零
  if (!segmented || terms.length === 0) {
    for (const run of cjkRuns) {
      if (run.length === 1) {
        terms.push(run)
        continue
      }
      for (let i = 0; i < run.length - 1; i++) terms.push(run.slice(i, i + 2))
    }
  }

  return [...new Set(terms)]
}

/**
 * 中文高频虚字（相关性计算时不计入）。
 *
 * 为什么要排除：像「怎么利用AI赚钱」这种查询里，"怎""么"是虚字 ——
 * 任何含"怎么"的中文文本都会命中它们，字符覆盖率被凭空拉高，
 * 无关页面也能拿到"相关"的评价。
 *
 * 只收**最没有歧义**的一批。像「中/上/下/多/少/能/会/为/以/到」这些
 * 在很多查询里是实义字（中间件、上线、能效、会计…），
 * 排除它们会误伤真相关内容，所以宁可少收几个。
 */
const CJK_STOP_CHARS = new Set([
  ...'的了是在和与及或等这那你我他她它们就都而之吗呢吧啊么怎什么怎样如何',
])

/**
 * 查询里的 CJK 字符（去重）。
 *
 * 取的是「查询里出现过哪些字」，不区分顺序 —— 这正是它比 bigram 宽容的地方。
 */
function cjkChars(query: string): string[] {
  const chars = query.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? []
  const unique = [...new Set(chars)]
  const meaningful = unique.filter((c) => !CJK_STOP_CHARS.has(c))
  // 若整条查询都是虚字（比如就问「怎么办」），那就不过滤 ——
  // 宁可相关性算得粗一点，也不能让所有结果因为"没有实义字"而一起归零
  return meaningful.length > 0 ? meaningful : unique
}

/**
 * 文本与查询的相关性，0..1。
 *
 * 两个互补的判据，**取较大者**（而非加权平均 —— 两者擅长的情况不同，
 * 平均会把各自的优势互相稀释）：
 *
 * ① **词项命中率**（英文按词、中文按 bigram）—— 精确，但对**长中文查询太严**：
 *    「设计师兼程序员怎么赚钱」会被切成 9 个 bigram，
 *    一条明显相关的结果（标题「程序员副业赚钱指南」）通常只命中一两个
 *    → 0.11~0.22，而完全无关的结果是 0。
 *    再经 `score *= 0.15 + 0.85 * rel`，两者只差 0.24 vs 0.15 ——
 *    **区分度不足以把无关结果压下去**：实测 BrainyQuote 名言站、
 *    法语自助出版站排进了前 4 名。
 *
 * ② **中文字符覆盖率** —— 粒度更粗，但判"相关/无关"更稳：
 *    相关的标题会覆盖查询里的大部分实义字，无关的几乎一个都不沾。
 *    乘 0.75 是因为它天然比 bigram 宽松（粒度小），不该完全压过 ①。
 */
export function relevance(text: string, query: string): number {
  if (text === "" || query.trim() === "") return 0
  const lower = text.toLowerCase()

  const terms = queryTerms(query)
  const termScore = terms.length === 0
    ? 0
    : terms.filter((t) => lower.includes(t)).length / terms.length

  const chars = cjkChars(query)
  const charScore = chars.length === 0
    ? 0
    : chars.filter((c) => lower.includes(c)).length / chars.length

  return Math.max(termScore, charScore * 0.75)
}

/**
 * 计算聚合评分。
 *
 * ## 前半段：共识分（严格对齐 SearXNG 的 `calculate_score`）
 *
 * SearXNG 的算法是：
 * ```
 * weight = Π(引擎权重) × 命中次数
 * score  = Σ(weight / position)
 * ```
 *
 * 关键在第二个乘数：**命中次数是线性放大**。
 * 我们原来写的是 `1 + (命中数-1) × 0.2`（饱和增长）——
 * 命中 5 个引擎只放 1.8 倍，而 SearXNG 是 5 倍。
 * 后果是「多个引擎一致认可的结果」和「某个小众引擎的噪声结果」得分接近，
 * 共识这一维基本失效。
 *
 * ## 后半段：相关性（**这是我们与 SearXNG 的关键分歧，必须保留**）
 *
 * SearXNG 不做文本相关性，因为它只信少数几个高质量引擎
 * （Google/Bing/DDG），那些引擎自身的相关性排序就可靠。
 *
 * **但我们的引擎池是 186 个、质量参差**，不能照搬"信任引擎"的前提：
 * 实测搜前端技术词会返回电影、代数几何论文、App Store 应用 ——
 * 只因为它们恰好被某个窄领域引擎排在了前面。
 * 所以必须自己算相关性。
 *
 * ⚠️ 但相关性**必须是乘法、且不能压过基础分**。
 * 早先写成加法（`score += titleRel × 2 + snippetRel`）是个严重错误：
 * 加法项最大 3.0，而基础分通常只有 1 左右 ——
 * 于是「标题里碰巧含几个查询词」直接压过了「多少引擎认可它」，
 * 排序彻底失真。改成乘法后，不相关的整体打折、相关的不额外膨胀，主次就正了。
 */
export function calculateScore(
  engines: readonly string[],
  positions: readonly number[],
  weights: Map<string, number>,
  publishedDate?: number,
  title?: string,
  snippet?: string,
  query?: string,
): number {
  // ── 共识分：Π(权重) × 命中次数，再按位置折算 ──
  let weight = 1
  for (const e of engines) weight *= weights.get(e) ?? 1.0
  weight *= Math.max(1, positions.length)

  let score = 0
  for (const p of positions) score += weight / Math.max(1, p)

  // ── 相关性：乘法因子 ──
  if (query !== undefined && query.trim() !== '') {
    const titleRel = title === undefined ? 0 : relevance(title, query)
    const snippetRel = snippet === undefined ? 0 : relevance(snippet, query)
    // 标题比摘要更权威，所以取「标题相关性」与「打折后的摘要相关性」中的较大者
    const rel = Math.max(titleRel, snippetRel * 0.6)
    /*
     * 下界 0.02：判为完全不相关的结果压到 2%。
     *
     * 这个数字是从 0.15 → 0.05 → 0.02 一路降下来的，每次都有实测依据：
     *
     * - **0.15** 时：无关 ×0.15 vs 中文长查询的相关 ×0.24 —— 只差 1.6 倍，
     *   噪声凭"命中数"或"发布时间"就能翻过去（BrainyQuote、法语出版站排进前 4）。
     * - **0.05** 时：换用结巴分词后相关性能到 0.33~0.67，看起来够了，
     *   但实测仍有一条 Solana 币价混进第 4 名 —— 因为它的**基础分**很高
     *   （在 bing 里排第 1：weight 0.9 × 1/1），×0.05 后仍有 0.045，
     *   而一条"相关但排位靠后"的结果基础分只有 0.1 左右，
     *   ×0.36 后是 0.036，反而更低。**基础分的差距压过了相关性。**
     * - **0.02** 时：无关最高 0.9 × 0.02 = 0.018，相关最低 0.1 × 0.343 = 0.034，
     *   相关性这一维终于能稳定地压住排位差异。
     *
     * 为什么保留一个非零下界而不是直接归零：我们的相关性算法是朴素的，
     * 总有判错的时候。留 2% 让它至少还能按共识分排序，
     * 而不是在"整批结果都不相关"时全军覆没成一片零分。
     */
    score *= 0.02 + 0.98 * rel
  }

  // ── 时效性：**只做微调，不改变主序** ──
  //
  // 原来是一年衰减到 0.5（`max(0.5, 1 - 天数/365)`），力度过大：
  // 一篇稍微旧但高度相关、多引擎共识的文档，会被一篇新的泛泛之谈翻过去。
  // 时效性的正确做法是交给引擎的时间过滤（timeRange），
  // 排序里的衰减只该起"同分时偏向新内容"的作用。
  if (publishedDate !== undefined) {
    const daysAgo = (Date.now() - publishedDate) / 86_400_000
    score *= Math.max(0.75, 1 - (daysAgo / 365) * 0.25)
  }

  return score
}

export interface AggregateContext {
  weights: Map<string, number>
  maxResults: number
  /** 来自搜索引擎的拼写建议（如 "Did you mean: ..."） */
  suggestion?: string
}

/**
 * 聚合各阶段的数量。
 *
 * 为什么要把这些数字报出来：**"显示 8 条"和"召回 300 条里显示 8 条"
 * 是完全不同的信息**。只给结果不给数量，调用方就不知道自己错过了多少，
 * 也无法判断该加大条数还是换关键词重搜。
 */
export interface AggregateStats {
  /** 各引擎返回的原始条目总数 */
  raw: number
  /** URL 去重后的条数 */
  deduped: number
  /** 相似标题合并后的条数（= 可排序的全部候选） */
  merged: number
  /** 实际输出给调用方的条数 */
  shown: number
}

export interface AggregateOutcome {
  results: AggregatedResult[]
  stats: AggregateStats
}

export function aggregate(
  allResults: readonly SearchResult[],
  ctx: AggregateContext,
  query?: string,
): AggregateOutcome {
  // 从原始结果中提取拼写建议
  if (!ctx.suggestion) {
    for (const r of allResults) {
      if (r.suggestion) { ctx.suggestion = r.suggestion; break }
    }
  }

  /*
   * 阶段 0: 还原跳转链接，并丢掉**没有 URL** 的结果。必须在去重之前 ——
   * 同一页面经不同引擎的跳转链接外层各不相同，不还原就会被当成两条独立结果，
   * "多引擎共识"这个最重要的排序信号就稀释了。
   *
   * 为什么这里要显式过滤：`SearchResult.url` 的类型是 string，但那是**我们的**承诺，
   * 而引擎解析出来的数据不受它约束 —— 实测出现过 url 为 undefined 的条目
   * （页签里报 `Cannot read properties of undefined (reading 'replace')`）。
   * URL 既是去重键也是结果的核心字段，没有它的条目留着毫无意义，
   * 只会在下游各处逼着每个函数都做防御。**在入口挡掉比到处打补丁干净。**
   */
  const resolved: SearchResult[] = []
  for (const r of allResults) {
    if (typeof r.url !== "string" || r.url === "") {
      // 报出**是谁**吐了脏数据 —— 不然只能在这一层一直挡，修不到源头。
      // 只在 DEBUG 下打，且走 stderr，不污染返回给模型的结果文本。
      if (process.env.DSH_WEBSEARCH_DEBUG === "1") {
        process.stderr.write(
          `[websearch] 丢弃无 URL 的结果: engine=${String(r.engine)} title=${JSON.stringify(r.title)}\n`,
        )
      }
      continue
    }
    const unwrapped = unwrapRedirectUrl(r.url)
    resolved.push(unwrapped === r.url ? r : { ...r, url: unwrapped })
  }

  // 阶段 1: URL 去重
  const urlMap = new Map<string, SearchResult[]>()
  for (const r of resolved) {
    const key = normalizeUrl(r.url)
    const group = urlMap.get(key) ?? []
    group.push(r)
    urlMap.set(key, group)
  }

  const mergedByUrl: AggregatedResult[] = []
  for (const [, group] of urlMap) mergedByUrl.push(mergeGroup(group, query))

  // 阶段 2: 相似标题合并
  const merged: AggregatedResult[] = []
  const used = new Set<number>()
  for (let i = 0; i < mergedByUrl.length; i++) {
    if (used.has(i)) continue
    used.add(i)
    const similarGroup: AggregatedResult[] = [mergedByUrl[i]]
    for (let j = i + 1; j < mergedByUrl.length; j++) {
      if (used.has(j)) continue
      if (isSimilarTitle(mergedByUrl[i].title, mergedByUrl[j].title)) {
        used.add(j)
        similarGroup.push(mergedByUrl[j])
      }
    }
    merged.push(similarGroup.length === 1 ? similarGroup[0] : mergeSimilar(similarGroup))
  }

  // 阶段 3: 评分 + 排序
  for (const r of merged) {
    r.score = calculateScore(r.engines, r.positions, ctx.weights, r.publishedDate, r.title, r.snippet, query)
  }
  merged.sort((a, b) => b.score - a.score)

  const shown = diversifyByDomain(merged, 3).slice(0, ctx.maxResults)

  return {
    results: shown,
    stats: {
      raw: allResults.length,
      deduped: mergedByUrl.length,
      merged: merged.length,
      shown: shown.length,
    },
  }
}

/** 计算 snippet 与查询的相关性分数（包含的词项越多分越高） */
function snippetRelevance(snippet: string, query: string): number {
  return relevance(snippet, query)
}

function mergeGroup(group: SearchResult[], query?: string): AggregatedResult {
  const first = group[0]
  const engines: string[] = []
  const positions: number[] = []
  let bestTitle = first.title
  let bestSnippet = first.snippet
  let bestDate = first.publishedDate
  let suggestion: string | undefined

  // 选择最长的标题、相关性最高的 snippet
  for (const r of group) {
    engines.push(r.engine)
    positions.push(r.position)
    if (r.title.length > bestTitle.length) bestTitle = r.title
    // snippet 选择：优先选择包含更多查询词的，其次选最长的
    const q = query ?? ""
    if (snippetRelevance(r.snippet, q) > snippetRelevance(bestSnippet, q) ||
        (snippetRelevance(r.snippet, q) === snippetRelevance(bestSnippet, q) &&
         r.snippet.length > bestSnippet.length)) {
      bestSnippet = r.snippet
    }
    if (r.publishedDate && (!bestDate || r.publishedDate > bestDate)) bestDate = r.publishedDate
    if (r.suggestion && !suggestion) suggestion = r.suggestion
  }

  return makeAggregatedResult({
    title: bestTitle, url: first.url, snippet: bestSnippet,
    engines, positions, publishedDate: bestDate, category: first.category,
    suggestion,
  })
}

function mergeSimilar(group: AggregatedResult[]): AggregatedResult {
  const first = group[0]
  const suggestion = group.find((r) => r.suggestion)?.suggestion
  return makeAggregatedResult({
    title: first.title,
    url: first.url,
    snippet: group.reduce((best, r) => r.snippet.length > best.length ? r.snippet : best, first.snippet),
    engines: [...new Set(group.flatMap((r) => r.engines))],
    positions: group.flatMap((r) => r.positions),
    publishedDate: group.reduce(
      (best, r) => r.publishedDate && (!best || r.publishedDate > best) ? r.publishedDate : best,
      first.publishedDate,
    ),
    category: first.category,
    suggestion,
  })
}

function diversifyByDomain(results: AggregatedResult[], maxPerDomain: number): AggregatedResult[] {
  const domainCount = new Map<string, number>()
  const diversified: AggregatedResult[] = []
  const remaining: AggregatedResult[] = []

  for (const r of results) {
    try {
      const domain = new URL(r.url).hostname.replace(/^www\./, "")
      const count = domainCount.get(domain) ?? 0
      if (count < maxPerDomain) {
        domainCount.set(domain, count + 1)
        diversified.push(r)
      } else {
        remaining.push(r)
      }
    } catch { diversified.push(r) }
  }
  diversified.push(...remaining)
  return diversified
}

/** 单条摘要的字符上限 */
const MAX_SNIPPET_CHARS = 600

/**
 * 清理并截断摘要。
 *
 * 两件事都必须做，都是实测踩出来的：
 *
 * 1. **压缩空白**：有的引擎会把带大量连续空白的原文直接塞进来
 *    （实测一条 GitHub 结果的摘要有几百个全角空格），
 *    在输出里就是一大片"空白"，纯浪费上下文。
 * 2. **截断**：`github-issues` / `npm` 这类 API 引擎会把**整篇文档**当摘要返回，
 *    实测出现过几万字符的一条 —— 一条就挤掉了其余所有结果的可见度。
 *
 * 上限给 600 字是有意的：这个长度足够容纳一段完整的实用信息
 * （比如妊娠糖尿病的一日三餐菜谱，实测约 500 字），
 * 又不至于让单条结果失控。**不能截得太短** —— 之前 300 字的限制
 * 会把这类有价值的长摘要切掉一半。
 */
function cleanSnippet(text: string): string {
  const collapsed = text.replace(/[\s\u3000]+/g, " ").trim()
  return collapsed.length > MAX_SNIPPET_CHARS
    ? collapsed.slice(0, MAX_SNIPPET_CHARS) + "…"
    : collapsed
}

export function formatResults(results: AggregatedResult[], query: string, ctxSuggestion?: string): string {
  if (results.length === 0) return ""

  /** 从 URL 中提取域名 */
  function extractDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url }
  }

  const lines = results.map(
    (r, i) => {
      const meta: string[] = [`[${extractDomain(r.url)}]`]
      if (r.category) meta.push(r.category.toUpperCase())
      // 关键词语气提示（灵感：BettaFish Sentiment Analysis）
      const sentiment = detectSentiment(r.title + " " + r.snippet)
      if (sentiment) meta.push(sentiment)
      const engineStr = r.engines.length === 1
        ? r.engines[0]
        : `${r.engines[0]}+${r.engines.length - 1}更多`

      return (
        `${i + 1}. ${r.title}\n` +
        `   ${meta.join(" · ")}\n` +
        `   ${engineStr} | ${r.url}` +
        (r.publishedDate ? `\n   日期: ${new Date(r.publishedDate).toISOString().slice(0, 10)}` : "") +
        `\n   ${cleanSnippet(r.snippet ?? "")}`
      )
    },
  )

  const parts: string[] = [
    `搜索 "${query}" 共 ${results.length} 条结果：`,
    ...lines,
  ]

  // 如果有拼写建议，追加在末尾
  const suggestion = results.find((r) => r.suggestion)?.suggestion ?? ctxSuggestion
  if (suggestion) {
    parts.push(`\n您是不是想找: ${suggestion}`)
  }

  return parts.join("\n\n")
}

// ── 结构化报告格式（灵感：BettaFish 的 Report Agent + Forum 协作机制）─

/** 搜索结果类别分组 */
interface CategoryGroup {
  category: string
  sources: string[]
  results: AggregatedResult[]
}

/**
 * 将结果格式化为结构化分析报告。
 *
 * 借鉴 BettaFish Report Agent 的设计，生成包含摘要、分类聚合、
 * 来源多样性分析和趋势洞察的结构化报告，适合 LLM 深度阅读。
 */
export function formatStructuredReport(results: AggregatedResult[], query: string): string {
  if (results.length === 0) return ""

  /** 提取域名 */
  function domain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url }
  }

  // 1. 按类别分组
  const groups = new Map<string, CategoryGroup>()
  for (const r of results) {
    const cat = r.category || "general"
    if (!groups.has(cat)) groups.set(cat, { category: cat, sources: [], results: [] })
    const g = groups.get(cat)!
    g.results.push(r)
    const d = domain(r.url)
    if (!g.sources.includes(d)) g.sources.push(d)
  }

  // 2. 统计信息
  const allSources = new Set(results.map((r) => domain(r.url)))
  const engineSet = new Set(results.flatMap((r) => r.engines))
  const topSource = [...allSources].slice(0, 5)

  // 3. 情感/语气分析（灵感：BettaFish 多语言情感分析）
  const sentiments = results.map((r) => detectSentiment(r.title + " " + r.snippet))
  const positive = sentiments.filter((s) => s === "[正面]").length
  const negative = sentiments.filter((s) => s === "[负面]").length
  const neutral = sentiments.filter((s) => s === "[中性]").length
  const sentimentSummary = positive + negative + neutral > 0
    ? `${positive} 正面 · ${neutral} 中性 · ${negative} 负面`
    : "未检测到明显情感倾向"

  // 4. 生成报告
  const sections: string[] = []

  // 摘要
  sections.push(
    `## 搜索结果分析报告: "${query}"\n` +
    `\n` +
    `**概览**: 共检索到 ${results.length} 条结果，来自 ${allSources.size} 个来源 ` +
    `（${engineSet.size} 个搜索引擎）。\n` +
    `**主要来源**: ${topSource.join(", ")}。\n` +
    `**覆盖类别**: ${[...groups.keys()].join(", ")}。\n` +
    `**时效性**: ${getTimeliness(results)}。\n` +
    `**情感倾向**: ${sentimentSummary}。`,
  )

  // 各类别结果
  let rank = 0
  for (const [cat, group] of groups) {
    const label = CATEGORY_LABELS[cat] || cat
    sections.push(
      `### ${label}（${group.results.length} 条）\n` +
      `来源: ${group.sources.join(", ")}\n` +
      group.results.slice(0, 5).map((r) => {
        rank++
        return (
          `${rank}. **${r.title}**\n` +
          `   [${domain(r.url)}] | ${r.url}\n` +
          (r.publishedDate ? `   日期: ${new Date(r.publishedDate).toISOString().slice(0, 10)}\n` : "") +
          `   ${r.snippet || ""}`
        )
      }).join("\n\n"),
    )
  }

  // 来源多样性分析
  sections.push(
    `### 来源分析\n` +
    `- **独立来源数**: ${allSources.size}\n` +
    `- **搜索引擎数**: ${engineSet.size}\n` +
    `- **最高分**: ${(results[0]?.score ?? 0).toFixed(1)}\n` +
    `- **来源列表**: ${[...allSources].join(", ")}`,
  )

  sections.push(
    `---\n*报告由 opencode Search 生成 | ` +
    `共 ${results.length} 条结果 · ${allSources.size} 来源 · ` +
    `引擎: ${[...engineSet].join(", ")}*`,
  )

  return sections.join("\n\n")
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "综合信息",
  video: "视频",
  image: "图片",
  music: "音乐",
  code: "代码/技术",
  academic: "学术",
  news: "新闻",
  social: "社交",
  shopping: "购物比价",
  encyclopedia: "百科",
}

function getTimeliness(results: AggregatedResult[]): string {
  const dates = results.map((r) => r.publishedDate).filter((d): d is number => d !== undefined)
  if (dates.length === 0) return "多数结果未标注日期"
  
  const now = Date.now()
  const oldest = Math.min(...dates)
  const newest = Math.max(...dates)
  const rangeDays = Math.round((now - oldest) / 86400000)
  const newestDays = Math.round((now - newest) / 86400000)
  
  if (newestDays <= 1) return "包含最新（1 天内）内容"
  if (newestDays <= 7) return "包含本周内容"
  if (rangeDays <= 30) return `近一月内的内容（最新 ${newestDays} 天前）`
  return `内容时间跨度约 ${rangeDays} 天（最新 ${newestDays} 天前）`
}

// ── 简易关键词语气检测（灵感：BettaFish 多语言情感分析）──────

/** 正向关键词 */
const POSITIVE_WORDS = /\b(excellent|amazing|great|wonderful| fantastic|beautiful|love|best|perfect|成功|优秀|出色|突破|创新|领先|好评)/i

/** 负向关键词 */
const NEGATIVE_WORDS = /\b(terrible|awful|horrible|worst|bad|hate|fail|error|crisis|惨淡|失败|崩盘|暴跌|争议|丑闻|批评|投诉|爆炸|死亡)/i

/** 争议/中立关键词 */
const NEUTRAL_WORDS = /\b(分析|调查|报道|研究|report|analysis|survey|review|update|公告|声明|回应)/i

/**
 * 基于关键词的简易语气检测。
 * 轻量级实现，无需 ML 模型，快速给出结果的情感倾向提示。
 */
function detectSentiment(text: string): string | undefined {
  if (POSITIVE_WORDS.test(text)) return "[正面]"
  if (NEGATIVE_WORDS.test(text)) return "[负面]"
  if (NEUTRAL_WORDS.test(text)) return "[中性]"
  return undefined
}

/** 格式化引擎健康状态报告 */
export function formatEngineStatusReport(statuses: Map<string, import("./engine").EngineStatus>): string {
  const lines: string[] = ["引擎健康状态报告："]
  for (const [name, s] of statuses) {
    const latency = s.metrics.successfulRequests > 0
      ? `${Math.round(s.metrics.avgLatency)}ms avg`
      : "no data"
    const successRate = s.metrics.totalRequests > 0
      ? `${Math.round((s.metrics.successfulRequests / s.metrics.totalRequests) * 100)}%`
      : "no data"
    lines.push(
      `  ${name}:` +
      ` ${s.suspended ? "🔴暂停中" : "🟢正常"}` +
      ` 成功率=${successRate}` +
      ` 延迟=${latency}` +
      ` 连续失败=${s.consecutiveFailures}` +
      (s.lastError ? ` 上次错误="${s.lastError}"` : ""),
    )
  }
  return lines.join("\n")
}

export * as Aggregator from "./aggregator"
