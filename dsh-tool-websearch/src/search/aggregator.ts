/**
 * 搜索结果聚合器
 *
 * 借鉴 SearXNG 的 ResultContainer 设计，实现去重、合并、评分、排序。
 */
import type { AggregatedResult, SearchResult } from "./engine"
import { makeAggregatedResult } from "./engine"

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
export function queryTerms(query: string): string[] {
  const terms: string[] = []
  const lower = query.toLowerCase()
  for (const m of lower.matchAll(/[a-z0-9]{2,}/g)) terms.push(m[0])
  const cjkRuns = query.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g) ?? []
  for (const run of cjkRuns) {
    if (run.length === 1) { terms.push(run); continue }
    for (let i = 0; i < run.length - 1; i++) terms.push(run.slice(i, i + 2))
  }
  return terms
}

/**
 * 文本与查询的相关性，0..1。
 *
 * 只做「词项命中比例」这一个朴素判断 —— 但对"把不相关的东西挡下去"
 * 这个目的已经够用，而且快、无依赖、可解释。
 */
export function relevance(text: string, query: string): number {
  if (text === "" || query.trim() === "") return 0
  const terms = queryTerms(query)
  if (terms.length === 0) return 0
  const lower = text.toLowerCase()
  let hit = 0
  for (const t of terms) if (lower.includes(t)) hit++
  return hit / terms.length
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
    // 下界 0.15：即使判为不相关也留一点分，避免我们的相关性算法误判时把好结果彻底埋掉
    score *= 0.15 + 0.85 * rel
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

  // 阶段 1: URL 去重
  const urlMap = new Map<string, SearchResult[]>()
  for (const r of allResults) {
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
        `\n   ${r.snippet ?? ""}`
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
