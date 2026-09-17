// Browser half for dsh-tool-websearch. The host package owns both the tools and
// their client views so one Cordis row activates the complete capability.
window.__ModuleLoader__.load({
	id: "dsh-tool-websearch",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		const PROGRESS_API = "/api/dsh-websearch/progress";
		const PROXY_API_BASE = "/api/dsh-websearch/proxy";
		const SEARCH_API = "/api/dsh-websearch/search";

		/*
		 * 右侧栏「元搜索」页签需要的四个服务：
		 *   slots            —— 注册插槽（工具卡和代理开关已经在用）
		 *   sidebarRightTabs —— 注册页签类型
		 *   sidebarRight     —— 打开页签（openTab）
		 *   layout           —— 展开右栏（注册成「页面类型」的页签不会自己展开）
		 */
		const inject = ["slots", "sidebarRightTabs", "sidebarRight", "layout"];

		/** 页签在本实现的唯一身份；同时是正文与标题两个 keyed 插槽的 key */
		const META_TAB_ID = "dsh-tool-websearch:meta";
		/** 页签类型判别符，openTab 用它 */
		const META_TAB_KIND = "dsh-tool-websearch:meta";

		const S = {
			shell: {
				display: "flex", flexDirection: "column", width: "100%", minWidth: 0,
				borderRadius: 8, border: "1px solid var(--dsw-alias-line-default, #e8e8e8)",
				background: "var(--dsw-alias-fill-secondary, #fff)", overflow: "hidden",
				isolation: "isolate", contain: "content", boxSizing: "border-box",
			},
			head: {
				display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
				padding: "10px 14px", minWidth: 0,
				background: "var(--dsw-alias-fill-primary, #fff)",
				borderBottom: "1px solid var(--dsw-alias-line-default, #eee)",
			},
			headLeft: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
			icon: {
				width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center",
				justifyContent: "center", flex: "none", color: "#fff", background: "#056de8",
				fontSize: 12, fontWeight: 800, lineHeight: "22px",
			},
			title: {
				fontSize: 13, lineHeight: "18px", fontWeight: 700,
				color: "var(--dsw-alias-label-primary)", whiteSpace: "nowrap",
				overflow: "hidden", textOverflow: "ellipsis",
			},
			subtitle: {
				maxWidth: 240, fontSize: 11, lineHeight: "16px",
				color: "var(--dsw-alias-label-tertiary)", whiteSpace: "nowrap",
				overflow: "hidden", textOverflow: "ellipsis",
			},
			body: { display: "flex", flexDirection: "column", minWidth: 0 },
			badge: {
				display: "inline-flex", alignItems: "center", flex: "none", padding: "1px 7px",
				borderRadius: 999, fontSize: 11, lineHeight: "16px", fontWeight: 600,
			},
			row: {
				display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
				minWidth: 0, color: "inherit", textDecoration: "none",
				borderBottom: "1px solid var(--dsw-alias-line-default, #f0f0f0)",
			},
			rank: {
				width: 20, flex: "none", paddingTop: 1, textAlign: "center", fontSize: 13,
				fontWeight: 800, lineHeight: "20px", color: "var(--dsw-alias-label-tertiary)",
			},
			result: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: "1 1 auto" },
			resultTitle: {
				fontSize: 13, lineHeight: "19px", fontWeight: 600, color: "var(--dsw-alias-label-primary)",
				display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
			},
			snippet: {
				fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary)",
				display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
			},
			meta: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, minWidth: 0, marginTop: 2 },
			pill: {
				display: "inline-flex", alignItems: "center", maxWidth: "100%", padding: "1px 7px",
				borderRadius: 999, border: "1px solid var(--dsw-alias-line-default, #e8e8e8)",
				background: "var(--dsw-alias-fill-tertiary, #fafafa)",
				color: "var(--dsw-alias-label-secondary)", fontSize: 11, lineHeight: "16px",
				overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
			},
			foot: {
				padding: "8px 14px", borderTop: "1px solid var(--dsw-alias-line-default, #f0f0f0)",
				background: "var(--dsw-alias-fill-primary, #fff)", color: "var(--dsw-alias-label-tertiary)",
				fontSize: 11, lineHeight: "16px", whiteSpace: "pre-wrap", wordBreak: "break-word",
			},
			empty: {
				padding: "14px", color: "var(--dsw-alias-label-secondary)", fontSize: 12,
				lineHeight: "18px", whiteSpace: "pre-wrap", wordBreak: "break-word",
			},
			error: {
				margin: 12, padding: "10px 12px", borderRadius: 8,
				border: "1px solid var(--dsw-alias-state-error-primary, #c5221f)",
				background: "var(--dsw-alias-state-error-fill, #fce8e6)",
				color: "var(--dsw-alias-state-error-primary, #a50e0e)", fontSize: 12,
				lineHeight: "18px", whiteSpace: "pre-wrap", wordBreak: "break-word",
			},
			progress: { padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 },
			progressSummary: {
				fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary)",
				fontVariantNumeric: "tabular-nums",
			},
			progressRow: {
				display: "flex", gap: 8, minWidth: 0, fontSize: 12, lineHeight: "18px",
				color: "var(--dsw-alias-label-secondary)",
			},
			progressEngine: { flex: "none", color: "var(--dsw-alias-state-business-primary, #056de8)" },
			progressTitle: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
			skeleton: { height: 48, borderRadius: 6, background: "var(--dsw-alias-fill-tertiary, #f2f2f2)" },
			proxyButton: {
				display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 6px",
				border: 0, borderRadius: 6, background: "transparent", cursor: "pointer",
				color: "var(--dsw-alias-label-secondary)", fontSize: 12, lineHeight: "16px",
				isolation: "isolate", contain: "content", boxSizing: "border-box",
			},
			proxyDot: { width: 8, height: 8, borderRadius: 999, flex: "none" },
			proxyUrl: { maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--dsw-alias-label-tertiary)", fontSize: 11 },
		};

		function parseArgs(raw) {
			try { return JSON.parse(raw || "{}"); } catch { return {}; }
		}

		function blockText(block) {
			const done = !!block && "kind" in block;
			if (!done) return { done: false, text: "", isError: false, argsRaw: (block && block.argsRaw) || "" };
			const parts = [];
			for (const part of block.content || []) {
				parts.push(part.type === "text" ? part.text : JSON.stringify(part, null, 2));
			}
			if (parts.length === 0 && block.error !== void 0) {
				parts.push("ERROR: " + ((block.error && block.error.message) || block.error.code || block.error.name || "unknown"));
			}
			return {
				done: true,
				text: parts.join("\n"),
				isError: block.isError === true,
				argsRaw: (block.call && block.call.argsRaw) || "",
			};
		}

		function queryOf(argsRaw) {
			const args = parseArgs(argsRaw);
			return typeof args.query === "string" ? args.query : "";
		}

		function parseSearchText(text) {
			const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
			const headerIndex = lines.findIndex((line) => /(?:\[缓存命中\]\s*)?搜索\s+"[^"]*"\s+共\s+\d+\s+条结果[：:]/.test(line));
			const statsMatch = String(text || "").match(/^\[引擎[^\n]*\]/m);
			const cached = String(text || "").includes("[缓存命中]");
			const output = { stats: statsMatch ? statsMatch[0] : "", cached, query: "", count: 0, results: [], suggestion: "" };
			if (headerIndex === -1) return output;

			const header = lines[headerIndex].match(/搜索\s+"([^"]*)"\s+共\s+(\d+)\s+条结果[：:]/);
			if (header) {
				output.query = header[1];
				output.count = Number(header[2]) || 0;
			}

			let index = headerIndex + 1;
			while (index < lines.length) {
				const first = lines[index].trim();
				if (!first) { index++; continue; }
				const suggestion = first.match(/^您是不是想找:\s*(.+)$/);
				if (suggestion) { output.suggestion = suggestion[1]; break; }
				const row = first.match(/^(\d+)\.\s+(.+)$/);
				if (!row) { index++; continue; }

				const item = { rank: Number(row[1]), title: row[2], domain: "", tags: [], engine: "", url: "", date: "", snippet: "" };
				const snippet = [];
				index++;
				while (index < lines.length) {
					const line = lines[index];
					const value = line.trim();
					if (/^\d+\.\s+/.test(value) || /^您是不是想找:/.test(value)) break;
					if (!value) { if (snippet.length > 0) snippet.push(""); index++; continue; }
					if (!item.domain && /^\[[^\]]+\]/.test(value)) {
						const parts = value.split(" · ").map((part) => part.trim()).filter(Boolean);
						const domain = parts.shift();
						item.domain = domain ? domain.replace(/^\[|\]$/g, "") : "";
						item.tags = parts;
					} else if (!item.url && value.includes(" | ")) {
						const source = value.split(" | ");
						item.engine = source.shift().trim();
						item.url = source.join(" | ").trim();
					} else if (!item.date && /^日期:\s*/.test(value)) {
						item.date = value.replace(/^日期:\s*/, "");
					} else {
						snippet.push(value);
					}
					index++;
				}
				item.snippet = snippet.join(" ").replace(/\s+/g, " ").trim();
				output.results.push(item);
			}
			return output;
		}

		function badge(text, kind) {
			const tones = {
				brand: { color: "#056de8", background: "#e8f0fe" },
				ok: { color: "var(--dsw-alias-state-success-primary, #137333)", background: "var(--dsw-alias-state-success-fill, #e6f4ea)" },
				warn: { color: "var(--dsw-alias-state-warning-primary, #8a6d00)", background: "var(--dsw-alias-state-warning-fill, #fef7e0)" },
				bad: { color: "var(--dsw-alias-state-error-primary, #a50e0e)", background: "var(--dsw-alias-state-error-fill, #fce8e6)" },
			}[kind] || { color: "var(--dsw-alias-label-secondary)", background: "var(--dsw-alias-fill-tertiary, #f2f2f2)" };
			return react.createElement("span", { style: { ...S.badge, ...tones } }, text);
		}

		function ToolShell(props) {
			return react.createElement("div", { style: S.shell },
				react.createElement("div", { style: S.head },
					react.createElement("div", { style: S.headLeft },
						react.createElement("span", { style: S.icon }, props.icon || "网"),
						react.createElement("span", { style: S.title }, props.title),
						props.badge || null,
					),
					props.subtitle ? react.createElement("span", { style: S.subtitle, title: props.subtitle }, props.subtitle) : null,
				),
				react.createElement("div", { style: S.body }, props.children),
				props.footer ? react.createElement("div", { style: S.foot }, props.footer) : null,
			);
		}

		function LoadingRows() {
			return react.createElement("div", { style: S.progress },
				react.createElement("div", { style: S.skeleton }),
				react.createElement("div", { style: { ...S.skeleton, opacity: 0.7 } }),
			);
		}

		function SearchResultRow(props) {
			const item = props.item;
			const [hover, setHover] = react.useState(false);
			const rowStyle = {
				...S.row,
				background: hover ? "var(--dsw-alias-fill-hover, rgba(132,133,141,0.08))" : "transparent",
				borderBottom: props.last ? "none" : S.row.borderBottom,
			};
			const tags = [];
			if (item.domain) tags.push(item.domain);
			for (const tag of item.tags) tags.push(tag);
			if (item.engine) tags.push(item.engine);
			if (item.date) tags.push(item.date);
			const content = [
				react.createElement("span", { key: "rank", style: S.rank }, String(item.rank)),
				react.createElement("span", { key: "body", style: S.result },
					react.createElement("span", { style: { ...S.resultTitle, color: hover ? "var(--dsw-alias-state-primary-default, #056de8)" : S.resultTitle.color } }, item.title || "(无标题)"),
					item.snippet ? react.createElement("span", { style: S.snippet }, item.snippet) : null,
					tags.length > 0 ? react.createElement("span", { style: S.meta }, tags.map((tag, index) => react.createElement("span", { key: index, style: S.pill }, tag))) : null,
				),
			];
			const events = { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) };
			if (item.url && /^https?:\/\//i.test(item.url)) {
				return react.createElement("a", { href: item.url, target: "_blank", rel: "noopener noreferrer", style: rowStyle, ...events }, content);
			}
			return react.createElement("div", { style: rowStyle, ...events }, content);
		}

		function useSearchProgress(sessionId, callId, running) {
			const [snapshot, setSnapshot] = react.useState(null);
			react.useEffect(() => {
				setSnapshot(null);
				if (!running || !sessionId || !callId) return;
				let stopped = false;
				let timer;
				let request;
				const poll = async () => {
					request = new AbortController();
					const timeout = setTimeout(() => request.abort(), 10000);
					let retry = true;
					try {
						const query = new URLSearchParams({ sessionId, callId });
						const response = await fetch(PROGRESS_API + "?" + query, {
							credentials: "same-origin", cache: "no-store",
							headers: { accept: "application/json" }, signal: request.signal,
						});
						if (response.status === 401 || response.status === 403) retry = false;
						if (response.ok) {
							const value = await response.json();
							if (!stopped) setSnapshot({ sessionId, callId, progress: value?.progress });
						}
					} catch {
						// Transient transport failures leave the running card usable.
					} finally {
						clearTimeout(timeout);
						if (!stopped && retry) timer = setTimeout(poll, 500);
					}
				};
				void poll();
				return () => {
					stopped = true;
					clearTimeout(timer);
					request?.abort();
				};
			}, [sessionId, callId, running]);
			return running && snapshot && snapshot.sessionId === sessionId && snapshot.callId === callId
				? snapshot.progress : undefined;
		}

		function WebSearchMetaView(props) {
			const info = blockText(props.block);
			const query = queryOf(info.argsRaw);
			const progress = useSearchProgress(props.sessionId, props.callId, !info.done);
			if (!info.done) {
				const summary = progress
					? "引擎 " + (progress.done || 0) + "/" + (progress.total || 0) + " · 当前 " + (progress.current || "准备中") + " · 已得 " + (progress.partialCount || 0) + " 条"
					: "正在连接搜索引擎";
				const latest = progress && Array.isArray(progress.latestResults) ? progress.latestResults : [];
				return react.createElement(ToolShell, { title: "全网搜索", icon: "网", subtitle: query, badge: badge("检索中", "warn"), footer: summary },
					latest.length > 0
						? react.createElement("div", { style: S.progress }, latest.map((item, index) => react.createElement("div", { key: index, style: S.progressRow },
							react.createElement("span", { style: S.progressEngine }, item.engine || "搜索"),
							react.createElement("span", { style: S.progressTitle }, item.title || item.url || "正在返回结果"),
						)))
						: react.createElement(LoadingRows),
				);
			}

			if (info.isError || info.text.indexOf("ERROR:") === 0) {
				return react.createElement(ToolShell, { title: "全网搜索", icon: "网", subtitle: query, badge: badge("失败", "bad") },
					react.createElement("div", { style: S.error }, info.text || "搜索请求失败"),
				);
			}

			const parsed = parseSearchText(info.text);
			const titleQuery = query || parsed.query;
			if (parsed.results.length === 0) {
				const emptyText = info.text || "未找到搜索结果。";
				return react.createElement(ToolShell, { title: "全网搜索", icon: "网", subtitle: titleQuery, badge: badge("无结果", "warn"), footer: parsed.stats || "搜索已完成" },
					react.createElement("div", { style: S.empty }, emptyText),
				);
			}

			const footer = [parsed.stats, parsed.cached ? "缓存命中" : "", parsed.suggestion ? "建议: " + parsed.suggestion : ""]
				.filter(Boolean).join(" · ");
			return react.createElement(ToolShell, {
				title: "全网搜索", icon: "网", subtitle: titleQuery,
				badge: badge("共 " + (parsed.count || parsed.results.length) + " 条", "brand"), footer,
			}, parsed.results.map((item, index) => react.createElement(SearchResultRow, { key: String(item.rank) + item.url, item, last: index === parsed.results.length - 1 })));
		}

		function ProxyToggleView() {
			const [state, setState] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [hover, setHover] = react.useState(false);
			const refresh = react.useCallback(() => {
				return fetch(PROXY_API_BASE, { headers: { accept: "application/json" } })
					.then((response) => response.ok ? response.json() : null)
					.then((value) => { if (value && typeof value === "object") setState(value); })
					.catch(() => {});
			}, []);
			react.useEffect(() => { refresh(); }, [refresh]);
			const onToggle = () => {
				if (busy) return;
				setBusy(true);
				fetch(PROXY_API_BASE + "/toggle", { method: "POST" })
					.then((response) => response.ok ? response.json() : null)
					.then((value) => { if (value && typeof value === "object") setState(value); })
					.catch(() => {})
					.finally(() => setBusy(false));
			};
			const enabled = !!(state && state.enabled);
			const url = (state && (state.proxyUrl || state.detectedUrl)) || "";
			const title = "系统代理: " + (enabled ? "已启用" : "未启用") + (url ? " · " + url : "");
			return react.createElement("button", {
				type: "button", title, "aria-pressed": enabled, disabled: busy, onClick: onToggle,
				onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
				style: { ...S.proxyButton, background: hover ? "var(--dsw-alias-fill-hover, rgba(132,133,141,0.08))" : "transparent", opacity: busy ? 0.6 : 1 },
			},
				react.createElement("span", { style: { ...S.proxyDot, background: enabled ? "var(--dsw-alias-state-success-primary, #137333)" : "var(--dsw-alias-label-tertiary, #9e9e9e)" } }),
				react.createElement("span", null, "代理"),
				url ? react.createElement("span", { style: S.proxyUrl }, url.replace(/^https?:\/\//, "")) : null,
			);
		}

		/* ── 右侧栏「元搜索」页签 ────────────────────────────────────── */

		/** 页签界面的样式。单独写一套，不动已经在用的 S。 */
		const MS = {
			root: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0, minWidth: 0, background: "var(--dsw-alias-fill-primary, #fff)" },
			form: { display: "flex", gap: 6, padding: "10px 12px", borderBottom: "1px solid var(--dsw-alias-line-default, #eee)", flex: "none" },
			input: { flex: 1, minWidth: 0, height: 30, padding: "0 10px", fontSize: 13, borderRadius: 6, border: "1px solid var(--dsw-alias-line-default, #ddd)", background: "var(--dsw-alias-fill-secondary, #fff)", color: "var(--dsw-alias-label-primary)", outline: "none", boxSizing: "border-box" },
			button: { flex: "none", height: 30, padding: "0 14px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", background: "#056de8", color: "#fff", cursor: "pointer" },
			stats: { padding: "8px 12px", fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary)", borderBottom: "1px solid var(--dsw-alias-line-default, #f0f0f0)", flex: "none", wordBreak: "break-all" },
			list: { flex: 1, minHeight: 0, overflowY: "auto", padding: "2px 0" },
			item: { padding: "10px 12px", borderBottom: "1px solid var(--dsw-alias-line-default, #f5f5f5)" },
			link: { fontSize: 13, lineHeight: "19px", fontWeight: 600, color: "#056de8", textDecoration: "none", display: "block" },
			meta: { marginTop: 3, fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary)", display: "flex", gap: 8, flexWrap: "wrap" },
			snippet: { marginTop: 4, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary)", wordBreak: "break-word" },
			empty: { padding: "28px 16px", textAlign: "center", fontSize: 12, color: "var(--dsw-alias-label-tertiary)" },
		};

		/** 取域名用于展示；取不到就原样返回 */
		function msDomain(url) {
			try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
		}

		/**
		 * 页签正文：搜索框 + 结果列表。
		 *
		 * 这是给**人**用的界面（不是给模型），所以标题直接在新标签打开。
		 * 数据走 Host 的 /api/dsh-websearch/search —— 浏览器半部拿不到工具调用通道，
		 * 只能走 HTTP 路由。
		 */
		function MetaSearchBody() {
			const [query, setQuery] = react.useState("");
			const [phase, setPhase] = react.useState("idle");   // idle | loading | done | error
			const [outcome, setOutcome] = react.useState(null);
			const [error, setError] = react.useState("");

			const run = react.useCallback((text) => {
				const q = String(text || "").trim();
				if (!q) return;
				setPhase("loading");
				setError("");
				fetch(SEARCH_API + "?q=" + encodeURIComponent(q) + "&num=30", { credentials: "same-origin" })
					.then((res) => res.json().then((data) => ({ ok: res.ok, status: res.status, data })))
					.then(({ ok, status, data }) => {
						if (!ok) throw new Error((data && data.error) || ("HTTP " + status));
						setOutcome(data);
						setPhase("done");
					})
					.catch((e) => {
						setError(e && e.message ? e.message : String(e));
						setPhase("error");
					});
			}, []);

			const items = outcome && Array.isArray(outcome.results) ? outcome.results : [];

			return react.createElement("div", { style: MS.root },
				react.createElement("form", {
					style: MS.form,
					onSubmit: (e) => { e.preventDefault(); run(query); },
				},
					react.createElement("input", {
						style: MS.input,
						type: "search",
						value: query,
						placeholder: "搜索互联网（多引擎聚合）",
						"aria-label": "搜索词",
						onChange: (e) => setQuery(e.target.value),
					}),
					react.createElement("button", {
						style: Object.assign({}, MS.button, phase === "loading" ? { opacity: 0.6, cursor: "default" } : {}),
						type: "submit",
						disabled: phase === "loading",
						"aria-busy": phase === "loading",
					}, phase === "loading" ? "搜索中" : "搜索"),
				),
				outcome && outcome.statsLine ? react.createElement("div", { style: MS.stats }, outcome.statsLine) : null,
				phase === "idle" ? react.createElement("div", { style: MS.empty }, "输入关键词开始搜索。") : null,
				phase === "loading" ? react.createElement("div", { style: MS.empty }, "正在并发查询各引擎…") : null,
				phase === "error" ? react.createElement("div", { style: MS.empty }, "出错了：" + error) : null,
				phase === "done" && items.length === 0
					? react.createElement("div", { style: MS.empty }, (outcome && outcome.message) || "没有结果。")
					: null,
				items.length > 0
					? react.createElement("div", { style: MS.list },
						items.map((r, i) => react.createElement("div", { style: MS.item, key: (r.url || "") + i },
							react.createElement("a", {
								style: MS.link, href: r.url, target: "_blank", rel: "noreferrer noopener",
							}, r.title),
							react.createElement("div", { style: MS.meta },
								react.createElement("span", null, msDomain(r.url)),
								Array.isArray(r.engines) && r.engines.length > 0
									? react.createElement("span", null, r.engines.slice(0, 3).join(" · "))
									: null,
								r.publishedDate
									? react.createElement("span", null, new Date(r.publishedDate).toISOString().slice(0, 10))
									: null,
							),
							r.snippet ? react.createElement("div", { style: MS.snippet }, r.snippet) : null,
						)),
					)
					: null,
			);
		}

		/** 页签 chip 上的标题 */
		function MetaSearchTitle() {
			return react.createElement("span", { style: { fontSize: 12, fontWeight: 600 } }, "元搜索");
		}

		/**
		 * 造一个侧栏底部的触发按钮（Settings 旁边）。
		 *
		 * 用工厂把 `ctx` 闭包进来 —— 组件本身拿不到 ctx，
		 * 而 openTab 是 ctx.sidebarRight 上的写操作。
		 *
		 * 注意 ownerProps 只有 `{ wide }`：缩起时是 56px 轨道态，
		 * 展开时按 42px 行高（和官方同类入口一致）。**不要声明满宽**，
		 * 否则会把同槽位里别人的行挤出可视区。
		 */
		function makeMetaSearchOpener(ctx) {
			return function MetaSearchOpener(props) {
				const wide = !!(props && props.wide);
				const [hover, setHover] = react.useState(false);
				const open = react.useCallback(() => {
					try {
						ctx.sidebarRight.openTab(META_TAB_KIND);
						if (ctx.sidebarRight.isExpanded() !== true) ctx.layout.openRightbar(false, false);
					} catch (e) {
						/* 没有已挂载的会话界面时 openTab 会抛；别让异常冒到 UI */
					}
				}, [ctx]);
				return react.createElement("button", {
					type: "button",
					title: "元搜索",
					"aria-label": "元搜索",
					onClick: open,
					onMouseEnter: () => setHover(true),
					onMouseLeave: () => setHover(false),
					style: {
						display: "flex", alignItems: "center", justifyContent: wide ? "flex-start" : "center",
						gap: 8, width: wide ? "100%" : 36, height: wide ? 42 : 36, padding: wide ? "0 10px" : 0,
						border: "none", borderRadius: 6, cursor: "pointer", boxSizing: "border-box",
						background: hover ? "var(--dsw-alias-fill-hover, rgba(132,133,141,0.08))" : "transparent",
						color: "var(--dsw-alias-label-primary)", fontSize: 13,
					},
				},
					react.createElement("span", { style: { fontSize: 14, lineHeight: "1" } }, "\uD83D\uDD0E"),
					wide ? react.createElement("span", null, "元搜索") : null,
				);
			};
		}

		function apply(ctx) {
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "web_search_meta",
			}, WebSearchMetaView));
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "websearch-proxy-toggle",
				order: 100,
			}, ProxyToggleView));

			/*
			 * ── 右侧栏「元搜索」页签：三步注册 ──
			 *
			 * 每一步都包在 ctx.effect() 里：注册即副作用，卸载时 Cordis 靠它回收。
			 *
			 * 注意：注册成「页面类型」的页签（没写 patterns）**不会自己展开右栏**，
			 * 所以触发按钮里要显式调 layout.openRightbar —— 见 makeMetaSearchOpener。
			 */

			// 1) 页签类型：定义"这个页签是什么"
			ctx.effect(() => ctx.sidebarRightTabs.register({
				id: META_TAB_ID,
				kind: META_TAB_KIND,
				title: () => "元搜索",
			}));

			// 2) 正文与标题：两个 keyed 插槽，key 就是上面的 id
			ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
				name: "sidebar.right.pane.tab",
				key: META_TAB_ID,
			}, MetaSearchBody)));
			ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({
				name: "sidebar.right.pane.tab.title",
				key: META_TAB_ID,
			}, MetaSearchTitle)));

			// 3) 侧栏底部的触发按钮（Settings 旁边的那一排）
			const MetaSearchOpener = makeMetaSearchOpener(ctx);
			ctx.effect(() => ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "websearch-meta-entry",
				order: 60,
				label: () => "元搜索",
			}, MetaSearchOpener)));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
