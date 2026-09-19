// lib/runner.js — 索引更新调度器:单飞、分片让出、后台定时、可取消、可观察进度。
//
// 为什么要这一层:`node:sqlite` 只有同步 API,写入块的那一段(每个会话一个事务)必然占着
// JS 线程。真正的"异步索引"在这里落成三件事:
//   1. 单飞——同一时刻只有一轮索引更新,并发触发排成一条链,不会重复读日志、重复写同一会话;
//   2. 分片让出——每处理若干个会话就把事件循环交还一次(setImmediate),让 SSE、别的会话
//      的工具调用、审批提示有机会跑,而不是等整轮跑完;单会话事务仍是同步块(除非上 worker);
//   3. 后台调度——按间隔在后台跑,检索路径可以选择不等它(见 config.reconcileOnSearch)。
// 进度通过 onProgress 回调发布,插件把它挂到 stats()/status 上。

/** 把事件循环交还一次。 */
function yieldToLoop() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

/** 空进度快照。 */
function idleProgress() {
  return {
    running: false,
    phase: "idle",
    listed: 0,
    planned: 0,
    total: 0,
    done: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    current: undefined,
    startedAt: 0,
    finishedAt: 0,
    lastError: undefined,
  };
}

/**
 * 造一个索引更新调度器。
 * @param input - `{ indexer, backgroundMs, yieldEvery, log, onProgress }`。
 * @returns `{ run, startBackground, stop, progress, isRunning }`。
 */
export function createIndexRunner({ indexer, backgroundMs = 0, yieldEvery = 1, log = () => {}, onProgress = () => {} } = {}) {
  let tail = Promise.resolve();
  let controller;
  let timer;
  let progress = idleProgress();

  const emit = () => {
    try {
      onProgress({ ...progress });
    } catch {
      // 观察者自己抛错不能影响索引更新。
    }
  };

  async function runOnce(request) {
    controller = new AbortController();
    const signal = request.signal ?? controller.signal;
    progress = {
      ...idleProgress(),
      running: true,
      phase: "listing",
      startedAt: Date.now(),
    };
    emit();
    try {
      const summary = await indexer.reconcile({
        ...request,
        signal,
        yieldEvery,
        onProgress(event) {
          progress = { ...progress, ...event, running: true, phase: event.phase ?? progress.phase };
          emit();
        },
      });
      progress = {
        ...progress,
        ...summary,
        running: false,
        phase: summary.aborted === true ? "stopped" : "idle",
        current: undefined,
        finishedAt: Date.now(),
      };
      emit();
      return summary;
    } catch (error) {
      const aborted = error?.name === "AbortError" || signal.aborted === true;
      progress = {
        ...progress,
        running: false,
        phase: aborted ? "stopped" : "error",
        current: undefined,
        finishedAt: Date.now(),
        lastError: aborted ? undefined : (error && error.message ? error.message : String(error)),
      };
      emit();
      // 取消不是失败:给调用方一份"停在这儿"的摘要,而不是抛出去打断工具调用。
      if (aborted) {
        return { listed: 0, planned: 0, excluded: 0, updated: 0, unchanged: 0, errors: 0, aborted: true };
      }
      throw error;
    } finally {
      controller = undefined;
      // 让出一次,避免"最后一轮跑完立刻又接上一轮"把事件循环连着占满。
      await yieldToLoop();
    }
  }

  return {
    /**
     * 触发一轮索引更新。单飞:并发调用不会并行跑,后到者等前一轮结束后再跑自己的那轮。
     * @param request - 透传给 indexer.reconcile 的参数(force/sessionIds/maxSessions/signal)。
     */
    run(request = {}) {
      const next = tail.then(() => runOnce(request), () => runOnce(request));
      tail = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
    /** 开后台定时索引更新(幂等);backgroundMs <= 0 时什么都不做。 */
    startBackground() {
      if (timer !== undefined || !(backgroundMs > 0)) return false;
      timer = setInterval(() => {
        this.run({}).catch((error) => {
          log(`后台索引更新失败:${error && error.message ? error.message : String(error)}`);
        });
      }, backgroundMs);
      timer.unref?.();
      return true;
    },
    /** 停后台定时并取消在飞的一轮(卸载、关库时调用)。 */
    stop() {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
      controller?.abort();
    },
    /** 当前进度快照(给 stats()/status 用)。 */
    progress() {
      return { ...progress };
    },
    isRunning() {
      return progress.running;
    },
  };
}
