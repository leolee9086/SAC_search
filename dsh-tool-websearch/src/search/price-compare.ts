/**
 * 购物比价专用聚合器
 *
 * 在通用搜索聚合器（Aggregator）的基础上，针对购物比价场景：
 * 1. 从标题/摘要中提取价格字段
 * 2. 按来源平台分组
 * 3. 计算最低价、最高价、价差
 * 4. 生成排序推荐
 *
 * 设计原则：
 * - 输入兼容 Aggregator.aggregate() 的输出
 * - 纯函数，无副作用
 * - 可同时被 websearch tool 和 price-compare tool 使用
 */
import type { AggregatedResult } from "./engine"

// ── 价格信息 ──────────────────────────────────────────

export interface PriceInfo {
  /** 提取到的价格（元） */
  price?: number
  /** 原价/标价 */
  originalPrice?: number
  /** 来源平台名称 */
  source: string
  /** 商品标题 */
  title: string
  /** 商品链接 */
  url: string
  /** 摘要片段 */
  snippet: string
}

export interface PriceStats {
  /** 各平台最低价汇总 */
  cheapest: { price: number; source: string; title: string; url: string }
  /** 各平台最高价汇总 */
  mostExpensive: { price: number; source: string; title: string; url: string }
  /** 价差 */
  spread: number
  /** 价差百分比 */
  spreadPercent: number
  /** 含价格商品数 */
  pricedCount: number
  /** 各平台价格区间 */
  byPlatform: Map<string, { min: number; max: number; count: number }>
}

// ── 价格提取 ──────────────────────────────────────────

/**
 * 从文本中提取价格（元）
 *
 * 支持格式：
 * - ¥123.00 / ￥123
 * - 123元
 * - $123.45（按 7.2 汇率折算）
 * - 纯数字 123.45
 */
export function detectPrice(text: string): number | undefined {
  if (!text) return undefined
  const cleaned = text.trim()

  // 先移除千位分隔符（逗号），避免 2,599 被误解析为 2.59
  const normalized = cleaned.replace(/,(\d{3})/g, "$1")

  // 人民币: ¥123.00 / ¥2,599 或 ￥123
  const cnyMatch = normalized.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/)
  if (cnyMatch) return parseFloat(cnyMatch[1])

  // 数字 + 元: 123元
  const yuanMatch = normalized.match(/(\d+(?:\.\d{1,2})?)\s*元/)
  if (yuanMatch) return parseFloat(yuanMatch[1])

  // 美元: $123.45
  const usdMatch = normalized.match(/\$\s*(\d+(?:\.\d{1,2})?)/)
  if (usdMatch) return parseFloat(usdMatch[1]) * 7.2

  return undefined
}

/**
 * 格式化价格为人民币显示字符串（含千位分隔符）
 * 例如: 8499 → "¥8,499.00"
 */
export function formatPrice(price: number): string {
  const parts = price.toFixed(2).split(".")
  const intPart = parts[0]
  const decPart = parts[1]
  // 添加千位分隔符
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `¥${formatted}.${decPart}`
}

/**
 * 从聚合结果中提取价格信息
 */
export function extractPrices(results: readonly AggregatedResult[]): PriceInfo[] {
  return results.map((r) => {
    const fullText = `${r.title} ${r.snippet}`
    const price = detectPrice(fullText)
    const source = extractSource(r.url)

    return {
      price,
      title: r.title.replace(/[¥￥]\s*\d+(?:[.,]\d{1,2})?/, "").trim() || r.title,
      url: r.url,
      source,
      snippet: r.snippet,
    }
  })
}

/**
 * 计算价格统计信息
 */
export function computeStats(prices: PriceInfo[]): PriceStats | undefined {
  const priced = prices.filter((p) => p.price !== undefined && p.price !== null) as Array<
    PriceInfo & { price: number }
  >
  if (priced.length < 1) return undefined

  // 按平台分组
  const byPlatform = new Map<string, { min: number; max: number; count: number }>()
  for (const p of priced) {
    const stats = byPlatform.get(p.source) ?? { min: Infinity, max: -Infinity, count: 0 }
    stats.min = Math.min(stats.min, p.price)
    stats.max = Math.max(stats.max, p.price)
    stats.count++
    byPlatform.set(p.source, stats)
  }

  if (priced.length === 1) {
    return {
      cheapest: priced[0],
      mostExpensive: priced[0],
      spread: 0,
      spreadPercent: 0,
      pricedCount: 1,
      byPlatform,
    }
  }

  // 排序取极值
  const sorted = [...priced].sort((a, b) => a.price - b.price)
  const cheapest = sorted[0]
  const mostExpensive = sorted[sorted.length - 1]
  const spread = mostExpensive.price - cheapest.price
  const spreadPercent = cheapest.price > 0 ? (spread / cheapest.price) * 100 : 0

  return { cheapest, mostExpensive, spread, spreadPercent, pricedCount: priced.length, byPlatform }
}

// ── 报告生成 ──────────────────────────────────────────

/**
 * 生成购物比价结构化报告
 *
 * 调用时机（websearch tool）：
 * 1. aggregate() 得到混合结果
 * 2. 如果 category: "shopping" 结果数量 > 0，调用此函数
 * 3. 替换或补充 formatResults()
 *
 * @param results  聚合后的搜索结果（含 shopping 类别）
 * @param query    原始查询词
 * @returns        格式化的比价报告文本
 */
export function formatShoppingReport(
  results: readonly AggregatedResult[],
  query: string,
): string {
  if (results.length === 0) return ""

  // 分离购物结果和其他结果
  const shopping = results.filter((r) => r.category === "shopping")
  const other = results.filter((r) => r.category !== "shopping")

  const sections: string[] = []
  sections.push(`## 比价报告: "${query}"\n`)

  // 价格提取与分析
  const priceInfos = extractPrices(shopping)
  const stats = computeStats(priceInfos)

  if (stats) {
    // 价格总览
    sections.push(
      `### 价格总览\n` +
      `- **含价格商品**: ${stats.pricedCount} 条\n` +
      `- **最低价**: ${formatPrice(stats.cheapest.price)} — ${stats.cheapest.source}\n` +
      `- **最高价**: ${formatPrice(stats.mostExpensive.price)} — ${stats.mostExpensive.source}\n` +
      (stats.pricedCount >= 2
        ? `- **价差**: ${formatPrice(stats.spread)} (${stats.spreadPercent.toFixed(1)}%)\n`
        : ""),
    )

    // 各平台价格区间
    if (stats.byPlatform.size > 1) {
      sections.push(`### 各平台价格区间\n`)
      for (const [source, s] of stats.byPlatform) {
        if (s.min === s.max) {
          sections.push(`- **${source}**: ${formatPrice(s.min)} (${s.count} 条)`)
        } else {
          sections.push(`- **${source}**: ${formatPrice(s.min)} ~ ${formatPrice(s.max)} (${s.count} 条)`)
        }
      }
      sections.push("")
    }

    // 推荐
    sections.push(
      `### 🏆 推荐\n` +
      `- **${stats.cheapest.title}**\n` +
      `- 价格: **${formatPrice(stats.cheapest.price)}** — ${stats.cheapest.source}\n` +
      `- 链接: ${stats.cheapest.url}\n`,
    )
  } else {
    sections.push(`未从商品信息中提取到明确价格。\n`)
  }

  // 所有商品列表（含无价格商品）
  sections.push(`### 全部商品 (${shopping.length} 条)\n`)
  sections.push(
    priceInfos
      .map((p, i) => {
        const priceStr = p.price !== undefined ? formatPrice(p.price) : "价格待询"
        return `${i + 1}. [${p.source}] ${p.title}\n   💰 ${priceStr}\n   🔗 ${p.url}`
      })
      .join("\n\n"),
  )

  // 其他类别结果
  if (other.length > 0) {
    sections.push(`\n### 其他相关信息 (${other.length} 条)\n`)
    sections.push(
      other
        .slice(0, 3)
        .map((r, i) => {
          return `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet || ""}`
        })
        .join("\n\n"),
    )
  }

  return sections.join("\n\n")
}

// ── 辅助函数 ──────────────────────────────────────────

/** 从 URL 中提取来源名称 */
function extractSource(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    // 常见电商平台映射
    const map: Record<string, string> = {
      "smzdm.com": "什么值得买",
      "jd.com": "京东",
      "taobao.com": "淘宝",
      "tmall.com": "天猫",
      "pinduoduo.com": "拼多多",
      "yangkeduo.com": "拼多多",
      "suning.com": "苏宁易购",
      "gome.com.cn": "国美",
      "amazon.cn": "亚马逊中国",
      "amazon.com": "Amazon.com",
      "ebay.com": "eBay",
      "ebay.de": "eBay",
      "vip.com": "唯品会",
      "1688.com": "1688批发",
      "dangdang.com": "当当",
      "kaola.com": "考拉海购",
    }
    return map[hostname] || hostname
  } catch {
    return url
  }
}

export * as PriceCompare from "./price-compare"
