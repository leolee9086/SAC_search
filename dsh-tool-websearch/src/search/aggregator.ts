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
 * 计算聚合评分
 *
 * 借鉴 SearXNG 的 calculate_score 算法，但增加了时效性衰减因子和文本相关性。
 *
 * 评分组成：
 * 1. 基础分 = Σ(weight / position) — 位置越前、引擎权重越高，得分越高
 * 2. 多样性加分 = 基础分 × (1 + (引擎数-1) × 0.2) — 多引擎一致结果加分
 * 3. 时效性衰减 = 分 × max(0.5, 1 - 天数/365) — 一年内线性衰减至 50%
 * 4. 文本相关性加分 = 标题匹配 × 2.0 + snippet匹配 × 1.0
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
  // 基础分：加权位置分
  let score = 0
  for (let i = 0; i < engines.length; i++) {
    score += (weights.get(engines[i]) ?? 1.0) / positions[i]
  }

  // 引擎多样性加分（多引擎一致 → 置信度高）
  if (engines.length > 1) score *= 1 + (engines.length - 1) * 0.2

  // 时效性加分（新结果额外加 10%，一年后衰减至 -10%）
  if (publishedDate) {
    const daysAgo = (Date.now() - publishedDate) / 86_400_000
    const recencyFactor = Math.max(0.5, 1 - daysAgo / 365)
    score *= recencyFactor
  }

  // 文本相关性加分（标题和snippet与查询的匹配度）
  if (query && (title || snippet)) {
    const titleRel = title ? snippetRelevance(title, query) : 0
    const snippetRel = snippet ? snippetRelevance(snippet, query) : 0
    score += titleRel * 2.0 + snippetRel * 1.0
  }

  return score
}

export interface AggregateContext {
  weights: Map<string, number>
  maxResults: number
  /** 来自搜索引擎的拼写建议（如 "Did you mean: ..."） */
  suggestion?: string
}

export function aggregate(
  allResults: readonly SearchResult[],
  ctx: AggregateContext,
  query?: string,
): AggregatedResult[] {
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

  // 阶段 3: 评分（含时效性衰减）+ 多样性排序
  for (const r of merged) {
    r.score = calculateScore(r.engines, r.positions, ctx.weights, r.publishedDate, r.title, r.snippet, query)
  }
  merged.sort((a, b) => b.score - a.score)

  return diversifyByDomain(merged, 3).slice(0, ctx.maxResults)
}

/** 计算 snippet 与查询的相关性分数（包含的关键词越多分越高） */
function snippetRelevance(snippet: string, query: string): number {
  if (!query || !snippet) return 0
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const lower = snippet.toLowerCase()
  return terms.filter((t) => lower.includes(t)).length / terms.length
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
