// Process-local progress, owned by one plugin activation. Never touches Session logs.
export function createProgressStore() {
  const sessions = new Map();
  let disposed = false;

  return {
    start(sessionId, callId, signal) {
      if (disposed || !sessionId || !callId || signal?.aborted) return undefined;
      let calls = sessions.get(sessionId);
      if (!calls) sessions.set(sessionId, calls = new Map());
      // A repeated call id replaces only its own previous observation.
      calls.get(callId)?.finish();
      sessions.set(sessionId, calls);
      const entry = { progress: undefined, finish };
      calls.set(callId, entry);
      function finish() {
        signal?.removeEventListener("abort", finish);
        if (calls.get(callId) !== entry) return;
        calls.delete(callId);
        if (calls.size === 0) sessions.delete(sessionId);
      }
      signal?.addEventListener("abort", finish, { once: true });
      return {
        update(progress) {
          if (disposed || calls.get(callId) !== entry) return;
          // Keep only the five preview rows consumed by the running card.
          entry.progress = {
            done: progress.done,
            total: progress.total,
            current: progress.current,
            phase: progress.phase,
            partialCount: progress.partialCount,
            latestResults: progress.latestResults.slice(0, 5).map(({ title, url, engine }) => ({ title, url, engine })),
          };
        },
        finish,
      };
    },
    get(sessionId, callId) {
      return sessions.get(sessionId)?.get(callId)?.progress;
    },
    dispose() {
      disposed = true;
      for (const calls of sessions.values()) {
        for (const entry of calls.values()) entry.finish();
      }
      sessions.clear();
    },
  };
}
