// lib/client.js — dsh-client-ui-websearch 浏览器端插件(手写 ModuleLoader 格式)。
// 为 web_search_meta 工具注册 keyed 原子视图(tool.call.toolview):
// - 运行中:标题 + 逐引擎进度(引擎 x/y · 当前引擎 · 已得 N 条)+ 最新结果预览,
//   进度数据来自 host 投影单元 "websearch-progress"(useProjection 订阅,事件驱动实时刷新)
// - 完成后:显示聚合结果文本
// 实现等同 s-code websearch 的运行中进度观测(open-code 的 Tool.Progress 元数据流)。
window.__ModuleLoader__.load({
	id: "dsh-client-ui-websearch",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		const PROGRESS_KEY = "websearch-progress";
		const inject = ["slots"];

		// ── 样式(主题 token)────────────────────────────
		const styles = {
			root: { flexDirection: "column", gap: "6px", width: "100%", minWidth: "0", display: "flex" },
			title: { color: "var(--dsw-alias-label-primary)", fontSize: "14px", fontWeight: "500", lineHeight: "22px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
			summary: { color: "var(--dsw-alias-label-secondary)", fontSize: "12px", lineHeight: "18px", fontVariantNumeric: "tabular-nums" },
			list: { flexDirection: "column", gap: "2px", width: "100%", minWidth: "0", marginTop: "2px", display: "flex" },
			row: { color: "var(--dsw-alias-label-secondary)", fontSize: "12px", lineHeight: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", gap: "6px", minWidth: "0" },
			engine: { color: "var(--dsw-alias-state-business-primary)", flex: "none" },
			rowTitle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: "0" },
			pre: { whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "0", color: "var(--dsw-alias-label-secondary)", fontSize: "13px", lineHeight: "20px", fontFamily: "var(--dsw-font-markdown-code-block-small, ui-monospace, monospace)" },
			error: { color: "var(--dsw-alias-state-error-primary)" },
		};

		// ── 工具函数────────────────────────────────────
		function parseArgs(raw) {
			try { return JSON.parse(raw || "{}"); } catch { return {}; }
		}

		function queryOf(block) {
			const done = "kind" in block;
			const argsRaw = done ? (block.call && block.call.argsRaw) : block.argsRaw;
			const args = parseArgs(argsRaw);
			return typeof args.query === "string" ? args.query : "";
		}

		function resultText(node) {
			const parts = [];
			for (const block of node.content || []) {
				if (block.type === "text") parts.push(block.text);
				else parts.push(JSON.stringify(block, null, 2));
			}
			if (parts.length === 0 && node.error !== void 0) {
				parts.push((node.error.name || "Error") + ": " + (node.error.code || ""));
			}
			return parts.join("\n");
		}

		// ── 视图组件────────────────────────────────────
		function WebSearchMetaView(props) {
			const block = props.block;
			const done = "kind" in block;
			const query = queryOf(block);
			// 进度来自 host 投影单元:useProjection 是 slot 系统注入的 standard prop
			const allProgress = typeof props.useProjection === "function"
				? props.useProjection(PROGRESS_KEY)
				: undefined;
			const prog = allProgress && props.callId ? allProgress[props.callId] : undefined;

			if (done) {
				const text = resultText(block);
				return react.createElement("div", { style: styles.root },
					react.createElement("div", { style: styles.title }, "搜索: " + (query || "")),
					react.createElement("pre", { style: text ? styles.pre : styles.error }, text || "(无结果)"),
				);
			}

			const summary = prog
				? "引擎 " + (prog.done || 0) + "/" + (prog.total || 0) + " · 当前 " + (prog.current || "") + " · 已得 " + (prog.partialCount || 0) + " 条"
				: "搜索中…";
			const rows = (prog && Array.isArray(prog.latestResults) ? prog.latestResults : []).map((r, i) =>
				react.createElement("div", { key: i, style: styles.row },
					react.createElement("span", { style: styles.engine }, r.engine),
					react.createElement("span", { style: styles.rowTitle }, r.title || r.url),
				),
			);
			return react.createElement("div", { style: styles.root },
				react.createElement("div", { style: styles.title }, "正在搜索: " + (query || "")),
				react.createElement("div", { style: styles.summary }, summary),
				rows.length > 0 ? react.createElement("div", { style: styles.list }, rows) : null,
			);
		}

		// ── 插件入口────────────────────────────────────
		function apply(ctx) {
			ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
				name: "tool.call.toolview",
				key: "web_search_meta",
			}, WebSearchMetaView));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
