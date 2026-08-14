/**
 * 系统代理检测模块
 *
 * 自动检测可用的 HTTP/HTTPS 代理，供各搜索引擎使用。
 *
 * 检测顺序：
 * 1. HTTP_PROXY / HTTPS_PROXY / ALL_PROXY 环境变量
 * 2. 探测常见代理地址（如 127.0.0.1:7890）
 * 3. 无可用代理时返回 undefined
 */
import { Effect } from "effect"

export interface ProxyConfig {
  readonly http?: string
  readonly https?: string
  readonly noProxy?: string
}

/**
 * 从环境变量检测代理配置
 */
export function detectProxyFromEnv(): ProxyConfig {
  const http = process.env.HTTP_PROXY || process.env.http_proxy
  const https = process.env.HTTPS_PROXY || process.env.https_proxy
  const all = process.env.ALL_PROXY || process.env.all_proxy
  const noProxy = process.env.NO_PROXY || process.env.no_proxy

  return {
    http: http || all || undefined,
    https: https || all || undefined,
    noProxy,
  }
}

/**
 * 探测 127.0.0.1:7890 是否可用（常见代理端口）
 */
export function probeCommonProxy(): Effect.Effect<ProxyConfig | undefined> {
  return Effect.gen(function* () {
    const candidates = [
      "http://127.0.0.1:7890",
      "http://127.0.0.1:1080",
      "http://127.0.0.1:1081",
      "http://127.0.0.1:8080",
    ]

    for (const proxy of candidates) {
      try {
        const resp = yield* Effect.promise(() =>
          fetch(proxy, {
            method: "CONNECT",
            signal: AbortSignal.timeout(3000),
          }),
        )
        if (resp.status < 500) {
          return { http: proxy, https: proxy }
        }
      } catch {
        continue
      }
    }
    return undefined
  })
}

/**
 * 获取代理配置：优先环境变量，其次自动探测
 */
export function getProxyConfig(): ProxyConfig {
  const envProxy = detectProxyFromEnv()
  if (envProxy.http || envProxy.https) return envProxy
  return {}
}

/**
 * 检测可用的代理配置（不设置环境变量，仅返回配置）。
 *
 * 检测顺序：
 * 1. 已设置的 HTTP_PROXY / HTTPS_PROXY 环境变量
 * 2. 自动探测本地常见代理端口（127.0.0.1:7890 等）
 * 3. 无可用代理时返回空配置
 *
 * 调用方根据返回的配置决定是否调用 {@link applyProxyEnv}。
 */
export function detectProxyConfig(): Effect.Effect<ProxyConfig, never, never> {
  return Effect.gen(function* () {
    // 已有环境变量 → 直接返回（代理已在生效）
    const envProxy = detectProxyFromEnv()
    if (envProxy.http || envProxy.https) return envProxy

    // 自动探测本地代理（Effect.catch 将错误转为 never，确保返回类型匹配）
    return yield* probeCommonProxy().pipe(
      Effect.catch(() => Effect.succeed(undefined as ProxyConfig | undefined)),
      Effect.map((probed) => probed ?? {}),
    )
  })
}

/**
 * 将代理配置应用到进程环境变量（Bun fetch 原生支持）。
 *
 * 设置 HTTP_PROXY / HTTPS_PROXY / NO_PROXY，此后所有 Bun fetch 调用
 * 自动通过代理发出 HTTP 请求。
 */
export function applyProxyEnv(config: ProxyConfig): void {
  if (config.http && !process.env.HTTP_PROXY) {
    process.env.HTTP_PROXY = config.http
  }
  if (config.https && !process.env.HTTPS_PROXY) {
    process.env.HTTPS_PROXY = config.https
  }
  if (!process.env.NO_PROXY) {
    process.env.NO_PROXY = "localhost,127.0.0.0/8,.local"
  }
}

/**
 * 【便捷方法】检测并立即应用代理配置。
 *
 * 适用于无需用户确认的场景（向后兼容）。
 * 必须在搜索引擎 HTTP 请求之前调用。
 */
export function configureProxy(): Effect.Effect<ProxyConfig, never, never> {
  return Effect.gen(function* () {
    const config = yield* detectProxyConfig()
    if (config.http || config.https) {
      applyProxyEnv(config)
    }
    return config
  })
}

export * as Proxy from "./proxy"
