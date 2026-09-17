/**
 * 知乎 —— 走**官方开放平台 API**（developer.zhihu.com），不抓网页。
 *
 * ## 为什么不用抓取
 *
 * 知乎网页版对非浏览器请求直接给 403；就算用 CDP 驱动真实 Chrome（带登录态），
 * 抓到的搜索页显示的是「未搜索到相关内容，提问快速获得回答」——
 * 而同一个查询走官方接口能拿到 10 条**正文级**结果（ContentText 是内容本身，
 * 不只是摘要），还带 VoteUpCount / AuthorityLevel / RankingScore。
 * 这是量级上的差别，没有任何理由再去抓网页。
 *
 * ## 凭证
 *
 * ref 名 `ZHIHU_ACCESS_SECRET`。由 Host 侧从 DSH 的 credentials 服务解析后
 * 塞进环境变量（见 `lib/index.js` 的 inject）——**本引擎只读环境变量**，
 * 不关心它怎么落盘的，也不依赖 dsh-zhihu-tools 那个插件。
 *
 * ## 配额
 *
 * 官方口径 **5000 次/天**，对个人使用绰绰有余，不必刻意省着用。
 *
 * ## 接口限制（决定了这个引擎的上限）
 *
 * `Count` 官方上限 **10**，且 `HasMore` 恒为 false —— **没有分页**。
 * 所以知乎最多贡献 10 条结果；换来的是这 10 条质量很高。
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult, stripHtml } from "../engine"

const API_BASE = "https://developer.zhihu.com"
/** 官方上限就是 10，且没有分页 */
const MAX_COUNT = 10

/** 接口返回的结果条目（只列我们用到的字段） */
interface ZhihuItem {
  Title?: string
  ContentType?: string
  ContentID?: string | number
  ContentText?: string
  Url?: string
  CommentCount?: number
  VoteUpCount?: number
  AuthorName?: string
  AuthorBadgeText?: string
  EditTime?: number
  AuthorityLevel?: string
  RankingScore?: number
}

interface ZhihuResponse {
  Code?: number
  Message?: string
  Data?: { Items?: ZhihuItem[]; EmptyReason?: string }
}

export function makeZhihu(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchZhihu(http, query, opts, config.timeout),
  }
}

function searchZhihu(
  http: HttpClient.HttpClient,
  query: string,
  opts: SearchOptions,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const secret = (process.env.ZHIHU_ACCESS_SECRET ?? "").trim()
    // 没配凭证就静默跳过 —— 这不是错误，只是这个可选引擎没启用
    if (secret === "") return []

    const count = Math.min(MAX_COUNT, Math.max(1, opts.numResults ?? MAX_COUNT))
    const params = new URLSearchParams({ Query: query, Count: String(count) })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_BASE}/api/v1/content/zhihu_search?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          Authorization: `Bearer ${secret}`,
          // 官方要求 unix 秒
          "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []

    const body: string = yield* response.text
    let parsed: ZhihuResponse
    try {
      parsed = JSON.parse(body) as ZhihuResponse
    } catch {
      return []
    }

    // Code !== 0 时有明确语义（10001 参数 / 20001 鉴权 / 30001 限流 / 30002 配额），
    // 但对搜索来说都只是"这次没结果" —— 不抛错，让其他引擎照常工作
    if (parsed.Code !== 0) return []

    return parseZhihuItems(parsed.Data?.Items ?? [], count)
  })
}

/**
 * 映射成我们的结果模型。
 *
 * 按知乎自己的 `RankingScore` 降序排 —— 它比我们更懂站内的相关性，
 * 而 position 会进入我们的共识评分，等于把知乎的判断引进来。
 *
 * 导出是为了能单独测：喂一份 JSON 就能验证映射，不必真的调接口。
 */
export function parseZhihuItems(items: readonly ZhihuItem[], maxResults: number): SearchResult[] {
  const valid = items
    .filter(
      (it) =>
        typeof it.Url === "string" && it.Url !== ""
        && typeof it.Title === "string" && it.Title !== "",
    )
    .slice()
    .sort((a, b) => (b.RankingScore ?? 0) - (a.RankingScore ?? 0))
    .slice(0, maxResults)

  return valid.map((it, i) => {
    // EditTime 是 unix 秒
    const published = typeof it.EditTime === "number" ? it.EditTime * 1000 : Number.NaN
    return makeSearchResult({
      title: cleanTitle(it.Title ?? ""),
      url: it.Url ?? "",
      snippet: stripHtml(it.ContentText ?? "").trim(),
      engine: "zhihu",
      position: i + 1,
      ...(Number.isFinite(published) ? { publishedDate: published } : {}),
    })
  })
}

/** 接口的标题固定带 " - 知乎" 后缀，纯噪声，去掉 */
function cleanTitle(title: string): string {
  return title.replace(/\s*-\s*知乎\s*$/, "").trim()
}

export * as Zhihu from "./zhihu"
