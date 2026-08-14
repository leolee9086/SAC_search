/**
 * Bing Images 搜索引擎适配器
 *
 * 参考 SearXNG 的 bing_images.py
 * 解析 Bing Images 的异步 HTML 结果页
 * https://www.bing.com/images/async?q=KEYWORD&async=1&first=1&count=35
 *
 * 无需 API key，与 bing.ts 复用相同的 User-Agent 策略
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BING_IMAGES_URL = "https://www.bing.com/images/async"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeBingImages(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchBingImages(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchBingImages(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      async: "1",
      first: "1",
      count: String(Math.min(numResults, 35)),
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BING_IMAGES_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8",
          Accept: "text/html,application/xhtml+xml",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html || html.includes("captcha")) return []

    return parseBingImagesResults(html, numResults)
  })
}

/**
 * 解析 Bing Images 结果
 *
 * 参考 SearXNG:
 * - dom.xpath('//ul[contains(@class, "dgControl_list")]/li')
 * - 每个 li > a.iusc > @m (JSON metadata: purl=页面URL, murl=图片URL, turl=缩略图URL)
 * - div.infnmpt//a = 标题
 * - div.imgpt//div/span = 格式信息
 */
export function parseBingImagesResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // 定位结果列表容器
  const listStart = html.indexOf('dgControl_list')
  const searchHtml = listStart === -1 ? html : html.slice(listStart)

  // 匹配每个结果项 <li> 包含 a.iusc
  const itemRegex = /<li[^>]*>[\s\S]*?<a[^>]*class="iusc"[^>]*m="([^"]*)"[\s\S]*?<\/li>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(searchHtml)) !== null) {
    if (results.length >= maxResults) break
    const block = match[0]
    const metadataRaw = match[1]

    // 解析 JSON 元数据
    let metadata: { purl?: string; murl?: string; turl?: string; desc?: string } | null = null
    try {
      // 解码 HTML 实体
      const cleanJson = metadataRaw.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      metadata = JSON.parse(cleanJson)
    } catch {
      continue
    }

    const pageUrl = metadata?.purl
    const imgUrl = metadata?.murl
    if (!pageUrl || !imgUrl) continue

    // 标题
    const titleMatch = block.match(/<div[^>]*class="infnmpt"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : ""

    // 格式/尺寸
    const formatMatch = block.match(/<div[^>]*class="imgpt"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/i)
    const resolution = formatMatch ? formatMatch[1].trim() : ""

    pos++
    results.push(
      makeSearchResult({
        title: title || `Image ${pos}`,
        url: pageUrl,
        snippet: `${resolution} · ${imgUrl.slice(0, 80)}`.trim(),
        engine: "bing-images",
        position: pos,
        category: "image",
      }),
    )
  }

  return results
}

export * as BingImages from "./bing-images"
