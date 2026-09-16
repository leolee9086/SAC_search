# SAC_search

**SAC = Stand Alone Complex(攻壳机动队术语)：没有原型的独立复合体。** 命名梗一脉相承自 [SiyuanAssistantCollection](https://github.com/leolee9086/SiyuanAssistantCollection)(表面读作 "Siyuan Assistant Collection"，SAC 实为 Stand Alone Complex 的标准缩写)——本仓库延续同一梗：官方没有给第三方插件预留注册面（没有原型），社区插件自发聚合出同类能力（独立复合体）。本仓库不是任何官方项目的子集，而是一个独立成型的复合体——约 200 个免 API key 搜索引擎自发聚合，在 DeepSeek Harness 上作为自包含插件运行。

本仓库目前有两个插件：

| 插件 | 做什么 |
|---|---|
| [`dsh-tool-websearch/`](./dsh-tool-websearch) | **互联网元搜索**：免 API key 直接调用 DuckDuckGo / Bing / Google / 百度 / 搜狗 等约 200 个搜索引擎，并发执行、结果去重聚合、按引擎权重与时效性评分。搜索实现移植自 s-code，构建期打包为自包含 ESM bundle，运行时零依赖。 |
| [`dsh-tool-everything/`](./dsh-tool-everything) | **本机文件索引检索**：查询 [Everything](https://www.voidtools.com/) 自带的 HTTP 接口，毫秒级按文件名、路径、扩展名、大小、修改时间检索整机文件；`path` 参数可把范围限定在某个目录（自动补尾分隔符，不会连带同前缀的兄弟目录）。索引含整机文件名，所以**审批跟着会话文件权限走**：完全权限直接调用，工作区/只读权限每次调用都过 DSH 审批，审批理由里带本次查询的关键词。零运行时依赖。 |

两个插件都只通过运行时的 Cordis 服务契约与 DSH 交互，不 import 任何 DSH 包。

## 安装

需要 Node.js **22.19.0 或更高版本**、pnpm，以及兼容的 DeepSeek Harness Web 环境。

插件包位于 `dsh-tool-websearch/` 子目录，所以**不能**用 `pnpm add 'github:leolee9086/SAC_search#v0.1.0'` 这类 git 依赖形式安装——git 依赖要求 `package.json` 在仓库根，pnpm 会把仓库根当成一个空包（装出 0.0.0 的壳，整个仓库被塞进 `node_modules` 的子目录）。请用下面的 tgz，或把插件目录放进 `$DSH_HOME/plugins/`。

从 [Releases](https://github.com/leolee9086/SAC_search/releases) 下载 `dsh-tool-websearch-0.1.1.tgz`，在 DSH Web profile 目录（默认 `~/.dsh/profiles/web`，Windows 通常为 `%USERPROFILE%\.dsh\profiles\web`）执行：

```sh
pnpm add ./dsh-tool-websearch-0.1.1.tgz
```

然后在该 profile 的 `cordis.patch.yml` 中加入下列配置；已有 `insert` 列表时只需向列表追加这一项，不要重复注册：

```yaml
- insert:
    - id: dsh-tool-websearch
      name: dsh-tool-websearch
```

包内已带 `cordis.patch.yml`，因此也可以直接作为 bundle 挂载：

```yaml
- name: dsh-tool-websearch
```

重载插件或重启 DSH 后刷新浏览器页面。开发时也可以把插件目录整个放进 `$DSH_HOME/plugins/` 后重启 dsh。

两个插件各有自己的前置条件：

- `dsh-tool-websearch` 开箱即用，免 API key。
- `dsh-tool-everything` 需要本机装好 Everything 并**打开它的 HTTP 服务**（默认是关的），只绑回环、关掉文件下载：

  ```ini
  ; %APPDATA%\Everything\Everything.ini(改前请先退出 Everything)
  http_server_enabled=1
  http_server_bindings=127.0.0.1
  http_server_port=8080
  http_server_allow_file_download=0
  ```

  端口要和插件 `config.port` 一致。细节见 [`dsh-tool-everything/README.md`](./dsh-tool-everything/README.md)。

## 用法

模型侧的工具：

```
web_search_meta(query="rust async runtime 对比", engines=["duckduckgo","bing","baidu"])
web_search_status()   # 可用引擎、权重、超时、速率限制、缓存与健康状态
web_search_proxy()    # 查看/切换本地代理（探测 127.0.0.1:7890 等本地代理）
```

搜索结果在浏览器里以结果卡展示，运行中的逐引擎进度也显示在该卡片上。

## 运行进度

当前实现的进度只保存在插件实例内存里，按 `sessionId + callId` 隔离，每次保留最多五条结果预览；搜索完成、失败、取消或插件卸载时清理，迟到回调不会恢复已清理状态。插件不注册进度投影，也不调用 `Session.append` 写入自定义事件——最终搜索文本仍通过正常工具返回值保存，历史结果卡继续读取该结果。细节见 [`dsh-tool-websearch/README.md`](./dsh-tool-websearch/README.md)。

## 两个历史分支

`main` 之前，本仓库用两个分支对比过"自定义会话事件"的两种用法。它们保留下来作为那段对比的记录：

| 分支 | 进度通道 | 会话历史安全 | 运行中逐引擎进度 |
|---|---|---|---|
| [`standard`](https://github.com/leolee9086/SAC_search/tree/standard) | 纯官方 API，不写任何自定义事件 | ✅ 永远安全 | ❌ 仅静态卡片「正在搜索: q」 |
| [`progress-events`](https://github.com/leolee9086/SAC_search/tree/progress-events) | 自定义事件 `tool/websearch-progress` + `ignorable` 标记 | ⚠️ 依赖官方 `Session.append` 的 ignorable 表面（见下） | ✅ 实时：引擎 x/y、当前引擎、已得条数、最新结果预览 |

两个分支的搜索引擎代码、工具 schema、结果渲染完全一致，唯一差异是进度通道。

### 为什么当初要有这两个分支

DeepSeek Harness 的会话日志持久化有一个已知事件类型白名单 `KNOWN_SESSION_EVENT_TYPES`（由 `gen-persistence-catalog.ts` 从 repo 内 `SessionEventMap` 声明生成）。读取端遇到白名单外的事件时：

- 未标记 `ignorable: true` → 整份会话日志拒绝加载（`SessionFormatUnsupportedError`，历史"损坏"且无法修复）；
- 标记 `ignorable: true` → 跳过该事件，正常恢复。

官方架构笔记 [`2026-08-10-session-log-version-mechanism`](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/architecture/2026-08-10-session-log-version-mechanism.md) 明确说明：

> "writers do not yet set `ignorable` (no producer needs it), so `Session.append` gains that surface with its first user."

即：官方设计预期 `Session.append` 会在第一个用户出现时获得 ignorable 表面。`progress-events` 分支曾在官方实现该表面之前以最小补丁提前使用它，`standard` 分支则证明插件在纯官方 API 下也能完整工作。

`main` 最终选了第三条路：进度只留在插件实例的内存里，既不写自定义事件、也不依赖官方补丁，因此既没有日志风险也不需要等待官方实现。

## 许可证

MIT

## 交流

想聊工具软件折腾、或者有问题要问，欢迎加个人讨论群【工具软件爱好者折腾群-综合讨论】：[点击加入](https://qm.qq.com/q/bXbOIxVWRq)（群号 **1017854502**）。

## 赞赏

如果这个项目帮到了你，可以请我喝杯咖啡：

![赞赏码](assets/sponsor-qr.png)

也欢迎通过 [爱发电](https://afdian.net/a/leolee9086) 支持。