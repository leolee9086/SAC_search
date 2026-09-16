# dsh-tool-everything

DSH 工具插件：通过 [Everything](https://www.voidtools.com/)（voidtools，Windows 文件名搜索引擎）自带的 HTTP 接口检索本机文件索引，提供 `everything_search`、`everything_workspace_search` 和 `everything_status` 三个 Host 工具。前者检整机（每次调用都要审批），后者只检当前会话的工作区（免审批）。

Everything 的索引是读 NTFS 主文件表建的、并用 USN Journal 增量维护，所以查询是毫秒级、不需要扫描目录。本插件只做"把查询转成 Everything 的 HTTP 请求、把结果整理给模型"，解析和索引都在 Everything 那边。

**审批跟着会话的文件权限走。** Everything 索引里是整机所有文件名与路径，而且它的 HTTP 接口默认还允许**下载文件**（官方文档原话：Every file and folder indexed by Everything can be searched and downloaded via the web server），所以本插件在 `tools/pre-execute` 这个执行点读当前会话生效的文件权限 `ctx.sandboxPolicy.resolve({ session }).mode`（显式覆盖 > 会话 `sandbox/mode` 事件 > 部署默认），再决定要不要问：

| 会话文件权限 | 行为 |
|---|---|
| `danger-full-access`（完全权限） | **直接调用，不进审批**。DSH 把这一档声明为 "Full file access without approval prompts"，此时弹审批只会被自动拒绝 |
| `workspace-write` / `read-only` | 返回 `{ kind: "ask" }`，由 DSH 的审批服务向你确认 |
| 读不到权限服务 | 按需要审批处理（fail closed） |

审批结果由 DSH 自己处理：它会写 `approval/asked` / `approval/decided` 审计事件，并把结果映射成放行或拒绝（拒绝、取消、通道不可用都是拒绝）；插件自己不裁决、也不放行任何调用。`config.approvalMode` 可以改成 `always`（任何权限都问）或 `never`（从不问，不建议）。

**工作区内检索（`everything_workspace_search`）不需要审批。** 它的范围由插件自己拼在 `ctx.sandboxPolicy.resolve({ session }).workspaceRoot` 上（与会话文件权限同源，插件不自己猜 cwd），只会返回工作区内的条目，所以默认直接放行——免审批的依据是工具身份加插件自己拼的范围，不是调用方给的参数。`everything_search` 不提供任何"只搜工作区"的参数，任何调用都仍然过审批。工作区检索只有一处会问：解析不到工作区根时（fail closed）；`approvalMode: always` 也仍然一律申请。

审批理由把**这次调用的关键词放在最前面**，让人看得见要搜什么再决定：

```
everything_search query="效果图" path="D:\工作" ext="psd" maxResults=20 · 读取 Everything 的整机文件名索引 · 当前文件权限 workspace-write
```

摘要包含 `query`/`path`/`ext`/`probe`/`maxResults`/`offset`/`sort` 与 `regex`/`matchCase`/`wholeWord`/`ascending` 开关，没有参数时写"无参数"；整条理由超过 400 字会截断，避免把弹窗撑爆。

## 前置条件：打开 Everything 的 HTTP 服务

插件本身零运行时依赖，但要求 Everything 那边把 HTTP 服务打开（默认是关的）。在 Everything 里勾：

1. `工具 → 选项 → HTTP 服务器`，勾上"启用 HTTP 服务器"；
2. **监听端口**设成和插件 `config.port` 一致（本插件默认 `8080`）；
3. 把"绑定"限定为 `127.0.0.1`，不要暴露到局域网；
4. 取消勾选"允许下载文件"。

也可以在 Everything 未运行时直接改 `%APPDATA%\Everything\Everything.ini`：

```ini
http_server_enabled=1
http_server_bindings=127.0.0.1
http_server_port=8080
http_server_allow_file_download=0
```

改完重启 Everything。验证：

```sh
curl "http://127.0.0.1:8080/?search=Everything.exe&json=1&count=1&path_column=1"
```

## 安装

需要 Node.js **22.19.0 或更高版本**，以及 Everything（本插件在 1.4.1.1032 上实测）。

本包在 [SAC_search](https://github.com/leolee9086/SAC_search) 仓库的 `dsh-tool-everything/` 子目录里。开发时直接把该目录放进 `$DSH_HOME/plugins/`，或在 profile 里 link：

```
dsh-tool-everything/  # everything_search / everything_workspace_search / everything_status
```

在该 profile 的 `cordis.patch.yml` 里挂载（已有 `insert` 列表时只追加这一项）：

```yaml
- insert:
    - id: dsh-tool-everything
      name: dsh-tool-everything
      config:
        host: 127.0.0.1
        port: 8080
```

包内已带 `cordis.patch.yml`，也可以直接作为 bundle 挂载：

```yaml
- name: dsh-tool-everything
```

重载插件或重启 DSH 后生效。

## 配置

| 键 | 默认 | 说明 |
|---|---|---|
| `host` | `127.0.0.1` | Everything HTTP 服务地址 |
| `port` | `8080` | Everything HTTP 服务端口，要和 Everything 里设的一致 |
| `timeoutMs` | `15000` | 单次查询超时 |
| `defaultResults` | `50` | 不传 `maxResults` 时返回多少条 |
| `maxResults` | `500` | 单次返回条数上限 |
| `maxQueryLength` | `4096` | 查询串长度上限 |
| `approvalMode` | `auto` | `auto`=跟会话文件权限走（完全权限直接调用，其余审批）；`always`=每次都问；`never`=从不问 |
| `approvalReason` | 内置说明 | 自定义审批理由 |

## 用法

```
everything_search(query="ext:psd 效果图")
everything_search(query="报价", path="D:\\工作", ext="xlsx;docx", maxResults=20)
everything_search(query="^方案.*\\.pdf$", regex=true, sort="date_modified", ascending=false)
everything_workspace_search(query="规则", ext="js;md")
everything_workspace_search(query="报价", subpath="docs\\报价")
everything_status(probe="Everything.exe")
```

`everything_workspace_search` 与 `everything_search` 的差别只有范围：它没有 `path` 参数（范围由插件钉在会话工作区根上），多一个 `subpath`（工作区内的相对子目录，绝对路径、UNC、`..` 与引号一律拒绝）；`query` 里出现 `|`（Everything 的 OR）也会被拒——`|` 会让范围限定失效，而免审批的前提正是范围留在工作区内。

`query` 走 **Everything 自己的搜索语法**，插件不解析它。实测（Everything 1.4.1.1032 的 HTTP 接口）各函数的有效性：

| 函数 | 实测结果 |
|---|---|
| `ext:` `path:` `folder:` `size:` `dm:` `file:` | 有效 |
| `name:` | **无效**——`name:package.json`、`name:"package.json"`、`name:package` 全部返回 0 条；要按文件名找就直接写文件名 |

`path` 与 `ext` 是拼进查询的便捷参数（1.4 的 HTTP 接口不认独立的目录/扩展名过滤参数）：`ext` 拼成 `ext:psd`（多个用 `;` 分隔），`path` 拼成 `path:"…\"`。

**限定范围靠 `path` 参数**，末尾那个反斜杠是关键：`path:` 是"整条路径里含这段文本"的匹配，不补尾分隔符会把同前缀的兄弟目录一起带进来——实测 `path:"C:\Program Files"` 317684 条，补成 `path:"C:\Program Files\"` 后 283886 条（排掉了 `C:\Program Files (x86)`）。插件会自动补，已经带 `\` 或 `/` 的路径不会重复补。

## 实现要点（都是实测出来的）

- 结果字段靠 `path_column=1`、`size_column=1`、`date_modified_column=1` 请求；不请求就只有 `type` 和 `name`。
- **`date_modified` 是 Windows FILETIME**（1601 年起的 100 纳秒数），不是 Unix 时间戳，要 `/10000 - 11644473600000` 才是毫秒。直接当毫秒用会得到 1970 年。
- `date_created` / `date_accessed` 默认拿不到：Everything 只在勾选了"索引创建时间/访问时间"时才返回，所以插件不请求它们。
- 排序用 `sort=` + `ascending=`，翻页用 `offset=`，匹配开关用 `case=` / `wholeword=` / `regex=`。
- HTTP 接口不提供"按目录过滤""按大小区间过滤"的参数，这类条件写进 `query`（目录用 `path` 参数，会自动补尾部分隔符收紧范围）。

## 已知边界

- 只支持 Windows + 已安装并运行 Everything；插件不自己建索引，Everything 没跑起来就只能报错。
- Everything 1.5 的 HTTP 参数与 1.4 有差异（1.5 起支持更多列与 `path=` 过滤），本插件按 1.4 实测行为实现。
- 返回条数受 `count` 限制，超出部分不返回（文本里会提示还剩多少条）。
- 工作区检索只保证范围被钉在工作区内，不保证 `query` 里的其它条件都被理解：`name:` 在 HTTP 接口上无效这类事实对两个工具一样成立。
- 工作区根取自会话（会话 cwd > 部署默认）；会话搬了目录要重新起会话，插件不缓存也不猜。

## 测试

```sh
pnpm test        # node --test test/*.test.mjs
pnpm run check   # node --check lib/*.js
```

测试全部用假 fetch 与假 ctx，不打真实网络、不要求本机装 Everything：覆盖 URL 拼装、FILETIME 换算、结果映射、错误与超时/取消分类、审批闸门（整机检索 ask、工作区检索放行、别的工具放行、可关闭）、三个工具的入参校验与文本输出，以及工作区检索的范围拼装与逃逸拒绝（`..`、绝对路径、UNC、引号、`|`）。

## 许可证

MIT
