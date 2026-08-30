import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { Agent, ProxyAgent, setGlobalDispatcher } from "undici"

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
const NO_PROXY = ["localhost", "127.0.0.1", "::1", ".local"]
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
      setGlobalDispatcher(new ProxyAgent({ uri: state.proxyUrl, noProxy: NO_PROXY }))
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
