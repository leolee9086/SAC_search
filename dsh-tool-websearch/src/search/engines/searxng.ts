/**
 * SearXNG —— **可选**的上游引擎（候选引擎，非必需依赖）。
 *
 * ## 定位：有则增强，无则自动降级
 *
 * 我们自己的引擎抓不住主流搜索（Google 返回 JS 跳转壳、百度/搜狗要验证码），
 * 而 SearXNG 有专职维护者持续跟进各家反爬。所以：
 *
 *   - **用户自己部署**了 SearXNG → 这个引擎自动生效，召回质量大幅提升
 *   - **没部署** → 它连不上，返回空数组、记一次失败，**其余引擎照常工作**
 *
 * 关键点：**它绝不能成为必需依赖**。让"装完 DSH 还要装 Python"成为门槛
 * 是不可接受的；但作为"愿意折腾就有更好效果"的可选项，则两全其美。
 *
 * 连不上时的开销可以忽略：本机端口没服务会立刻 ECONNREFUSED，
 * 不会等到超时；而且 executor 的熔断器会在连续失败后自动跳过它。
 *
 * 部署方式见 `docs/searxng.md`。
 *
 * ## 关键设计：把上游引擎信息展开
 *
 * SearXNG 的每条结果带一个 `engines` 数组（命中了哪几个上游引擎）。
 * 这里**为每个上游引擎各生成一条结果**，而不是压成一条，于是我们已有的
 * 去重与共识评分能**原样生效**：
 *   - URL 去重会把同一 URL 的多条合并回一条
 *   - `positions.length` 自然变成"命中几个上游引擎" → 共识线性放大
 *     （与 SearXNG 自己的 `calculate_score` 同一套语义）
 * 否则"被 google 和 bing 同时命中"这个事实就白丢了。
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

/** 默认指向本机实例；可用 DSH_SEARXNG_ENDPOINT 指向别处（换端口/换机器） */
const DEFAULT_ENDPOINT = "http://127.0.0.1:8899"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

/** SearXNG JSON 里我们关心的字段 */
interface SearxngResult {
  url?: string
  title?: string
  content?: string
  engines?: string[]
  category?: string
  publishedDate?: string | null
}

export function makeSearxng(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSearxng(http, query, opts, config.timeout),
  }
}

function searchSearxng(
  http: HttpClient.HttpClient,
  query: string,
  opts: SearchOptions,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const endpoint = (process.env.DSH_SEARXNG_ENDPOINT ?? DEFAULT_ENDPOINT).replace(/\/+$/, "")
    const url = `${endpoint}/search?q=${encodeURIComponent(query)}&format=json`

    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []

    const body: string = yield* response.text
    let parsed: { results?: SearxngResult[] }
    try {
      parsed = JSON.parse(body) as { results?: SearxngResult[] }
    } catch {
      // 拿到的不是 JSON：服务没部署、或走错了端口
      return []
    }

    const numResults = opts.numResults && opts.numResults > 0 ? opts.numResults : 30
    return parseSearxngResults(parsed.results ?? [], numResults)
  })
}

/**
 * 把 SearXNG 的结果转成我们的结果模型。
 *
 * 导出是为了能单独测：喂一份 JSON 就能验证转换逻辑，不必真的起一个实例。
 */
export function parseSearxngResults(
  raw: readonly SearxngResult[],
  maxResults: number,
): SearchResult[] {
  const out: SearchResult[] = []
  let rank = 0

  for (const r of raw) {
    if (rank >= maxResults) break
    const url = (r.url ?? "").trim()
    const title = (r.title ?? "").trim()
    // 没标题或没 URL 的结果对我们没价值（上游偶尔会返回这类条目）
    if (url === "" || title === "") continue

    rank++
    const upstreams = Array.isArray(r.engines) && r.engines.length > 0 ? r.engines : ["searxng"]
    const published = r.publishedDate ? Date.parse(r.publishedDate) : Number.NaN

    for (const upstream of upstreams) {
      out.push(
        makeSearchResult({
          title,
          url,
          snippet: (r.content ?? "").trim(),
          // 保留上游来源：这样"被几个引擎同时命中"的信息不会丢，
          // 最终输出里也能看出结果来自哪里
          engine: `searxng:${upstream}`,
          // 用 SearXNG 的综合名次当位置：它已按自身算法排过序，
          // 而我们拿不到"各上游引擎内部的原始名次"
          position: rank,
          ...(r.category !== undefined && r.category !== "" ? { category: r.category } : {}),
          ...(Number.isFinite(published) ? { publishedDate: published } : {}),
        }),
      )
    }
  }

  return out
}

export * as Searxng from "./searxng"
