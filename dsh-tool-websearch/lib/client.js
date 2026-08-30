// Browser half for dsh-tool-websearch. The host package owns both the tools and
// their client views so one Cordis row activates the complete capability.
window.__ModuleLoader__.load({
	id: "dsh-tool-websearch",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		const PROGRESS_KEY = "websearch-progress";
		const PROXY_API_BASE = "/api/dsh-websearch/proxy";
		const inject = ["slots"];

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

		function WebSearchMetaView(props) {
			const info = blockText(props.block);
			const query = queryOf(info.argsRaw);
			const allProgress = typeof props.useProjection === "function" ? props.useProjection(PROGRESS_KEY) : undefined;
			const progress = allProgress && props.callId ? allProgress[props.callId] : undefined;
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
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
