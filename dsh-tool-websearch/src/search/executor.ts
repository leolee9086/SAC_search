/**
 * 并发搜索执行器
 *
 * 每个引擎在独立 Effect 中运行，使用 Effect.forEach 的 concurrency 实现并行。
 * 借鉴 SearXNG 的多线程并发 + 熔断器模式。
 */
import { Duration, Effect } from "effect"

/** 全局搜索引擎最大并发数，防止过多并发 HTTP 请求导致网络栈过载 */
export const MAX_CONCURRENCY = 10
import { HttpClient } from "effect/unstable/http"
import type { EngineStatus, SearchEngine, SearchOptions, SearchResult } from "./engine"
import { AccessDeniedError, CaptchaError, EngineError, RateLimitError, TimeoutError, makeEngineStatus } from "./engine"
import { getGlobalRateLimiter } from "./rate-limiter"

/** 执行器状态（可变，追踪引擎健康） */
export class ExecutorState {
  readonly engineStatuses = new Map<string, EngineStatus>()
}

/** 全局引擎健康状态（跨工具调用持久化）
 * 借鉴 SearXNG 的引擎暂停机制：连续失败后自动暂停，暂停时间指数增长。
 * 模块级单例确保引擎健康在多次搜索间持续追踪。
 */
const globalEngineStatuses = new Map<string, EngineStatus>()

/** 获取全局引擎健康状态，供生产流程使用 */
export function getGlobalState(): ExecutorState {
  return { engineStatuses: globalEngineStatuses }
}

/** 重置全局引擎健康状态（仅测试用） */
export function resetGlobalState(): void {
  globalEngineStatuses.clear()
}

export interface ExecuteResult {
  results: readonly SearchResult[]
  errors: readonly EngineError[]
}

type EngineOutcome =
  | { _tag: "success"; results: readonly SearchResult[] }
  | { _tag: "error"; error: EngineError }

/** 进度相位：引擎开始 / 新增结果 / 引擎完成 */
export type ProgressPhase = "start" | "result" | "done"

/** 进度回调携带的信息 */
export interface ProgressInfo {
  /** 已完成的引擎数（start 时不计入） */
  done: number
  /** 活跃引擎总数 */
  total: number
  /** 当前引擎名 */
  current: string
  /** 相位 */
  phase: ProgressPhase
  /** 累计结果（所有引擎已返回的去重前原始结果） */
  partialResults: readonly SearchResult[]
  /** 本次新增的结果（phase=start 时为空数组） */
  newResults: readonly SearchResult[]
}

/** 进度回调类型。返回 Effect<void> 以便集成到 Effect 流中。 */
export type ProgressCallback = (info: ProgressInfo) => Effect.Effect<void> | undefined | void

/**
 * 并发执行多个搜索引擎
 *
 * 引擎健康检查（熔断器）借鉴 SearXNG 的设计：
 * - RateLimitError → 不计数，对端告诉我们要多久（Retry-After）
 * - CaptchaError → 永久暂停（需要人工干预）
 * - AccessDeniedError → 永久暂停（引擎封禁我们的 IP）
 * - TimeoutError → 计为失败，退避
 * - 其他错误 → 计为失败，退避
 * - 指数退避：1次→1分，2次→5分，3+次→15分
 * - 错误不会级联到其他引擎
 */
export function executeAll(
  engines: readonly SearchEngine[],
  http: HttpClient.HttpClient,
  query: string,
  opts: SearchOptions,
  state: ExecutorState,
  onProgress?: ProgressCallback,
): Effect.Effect<ExecuteResult, never, never> {
  return Effect.gen(function* () {
    // 过滤暂停中的引擎（熔断器恢复检测）
    const active = engines.filter((e) => {
      const status = state.engineStatuses.get(e.name)
      if (!status?.suspended) return true
      if (status.suspendedUntil && Date.now() > status.suspendedUntil) {
        status.suspended = false
        status.consecutiveFailures = 0
        return true
      }
      return false
    })

    if (active.length === 0) return { results: [], errors: [] }

    const total = active.length
    const done = { value: 0 }
    const partialResults = { all: [] as SearchResult[] }

    // 引擎开始时发一次 start 相位，让前端立刻看到「正在查询 X...」
    const emitStart = (engineName: string) => {
      onProgress?.({
        done: done.value,
        total,
        current: engineName,
        phase: "start",
        partialResults: partialResults.all,
        newResults: [],
      })
    }

    const outcomes = yield* Effect.forEach(
      active,
      (engine) =>
        Effect.gen(function* () {
          emitStart(engine.name)
          const outcome = yield* executeEngineSafely(engine, http, query, opts, state)
          if (outcome._tag === "success" && outcome.results.length > 0) {
            // 引擎成功后，一次性把该引擎全部结果 push，并发一次 result 相位。
            // （按引擎粒度而非逐条，避免高基数结果导致 Tool.Progress 事件洪流。）
            partialResults.all.push(...outcome.results)
            yield* onProgress?.({
              done: done.value,
              total,
              current: engine.name,
              phase: "result",
              partialResults: partialResults.all,
              newResults: outcome.results,
            }) ?? Effect.void
          }
          done.value++
          // 引擎完成相位（含失败引擎，便于前端显示进度计数）
          yield* onProgress?.({
            done: done.value,
            total,
            current: engine.name,
            phase: "done",
            partialResults: partialResults.all,
            newResults: outcome._tag === "success" ? outcome.results : [],
          }) ?? Effect.void
          return outcome
        }),
      { concurrency: MAX_CONCURRENCY },
    )

    const allResults: SearchResult[] = []
    const allErrors: EngineError[] = []
    for (const o of outcomes) {
      if (o._tag === "success") allResults.push(...o.results)
      else allErrors.push(o.error)
    }

    return { results: allResults, errors: allErrors }
  })
}

/**
 * 安全地执行单个引擎搜索，捕获所有错误和缺陷
 *
 * 借鉴 SearXNG 的 OnlineProcessor.search() 异常处理模式。
 * 不同类型错误有不同处理策略：
 * - RateLimit: 不计数，用 Retry-After 设置暂停时间
 * - Captcha/AccessDenied: 永久暂停
 * - Timeout: 计数为失败
 * - 其他: 计数为失败
 *
 * 在引擎调用前检查速率限制器（RateLimiter），确保最小请求间隔。
 * 借鉴 s-forge analysis: 每个引擎独立追踪最近调用时间。
 */
function executeEngineSafely(
  engine: SearchEngine,
  http: HttpClient.HttpClient,
  query: string,
  opts: SearchOptions,
  state: ExecutorState,
): Effect.Effect<EngineOutcome, never, never> {
  const startTime = Date.now()

  return (Effect.gen(function* () {
    // 引擎级速率限制：确保最小请求间隔
    // 借鉴 s-forge analysis RateLimiter 设计
    const limiter = getGlobalRateLimiter()
    const waitMs = limiter.check(engine.name)
    if (waitMs > 0) {
      yield* Effect.sleep(`${waitMs} millis`)
    }

    const maybeResults = yield* engine.search(http, query, opts).pipe(
      Effect.timeout(engine.config.timeout),
    )
    if (maybeResults === undefined) {
      throw new TimeoutError({ engine: engine.name, message: `timed out after ${engine.config.timeout}ms` })
    }
    const results = maybeResults
    const latency = Date.now() - startTime
    const status = getOrCreateStatus(state, engine.name)
    status.consecutiveFailures = 0
    status.metrics.totalRequests++
    status.metrics.successfulRequests++
    status.metrics.totalLatency += latency
    status.metrics.avgLatency = status.metrics.totalLatency / status.metrics.successfulRequests
    status.metrics.lastSuccessAt = Date.now()
    return { _tag: "success", results } as EngineOutcome
  }) as Effect.Effect<EngineOutcome, unknown, never>).pipe(
    Effect.catch((error) => {
      const latency = Date.now() - startTime
      if (error instanceof RateLimitError) {
        // 限流不计数为连续失败，用 Retry-After 设置暂停
        const status = getOrCreateStatus(state, engine.name)
        status.lastError = error.message
        status.metrics.totalRequests++
        const retryAfter = error.retryAfter ?? 60
        status.suspended = true
        status.suspendedUntil = Date.now() + retryAfter * 1000
        status.lastSuspensionReason = `rate-limited, retry-after: ${retryAfter}s`
        status.lastSuspensionDuration = retryAfter * 1000
        return Effect.succeed<EngineOutcome>({
          _tag: "error",
          error: new EngineError({ engine: engine.name, message: error.message, retryable: true }),
        })
      }
      if (error instanceof CaptchaError || error instanceof AccessDeniedError) {
        // CAPTCHA 和拒绝 → 永久暂停（不计数，自然恢复周期 30 分钟）
        const status = getOrCreateStatus(state, engine.name)
        status.lastError = error.message
        status.metrics.totalRequests++
        status.consecutiveFailures++ // 计数以便后续可能自动恢复
        status.suspended = true
        status.suspendedUntil = Date.now() + Duration.toMillis(Duration.minutes(30))
        status.lastSuspensionReason = error instanceof CaptchaError ? "captcha-challenge" : "access-denied"
        status.lastSuspensionDuration = Duration.toMillis(Duration.minutes(30))
        return Effect.succeed<EngineOutcome>({
          _tag: "error",
          error: new EngineError({ engine: engine.name, message: error.message, retryable: false }),
        })
      }
      if (error instanceof TimeoutError) {
        // 超时 → 计数为失败
        const status = getOrCreateStatus(state, engine.name)
        status.metrics.totalRequests++
        applyExponentialBackoff(status, engine.name, `timeout after ${engine.config.timeout}ms`)
        return Effect.succeed<EngineOutcome>({
          _tag: "error",
          error: new EngineError({ engine: engine.name, message: `timeout: ${error.message}`, retryable: true }),
        })
      }
      // 一般错误
      const msg = error instanceof Error ? error.message : String(error)
      const status = getOrCreateStatus(state, engine.name)
      status.metrics.totalRequests++
      applyExponentialBackoff(status, engine.name, msg)
      return Effect.succeed<EngineOutcome>({
        _tag: "error",
        error: new EngineError({ engine: engine.name, message: msg, retryable: true }),
      })
    }),
    Effect.catchDefect((defect) => {
      const engineErr = new EngineError({ engine: engine.name, message: String(defect), retryable: false })
      const status = getOrCreateStatus(state, engine.name)
      status.metrics.totalRequests++
      // 缺陷（不可恢复异常）→ 也指数退避
      applyExponentialBackoff(status, engine.name, `defect: ${String(defect)}`)
      return Effect.succeed<EngineOutcome>({ _tag: "error", error: engineErr })
    }),
  )
}

/**
 * 指数退避算法（含随机抖动）
 *
 * 借鉴 SearXNG 的 suspend 机制，但改用指数级增长暂停时间：
 * - 连续失败 1 次 → 暂停 1 分钟 ±20% 抖动
 * - 连续失败 2 次 → 暂停 5 分钟 ±20% 抖动
 * - 连续失败 3+ 次 → 暂停 15 分钟 ±20% 抖动
 * - 最大暂停 60 分钟（硬上限）
 *
 * 随机抖动（jitter）防止多个引擎同时恢复时出现惊群效应。
 * 相比 SearXNG 的固定暂停（最短 ban_time_on_fail），我们的指数退避更温和，
 * 允许引擎在短时间故障后快速恢复，同时对持续故障做出更强硬的响应。
 */
function applyExponentialBackoff(status: EngineStatus, engineName: string, errorMessage: string): void {
  status.consecutiveFailures++
  status.totalFailures++
  status.lastError = errorMessage

  const baseMinutes = status.consecutiveFailures <= 1
    ? 1
    : status.consecutiveFailures <= 2
      ? 5
      : 15

  // 加入 ±20% 随机抖动，防止惊群效应
  const jitter = 0.8 + Math.random() * 0.4
  const backoffMinutes = baseMinutes * jitter
  const clamped = Math.min(backoffMinutes, 60) // 上限 60 分钟
  const durationMs = clamped * 60 * 1000

  status.suspended = true
  status.suspendedUntil = Date.now() + durationMs
  status.lastSuspensionReason = `exponential-backoff@${baseMinutes}min(jitter=${jitter.toFixed(2)})`
  status.lastSuspensionDuration = durationMs
}

function getOrCreateStatus(state: ExecutorState, name: string): EngineStatus {
  let status = state.engineStatuses.get(name)
  if (!status) {
    status = makeEngineStatus()
    state.engineStatuses.set(name, status)
  }
  return status
}

export * as Executor from "./executor"
