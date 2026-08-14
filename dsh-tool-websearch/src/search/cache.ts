/**
 * 搜索结果缓存
 *
 * 借鉴 SearXNG 的 ExpireCache 设计，使用内存 Map + TTL 实现。
 * 缓存查询结果，避免短时间内重复搜索相同关键词。
 *
 * 改进：
 * - 真 LRU 驱逐（基于访问顺序）
 * - 缓存键包含搜索选项（timeRange、lang、queryType）
 * - 命中率/未命中率统计
 */
import type { SearchOptions, SearchResult } from "./engine"

interface CacheEntry {
  results: readonly SearchResult[]
  expiresAt: number
}

export class ResultCache {
  private cache = new Map<string, CacheEntry>()
  private accessOrder: string[] = [] // 跟踪访问顺序实现真 LRU
  private maxSize: number
  private ttl: number
  /** 命中次数 */
  hits = 0
  /** 未命中次数 */
  misses = 0

  constructor(maxSize = 100, ttlMs = 60_000) {
    this.maxSize = maxSize
    this.ttl = ttlMs
  }

  /** 生成缓存键（查询 + 搜索选项） */
  static makeKey(query: string, opts: Partial<SearchOptions> = {}): string {
    return `${query}|${opts.numResults ?? 8}|${opts.timeRange ?? ""}|${opts.lang ?? ""}`
  }

  /** 获取缓存结果，过期条目自动删除，命中时更新访问顺序 */
  get(key: string): readonly SearchResult[] | undefined {
    const entry = this.cache.get(key)
    if (!entry) {
      this.misses++
      return undefined
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this._removeFromAccessOrder(key)
      this.misses++
      return undefined
    }
    // 真 LRU：将访问的键移到末尾
    this._touch(key)
    this.hits++
    return entry.results
  }

  /** 写入缓存 */
  set(key: string, results: readonly SearchResult[]): void {
    // 已存在则更新
    if (this.cache.has(key)) {
      this._touch(key)
      this.cache.set(key, { results, expiresAt: Date.now() + this.ttl })
      return
    }
    // LRU 驱逐：淘汰最久未访问的条目
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.accessOrder.shift()
      if (lruKey !== undefined) this.cache.delete(lruKey)
    }
    this.accessOrder.push(key)
    this.cache.set(key, { results, expiresAt: Date.now() + this.ttl })
  }

  private _touch(key: string): void {
    this._removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  private _removeFromAccessOrder(key: string): void {
    const idx = this.accessOrder.indexOf(key)
    if (idx !== -1) this.accessOrder.splice(idx, 1)
  }

  /** 清空缓存及统计 */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.hits = 0
    this.misses = 0
  }

  /** 当前缓存条目数 */
  get size(): number {
    return this.cache.size
  }

  /** 命中率 */
  get hitRate(): number {
    const total = this.hits + this.misses
    return total === 0 ? 0 : this.hits / total
  }
}

/** 全局搜索结果缓存实例 */
export const globalResultCache = new ResultCache(100, 60_000)

export * as SearchCache from "./cache"
