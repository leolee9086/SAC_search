# dsh-tool-websearch

独立 DSH 多引擎搜索插件，提供 `web_search_meta`、`web_search_status`、`web_search_proxy` 和浏览器搜索结果卡。

## 运行进度

搜索进度仅保存在当前插件实例的内存中，按 `sessionId + callId` 隔离，每次保留最多五条结果预览。搜索完成、失败、取消或插件卸载时清理；迟到回调不会恢复已清理状态。插件不再注册进度投影，也不调用 `Session.append` 写入 `tool/websearch-progress`。最终搜索文本仍通过正常工具返回值保存，历史结果卡继续读取该结果。

运行中的结果卡每 500ms 读取 `GET /api/dsh-websearch/progress?sessionId=…&callId=…`，请求不重叠，单次请求 10 秒超时。工具结束、切换会话/调用或组件卸载时取消轮询；401/403 停止重试。缺少进度时显示普通加载状态，最终结果不依赖进度接口。

进度与代理 HTTP 接口均调用 DSH 的 `connection.requestRejection(req)`，沿用 Host/Origin 检查和浏览器登录 cookie。缺少该服务时拒绝请求。进度接口要求两个标识，不提供列表或仅按 callId 查找，响应禁止缓存。会话读取权限沿用 DSH 浏览器登录权限；它不额外建立用户账号或新的会话 ACL。

## 维护与验证

`lib/index.js`、`lib/progress.js`、`lib/client.js` 是直接维护的入口文件；`bun run build` 只从 `src/runner.ts` 构建搜索 bundle。本次进度修复不需要构建搜索 bundle 或安装依赖。

在插件目录、Node 22.19+ 下运行：

```sh
npm test
node --check lib/index.js
node --check lib/progress.js
node --check lib/client.js
git diff --check
```

测试使用 Node 内置测试器和实验性模块 mock，完全替换搜索 bundle，并以受控 fetch/时钟验证客户端；不会真实搜索、探测代理、启动服务器或操作浏览器。覆盖无日志写入、并行会话隔离、鉴权拒绝、清理/卸载/迟到回调、轮询取消和最终结果卡。`test/probe.mjs` 会执行真实搜索，不属于此测试命令。

此修改只预防新污染，不修复现有日志。已运行的旧 Host 插件仍需由维护者重新加载；进程重启后未完成的临时进度不会恢复。激活与历史数据修复由部署维护者负责，界面验证由用户完成。
