/**
 * 查询意图检测
 *
 * 根据查询文本自动推断搜索意图，动态选择最适合的引擎组。
 * 不需要调用方手动指定 queryType。
 */
import type { SearchEngine } from "./engine"

/**
 * 扩展的查询意图类型，包含 GitHub 仓库/代码搜索检测
 */
export interface GitHubIntent {
  /** 检测到的 GitHub 仓库 owner */
  owner?: string
  /** 检测到的 GitHub 仓库 name */
  repo?: string
  /** 是否为 GitHub 仓库查询（owner/repo 格式） */
  isGitHubRepo?: boolean
  /** 是否为 GitHub 代码搜索（含 repo: 限定符） */
  isGitHubCodeSearch?: boolean
  /** 是否为 GitHub issue/PR 查询（含 github.com 链接或 issue 关键词） */
  isGitHubIssue?: boolean
}

// ── GitHub 检测模式 ─────────────────────────────────

/** GitHub 仓库匹配: owner/repo (如 facebook/react, anomalyco/opencode) */
const GITHUB_REPO_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/

/** GitHub 代码搜索限定符: repo:owner/name */
const GITHUB_CODE_QUALIFIER = /\brepo:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\b/

/** GitHub URL 匹配: github.com/owner/repo */
const GITHUB_URL_PATTERN = /github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/

/** 编程语言/框架名称（用于 GitHub 代码搜索检测） */
const GITHUB_CODE_KEYWORDS = /\b(repo|code search|in:file|language:)\b/i

// ── 意图类型 ──────────────────────────────────────────

export interface QueryIntent extends Partial<GitHubIntent> {
  queryType?: "general" | "code" | "news" | "academic" | "social" | "video" | "shopping"
  isTranslation?: boolean
  isCurrency?: boolean
  isWeather?: boolean
  isUrlLookup?: boolean
}

// ── 检测规则 ──────────────────────────────────────────

// 编程语言名称（用于代码类检测）
const LANG_NAMES = [
  "rust", "python", "typescript", "javascript", "go", "golang",
  "java", "cplusplus", "csharp", "ruby", "swift", "kotlin", "scala",
  "php", "perl", "lua", "haskell", "elixir", "clojure",
  "dart", "flutter", "react", "vue", "angular", "node",
  "deno", "bun", "nextjs", "nuxt", "svelte",
]

const LANG_PATTERN = new RegExp(`\\b(${LANG_NAMES.join("|")})\\b`, "i")

// 货币代码
const CURRENCY_PATTERN = /\b([A-Z]{3})\s+(?:to|in|=>)\s+([A-Z]{3})\b/i

// 天气关键词
const WEATHER_PATTERN = /\b(weather|temperature|forecast|°[cf]|humidity|wind|rain|snow)\b/i
const WEATHER_CN = /天气|温度|预报|湿度|风力|降雨|下雪|气温|℃|℉/

// 翻译关键词
const TRANSLATION_PATTERN = /\b(translate|meaning|definition|dictionary|duden|dictzone)\b/i
const TRANSLATION_CN = /翻译|意思|定义|词典|字典|释义/

// URL 模式
const URL_PATTERN = /^https?:\/\//i

// 购物/比价关键词
const SHOPPING_PATTERN = /\b(price|buy|shop|deal|discount|coupon|cheap|best price|compare|purchase|order)\b/i
const SHOPPING_CN = /价格|多少钱|报价|售价|优惠|打折|促销|比价|性价比|购买|商城|旗舰店|专柜|正品|包邮|多少钱一个|什么价|值得买|评测|测评/

// 视频关键词
const VIDEO_PATTERN = /\b(watch|video|episode|trailer|clip)\b/i
const VIDEO_CN = /视频|观看|电影|电视剧|动漫|番剧|短片|预告|直播/

// 新闻关键词  
const NEWS_PATTERN = /\b(news|latest|breaking|update|today|报道|新闻|最新)\b/i
const NEWS_CN = /报道|新闻|最新|快讯|头条|时政|国际|国内|社会|热点/

// 学术关键词
const ACADEMIC_PATTERN = /\b(paper|thesis|doi|arxiv|semantic scholar|citation|reference|research|journal|proceedings)\b/i

// 代码/技术关键词
const CODE_KEYWORDS = [
  "\\bhow to\\b", "\\bwhat is\\b", "\\binstall\\b", "\\bnpm\\b", "\\bpip\\b",
  "\\bcargo\\b", "\\bgit\\b", "\\bapi\\b", "\\brest\\b", "\\bgraphql\\b",
  "\\bsql\\b", "\\bquery\\b", "\\bfunction\\b", "\\bclass\\b", "\\binterface\\b",
  "\\btype\\b", "\\berror\\b", "\\bbug\\b", "\\bdebug\\b", "\\bcompile\\b",
  "\\bsort\\b", "\\barray\\b", "\\blist\\b", "\\bmap\\b", "\\bfilter\\b",
  "\\breduce\\b", "\\balgorithm\\b", "\\btutorial\\b", "\\bguide\\b",
  "\\bdocumentation\\b", "\\bdocs\\b", "\\bdocker\\b", "\\bdeploy\\b",
  "\\bserver\\b", "\\bclient\\b", "\\bfrontend\\b", "\\bbackend\\b",
  "\\bfullstack\\b", "\\bleetcode\\b", "\\bcoding\\b",
]

const CODE_PATTERN = new RegExp(
  CODE_KEYWORDS.concat([LANG_PATTERN.source]).join("|"), "i",
)

// ── 意图检测 ──────────────────────────────────────────

/**
 * 检测 GitHub 相关查询
 *
 * 识别以下模式：
 * - "facebook/react" → 仓库搜索
 * - "repo:facebook/react" → 代码搜索
 * - "function foo repo:facebook/react" → 代码搜索
 * - "github.com/facebook/react/issues" → issue 搜索
 * - "react repo:facebook/react language:ts" → 代码搜索
 */
export function detectGitHubQuery(query: string): GitHubIntent | undefined {
  const trimmed = query.trim()
  if (!trimmed) return undefined

  // 检查 GitHub URL
  const urlMatch = trimmed.match(GITHUB_URL_PATTERN)
  if (urlMatch) {
    const owner = urlMatch[1]
    const repo = urlMatch[2]
    if (trimmed.includes("/issues") || trimmed.includes("/pull") || trimmed.includes("issue") || trimmed.includes("PR")) {
      return { owner, repo, isGitHubIssue: true, isGitHubRepo: true }
    }
    return { owner, repo, isGitHubRepo: true }
  }

  // 检查 repo: 限定符（GitHub Code Search）
  const codeMatch = trimmed.match(GITHUB_CODE_QUALIFIER)
  if (codeMatch) {
    const owner = codeMatch[1]
    const repo = codeMatch[2]
    return { owner, repo, isGitHubCodeSearch: true, isGitHubRepo: true }
  }

  // 检查 owner/repo 格式（纯仓库名查询）
  const repoMatch = trimmed.match(GITHUB_REPO_PATTERN)
  if (repoMatch) {
    const parts = trimmed.split("/")
    const owner = parts[0]
    const repo = parts[1]
    // 排除常见误匹配（如 URL、文件路径、版本号等）
    if (owner.length >= 2 && repo.length >= 2 && !owner.includes(".") && !trimmed.startsWith("http")) {
      return { owner, repo, isGitHubRepo: true }
    }
  }

  return undefined
}

/**
 * 检测查询意图，返回建议的 queryType 和额外标记。
 * 规则优先级从高到低，匹配即返回。
 */
export function detectQueryIntent(query: string): QueryIntent & GitHubIntent {
  const trimmed = query.trim()
  if (!trimmed) return {}

  // 1. URL → 通用搜索
  if (URL_PATTERN.test(trimmed)) {
    return { queryType: "general" }
  }

  // 2. 货币转换
  if (CURRENCY_PATTERN.test(trimmed)) {
    return { queryType: "general", isCurrency: true }
  }

  // 3. 天气
  if (WEATHER_PATTERN.test(trimmed) || WEATHER_CN.test(trimmed)) {
    return { queryType: "general", isWeather: true }
  }

  // 4. 翻译
  if (TRANSLATION_PATTERN.test(trimmed) || TRANSLATION_CN.test(trimmed)) {
    return { queryType: "general", isTranslation: true }
  }

  // 5. GitHub 仓库/代码搜索检测（优先于通用代码检测）
  const gh = detectGitHubQuery(trimmed)
  if (gh?.isGitHubRepo) {
    return { ...gh, queryType: "code" }
  }

  // 6. 代码/技术
  if (CODE_PATTERN.test(trimmed) || LANG_PATTERN.test(trimmed)) {
    return { queryType: "code" }
  }

  // 6. 学术
  if (ACADEMIC_PATTERN.test(trimmed)) {
    return { queryType: "academic" }
  }

  // 7. 购物/比价
  if (SHOPPING_PATTERN.test(trimmed) || SHOPPING_CN.test(trimmed)) {
    return { queryType: "shopping" }
  }

  // 8. 视频（在新闻前检测，避免"最新电影预告"被新闻捕获）
  if (VIDEO_PATTERN.test(trimmed) || VIDEO_CN.test(trimmed)) {
    return { queryType: "video" }
  }

  // 8. 新闻
  if (NEWS_PATTERN.test(trimmed) || NEWS_CN.test(trimmed)) {
    return { queryType: "news" }
  }

  // 默认：通用
  return { queryType: "general" }
}

/**
 * 基于检测到的意图，返回建议的额外 flag 标记。
 * 这些标记可与 selectEngines 的 flags 参数合并。
 */
export function intentToFlags(intent: QueryIntent): Record<string, boolean> {
  const flags: Record<string, boolean> = {}
  if (intent.isCurrency) flags.currency = true
  if (intent.isWeather) flags.weather = true
  if (intent.isTranslation) flags.translation = true
  return flags
}

// ── 关键词优化（灵感：BettaFish 的 Keyword Optimizer Agent）─────

/**
 * 基于查询意图优化搜索关键词，提高搜索结果相关性。
 *
 * 借鉴 BettaFish Keyword Optimizer 的设计：根据分析目标自动补充
 * 领域限定词、排除无关词、优化查询结构。
 *
 * @param query - 原始查询
 * @param intent - 检测到的查询意图
 * @returns 优化后的查询词数组（多个变体）
 */
export function optimizeQuery(query: string, intent: QueryIntent): string[] {
  const trimmed = query.trim()
  if (!trimmed) return [""]

  const variants: string[] = [trimmed]

  // 根据意图补充领域限定词
  if (intent.queryType === "code") {
    variants.push(`${trimmed} documentation`)
    variants.push(`${trimmed} tutorial`)
    variants.push(`${trimmed} example`)
  } else if (intent.queryType === "academic") {
    variants.push(`${trimmed} research paper`)
    variants.push(`${trimmed} study`)
    variants.push(`${trimmed} journal`)
  } else if (intent.queryType === "news") {
    variants.push(`${trimmed} latest news`)
    } else if (intent.queryType === "video") {
      variants.push(`${trimmed} video`)
    } else if (intent.queryType === "shopping") {
      variants.push(`${trimmed} 价格`)
      variants.push(`${trimmed} 优惠`)
      variants.push(`${trimmed} 评测`)
    } else if (intent.isTranslation) {
    variants.push(`${trimmed} meaning`)
    variants.push(`${trimmed} definition`)
  } else if (intent.isWeather) {
    variants.push(`${trimmed} weather forecast`)
  }

  // 提取核心关键词变体（去除停用词后的精简查询）
  const keywords = extractKeywords(trimmed)
  if (keywords.length > 0 && keywords.join(" ") !== trimmed) {
    variants.push(keywords.join(" "))
  }

  return [...new Set(variants)]
}

// ── 关键词提取与过滤（灵感：BettaFish Keyword Optimizer 的备用方案）─

/** 通用停用词（中英文） */
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for",
  "of", "and", "or", "but", "with", "by", "from", "as", "into", "through",
  "what", "how", "why", "when", "where", "which", "who", "whom",
  "this", "that", "these", "those", "it", "its", "has", "have", "had",
  "do", "does", "did", "will", "would", "can", "could", "should", "may",
  "about", "than", "then", "also", "just", "very", "not", "no", "be", "been",
  "的", "了", "是", "在", "我", "他", "她", "它", "们", "有", "和", "与",
  "就", "但", "也", "都", "而", "及", "或", "被", "把", "对", "从", "到",
  "让", "上", "下", "来", "去", "用", "为", "能", "会", "要", "想", "说",
  "不", "这", "那", "个", "人", "大", "小", "多", "少", "很", "更", "最",
])

/** 过于官方/专业的词汇（不贴近真实用户语言） */
const BAD_KEYWORDS = new Set([
  "未来展望", "发展趋势", "战略规划", "政策导向", "管理机制",
  "态度分析", "公众反应", "情绪倾向", "舆情管理",
  "implementation", "utilization", "facilitation", "methodology",
])

/**
 * 从查询中提取核心关键词。
 *
 * 借鉴 BettaFish 的 fallback_keyword_extraction 设计：
 * 分割查询文本 → 移除停用词 → 过滤过长的专业词汇。
 */
export function extractKeywords(query: string, maxTokens: number = 5): string[] {
  // 按空格和中英文标点分割
  const tokens = query.split(/[\s,，。！？；：、()（）""''【】《》/\\]+/).filter(Boolean)

  const keywords: string[] = []
  for (const token of tokens) {
    const cleaned = token.trim().toLowerCase()
    if (!cleaned) continue
    if (cleaned.length <= 1) continue // 单字符无意义
    if (STOP_WORDS.has(cleaned)) continue
    if (BAD_KEYWORDS.has(cleaned)) continue
    if (cleaned.length > 30) continue // 过长无意义
    keywords.push(token.trim()) // 保留原始大小写
  }

  return keywords.slice(0, maxTokens)
}

export * as QueryIntent from "./query-intent"
