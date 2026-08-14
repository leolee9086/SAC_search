/**
 * Google Images 搜索引擎适配器
 *
 * 参考 SearXNG 的 google_images.py (3.7KB)
 * 使用 Google 内部 JSON API (_fmt:json) 获取图片搜索结果。
 *
 * 完整的语言/地区/域名协商：
 * - getGoogleInfo() → 子域名 + hl/lr/cr 参数
 * - isGoogleCaptcha() → CAPTCHA 检测
 *
 * 端点: https://{subdomain}/search?q=KEYWORD&tbm=isch&async=_fmt:json
 * 返回 JSON，解析 ischj.metadata 数组
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"
import { getGoogleInfo, isGoogleCaptcha } from "./google-traits"

export function makeGoogleImages(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGoogleImages(http, query, opts.numResults || config.maxResults, config.timeout, opts.lang),
  }
}

function searchGoogleImages(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
  lang?: string,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const info = getGoogleInfo(lang)

    const params = new URLSearchParams({
      q: query,
      tbm: "isch",
      hl: info.params.hl,
      lr: info.params.lr,
      asearch: "isch",
    })

    // 分页参数 (Zero-based numbering, 参考 SearXNG)
    const asyncParam = `_fmt:json,p:1,ijn:0`

    const url = `https://${info.subdomain}/search?${params.toString()}&${asyncParam}`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": info.headers["User-Agent"],
          "Accept-Language": lang?.replace("_", "-") || "en-US,en;q=0.9",
          Accept: "*/*",
          Cookie: Object.entries(info.cookies).map(([k, v]) => `${k}=${v}`).join("; "),
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    // CAPTCHA 检测
    if (isGoogleCaptcha(response.status, raw)) return []

    return parseGoogleImagesResults(raw, numResults)
  })
}

/**
 * 解析 Google Images JSON 响应
 *
 * 参考 SearXNG:
 * - json_data["ischj"]["metadata"] → items
 * - item["result"]["referrer_url"] = 页面URL
 * - item["result"]["page_title"] = 标题
 * - item["original_image"]["url"] = 图片源URL
 * - item["thumbnail"]["url"] = 缩略图
 */
export function parseGoogleImagesResults(raw: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  const jsonStart = raw.indexOf('{"ischj":')
  if (jsonStart === -1) return []

  let data: any
  try {
    data = JSON.parse(raw.slice(jsonStart))
  } catch {
    return []
  }

  const items = data?.ischj?.metadata
  if (!items || !Array.isArray(items)) return []

  let pos = 0
  for (const item of items) {
    if (results.length >= maxResults) break
    if (!item?.result) continue

    const result = item.result
    const pageUrl = result.referrer_url
    const title = result.page_title?.trim()
    const imgUrl = item.original_image?.url
    const snippet = item.text_in_grid?.snippet?.trim() || ""

    if (!title || !pageUrl || !imgUrl) continue

    pos++
    results.push(
      makeSearchResult({
        title,
        url: pageUrl,
        snippet: `${imgUrl.slice(0, 100)} · ${snippet}`.slice(0, 300),
        engine: "google-images",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as GoogleImages from "./google-images"
