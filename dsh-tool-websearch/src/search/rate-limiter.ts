/**
 * 跨调用持久化引擎级请求速率限制器 + User-Agent 轮换
 *
 * 参考 s-forge analysis 的 RateLimiter 设计：
 * - 每个引擎独立追踪最近调用时间
 * - 最小请求间隔（默认 800ms）防止触发反爬
 * - 全局单例（跨工具调用持久化）
 * - User-Agent 轮换池，每次请求随机选择
 *
 * 设计原则：
 * - 轻量级：仅追踪时间戳，不涉及锁（单线程 Effect 环境）
 * - 无侵入：引擎适配器无需修改
 * - 在 executor.ts 的 executeEngineSafely() 中调用
 */

// ── User-Agent 轮换池 ──────────────────────────────
//
// 多个真实浏览器 UA，每次请求随机轮换。
// 参考 s-forge analysis 的 userAgents 数组和 SearXNG 的 gen_useragent()。
const USER_AGENT_POOL = [
  // Chrome 143 Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  // Chrome 143 macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  // Chrome 143 Linux
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  // Firefox 135 Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
  // Firefox 135 macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0",
  // Edge 143 Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
  // Safari 18 macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  // Chrome 143 Android Mobile
  "Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
  // Firefox Android
  "Mozilla/5.0 (Android 14; Mobile; rv:135.0) Gecko/135.0 Firefox/135.0",
]

/** 从轮换池中随机选取一个 User-Agent */
export function randomUserAgent(): string {
  return USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)]
}

// ── 速率限制器 ──────────────────────────────────────

export interface RateLimitEntry {
  /** 上次调用时间戳（毫秒） */
  lastCallAt: number
  /** 连续因速率限制等待的次数 */
  consecutiveWaits: number
}

/**
 * 引擎级速率限制器
 *
 * 全局单例，跨工具调用持久化。
 * 每个引擎独立追踪最近调用时间，确保最小请求间隔。
 * 借鉴 s-forge analysis: 每个引擎 minInterval 默认为 800ms。
 *
 * 熔断器（executor.ts）处理的是失败后的恢复，
 * 速率限制器处理的是成功请求之间的最小间隔——两者互补。
 */
export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>()
  private defaultIntervalMs: number
  /** 每个引擎的专属间隔覆盖 */
  private engineIntervals = new Map<string, number>()

  constructor(defaultIntervalMs = 800) {
    this.defaultIntervalMs = defaultIntervalMs
  }

  /** 设置特定引擎的最小请求间隔 */
  setEngineInterval(engine: string, intervalMs: number): void {
    this.engineIntervals.set(engine, intervalMs)
  }

  /** 获取引擎的最小请求间隔 */
  getInterval(engine: string): number {
    return this.engineIntervals.get(engine) ?? this.defaultIntervalMs
  }

  /**
   * 检查引擎是否可以发送请求。
   * 返回需要等待的毫秒数（0 表示可以立即发送）。
   */
  check(engine: string): number {
    const now = Date.now()
    const entry = this.entries.get(engine)
    if (!entry) {
      this.entries.set(engine, { lastCallAt: now, consecutiveWaits: 0 })
      return 0
    }
    const interval = this.getInterval(engine)
    const elapsed = now - entry.lastCallAt
    if (elapsed >= interval) {
      entry.lastCallAt = now
      entry.consecutiveWaits = 0
      return 0
    }
    // 需要等待剩余时间
    const waitMs = interval - elapsed
    entry.consecutiveWaits++
    return Math.ceil(waitMs)
  }

  /**
   * 标记引擎已发送请求（更新 lastCallAt）
   * 在引擎请求完成后调用
   */
  markCalled(engine: string): void {
    const now = Date.now()
    const entry = this.entries.get(engine)
    if (entry) {
      entry.lastCallAt = now
    } else {
      this.entries.set(engine, { lastCallAt: now, consecutiveWaits: 0 })
    }
  }

  /** 获取所有引擎的速率限制状态（用于调试/报告） */
  getStatus(): Record<string, { lastCallAgo: number; interval: number; waits: number }> {
    const now = Date.now()
    const status: Record<string, { lastCallAgo: number; interval: number; waits: number }> = {}
    for (const [engine, entry] of this.entries) {
      status[engine] = {
        lastCallAgo: now - entry.lastCallAt,
        interval: this.getInterval(engine),
        waits: entry.consecutiveWaits,
      }
    }
    return status
  }

  /** 重置所有状态 */
  reset(): void {
    this.entries.clear()
  }
}

/**
 * 全局速率限制器单例（跨工具调用持久化）
 * 模块级单例确保速率限制在多次搜索间持续追踪。
 */
const globalRateLimiter = new RateLimiter()

// 为易触发反爬的引擎设置更保守的间隔
globalRateLimiter.setEngineInterval("google", 2000)      // Google 最严格
globalRateLimiter.setEngineInterval("google-images", 2000)
globalRateLimiter.setEngineInterval("google-news", 2000)
globalRateLimiter.setEngineInterval("google-scholar", 2000)
globalRateLimiter.setEngineInterval("baidu", 1500)        // 百度
globalRateLimiter.setEngineInterval("sogou", 1500)        // 搜狗
globalRateLimiter.setEngineInterval("naver", 1200)        // Naver
globalRateLimiter.setEngineInterval("yandex", 1200)       // Yandex
globalRateLimiter.setEngineInterval("bing", 1000)         // Bing
globalRateLimiter.setEngineInterval("bing-news", 1000)
globalRateLimiter.setEngineInterval("duckduckgo", 800)    // DDG
globalRateLimiter.setEngineInterval("brave", 500)         // Brave API 较宽松

/** 获取全局速率限制器实例 */
export function getGlobalRateLimiter(): RateLimiter {
  return globalRateLimiter
}

// ── 辅助函数 ─────────────────────────────────────────

/**
 * 等待引擎的速率限制间隔。
 * 返回等待的毫秒数。
 */
export function waitForRateLimit(engine: string): number {
  const limiter = getGlobalRateLimiter()
  const waitMs = limiter.check(engine)
  if (waitMs > 0) {
    // 在单线程环境下，我们用返回等待时间的方式而不是真的 sleep。
    // 调用方（executor.ts）会在每次引擎调用前检查此函数。
    // 如果 waitMs > 0，说明还没到间隔，发起请求会被延后。
  }
  return waitMs
}
