# 右侧栏页签：怎么加（调研记录）

> 目标：给 `dsh-tool-websearch` 做一个「元搜索引擎」页签，显示在右侧边栏，给哥用。
> 调研日期：2026-09-17
> **状态：已实现，已提交 `ddd0961`；生效方式与未验证点见文末「实现记录」。**

## 一、权威依据

- 技能：`C:\Users\al765\.dsh\skills\dsh-plugin-development\规程\插槽与右侧栏入口.spec.md`
  （索引里那条「怎么在右侧栏加一个页签，以及它的触发按钮？」就是它）
- 官方插槽目录（**权威 spec + 可运行示例**）：
  `D:\dev\deepseek-harness\packages\extensions\cordis-client-runner\src\client\slot-catalog.ts`
  - `sidebar.footer.action` 的条目在 **2130-2178 行**
- 完整实例（内置插件，照着抄就行）：
  - 页签三步注册：`packages\client\ui-sidebar-files\src\client\index.ts`（58 行，很短）
    以及同目录 `definition.tsx`（页签类型的字段）
  - 触发按钮：`packages\extensions\ui-cordis\src\client\index.ts`（第 87 行起）

> ⚠️ 这些是 DSH 本体源码，**只用来读**。插件里绝不能 `import @deepseek-ai/*`，
> 一切能力只通过 `ctx.get(...)` 或 `inject` 声明拿（技能里的头号红线）。

## 二、三步法（客户端 apply 里，全部用 ctx.effect 注册）

`inject` 需要：`slots`、`sidebarRightTabs`、`sidebarRight`、`layout`

### 1. 注册页签类型（这一步定义"这个页签是什么"）

```js
ctx.effect(() => ctx.sidebarRightTabs.register({
  id: 'dsh-websearch',            // 本实现的唯一身份；同时是下面两个插槽的 key
  kind: 'dsh-websearch:panel',    // 类型判别符，openTab 用它（可以不等于 id）
  title: () => '元搜索',           // 打开时写进布局记录的初始标题
}))
```

- `priority` 不写就落在 `extension` 档（内置的是 `'builtin'`）。
- 不写 `patterns` 就是**页面类型**：只能按 kind 打开，不认资源地址。
- （可选）`guide: [{ order, title, description, icon }]` —— 右栏引导页上的入口胶囊，见 `definition.tsx`。

### 2. 正文与标题（keyed 插槽，key 就是上面的 id）

```js
ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
  { name: 'sidebar.right.pane.tab', key: 'dsh-websearch', locale: NS }, Body)))
ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
  { name: 'sidebar.right.pane.tab.title', key: 'dsh-websearch' }, Title)))
```

两个插槽都是 `kind: 'keyed'`、`scope: 'session'`。

### 3. 触发按钮（侧栏底部、Settings 旁边）

```js
ctx.effect(() => ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
  { name: 'sidebar.footer.action', id: 'my-entry', order: 60, label: () => '元搜索' }, Opener)))
```

`sidebar.footer.action` 的权威约束（slot-catalog.ts 2130-2178 行）：

| 项 | 值 |
|---|---|
| kind / scope | `list` / **`root`**（不是 session） |
| 声明者 | `client-ui-sidebar` 的 `sidebar` 条目（该条目挂载期间才存在） |
| 注册选项 | `id`（**必填**）、`order`（升序，默认 0）、`label`（string 或 thunk） |
| ownerProps | 只有 `{ wide: boolean }`（`false` = 56px 轨道态） |
| 现有占用者 | `client-ui-cordis` 的 `CordisPanel`，id = **`cordis-panel`** |
| replaceRisk | `none` |

**要点**：
- `id` 用自己的就是**新增一格**；复用官方已占的 id（如 `cordis-panel`）会**顶掉**那一格。
- `label` 传 thunk 的话每次投影重读，本地化文案无需重注册。
- **不要声明满宽** —— 会把同槽位里别人的行挤出可视区。
- 宽窄两种形态自己画：缩起时按 36×36、展开时按 42px 行高（和官方同类入口一致）。

### 打开页签

```js
ctx.sidebarRight.openTab(kind)                 // 当前会话
ctx.sidebarRight.openTabIn(sessionId, kind)    // 指定会话
if (ctx.sidebarRight.isExpanded() !== true) ctx.layout.openRightbar(false, false)
```

- `openTab`/`openTabIn` 是**写操作**，需要已挂载的会话界面；没有时抛
  `sidebarRight: no session surface is mounted`。**触发按钮里必须 try/catch**，别让异常冒到 UI。
- 注册成「页面类型」的页签**不会自己把右栏展开**，要显式调 `layout.openRightbar(track, fullscreen)`。

## 三、我们插件的改造点

现状（`dsh-tool-websearch/lib/client.js`，386 行，**手写 JS**）：
- 用 `ModuleLoader factory` 模式（`module.exports` + `exports.apply/inject`）
- 用 `react.createElement`（无 JSX、无构建步骤）
- `apply(ctx)` 里已有两处插槽注册：
  - `tool.call.toolview`，key = `web_search_meta`（工具结果卡）
  - `conversation.input.left`，id = `websearch-proxy-toggle`（输入框左侧的代理开关）

**所以要做的**：
1. `inject` 增加 `sidebarRightTabs` / `sidebarRight` / `layout`（`slots` 应该已有）
2. `apply` 里再加：页签类型注册 + 正文/标题两个 keyed 插槽 + 一个 `sidebar.footer.action` 触发按钮
3. 写 Body 组件（元搜索界面：输入框 + 结果列表）—— 这是主要工作量
4. 改完 `lib/client.js` 后**刷新页面**即可（client 半部走 HMR；DSH 是开发模式，改前端不需要重启）

**已有的接口可复用**：Host 侧已经有 `web_search_meta` 工具、`/api/dsh-websearch/progress` 与
`/api/dsh-websearch/proxy` 路由 —— 页签里的界面可以调这些，不必新造后端。

## 四、待确认的设计问题（动手前要定的）

1. **页签里放什么**：只是搜索框 + 结果列表？还是带引擎选择、过滤条件（时间/类型）？
2. **要不要走 MCP/工具那条路**：搜索结果是否要同时写进会话（供模型看见），还是纯粹的 UI 面板？
3. **触发按钮的位置**：`order` 给多少（官方 `cordis-panel` 已占一格，我们别挤它）。

---

# 实现记录（2026-09-17）

## 设计取值（我按自己的方案做了第一版，等哥看完再改）

1. 页签内容：**搜索框 + 漏斗统计行 + 结果列表**（标题/域名/来源引擎/日期/摘要，标题新标签打开）
2. **纯 UI 面板**，搜索结果**不写进会话**（不干扰对话）
3. 触发按钮 `order: 60`，id `websearch-meta-entry`（不碰官方的 `cordis-panel`）

## 改了什么

**Host 侧 `lib/index.js`**
- 新增常量 `SEARCH_API = "/api/dsh-websearch/search"`
- 在 apply 里注册 GET/POST 路由（紧接 proxy 路由之后）
- 它调 `searchDetailed`（bundle 的新导出，返回结构化结果），
  不是工具用的 `searchWeb`（返回给模型看的文本）
- bundle 过旧（没有 searchDetailed）时返回 503 并说明怎么修

**bundle 侧 `src/runner.ts`**（随 `2c12a92` 提交）
- 新增导出 `searchDetailed(params, signal?, onProgress?)` → `WebSearchOutcome`
  （`statsLine` / `results` / `funnel` / `elapsedMs` / `engineCount` / `fromCache` / `message?`）
- **`searchWeb` 一行未动** —— 工具契约那条路径保持稳定，两条路径有意并行

**Client 侧 `lib/client.js`**（587 行）
- `inject` 扩为 `["slots", "sidebarRightTabs", "sidebarRight", "layout"]`
- 新增 `MS` 样式对象、`MetaSearchBody`、`MetaSearchTitle`、`makeMetaSearchOpener(ctx)`
  - 触发按钮用**工厂函数**把 `ctx` 闭包进来（组件本身拿不到 ctx，而 openTab 在 ctx 上）
- apply 里加三步注册，每步都包 `ctx.effect()`

## 生效方式（依据：技能《改完生效与验证》）

- 插件是以 `file:///D:/dev/SAC_search/dsh-tool-websearch/lib/index.js?progress=memory-v1`
  形式挂在 `~/.dsh/profiles/web/cordis.patch.yml` 第 36-37 行 —— **查询串是 HMR 版本标记**。
- 已改成 `?progress=memory-v1&ui=meta-tab-1` 触发重载；
  备份 `cordis.patch.yml.before-metatab-20260917-134444.bak`。
- Client 半部改完**刷新页面**即可（开发模式下前端不重启）。

## 还没验证的部分（要刷新页面才能看）

**HTTP 层验证不了**：鉴权（`connection.requestRejection`）发生在**路由匹配之前**，
实测 `proxy` / `search` / `nonexistent-xyz` 三个路径**全是 401** ——
所以"非 404 即存在"这个办法在这里不成立。

已自证的部分：两侧语法检查通过；`searchDetailed` 单独调用正常
（返回 `statsLine, results, funnel, elapsedMs, engineCount, fromCache`，结果条数正确）；
注册点齐全（`sidebarRightTabs.register` / 两个 keyed 插槽 / `sidebar.footer.action` / `openTab`）。

**待哥刷新页面确认**：侧栏底部是否出现「🔎 元搜索」入口、点开是否打开搜索页签、
搜一个词是否有结果。若没出现，先怀疑 Host 那行 HMR 没重载
（可以再改一次查询串，或重启 Harness）。

