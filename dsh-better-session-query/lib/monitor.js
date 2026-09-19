// lib/monitor.js — 界面监控的宿主数据面。
//
// 监控内容对照 s-forge(它那边用户能看到的是:索引状态 0 已索引 / 1 未索引、索引进度、
// 待处理的索引队列、各库体积、订正状态)。这里按同样五块组织:
//   state  → 是否在索引更新、阶段、进度、吞吐、上次错误
//   index  → 已索引会话 / 会话总数 / 未索引数 / 覆盖率、块数、可检索数、正文另存数、世代
//   size   → 主库字节、WAL 字节、倒排与正文文本字节、每块字节、分表行数
//   last   → 最近一轮索引更新摘要
//   config → 生效配置的只读摘要
//
// 路由只服务本机(loopback):monitor.json(索引快照)、memories.json(记忆,按三分视角分组)、
// events(SSE)、reindex(手动触发一轮)、compact(收缩库)、pause(暂停/继续)。

import { statSync } from "node:fs";

/** 允许访问监控数据面的远端地址。 */
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/**
 * 判断请求是否来自本机。
 * @param req - node:http 请求。
 * @returns 是否本机。
 */
export function isLoopback(req) {
  const address = req.socket?.remoteAddress;
  return typeof address === "string" && LOOPBACK.has(address);
}

/** 文件体积;文件不存在(如 :memory: 或还没建 WAL)就是 0。 */
export function fileBytes(path) {
  if (typeof path !== "string" || path === "" || path === ":memory:") return 0;
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

/** 进度换算成"每秒处理多少个会话"。 */
function ratePerSecond(progress, now) {
  const done = Number(progress?.done ?? 0);
  const startedAt = Number(progress?.startedAt ?? 0);
  if (progress?.running !== true || done <= 0 || startedAt <= 0) return 0;
  const seconds = Math.max(0.001, (now - startedAt) / 1000);
  return Math.round((done / seconds) * 10) / 10;
}

/**
 * 组装一份监控快照(纯函数,便于测试)。
 * @param input - `{ stats, size, progress, last, config, listed, walBytes, now }`。
 *   `listed` 是会话服务报的会话总数;拿不到时退化成"已索引数",覆盖率按 1 算。
 * @returns 快照对象。
 */
export function buildMonitorPayload(input = {}) {
  const { stats, size, progress, last, config, listed } = input;
  const now = Number(input.now ?? Date.now());
  const indexed = Number(stats?.sessions ?? 0);
  // 0 或非数字都算"还不知道":刚启动时会话服务可能还没报出总数,
  // 把 0 当真实总数就会显示"已索引 469 / 共 0"和 100% 覆盖率——那是假象,不如说不知道。
  const known = Number.isFinite(listed) && Number(listed) > 0;
  const total = known ? Number(listed) : null;
  const pending = known ? Math.max(0, total - indexed) : null;
  const blocks = Number(stats?.blocks ?? 0);
  const dbBytes = Number(size?.dbBytes ?? 0);
  const done = Number(progress?.done ?? 0);
  const total_ = Number(progress?.total ?? 0);
  return {
    version: 1,
    generatedAt: now,
    state: {
      running: progress?.running === true,
      phase: progress?.phase ?? "idle",
      // 暂停是用户意图(面板按下的):此时定时器与检索触发都停,只有显式请求还能跑。
      paused: input.paused === true,
      done,
      total: total_,
      percent: total_ > 0 ? Math.min(100, Math.round((done / total_) * 100)) : 0,
      updated: Number(progress?.updated ?? 0),
      unchanged: Number(progress?.unchanged ?? 0),
      errors: Number(progress?.errors ?? 0),
      current: progress?.current ?? null,
      startedAt: Number(progress?.startedAt ?? 0) || null,
      finishedAt: Number(progress?.finishedAt ?? 0) || null,
      lastError: progress?.lastError ?? null,
      ratePerSecond: ratePerSecond(progress, now),
    },
    index: {
      sessions: indexed,
      listed: total,
      pending,
      coverage: known ? Math.round((indexed / total) * 1000) / 1000 : null,
      blocks,
      searchable: Number(stats?.searchable ?? 0),
      storedTexts: Number(stats?.storedTexts ?? 0),
      generation: Number(stats?.generation ?? 0),
      updatedMs: Number(stats?.updatedMs ?? 0) || null,
    },
    size: {
      path: size?.path ?? null,
      dbBytes,
      walBytes: Number(input.walBytes ?? 0),
      textBytes: Number(size?.textBytes ?? 0),
      bytesPerBlock: blocks > 0 ? Math.round(dbBytes / blocks) : 0,
      needsCompact: input.needsCompact === true,
      tables: size?.tables ?? {},
    },
    last: last === undefined || last === null
      ? null
      : {
        at: Number(last.at ?? 0) || null,
        listed: Number(last.listed ?? 0),
        planned: Number(last.planned ?? 0),
        excluded: Number(last.excluded ?? 0),
        updated: Number(last.updated ?? 0),
        unchanged: Number(last.unchanged ?? 0),
        errors: Number(last.errors ?? 0),
        aborted: last.aborted === true,
      },
    config: config ?? null,
  };
}

/** 读请求体(上限 16KB)。 */
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw new Error("body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * 把监控数据面挂到宿主 web 服务器上。
 *
 * 宿主 web 服务由比本插件更晚加载的行提供,所以 apply 跑到这一刻
 * `ctx.get("webServer")` 还是 undefined——直接把路由挂上去会永远挂不上,
 * 界面表现为数据面全程 404。`ctx.inject` 会等服务就位再回调,
 * 并在该服务被替换时重新挂一次。
 *
 * @param ctx - 插件上下文。
 * @param deps - `{ snapshot, reindex, compact, pause, memories, path, log }`;snapshot 与 memories 是 async () => payload。
 * @returns 是否已排队挂载(真正的挂载结果见 mountMonitor)。
 */
export function installMonitor(ctx, deps) {
  // 前缀怎么正规化由 createMonitorRoute 负责——用它的地方才管它对不对。
  //
  // 这个回调**绝不能有返回值**。Cordis 把插件回调的返回值当成 Effect 处理
  // (disposer 函数、它的 promise,或产出 disposer 的迭代器;见 vendor/cordis 的
  // Fiber._execute)。返回 true 会走到 `throw new TypeError("Invalid effect")`,
  // 让这个 fiber 加载失败、并把刚挂上的路由连同其它 effect 一起回滚掉——
  // 结果是界面依旧 404,而且插件日志里一个字都不会有(错误在 Cordis 那一层)。
  ctx.inject(["webServer"], (webCtx) => {
    mountMonitor(webCtx, deps, deps.path ?? "/session-blocks");
  });
  return true;
}

/**
 * 在 webServer 已经就位之后挂上路由。
 * 这里的 ctx 来自 `ctx.inject(["webServer"], ...)`,回调能跑就说明服务已经提供了。
 *
 * @param ctx - webServer 已就位的上下文。
 * @param deps - 同 installMonitor。
 * @param base - 已去掉尾斜杠的挂载前缀。
 * @returns 是否挂上了。
 */
function mountMonitor(ctx, deps, base) {
  // 用 ctx.get 严格读全局服务表。这里刻意不用属性代理 ctx.webServer:
  // 代理是拓扑敏感的(只对"本上下文声明的注入"有意义),而这一步要问的
  // 只是"服务在不在"这一个事实——DSH 自己的规则也是可选服务用 ctx.get。
  const webServer = ctx.get("webServer");
  if (webServer === undefined || typeof webServer.register !== "function") {
    deps.log("dsh-better-session-query: 没有 webServer,界面监控没有数据源(host 侧照常工作)");
    return false;
  }
  ctx.effect(() => webServer.register(createMonitorRoute(deps, base)), "betterSessionQuery.monitorRoutes");
  // 挂上了就落一条:数据面"活没活"不该只能靠探端点才知道(这个面板曾经全程 404 而日志里什么都没有)。
  deps.log(`dsh-better-session-query: 界面监控数据面已挂载 ${base}`);
  return true;
}

/**
 * 造数据面的路由。返回的就是 `webServer.register` 要的那个普通对象,
 * 整个过程不碰任何宿主服务——所以测试可以直接造一个路由、喂假请求进去,
 * 不需要仿真 Cordis 的时序。
 *
 * @param deps - `{ snapshot, reindex, compact, pause, memories }`;snapshot 与 memories 是 async () => payload。
 * @param base - 挂载前缀,已经去掉尾斜杠。
 * @returns `{ kind, path, handler }`。
 */
export function createMonitorRoute(deps, base) {
  const prefix = String(base ?? "").replace(/\/+$/, "");
  const json = (res, status, payload) => {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify(payload));
  };
  return {
    kind: "prefix",
    path: prefix,
    handler: async (req, res) => {
      if (!isLoopback(req)) {
        json(res, 403, { error: "loopback only" });
        return;
      }
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const route = url.pathname.slice(prefix.length) || "/";
      if (req.method === "GET" && route === "/monitor.json") {
        try {
          json(res, 200, await deps.snapshot());
        } catch (error) {
          json(res, 500, { error: error && error.message ? error.message : String(error) });
        }
        return;
      }
      if (req.method === "GET" && route === "/memories.json") {
        try {
          json(res, 200, await deps.memories());
        } catch (error) {
          json(res, 500, { error: error && error.message ? error.message : String(error) });
        }
        return;
      }
      if (req.method === "GET" && route === "/events") {
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-store",
          connection: "keep-alive",
        });
        let lastBody = "";
        let closed = false;
        /**
         * 上一拍还没跑完时跳过这一拍。
         *
         * `setInterval` 不会等 async 回调:`deps.snapshot()` 一旦比间隔慢,每一拍都会**再起一个**
         * 并发的组装,越堆越多,把事件循环占满(实测快照 2.6 秒 / 间隔 1 秒 —— 永久积压)。
         * 这里的跳过不是丢数据:快照是"当前状态的完整投影",下一拍拿到的就是最新的,
         * 中间那些过期的本来也没有意义。
         */
        let pushing = false;
        const push = async () => {
          if (closed || pushing) return;
          pushing = true;
          try {
            const body = JSON.stringify(await deps.snapshot());
            if (body === lastBody) return;
            lastBody = body;
            res.write(`data: ${body}\n\n`);
          } catch {
            // 快照失败不该打死这条流:下一次心跳再试。
          } finally {
            pushing = false;
          }
        };
        await push();
        // 2 秒而不是 1 秒:面板是给人看的,秒级刷新已经远超人的阅读速度;
        // 而组装虽然已经降到百毫秒级,仍要给足余量(索引正在跑时它会变慢)。
        const timer = setInterval(push, 2000);
        const heartbeat = setInterval(() => {
          if (!closed) res.write(": keep-alive\n\n");
        }, 15000);
        const cleanup = () => {
          closed = true;
          clearInterval(timer);
          clearInterval(heartbeat);
        };
        timer.unref?.();
        heartbeat.unref?.();
        req.on("close", cleanup);
        res.on("close", cleanup);
        return;
      }
      if (req.method === "POST" && route === "/reindex") {
        try {
          const body = await readBody(req);
          const payload = body.length === 0 ? {} : JSON.parse(body);
          const summary = await deps.reindex({ force: payload.force === true });
          json(res, 200, { ok: true, summary });
        } catch (error) {
          json(res, 400, { error: error && error.message ? error.message : String(error) });
        }
        return;
      }
      if (req.method === "POST" && route === "/compact") {
        try {
          const body = await readBody(req);
          const payload = body.length === 0 ? {} : JSON.parse(body);
          const result = await deps.compact({ vacuum: payload.vacuum !== false });
          json(res, 200, { ok: true, result });
        } catch (error) {
          json(res, 400, { error: error && error.message ? error.message : String(error) });
        }
        return;
      }
      if (req.method === "POST" && route === "/pause") {
        try {
          const body = await readBody(req);
          const payload = body.length === 0 ? {} : JSON.parse(body);
          const result = deps.pause({ paused: payload.paused !== false });
          json(res, 200, { ok: true, result });
        } catch (error) {
          json(res, 400, { error: error && error.message ? error.message : String(error) });
        }
        return;
      }
      json(res, 404, { error: "not found" });
    },
  };
}
