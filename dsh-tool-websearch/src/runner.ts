// runner.ts — DSH web_search 工具的搜索执行封装。
// 直接调用 s-code 移植的 search 模块(Selector/Executor/Aggregator/Cache/QueryIntent),
// 提供纯 async 的 searchWeb() 入口。构建期由 bun build 打包为自包含 ESM bundle,
// 运行时只依赖 Node 全局 fetch(effect 的 FetchHttpClient.layer 基于 globalThis.fetch)。
//
// 引擎选择语义与 s-code 一致:无过滤参数时使用全部引擎,传 queryType/timeRange/lang
// 时按过滤选引擎。engines / maxWaitSeconds 是显式可选参数,默认不裁剪、不设总超时
// (每引擎 15s 超时由 executor 兜底),运行结果附引擎统计,长运行可观测。
import { Effect } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import { Aggregator, Cache, Engine, Executor, QueryIntent, RateLimiter, Selector } from "./search/index";
import * as Proxy from "./search/proxy";

export interface WebSearchParams {
  query: string;
  numResults?: number;
  queryType?: "general" | "code" | "news" | "academic" | "social" | "video" | "shopping";
  timeRange?: "day" | "week" | "month" | "year";
  lang?: string;
  engines?: string[];
  maxWaitSeconds?: number;
}

/** 运行中进度观测(等同 s-code 的 Tool.Progress):每引擎 start/result/done 相位回调。 */
export interface SearchProgress {
  done: number;
  total: number;
  current: string;
  phase: "start" | "result" | "done";
  partialCount: number;
  latestResults: { title: string; url: string; engine: string }[];
}

function aggregateText(
  engines: readonly import("./search/engine").SearchEngine[],
  results: readonly import("./search/engine").SearchResult[],
  query: string,
  numResults: number,
): { text: string; stats: Aggregator.AggregateStats | undefined } {
  if (results.length === 0) return { text: "", stats: undefined };
  const weights = new Map(engines.map((e) => [e.name, e.config.weight]));
  const { results: aggregated, stats } = Aggregator.aggregate(results, { weights, maxResults: numResults }, query);
  if (aggregated.length === 0) return { text: "", stats };
  return { text: Aggregator.formatResults(aggregated, query), stats };
}

function engineStats(
  engines: readonly import("./search/engine").SearchEngine[],
  results: readonly import("./search/engine").SearchResult[],
  errors: readonly unknown[],
  elapsedMs: number,
  agg?: Aggregator.AggregateStats,
): string {
  const ok = new Set(results.map((r) => r.engine)).size;
  const failed = engines.length - ok;
  const parts = [`引擎 ${engines.length} 个`, `成功 ${ok}`, `失败 ${failed}`, `耗时 ${Math.round(elapsedMs / 1000)}s`];
  if (errors.length > 0) parts.push(`错误 ${errors.length} 个`);
  /*
   * 如实报出「召回 → 去重 → 排序 → 显示」这条漏斗。
   *
   * 只报"显示 30 条"是不够的：调用方无从判断是被引擎少召回了、
   * 还是被我们截断了。有这个漏斗，它就能决定是加大 numResults、
   * 换关键词、还是换引擎重搜 —— 这是**可操作的信息**，而不是好看的统计。
   */
  if (agg !== undefined) {
    parts.push(`召回 ${agg.raw} → 去重 ${agg.deduped} → 合并 ${agg.merged} → 显示 ${agg.shown}`);
  }
  return `[${parts.join(" · ")}]`;
}

export interface EngineInfo {
  name: string;
  requiresKey: boolean;
  weight: number;
  timeoutMs: number;
}

export function listEngines(): EngineInfo[] {
  return Selector.selectEngines().map((e) => ({
    name: e.name,
    requiresKey: e.config.requiresKey,
    weight: e.config.weight,
    timeoutMs: e.config.timeout,
  }));
}

export function getStatus(): {
  rateLimiter: Record<string, unknown>;
  cache: { size: number; hitRate: number };
  engines: Record<string, unknown>;
} {
  return {
    rateLimiter: RateLimiter.getGlobalRateLimiter().getStatus(),
    cache: { size: Cache.globalResultCache.size, hitRate: Cache.globalResultCache.hitRate },
    engines: Object.fromEntries(Executor.getGlobalState().engineStatuses),
  };
}

export function getProxyState() {
  return Proxy.getProxyState();
}

export function setProxyEnabled(enabled: boolean, proxyUrl?: string) {
  return Proxy.setProxyEnabled(enabled, proxyUrl);
}

export function toggleProxy() {
  return Proxy.toggleProxy();
}

export function ensureProxyApplied() {
  return Proxy.ensureApplied();
}

export function searchWeb(params: WebSearchParams, signal?: AbortSignal, onProgress?: (p: SearchProgress) => void): Promise<string> {
  const query = params.query.trim();
  if (!query) return Promise.resolve("ERROR: query 不能为空");
  const program = Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient;
    const startedAt = Date.now();

    // 意图检测(覆盖 queryType):用户显式指定优先
    const intent = QueryIntent.detectQueryIntent(query);
    const effectiveQueryType = params.queryType || intent.queryType || "general";

    /*
     * 引擎选择：**意图检测的结果必须用上**。
     *
     * 原来是「只有用户显式传了 queryType/timeRange/lang 才按类型选，
     * 否则走无参分支」。后果很严重：
     *   - 无参分支 = 201 个引擎全上（视频、购物、图片、学术、代码一起跑），
     *     实测同一查询耗时 106 秒、81 个引擎失败，结果里混着电影和论文；
     *   - 而显式传 `general` 时，因为 selector 里通用引擎的条件写的是
     *     `if (!flags)`，**Google/百度/Startpage/Yahoo 这些反而全被排除**，
     *     只剩下 pubmed、igdb、openweather 这类垂直引擎。
     *
     * 检测出来的意图是我们手上最可靠的信号，没有理由只在用户显式传参时才用。
     */
    let engines = Selector.selectEngines({
      queryType: effectiveQueryType,
      timeRange: params.timeRange,
      lang: params.lang,
    });

    // 显式白名单:只保留用户点名的引擎,不存在的名字明确报出,不静默
    if (params.engines && params.engines.length > 0) {
      const wanted = new Set(params.engines);
      const picked = engines.filter((e) => wanted.has(e.name));
      const missing = params.engines.filter((n) => !engines.some((e) => e.name === n));
      if (picked.length === 0) {
        return `ERROR: 指定的引擎均不存在: ${missing.join(", ")}。可用引擎列表见 web_search_status。`;
      }
      engines = picked;
      if (missing.length > 0) {
        return `ERROR: 以下引擎不存在,已忽略: ${missing.join(", ")}。可用引擎列表见 web_search_status。`;
      }
    }
    if (engines.length === 0) return "没有可用的搜索引擎。";

    /*
     * 输出条数。
     *
     * 默认从 8 提到 30、上限从 50 提到 200 —— 因为**过度截断是这里最大的信息损失**。
     *
     * 元搜索的价值在**召回**：各个引擎把互联网上相关的东西捞上来，
     * 我们的职责是尽量别弄丢，而不是替调用方决定"只要 8 条"。
     * 只给 8 条意味着：排序稍有偏差，真正有用的那条就被丢在视野之外，
     * 而且调用方**根本不知道还有多少条**。这是不可恢复的信息损失 ——
     * 给多了最坏情况是噪声多一点，给少了是"不知道自己错过了什么"。
     *
     * 同时 stats 里会如实报出「召回多少 → 去重后多少 → 显示多少」，
     * 让调用方能判断要不要调大、或者换关键词重来。
     */
    const numResults = params.numResults && params.numResults > 0
      ? Math.min(params.numResults, 200)
      : 30;
    const opts = Engine.makeSearchOptions({ numResults, timeRange: params.timeRange, lang: params.lang });

    // 内存缓存(热层):相同查询+选项直接返回聚合结果
    const cacheKey = Cache.ResultCache.makeKey(query, { numResults, timeRange: params.timeRange, lang: params.lang });
    const cached = Cache.globalResultCache.get(cacheKey);
    if (cached && cached.length > 0) {
      const { text, stats: agg } = aggregateText(engines, cached, query, numResults);
      const stats = engineStats(engines, cached, [], Date.now() - startedAt, agg);
      if (text) return `${stats}\n\n[缓存命中] ${text}`;
    }

    // 并发执行(executor 内部 MAX_CONCURRENCY=10 + 每引擎熔断/限流/15s 超时)
    // 总超时仅当用户显式传 maxWaitSeconds 时生效;超时说明进度,不静默
    const state = Executor.getGlobalState();
    const onEngineProgress: import("./search/executor").ProgressCallback = (info) => {
      if (!onProgress) return;
      onProgress({
        done: info.done,
        total: info.total,
        current: info.current,
        phase: info.phase,
        partialCount: info.partialResults.length,
        latestResults: info.partialResults
          .slice(-5)
          .reverse()
          .map((r) => ({ title: r.title, url: r.url, engine: r.engine })),
      });
    };
    const execEffect = Executor.executeAll(engines, http, query, opts, state, onEngineProgress);
    const execResult =
      params.maxWaitSeconds && params.maxWaitSeconds > 0
        ? yield* execEffect.pipe(Effect.timeout(`${params.maxWaitSeconds} seconds`))
        : yield* execEffect;
    if (!execResult) {
      return `搜索超过 ${params.maxWaitSeconds} 秒未完成(共 ${engines.length} 个引擎,每个引擎上限 15 秒)。可调大 maxWaitSeconds,或传 engines 指定引擎子集加速。`;
    }

    // 写回缓存
    if (execResult.results.length > 0) Cache.globalResultCache.set(cacheKey, execResult.results);

    /*
     * 引擎明细（`DSH_WEBSEARCH_DEBUG=1` 时打到 stderr）。
     *
     * 为什么需要它：汇总行 `[成功 5 · 失败 41]` 只说明"很糟"，不说明**糟在哪**。
     * 要优化召回就得知道：哪些引擎一个结果都没回来、失败的具体原因是什么。
     * 而这个信息只在执行结束的这一刻存在 —— 打出来比随返回值丢掉有用得多。
     *
     * 特意用 stderr：不污染返回给模型的结果文本。
     */
    if (process.env.DSH_WEBSEARCH_DEBUG === '1') {
      const byEngine = new Map<string, number>();
      for (const r of execResult.results) byEngine.set(r.engine, (byEngine.get(r.engine) ?? 0) + 1);
      const withResults = [...byEngine].sort((a, b) => b[1] - a[1]);
      process.stderr.write(
        `[websearch] 查询=${JSON.stringify(query)} 类型=${effectiveQueryType} 引擎=${engines.length}\n`
        + `[websearch] 有结果的引擎 ${withResults.length} 个（共 ${execResult.results.length} 条）:\n`
        + withResults.map(([n, c]) => `    ${n.padEnd(20)} ${c}`).join('\n') + '\n',
      );
      process.stderr.write(
        `[websearch] 报错 ${execResult.errors.length} 个:\n`
        + execResult.errors.map((e) => `    ${JSON.stringify(e)}`).join('\n') + '\n',
      );
      const silent = engines.filter((e) => !byEngine.has(e.name));
      process.stderr.write(
        `[websearch] 无结果的引擎 ${silent.length} 个:\n`
        + silent.map((e) => `    ${e.name}`).join('\n') + '\n',
      );
    }

    const { text, stats: agg } = aggregateText(engines, execResult.results, query, numResults);
    const stats = engineStats(engines, execResult.results, execResult.errors, Date.now() - startedAt, agg);
    return `${stats}\n\n${text || "未找到搜索结果。请尝试其他查询词。"}`;
  });
  // signal 为调用方取消信号(DSH 工具的 exec.signal):已 abort 时立即拒绝,
  // 运行中 abort 时 effect 中断(effect 的 runPromise 支持 AbortSignal)。
  if (signal && signal.aborted) {
    return Promise.reject(new Error("search aborted"));
  }
  return Proxy.ensureApplied()
    .catch(() => undefined)
    .then(() => Effect.runPromise(Effect.provide(program, FetchHttpClient.layer), signal ? { signal } : undefined));
}
