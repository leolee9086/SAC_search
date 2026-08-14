# cc-search

DeepSeek Harness 多引擎元搜索插件:免 API key 直接调用 DuckDuckGo / Bing / Google / 百度 / 搜狗等约 180 个搜索引擎,并发执行、结果去重聚合、按引擎权重与时效性评分。搜索逻辑移植自 s-code,构建期打包为自包含 ESM bundle,运行时零依赖。

本仓库同时提供两个分支,用于对比"自定义会话事件"的两种用法:

| 分支 | 进度通道 | 会话历史安全 | 运行中逐引擎进度 |
|---|---|---|---|
| [`standard`](https://github.com/USER/cc-search/tree/standard) | 纯官方 API,不写任何自定义事件 | ✅ 永远安全 | ❌ 仅静态卡片「正在搜索: q」 |
| [`progress-events`](https://github.com/USER/cc-search/tree/progress-events) | 自定义事件 `tool/websearch-progress` + `ignorable` 标记 | ⚠️ 依赖官方 `Session.append` 的 ignorable 表面(见下) | ✅ 实时:引擎 x/y、当前引擎、已得条数、最新结果预览 |

两个分支的搜索引擎代码、工具 schema、结果渲染完全一致,唯一差异是进度通道(见 `dsh-tool-websearch/lib/index.js` 的 `emitProgress`)。

## 为什么有两个分支

DeepSeek Harness 的会话日志持久化有一个已知事件类型白名单 `KNOWN_SESSION_EVENT_TYPES`(由 `gen-persistence-catalog.ts` 从 repo 内 `SessionEventMap` 声明生成)。读取端遇到白名单外的事件时:

- 未标记 `ignorable: true` → 整份会话日志拒绝加载(`SessionFormatUnsupportedError`,历史"损坏"且无法修复);
- 标记 `ignorable: true` → 跳过该事件,正常恢复。

官方架构笔记 [`2026-08-10-session-log-version-mechanism`](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/architecture/2026-08-10-session-log-version-mechanism.md) 明确说明:

> "writers do not yet set `ignorable` (no producer needs it), so `Session.append` gains that surface with its first user."

即:官方设计预期 `Session.append` 会在第一个用户出现时获得 ignorable 表面。本插件就是那个 "first user" —— `progress-events` 分支在官方实现该表面之前,以最小补丁提前使用它;`standard` 分支则证明插件在纯官方 API 下也能完整工作。

- 官方仓库当前不接受外部 PR,反馈渠道为 GitHub Discussions;
- `progress-events` 分支的 `ignorable` 使用方式期待官方在 `Session.append` 上正式实现该表面后,补丁即可移除。

## 安装

两个插件目录放入 `$DSH_HOME/plugins/`(如 `C:\Users\<you>\.dsh\plugins\`)后重启 dsh:

```
dsh-tool-websearch/        # host 插件:注册 web_search_meta / web_search_status
dsh-client-ui-websearch/   # 浏览器插件:进度视图(tool.call.toolview)
```

host 插件构建(可选,lib/ 下已含构建产物):

```
bun run build   # bun build src/runner.ts --target=node --format=esm --outfile=lib/search.bundle.mjs
```

## 用法

模型调用 `web_search_meta` 工具:

```
web_search_meta(query="rust async runtime 对比", engines=["duckduckgo","bing","baidu"])
```

可用引擎、健康状态与速率限制:调用 `web_search_status`。

## 许可证

MIT
