/**
 * 界面半边:DSH 原生右侧栏的「会话块索引」监控 tab。
 * 经典脚本格式(window.__ModuleLoader__.load),只用基线模块 react,无 JSX。
 * 注册键必须是包名:客户端模块表按图形行的 id 查工厂,行 id 就是包名。
 *
 * 监控内容对照 s-forge:状态(已索引/未索引)、索引进度、待办、库体积、最近一轮结果。
 */
window.__ModuleLoader__.load({
  id: "dsh-better-session-query",
  factory: (require) => {
    const react = require("react");
    const h = react.createElement;
    const NS = "dsh-better-session-query";
    const KIND = "dsh-better-session-query:monitor";
    const BASE = "/session-blocks";

    const T = {
      ink: "var(--dsw-alias-label-primary, #1f1f1f)",
      inkSecondary: "var(--dsw-alias-label-secondary, #757575)",
      border: "var(--dsw-alias-border-secondary, rgba(128,128,128,0.28))",
      hover: "var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,0.10))",
      danger: "var(--dsw-alias-state-danger-primary, #c62828)",
      success: "var(--dsw-alias-state-success-primary, #2e7d32)",
      warn: "var(--dsw-alias-state-warn-primary, #b26a00)",
      track: "var(--dsw-alias-bg-base, rgba(128,128,128,0.16))",
    };
    const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "11px" };
    const label = { color: T.inkSecondary, fontSize: "11px" };
    const value = { ...mono, color: T.ink };

    /** 字节数按人类可读格式化。 */
    const bytes = (n) => {
      const v = Number(n ?? 0);
      if (v < 1024) return `${v} B`;
      if (v < 1024 * 1024) return `${Math.round((v / 1024) * 10) / 10} KB`;
      return `${Math.round((v / 1048576) * 100) / 100} MB`;
    };
    const ms = (n) => (Number(n ?? 0) < 1000 ? `${Math.round(Number(n ?? 0))} ms` : `${Math.round(Number(n ?? 0) / 1000)} s`);
    const clock = (t) => (t ? new Date(t).toLocaleTimeString() : "—");

    /** 一行「标签: 值」。 */
    const row = (key, text, color) => h("div", {
      key,
      style: { display: "flex", justifyContent: "space-between", gap: "8px", padding: "2px 0" },
    },
    h("span", { style: label }, key),
    h("span", { style: { ...value, color: color ?? T.ink } }, text));

    /** 面板按钮的统一外观。 */
    const buttonStyle = (busy, theme) => ({
      width: "100%", height: "30px", borderRadius: "8px", cursor: busy ? "default" : "pointer",
      border: `1px solid ${theme.border}`, background: theme.hover, color: theme.ink,
      fontFamily: "inherit", fontSize: "12px", opacity: busy ? 0.6 : 1,
    });

    /** 进度条。 */
    const bar = (percent) => h("div", {
      style: { height: "6px", borderRadius: "3px", background: T.track, overflow: "hidden", margin: "6px 0" },
    }, h("div", {
      style: { width: `${Math.max(2, Math.min(100, Number(percent ?? 0)))}%`, height: "100%", background: T.success, transition: "width .3s ease" },
    }));

    // 槽位组件定义在 apply 之外,拿不到 apply 里的 t:locale 由槽位声明的 NS 经 props 下发,
    // 兜底再用一份本地字典,保证 props.t 缺席时也只是退回中文文案而不是崩。
    const LABELS = {
      title: "记忆", loading: "加载中…", unavailable: "监控数据面不可用(插件未启用?)",
      idle: "空闲", running: "正在索引", error: "出错", working: "处理中…",
      // 面板是只读监控:后台服务自己会跟上进度,不给"跑一轮"这类机制按钮。
      // 只有两个真正需要人决定的动作:暂停/继续、压缩占用。
      pause: "暂停索引", resume: "继续索引", paused: "已暂停",
      compact: "压缩索引占用",
      reclaimed: "已压缩", needsCompact: "占用偏大,建议压缩一次",
      index: "索引", size: "占用", last: "上次更新",
      sessions: "会话(已索引/总数)", pending: "待索引会话", coverage: "覆盖率",
      blocks: "块(可检索)", storedTexts: "正文另存(未进倒排)",
      db: "索引库", wal: "WAL", text: "倒排与正文文本", perBlock: "每块均摊",
      listed: "会话总数", planned: "计划处理", updated: "更新", unchanged: "未变",
      errors: "失败", aborted: "被取消", yes: "是",
      // 记忆面板(页签的默认视图)。三个抽屉的名字用三贤人,不用"超我/自我/本我"——
      // 后者是心理结构,是解释,不是给人看的标签。
      memoryTab: "记忆", indexTab: "索引",
      memoryLoading: "加载中…", memoryUnavailable: "记忆库不可用",
      memoryEmpty: "还没有记忆——用 session_blocks_remember 记一条试试",
      memories: "条", fresh: "新鲜", stale: "过期", expiresAt: "失效于",
    };

    const Monitor = (props) => {
      const t = (typeof props?.t === "function" && props.t) || ((key) => LABELS[key] ?? key);
      const [snap, setSnap] = react.useState(null);
      const [error, setError] = react.useState(null);
      const [busy, setBusy] = react.useState(false);
      const [notice, setNotice] = react.useState(null);

      const load = react.useCallback(async () => {
        try {
          const res = await fetch(`${BASE}/monitor.json`, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setSnap(await res.json());
          setError(null);
        } catch (err) {
          setError(String(err?.message ?? err));
        }
      }, []);

      react.useEffect(() => {
        let alive = true;
        let timer = null;
        const tick = async () => {
          await load();
          if (!alive) return;
          timer = setTimeout(tick, 2000);
        };
        tick();
        return () => { alive = false; if (timer) clearTimeout(timer); };
      }, [load]);

      const post = async (route, body, onDone) => {
        setBusy(true);
        try {
          const res = await fetch(`${BASE}/${route}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body ?? {}),
          });
          const payload = await res.json().catch(() => null);
          if (onDone) onDone(payload);
        } catch (err) {
          setNotice(String(err?.message ?? err));
        }
        await load();
        setBusy(false);
      };

      if (error !== null && snap === null) {
        return h("div", { style: { padding: "12px", color: T.inkSecondary, fontSize: "12px" } },
          t("unavailable"),
          h("div", { style: { ...mono, marginTop: "6px", color: T.danger } }, error));
      }
      if (snap === null) {
        return h("div", { style: { padding: "12px", color: T.inkSecondary, fontSize: "12px" } }, t("loading"));
      }

      const state = snap.state ?? {};
      const index = snap.index ?? {};
      const size = snap.size ?? {};
      const last = snap.last;
      const paused = snap.state?.paused === true;
      const tone = paused ? T.ink : (state.running ? T.warn : (state.lastError ? T.danger : T.success));
      const statusText = paused
        ? t("paused")
        : state.running
          ? `${t("running")} ${state.done}/${state.total}`
          : (state.lastError ? `${t("error")}: ${state.lastError}` : t("idle"));

      return h("div", { style: { padding: "12px", fontSize: "12px", color: T.ink } },
        h("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
          h("span", { style: { width: "8px", height: "8px", borderRadius: "4px", background: tone, flex: "none" } }),
          h("strong", { style: { fontSize: "12px" } }, statusText),
          h("span", { style: { ...label, marginLeft: "auto" } }, clock(snap.generatedAt))),
        state.running ? bar(state.percent) : null,
        state.running
          ? h("div", { style: { ...label, marginBottom: "6px" } },
            `${state.current ?? "—"} · ${state.updated} 更新 / ${state.unchanged} 未变 / ${state.errors} 失败 · ${state.ratePerSecond}/s`)
          : null,

        h("div", { style: { marginTop: "10px", paddingTop: "8px", borderTop: `1px solid ${T.border}` } },
          h("div", { style: { ...label, marginBottom: "4px" } }, t("index")),
          row(t("sessions"), index.listed === null || index.listed === undefined
            ? `${index.sessions} / ?(会话服务尚未报出总数)`
            : `${index.sessions} / ${index.listed}`, index.pending > 0 ? T.warn : T.success),
          row(t("pending"), index.pending === null || index.pending === undefined ? "—" : String(index.pending), index.pending > 0 ? T.warn : T.ink),
          row(t("coverage"), index.coverage === null || index.coverage === undefined
            ? "—"
            : `${Math.round(Number(index.coverage) * 1000) / 10}%`),
          row(t("blocks"), `${index.blocks} (${index.searchable} 可检索)`),
          row(t("storedTexts"), String(index.storedTexts ?? 0))),

        h("div", { style: { marginTop: "10px", paddingTop: "8px", borderTop: `1px solid ${T.border}` } },
          h("div", { style: { ...label, marginBottom: "4px" } }, t("size")),
          row(t("db"), bytes(size.dbBytes)),
          row(t("wal"), bytes(size.walBytes)),
          row(t("text"), bytes(size.textBytes)),
          row(t("perBlock"), `${size.bytesPerBlock ?? 0} B`)),

        last !== null
          ? h("div", { style: { marginTop: "10px", paddingTop: "8px", borderTop: `1px solid ${T.border}` } },
            h("div", { style: { ...label, marginBottom: "4px" } }, `${t("last")} · ${clock(last.at)}`),
            row(t("listed"), String(last.listed)),
            row(t("planned"), String(last.planned)),
            row(t("updated"), String(last.updated)),
            row(t("unchanged"), String(last.unchanged)),
            row(t("errors"), String(last.errors), last.errors > 0 ? T.danger : T.ink),
            last.aborted ? row(t("aborted"), t("yes"), T.warn) : null)
          : null,

        h("div", { style: { marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" } },
          h("button", {
            type: "button",
            onClick: () => post("pause", { paused: !paused }, () => setNotice(null)),
            disabled: busy,
            style: buttonStyle(busy, T),
          }, busy ? t("working") : (paused ? t("resume") : t("pause"))),
          h("button", {
            type: "button",
            onClick: () => post("compact", { vacuum: true }, (payload) => setNotice(
              payload?.result ? `${t("reclaimed")}: ${Math.round((payload.result.savedBytes ?? 0) / 1024)} KB` : null)),
            disabled: busy,
            style: buttonStyle(busy, T),
          }, busy ? t("working") : t("compact")),
          snap.size?.needsCompact === true
            ? h("div", { style: { ...label, color: T.warn } }, t("needsCompact"))
            : null,
          notice !== null ? h("div", { style: { ...label } }, notice) : null))
    };

    const Title = (props) => h("span", null, props && props.t ? props.t("title") : "Session Blocks");

    /** 一条记忆:问题当标题、答案当正文、下面一行元信息。 */
    const MemoryCard = (props) => {
      const { item, t } = props;
      const meta = [
        item.fresh === true ? null : h("span", { key: "age", style: { color: T.warn } }, t("stale")),
        item.tag ? h("span", { key: "tag" }, item.tag) : null,
        h("span", { key: "at" }, clock(item.time)),
        item.expires ? h("span", { key: "exp", title: item.expires }, `${t("expiresAt")} ${item.expires}`) : null,
      ].filter((node) => node !== null);
      return h("div", {
        style: {
          border: `1px solid ${T.border}`, borderRadius: "8px", padding: "6px 8px",
          marginBottom: "6px", background: T.hover,
        },
      },
      h("div", { style: { ...value, fontWeight: 600, marginBottom: "2px", wordBreak: "break-word" } }, item.q),
      h("div", { style: { ...label, color: T.ink, whiteSpace: "pre-wrap", wordBreak: "break-word" } }, item.a),
      meta.length > 0
        ? h("div", { style: { ...label, marginTop: "4px", display: "flex", gap: "8px", flexWrap: "wrap" } }, meta)
        : null);
    };

    /**
     * 记忆面板:默认就是三份——三贤人各一个抽屉。
     * 每条记忆只归一份(三选一),所以三份加起来是全部;这不是三个筛选视图,是同一批记忆的三个抽屉。
     */
    const Memory = (props) => {
      const t = (typeof props?.t === "function" && props.t) || ((key) => LABELS[key] ?? key);
      const [data, setData] = react.useState(null);
      const [error, setError] = react.useState(null);

      react.useEffect(() => {
        let alive = true;
        const load = async () => {
          try {
            const res = await fetch(`${BASE}/memories.json`, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const payload = await res.json();
            if (alive) { setData(payload); setError(null); }
          } catch (err) {
            if (alive) setError(err && err.message ? err.message : String(err));
          }
        };
        load();
        const timer = setInterval(load, 5000);
        return () => { alive = false; clearInterval(timer); };
      }, []);

      if (error !== null) {
        return h("div", { style: { padding: "12px", ...label, color: T.danger } }, `${t("memoryUnavailable")}: ${error}`);
      }
      if (data === null) return h("div", { style: { padding: "12px", ...label } }, t("memoryLoading"));
      if (data.available === false) {
        return h("div", { style: { padding: "12px", ...label, color: T.warn } }, `${t("memoryUnavailable")}: ${data.reason ?? ""}`);
      }
      if (Number(data.total ?? 0) === 0) return h("div", { style: { padding: "12px", ...label } }, t("memoryEmpty"));

      return h("div", { style: { padding: "10px 12px" } },
        // 概览:三份各多少条。这一排就是"默认三分视角"最直接的呈现。
        h("div", { style: { display: "flex", gap: "6px", marginBottom: "10px" } },
          ...data.groups.map((group) => h("div", {
            key: group.perspective || "unmarked",
            style: { flex: 1, minWidth: 0, border: `1px solid ${T.border}`, borderRadius: "8px", padding: "6px 4px", textAlign: "center" },
          },
          h("div", { style: { ...label, fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, group.label),
          h("div", { style: { ...value, fontSize: "16px" } }, String(group.count))))),
        // 三份明细,一份一位贤人。
        ...data.groups.map((group) => h("div", { key: `g-${group.perspective || "unmarked"}`, style: { marginBottom: "12px" } },
          h("div", {
            style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${T.border}`, paddingBottom: "3px", marginBottom: "6px" },
          },
          h("span", { style: { ...label, color: T.ink, fontWeight: 600, letterSpacing: "0.04em" } }, String(group.label).toUpperCase()),
          h("span", { style: label }, `${group.count} ${t("memories")}`)),
          group.items.length === 0
            ? h("div", { style: { ...label, fontStyle: "italic" } }, "—")
            : group.items.map((item) => h(MemoryCard, { key: item.blockId, item, t })))));
    };

    /** 页签容器:默认落在「记忆」,可切到「索引」监控。 */
    const Panel = (props) => {
      const t = (typeof props?.t === "function" && props.t) || ((key) => LABELS[key] ?? key);
      const [section, setSection] = react.useState("memory");
      const seg = (key, text) => h("button", {
        key, type: "button", onClick: () => setSection(key),
        style: {
          flex: 1, height: "26px", borderRadius: "7px", cursor: "pointer",
          border: `1px solid ${section === key ? T.border : "transparent"}`,
          background: section === key ? T.hover : "transparent",
          color: section === key ? T.ink : T.inkSecondary,
          fontFamily: "inherit", fontSize: "12px",
        },
      }, text);
      return h("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0 } },
        h("div", { style: { display: "flex", gap: "4px", padding: "8px 10px 0", flex: "none" } },
          seg("memory", t("memoryTab")), seg("index", t("indexTab"))),
        h("div", { style: { flex: 1, minHeight: 0, overflow: "auto" } },
          section === "memory" ? h(Memory, props) : h(Monitor, props)));
    };

    return {
      name: "dsh-better-session-query-client",
      inject: ["slots", "locale", "sidebarRightTabs", "sidebarRight", "layout"],
      apply(ctx) {
        const t = ctx.locale.bind(NS);
        const Icon = ({ size }) => h("svg", {
          viewBox: "0 0 24 24", width: size, height: size, fill: "none",
          stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round",
          style: { flex: "none" }, "aria-hidden": "true",
        },
        h("path", { key: "a", d: "M4 6h16M4 12h16M4 18h10" }),
        h("circle", { key: "b", cx: "19" , cy: "18", r: "2" }));

        const Opener = (props) => {
          const wide = props === undefined || props.wide !== false;
          const [hover, setHover] = react.useState(false);
          const open = () => {
            try {
              ctx.sidebarRight.openTab(KIND);
              if (ctx.sidebarRight.isExpanded() !== true) ctx.layout.openRightbar(false, false);
            } catch (err) {
              console.error("dsh-better-session-query: opening the monitor tab failed", err);
            }
          };
          const style = wide
            ? { display: "inline-flex", alignItems: "center", gap: "8px", height: "42px", margin: "4px -2px", padding: "0 10px 0 8px", border: "none", borderRadius: "12px", background: hover ? T.hover : "transparent", color: T.ink, fontFamily: "inherit", fontSize: "14px", cursor: "pointer" }
            : { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", margin: "8px 0 10px", padding: 0, border: "none", borderRadius: "50%", background: hover ? T.hover : "transparent", color: T.ink, cursor: "pointer" };
          return h("div", { style: { display: "flex", flexDirection: "column", flex: "none", alignSelf: "flex-start", minWidth: 0 } },
            h("button", {
              type: "button", title: t("title"), "aria-label": t("title"), onClick: open,
              onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false), style,
            },
            h(Icon, { size: wide ? 16 : 18 }),
            wide ? h("span", { style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t("title")) : null));
        };

        // 中文**只有一份来源**:下面这份 LABELS 既是组件在 props.t 缺席时的兜底,也是注册给 locale 的 zh 字典。
        // 之前抄了两份,加 pause/resume 时只改了一份,面板就冒出英文——这类漂移从结构上消掉。
        ctx.effect(() => ctx.locale.register(NS, {
          zh: { ...LABELS },
          en: {
            title: "Memory", loading: "Loading…", unavailable: "Monitor data plane unavailable (plugin off?)",
            idle: "idle", running: "indexing", error: "error", working: "working…",
            pause: "Pause indexing", resume: "Resume indexing", paused: "paused",
            compact: "Shrink index size",
            reclaimed: "Shrunk", needsCompact: "oversized — consider shrinking",
            index: "Index", size: "Size", last: "Last update",
            sessions: "sessions (indexed/total)", pending: "pending sessions", coverage: "coverage",
            blocks: "blocks (searchable)", storedTexts: "texts stored (not inverted)",
            db: "database", wal: "WAL", text: "indexed text", perBlock: "per block",
            listed: "sessions reported", planned: "planned", updated: "updated", unchanged: "unchanged",
            errors: "errors", aborted: "aborted", yes: "yes",
            memoryTab: "Memory", indexTab: "Index",
            memoryLoading: "Loading…", memoryUnavailable: "Memory store unavailable",
            memoryEmpty: "No memories yet — try session_blocks_remember",
            memories: "items", fresh: "fresh", stale: "stale", expiresAt: "expires when",
          },
        }));

        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: "dsh-better-session-query",
          kind: KIND,
          title: () => t("title"),
        }));
        ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register(
          { name: "sidebar.right.pane.tab", key: "dsh-better-session-query", locale: NS },
          Panel,
        )));
        ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register(
          { name: "sidebar.right.pane.tab.title", key: "dsh-better-session-query" },
          Title,
        )));
        ctx.effect(() => ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register(
          { name: "sidebar.footer.action", id: "better-session-query", order: 65, label: () => t("title") },
          Opener,
        )));
      },
    };
  },
});
