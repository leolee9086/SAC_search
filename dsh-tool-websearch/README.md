# dsh-tool-websearch

独立 DSH 多引擎搜索插件，提供 `web_search_meta`、`web_search_status`、`web_search_proxy` 三个 Host 工具和浏览器搜索结果卡。

免 API key 直接调用 DuckDuckGo / Bing / Google / 百度 / 搜狗 等约 200 个搜索引擎（完整清单由 `web_search_status` 报出），并发执行、结果去重聚合，按引擎权重与时效性评分。搜索实现移植自 s-code，构建期打包为 `lib/search.bundle.mjs`，运行时零依赖，只通过运行时的 Cordis 服务契约与 DSH 交互。

## 安装

需要 Node.js **22.19.0 或更高版本**、pnpm，以及兼容的 DeepSeek Harness Web 环境。

本包在 [SAC_search](https://github.com/leolee9086/SAC_search) 仓库的 `dsh-tool-websearch/` 子目录里，因此不能用 `pnpm add 'github:leolee9086/SAC_search#v0.1.0'` 这类 git 依赖形式安装（git 依赖要求 `package.json` 在仓库根）。请用下面的 tgz，或把本目录整个放进 `$DSH_HOME/plugins/`。

从 [Releases](https://github.com/leolee9086/SAC_search/releases) 下载 `dsh-tool-websearch-0.1.0.tgz`，在 DSH Web profile 目录（默认 `~/.dsh/profiles/web`，Windows 通常为 `%USERPROFILE%\.dsh\profiles\web`）执行：

```sh
pnpm add ./dsh-tool-websearch-0.1.0.tgz
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

重载插件或重启 DSH 后刷新浏览器页面。开发时也可以把本目录整个放进 `$DSH_HOME/plugins/` 后重启 dsh。

## 用法

模型侧的工具：

```
web_search_meta(query="rust async runtime 对比", engines=["duckduckgo","bing","baidu"])
web_search_status()   # 可用引擎、权重、超时、速率限制、缓存与健康状态
web_search_proxy()    # 查看/切换本地代理（探测 127.0.0.1:7890 等本地代理）
```

搜索结果在浏览器里以结果卡展示，逐引擎进度也显示在该卡片上；代理开关注册在会话输入区左侧。

## HTTP 接口

- `GET /api/dsh-websearch/progress?sessionId=…&callId=…`：读取某次调用的运行进度。
- `/api/dsh-websearch/proxy`：查看或切换代理。

两个接口都调用 DSH 的 `connection.requestRejection(req)`，沿用 Host/Origin 检查和浏览器登录 cookie；缺少该服务时拒绝请求。进度接口要求两个标识，不提供列表或仅按 callId 查找，响应禁止缓存。会话读取权限沿用 DSH 浏览器登录权限；它不额外建立用户账号或新的会话 ACL。

## 运行进度

搜索进度仅保存在当前插件实例的内存中，按 `sessionId + callId` 隔离，每次保留最多五条结果预览。搜索完成、失败、取消或插件卸载时清理；迟到回调不会恢复已清理状态。插件不注册进度投影，也不调用 `Session.append` 写入 `tool/websearch-progress`。最终搜索文本仍通过正常工具返回值保存，历史结果卡继续读取该结果。

运行中的结果卡每 500ms 读取进度接口，请求不重叠，单次请求 10 秒超时。工具结束、切换会话/调用或组件卸载时取消轮询；401/403 停止重试。缺少进度时显示普通加载状态，最终结果不依赖进度接口。

## 维护与验证

`lib/index.js`、`lib/progress.js`、`lib/client.js` 是直接维护的入口文件；`bun run build` 只从 `src/runner.ts` 构建搜索 bundle，只有改动 `src/` 时才需要重新构建（`lib/search.bundle.mjs` 已随仓库提交）。`pnpm pack` 前会自动跑测试和构建。

在插件目录、Node 22.19+ 下运行：

```sh
pnpm test        # node --experimental-test-module-mocks --test test/*.test.mjs
pnpm run check   # node --check lib/index.js lib/progress.js lib/client.js
```

测试使用 Node 内置测试器和实验性模块 mock，完全替换搜索 bundle，并以受控 fetch/时钟验证客户端；不会真实搜索、探测代理、启动服务器或操作浏览器。覆盖无日志写入、并行会话隔离、鉴权拒绝、清理/卸载/迟到回调、轮询取消和最终结果卡。`test/probe.mjs` 会执行真实搜索，不属于测试命令的一部分。

## 已知边界

- 客户端结果卡依赖 DSH 的会话快照与结果卡结构，DSH 升级改变该结构时可能需要更新本插件；DSH 插件接口本身也仍在预发布阶段。
- 进度是显示用的临时状态：进程重启后不恢复，插件卸载即清理，历史调用不再有进度。
- 部分引擎在特定网络环境下不可用（例如需要代理才能访问的境外引擎）。`web_search_status` 会报出各引擎健康状态，代理可用 `web_search_proxy` 查看或切换。
- 界面文案目前为简体中文。

## 许可证

MIT
