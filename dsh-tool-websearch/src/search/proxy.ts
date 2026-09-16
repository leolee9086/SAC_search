import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { Agent, EnvHttpProxyAgent, ProxyAgent, setGlobalDispatcher } from "undici"

export interface ProxyConfig {
  readonly http?: string
  readonly https?: string
  readonly noProxy?: string
}

export type ProxySource = "env" | "probe" | "manual" | "none"

export interface ProxyState {
  readonly enabled: boolean
  readonly proxyUrl: string
  readonly source: ProxySource
  readonly detectedUrl: string
}

const PROBE_HOSTS = [
  "http://127.0.0.1:7890",
  "http://127.0.0.1:1080",
  "http://127.0.0.1:1081",
  "http://127.0.0.1:8080",
]
const PROBE_TIMEOUT_MS = 5_000
/**
 * 直连白名单：这些域名**不走代理**。
 *
 * ## 为什么必须分流，而不是"全走代理"或"全直连"
 *
 * 实测两种极端都会瘸一条腿：
 *   - 全走代理：国内站点大量 `Transport error`
 *     （360search / douban / weibo 全部失败），中文召回直接少一大块
 *   - 全直连：墙外站点必然失败（Google / Brave / Startpage / Wikipedia / Reddit）
 *
 * 而元搜索的价值恰恰在于**两边都要**：中文内容靠国内引擎，
 * 技术文档与国际资料靠墙外引擎。所以按域名分流是唯一能同时工作的办法，
 * 这也是 PAC / 分流规则这套东西存在的原因。
 *
 * 域名匹配用后缀形式（`baidu.com` 覆盖 `www.baidu.com`、`tieba.baidu.com`）。
 */
export const NO_PROXY = [
  // 本机
  "localhost", "127.0.0.1", "::1", ".local",
  // 国内主流站点（直连更快也更可靠）
  "baidu.com", "bdstatic.com", "so.com", "360.cn", "360.com", "sogou.com", "sogoucdn.com",
  "zhihu.com", "zhimg.com", "douban.com", "doubanio.com", "weibo.com", "weibocdn.com",
  "xiaohongshu.com", "xhscdn.com", "bilibili.com", "hdslb.com", "iqiyi.com",
  "qq.com", "gtimg.com", "weixin.qq.com", "163.com", "126.net", "sina.com.cn", "sina.com",
  "sohu.com", "ifeng.com", "toutiao.com", "bytedance.com", "byteimg.com",
  "taobao.com", "tmall.com", "alicdn.com", "alibaba.com", "aliyun.com", "1688.com",
  "jd.com", "360buyimg.com", "pinduoduo.com", "yangkeduo.com", "suning.com",
  "csdn.net", "juejin.cn", "gitee.com", "oschina.net", "segmentfault.com", "cnblogs.com",
  "51cto.com", "infoq.cn", "runoob.com", "w3school.com.cn", "liaoxuefeng.com",
  "chinaso.com", "people.com.cn", "xinhuanet.com", "chinanews.com", "cctv.com",
  "quark.cn", "uc.cn", "sm.cn", "yisou.com", "sogou.com",
  "zhipin.com", "lagou.com", "51job.com", "nowcoder.com", "cnbeta.com",
]
const PLUGIN_DIR = fileURLToPath(new URL("../", import.meta.url))
const STATE_FILE = join(PLUGIN_DIR, "proxy-state.json")

let state: ProxyState = { enabled: false, proxyUrl: "", source: "none", detectedUrl: "" }
let dispatcherApplied = false
let resolving: Promise<void> | undefined

function loadPersisted(): void {
  try {
    if (!existsSync(STATE_FILE)) return
    const raw: unknown = JSON.parse(readFileSync(STATE_FILE, "utf8"))
    if (raw === null || typeof raw !== "object") return
    const value = raw as Record<string, unknown>
    state = {
      ...state,
      enabled: value.enabled === true,
      proxyUrl: typeof value.proxyUrl === "string" ? value.proxyUrl : "",
      source: value.source === "env" || value.source === "probe" || value.source === "manual" || value.source === "none"
        ? value.source
        : "none",
    }
  } catch {
    // Optional persisted state is best-effort; discovery remains available.
  }
}

function savePersisted(): void {
  try {
    mkdirSync(PLUGIN_DIR, { recursive: true })
    writeFileSync(STATE_FILE, JSON.stringify({
      enabled: state.enabled,
      proxyUrl: state.proxyUrl,
      source: state.source,
    }, null, 2), "utf8")
  } catch (error) {
    console.error("[websearch-proxy] save proxy-state failed:", error instanceof Error ? error.message : String(error))
  }
}

export function detectProxyFromEnv(): ProxyConfig {
  for (const key of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"]) {
    const value = (process.env[key] || "").trim()
    if (value) return { http: value, https: value, noProxy: process.env.NO_PROXY || process.env.no_proxy }
  }
  return {}
}

async function proxyReachable(proxyUrl: string): Promise<boolean> {
  let agent: ProxyAgent | undefined
  try {
    agent = new ProxyAgent({ uri: proxyUrl, requestTls: { rejectUnauthorized: false } })
    const response = await fetch("https://www.gstatic.com/generate_204", {
      dispatcher: agent,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    } as RequestInit)
    return response.status >= 200 && response.status < 400
  } catch {
    return false
  } finally {
    try {
      await agent?.close()
    } catch {
      // A failed probe has no live proxy state to retain.
    }
  }
}

export function probeCommonProxy(): Effect.Effect<ProxyConfig | undefined> {
  return Effect.promise(async () => {
    for (const proxy of PROBE_HOSTS) {
      if (await proxyReachable(proxy)) return { http: proxy, https: proxy }
    }
    return undefined
  })
}

export function detectProxyConfig(): Effect.Effect<ProxyConfig, never, never> {
  return Effect.gen(function* () {
    const envProxy = detectProxyFromEnv()
    if (envProxy.http || envProxy.https) return envProxy
    const probed = yield* probeCommonProxy().pipe(
      Effect.catch(() => Effect.succeed(undefined as ProxyConfig | undefined)),
    )
    return probed ?? {}
  })
}

function applyDispatcher(): void {
  if (state.enabled && state.proxyUrl) {
    try {
      /*
       * 用 **EnvHttpProxyAgent**，而不是 ProxyAgent。这是修一个真 bug：
       *
       * undici 6.x 的 `ProxyAgent` 只接受 `uri` / `auth`，**没有 noProxy 参数**。
       * 原来写的是 `new ProxyAgent({ uri, noProxy: NO_PROXY })` ——
       * 那个 `noProxy` 被**静默忽略**，于是所有请求都被塞进代理，
       * 包括百度/360/豆瓣/微博这些国内站点。后果实测得到：
       * 360search、douban、weibo 全部报 `Transport error`，
       * 中文召回直接瘸了一条腿。
       *
       * EnvHttpProxyAgent 支持 noProxy，能做到按域名分流：
       * 墙外站点走代理、国内站点直连 —— 元搜索恰恰是"两边都要"的场景。
       *
       * （静默忽略参数这种事最难查：不报错、不掉异常，只是行为不对。
       *   所以这里也顺带记进注释，免得以后有人又改回去。）
       */
      setGlobalDispatcher(new EnvHttpProxyAgent({
        httpProxy: state.proxyUrl,
        httpsProxy: state.proxyUrl,
        noProxy: NO_PROXY.join(","),
      }))
      dispatcherApplied = true
      return
    } catch {
      // Fall through to the direct dispatcher when the configured proxy is malformed.
    }
  }
  try {
    setGlobalDispatcher(new Agent())
  } catch {
    // Dispatcher installation is advisory; the search request still reports its own error.
  }
  dispatcherApplied = true
}

export async function setProxyEnabled(enabled: boolean, proxyUrl?: string): Promise<ProxyState> {
  state = { ...state, enabled }
  if (proxyUrl) {
    state = { ...state, proxyUrl, source: "manual" }
  } else if (!state.proxyUrl && state.detectedUrl) {
    state = { ...state, proxyUrl: state.detectedUrl, source: state.source === "env" ? "env" : "probe" }
  } else if (!state.proxyUrl && enabled) {
    const config = await Effect.runPromise(detectProxyConfig())
    const detected = config.http || config.https || ""
    if (detected) {
      state = {
        ...state,
        proxyUrl: detected,
        detectedUrl: detected,
        source: detectProxyFromEnv().http ? "env" : "probe",
      }
    } else {
      state = { ...state, enabled: false }
    }
  }
  applyDispatcher()
  savePersisted()
  return { ...state }
}

export function toggleProxy(): Promise<ProxyState> {
  return setProxyEnabled(!state.enabled)
}

export function getProxyState(): ProxyState {
  return { ...state }
}

export function getProxyConfig(): ProxyConfig {
  const envProxy = detectProxyFromEnv()
  if (envProxy.http || envProxy.https) return envProxy
  return state.proxyUrl ? { http: state.proxyUrl, https: state.proxyUrl } : {}
}

export function ensureApplied(): Promise<void> {
  if (dispatcherApplied) return Promise.resolve()
  if (resolving !== undefined) return resolving
  resolving = (async () => {
    try {
      loadPersisted()
      if (state.enabled && state.proxyUrl) {
        applyDispatcher()
        return
      }
      const config = await Effect.runPromise(detectProxyConfig())
      const detected = config.http || config.https || ""
      if (detected) {
        state = {
          ...state,
          enabled: true,
          proxyUrl: detected,
          detectedUrl: detected,
          source: detectProxyFromEnv().http ? "env" : "probe",
        }
        savePersisted()
      }
      applyDispatcher()
    } finally {
      resolving = undefined
    }
  })()
  return resolving
}

export function configureProxy(): Effect.Effect<ProxyConfig> {
  return Effect.gen(function* () {
    if (!dispatcherApplied) yield* Effect.promise(() => ensureApplied())
    return { http: state.proxyUrl || undefined, https: state.proxyUrl || undefined }
  })
}

export function applyProxyEnv(config: ProxyConfig): void {
  void setProxyEnabled(true, config.http || config.https)
}
