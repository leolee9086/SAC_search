/**
 * Google 搜索引擎特征模块（Traits）
 *
 * 参考 SearXNG 的 google.py (18.8KB) 中的 get_google_info()
 *
 * 处理：
 * - 语言/地区参数协商（hl, lr, cr）
 * - 子域名选择（www.google.com / www.google.de 等）
 * - CONSENT cookie
 * - User-Agent 生成
 * - CAPTCHA 检测
 */
import type { HttpClientResponse } from "effect/unstable/http"

// ── Google 支持的语言映射 ────────────────────────────

const LANG_MAP: Record<string, string> = {
  en: "lang_en",
  zh_CN: "lang_zh-CN",
  zh_TW: "lang_zh-TW",
  ja: "lang_ja",
  ko: "lang_ko",
  de: "lang_de",
  fr: "lang_fr",
  es: "lang_es",
  it: "lang_it",
  pt: "lang_pt",
  pt_BR: "lang_pt-BR",
  ru: "lang_ru",
  ar: "lang_ar",
  tr: "lang_tr",
  nl: "lang_nl",
  sv: "lang_sv",
  da: "lang_da",
  fi: "lang_fi",
  nb: "lang_no",
  pl: "lang_pl",
  cs: "lang_cs",
  hu: "lang_hu",
  ro: "lang_ro",
  th: "lang_th",
  vi: "lang_vi",
  id: "lang_id",
  ms: "lang_ms",
  fil: "lang_fil",
}

// ── Google 子域名映射 ────────────────────────────────

const DOMAIN_MAP: Record<string, string> = {
  US: "www.google.com",
  GB: "www.google.co.uk",
  DE: "www.google.de",
  FR: "www.google.fr",
  JP: "www.google.co.jp",
  KR: "www.google.co.kr",
  CN: "www.google.com.hk",
  TW: "www.google.com.tw",
  HK: "www.google.com.hk",
  CA: "www.google.ca",
  AU: "www.google.com.au",
  IN: "www.google.co.in",
  BR: "www.google.com.br",
  RU: "www.google.ru",
  IT: "www.google.it",
  ES: "www.google.es",
  NL: "www.google.nl",
  SE: "www.google.se",
  PL: "www.google.pl",
  TR: "www.google.com.tr",
  AR: "www.google.com.ar",
  MX: "www.google.com.mx",
  SG: "www.google.com.sg",
}

// ── GoogleInfo 数据结构 ─────────────────────────────

export interface GoogleInfo {
  /** Google 语言码 (lang_en) */
  language: string
  /** 国家代码 (US) */
  country: string
  /** 子域名 (www.google.com) */
  subdomain: string
  /** URL 查询参数 */
  params: Record<string, string>
  /** HTTP 头部 */
  headers: Record<string, string>
  /** Cookie */
  cookies: Record<string, string>
}

// ── 获取 Google 搜索参数 ────────────────────────────

/**
 * 获取 Google 搜索所需的语言/地区/域名参数
 *
 * 参考 SearXNG: get_google_info()
 *
 * @param lang 语言偏好（如 "zh-CN"、"en"）
 * @returns GoogleInfo 配置
 */
export function getGoogleInfo(lang?: string): GoogleInfo {
  const country = guessCountry(lang)
  const langNorm = normalizeLang(lang)     // "zh-CN" → "zh_CN"（用于 LANG_MAP 查询）
  const langOrig = lang?.replace("_", "-") || "en"  // "zh_CN" → "zh-CN"（用于 hl 参数）
  // 先查完整 locale (zh_CN)，再查纯语言 (zh)，最后默认 en
  const engLang = LANG_MAP[langNorm] || (langNorm ? LANG_MAP[langNorm.split("_")[0]] : undefined) || "lang_en"
  const subdomain = DOMAIN_MAP[country] || "www.google.com"

  // hl: 界面语言
  // lr: 搜索结果语言限制
  // cr: 搜索结果国家限制
  const params: Record<string, string> = {
    hl: langOrig,
    lr: engLang,
    cr: country !== "US" ? `country${country}` : "",
    ie: "utf8",
    oe: "utf8",
  }

  // 如果 lang 是 "all"，不限制语言
  if (!lang || lang === "all") {
    params.lr = ""
  }

  const headers: Record<string, string> = {
    Accept: "*/*",
    "User-Agent": genGoogleUa(country),
  }

  const cookies: Record<string, string> = {
    CONSENT: "YES+",
  }

  return { language: engLang, country, subdomain, params, headers, cookies }
}

/**
 * 从语言标签猜测国家
 */
function guessCountry(lang?: string): string {
  if (!lang) return "US"
  const parts = lang.split("-")
  if (parts.length > 1) return parts[1].toUpperCase()
  const map: Record<string, string> = {
    zh: "CN",
    ja: "JP",
    ko: "KR",
    de: "DE",
    fr: "FR",
    es: "ES",
    pt: "BR",
    ru: "RU",
    it: "IT",
    ar: "SA",
    tr: "TR",
    nl: "NL",
    sv: "SE",
    pl: "PL",
    da: "DK",
    fi: "FI",
    nb: "NO",
    th: "TH",
    vi: "VN",
    id: "ID",
    ms: "MY",
  }
  return map[parts[0]] || "US"
}

/**
 * 规范化语言标签
 */
function normalizeLang(lang?: string): string {
  if (!lang) return "en"
  return lang.replace("-", "_")
}

/**
 * 生成 Google Search App User-Agent
 *
 * 参考 SearXNG: gen_gsa_useragent()
 */
function genGoogleUa(country: string): string {
  return `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 (gws, country:${country})`
}

// ── CAPTCHA 检测 ────────────────────────────────────

/**
 * 检测 Google CAPTCHA
 *
 * 参考 SearXNG: detect_google_sorry()
 * 三种检测方式：
 * 1. 302 重定向到 sorry
 * 2. 响应 < 2000 字节含 /sorry/
 * 3. 状态码 302/303
 */
export function isGoogleCaptcha(status: number, body: string, url?: string): boolean {
  if (status === 302 || status === 303) return true
  if (!body) return false
  if (body.length < 2000 && (body.includes("/sorry/") || body.includes("sorry.google"))) return true
  if (url && (url.includes("sorry.google") || url.includes("/sorry/"))) return true
  return false
}

export * as GoogleTraits from "./google-traits"
