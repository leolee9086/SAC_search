# 召回优化笔记（dsh-tool-websearch）

> 这个引擎主要给织自己用，**召回质量由织判定**。
> 泛化目标（哥给的）：设计师兼程序员怎么赚钱 / 妊娠糖尿病妈妈的全日菜谱 / 怎么利用 AI 赚钱。

## 本轮全部改动与提交（2026-09-16，会话内的完整记录）

仓库：`D:\dev\SAC_search`（插件在子目录 `dsh-tool-websearch/`）

| commit | 内容 |
|---|---|
| `0f17b8d` | 召回三处根因：引擎选择（`!flags` 导致 general 丢 Google/百度）、过度截断（8→30、50→200）、排序（对齐 SearXNG 的共识算法）、代理（undici `ProxyAgent` 无 `noProxy` 参数 → 改 `EnvHttpProxyAgent`） |
| `c145dc4` | SearXNG **候选**引擎 + `docs/searxng.md` |
| `2298262` | 相关性区分度：中文字符覆盖率 + 虚字过滤 + 下界 0.15→0.05 |
| `cea6ddf` | 结巴完整词典 + 逆向最大匹配分词（`src/search/zh-cn.ts`、`data/zh-dict.txt`、`data/zh-stopwords.txt`）+ 下界→0.02 |
| `7106558` | AI 易用性：`unwrapRedirectUrl`（去重前解包跳转链接）+ 摘要清理截断 600 字 + 工具描述校准 |
| `4bd49ee` | 速度：并发 10→25（可配 `DSH_WEBSEARCH_CONCURRENCY`） |
| `af22099` | 中文源：bilibili + sogou-videos 纳入通用集（召回 26→49） |

### 改动过的文件（全路径）

```
D:\dev\SAC_search\dsh-tool-websearch\
  src\runner.ts                 截断/引擎选择/DEBUG 输出/统计漏斗
  src\search\aggregator.ts      排序算法、relevance、queryTerms、unwrapRedirectUrl、cleanSnippet
  src\search\selector.ts        引擎选择语义 + GENERAL_ENGINE_NAMES 精选名单
  src\search\proxy.ts           EnvHttpProxyAgent + NO_PROXY（已 export）
  src\search\zh-cn.ts           【新】中文分词
  src\search\engines\searxng.ts 【新】SearXNG 候选引擎
  src\search\executor.ts        MAX_CONCURRENCY
  lib\index.js                  【手写文件，不在 src】工具描述与参数说明 ← 改这里要重载插件
  data\zh-dict.txt              【新】结巴词典 34.9 万词 4.8MB
  data\zh-stopwords.txt         【新】停用词 746 词
  package.json                  files 字段加 data
  RECALL-NOTES.md               【本文件】
  docs\searxng.md               【新】SearXNG 部署说明（四个坑）
  scripts\check-relevance.ts    【新】相关性回归测试（13 项）
  scripts\diagnose-engines.ts   引擎诊断（支持指定引擎、合并各 queryType、bun 代理）
  scripts\cdp-grab.mjs          【新】CDP 抓取调研工具
  scripts\scan-user-agents.mjs  【新】扫 UA
  scripts\list-selected-engines.mjs、verify-proxy-bypass.mjs
```

### 命令速查（原样抄，可直接用）

```powershell
# 构建（改 src 后必做；DSH 用的是 lib/search.bundle.mjs）
cd D:\dev\SAC_search\dsh-tool-websearch; pnpm run build

# 真实搜索（务必用 node，bun 不认 undici 的 setGlobalDispatcher，结论会错）
node test/probe.mjs "设计师兼程序员怎么赚钱" 30
$env:DSH_WEBSEARCH_DEBUG = "1"     # 加这个看引擎级明细

# 相关性回归（秒出，纯函数）
bun scripts/check-relevance.ts

# 引擎诊断（第 4 个参数是引擎白名单，逗号分隔）
bun scripts/diagnose-engines.ts "查询词" general "bilibili,zhihu,weibo"
bun scripts/diagnose-engines.ts "查询词" general          # 不传=全量

# 看过滤后选中了哪些引擎
bun scripts/list-selected-engines.mjs

# 单测（必须带 --experimental-test-module-mocks，否则 mock.module 报错）
pnpm test

# SearXNG 本机实例（可选，8899 端口；8888 被 unsloth_studio 占）
$env:SEARXNG_SETTINGS_PATH = 'D:\dev\searxng\settings.yml'
cd D:\dev\searxng; .venv\Scripts\python.exe -m searx.webapp
```

### 坑与根因（避免重犯）

1. **bun 测代理会得出错误结论**：bun 有自己的 fetch，不认 `setGlobalDispatcher`。
   表现是"墙外引擎全失败"。→ 诊断统一用 `node`；脚本里要跑 bun 就先手动
   `setGlobalDispatcher(new EnvHttpProxyAgent(...))` 并覆盖 `globalThis.fetch`。
2. **undici 6.x 的 `ProxyAgent` 没有 `noProxy` 参数** —— 传了会被**静默忽略**，
   导致国内站点全被塞进代理。→ 用 `EnvHttpProxyAgent`。
3. **`keep_only` 不会启用 `disabled: true` 的引擎**（SearXNG 配置坑）：
   它只决定"可用列表里保留谁"。表现是 `/config` 显示 19 个启用却只有 1 个真跑。
4. **同一查询第二次会命中缓存**，"秒回但结果很少"会让人误判引擎坏了。→ 排查时换新词。
5. **批量替换的正则漏掉了复合条件**：`if (flags?.bilibili || isType("video"))` 这种
   前缀形式没被匹配到，导致 bilibili 永远不在通用集里。→ 批量改完必须反向检查一遍。
6. **PowerShell 里用 `git commit -m` 传含引号/括号的中文消息会解析失败** →
   把 message 写到文件再 `git commit -F <file>`。
7. **DSH 的桥接浏览器是用户正在用的窗口**，不要拿它做批量抓取实验；
   要实验就起独立的 headless Chrome（`--user-data-dir` 指向临时目录）。

### 当前待办（按优先级）

1. **复验微博的 `ERR_CONNECTION_CLOSED`**：加 `--proxy-server="direct://"` 重启 Chrome 再测。
2. 方向四其余部分：若哥要知乎/小红书，需定夺走哪条路（见上一节的三个选项）。
3. **dsh-reader 的「向上滚动自动加载」仍未解决**（另一个项目）：
   哥反馈"会不断停留在当前的进度位置"，疑似手动 scrollTop 补偿与浏览器原生
   scroll anchoring 叠加。哥让我参考 SOTA（react-virtuoso / TanStack Virtual 的
   prepend 保位做法）。项目在 `D:\dev\dsh-reader`，`PROGRESS.md` 有全文。
4. 收尾：关掉实验用的 headless Chrome（`http://127.0.0.1:9222` 那个实例）。

## 方向四：CDP 抓取调研结果（2026-09-16，务必先读这一节）

### 环境与工具

- **Chrome 路径**：`C:\Users\al765\AppData\Local\Google\Chrome\Application\chrome.exe`（实测版本 Chrome/153.0.8010.48）
- **启动 headless + CDP**（后台跑，实际会 detach）：
  ```powershell
  $chrome = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  $profile = "$env:TEMP\dsh-cdp-profile"
  New-Item -ItemType Directory -Force -Path $profile | Out-Null
  & $chrome --headless --remote-debugging-port=9222 --user-data-dir=$profile --no-first-run --disable-gpu --disable-extensions --window-size=1280,900
  ```
- **CDP 端点**：`http://127.0.0.1:9222`
  - `/json/version` 查浏览器与 WebSocket 地址
  - `/json/list` 列标签页
  - `/json/new?<url>` 建标签页 —— **必须用 PUT**（GET 会 405）
  - `/json/close/<id>` 关标签页
- **抓取脚本**：`scripts/cdp-grab.mjs`
  ```powershell
  node scripts/cdp-grab.mjs 'https://example.com/path' 6000
  ```
  第二个参数是**加载后等待毫秒数**（结果常是加载完再异步填充的，不能只等 load 事件）。
  输出：标题、DOM 长度、若干风控信号计数、纯文本前 400 字。

### 实测数据（都是全新 profile、无登录态）

| 平台 | URL | 页面标题 | DOM 长度 | 结论 |
|---|---|---|---|---|
| 知乎 | `https://www.zhihu.com/search?type=content&q=设计师赚钱` | `安全验证 - 知乎` | 27831 | ❌ 风控拦下。正文是「系统监测到您的网络环境存在异常，为保证您的正常访问，请点击下方验证按钮进行验证」 |
| 微博 | `https://s.weibo.com/weibo?q=设计师赚钱` | `s.weibo.com` | 187420 | ❌ **ERR_CONNECTION_CLOSED** —— 页面**根本没加载**，纯文本是 Chrome 的错误页（"无法访问此网站…意外终止了连接"） |
| 小红书 | `https://www.xiaohongshu.com/search_result?keyword=设计师赚钱` | `设计师赚钱 - 小红书搜索` | 80336 | ⚠️ 页面正常加载、标题正确，但**需要登录**才显示结果（检测到登录墙） |
| B站（对照） | `https://search.bilibili.com/all?keyword=设计师赚钱` | `设计师赚钱-哔哩哔哩_bilibili` | 1095873 | ⚠️ DOM 最大、有结果容器与链接，但**它已有可用的 API 引擎，不需要 CDP** |

### 结论与待办

**在无登录态的全新 profile 下，CDP 对知乎/微博/小红书都拿不到结果。**

**微博那条已经复验完毕**（2026-09-16 补测）：杀掉旧实例、用
`--proxy-server=direct:// --proxy-bypass-list=*` 重启后再测 ——
`ERR_CONNECTION_CLOSED` 确实是**代理问题**（Chrome 默认走系统代理 7890，
而国内站点走代理必失败，这个坑我们之前在 undici 侧也踩过、已修）。
**但排除代理后暴露的真实状态是：标题变成「登录 - 微博」，正文是登录页
（短信验证登录 / 扫码登录）。所以微博的结论是"需要登录态"，不是"能抓"。**

知乎在直连模式下更直接：DOM 只有 281 字节，内容是 JSON 错误
```json
{"error":{"message":"您当前请求存在异常，暂时限制本次访问。如有疑问，您可以通过手机摇一摇或登录后私信知乎小管家反馈。3b753119772199057da970657f19a905","code":40362}}
```
即**在接口层就被风控拦掉**（headless 特征 + IP 之前被脚本请求标记过）。

**三家汇总：知乎=风控 403、微博=需登录、小红书=需登录。**
都不是"技术方案不对"，而是**没有登录态**。

**若知乎/小红书也要，可选的三条路**（都有代价，需哥定夺）：
1. 用**有登录态的浏览器 profile** —— 但 Chrome profile 是独占的，会和哥自己开着的浏览器冲突；
2. 走 **DSH 的 browser bridge**（用户授权、用他已经登录的浏览器）—— 但这会操作哥正在用的窗口；
3. **放弃强风控平台**，专注能抓的源。

**复验用的命令**（下次直接抄）：
```powershell
# 杀掉旧实例（监听 9222 的那个）
Get-NetTCPConnection -LocalPort 9222 -State Listen | Select-Object -Unique OwningProcess |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
# 直连模式重启
Start-Process -FilePath "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe" -ArgumentList @(
  '--headless','--remote-debugging-port=9222',"--user-data-dir=$env:TEMP\dsh-cdp-direct",
  '--no-first-run','--disable-gpu','--disable-extensions',
  '--proxy-server=direct://','--proxy-bypass-list=*')
```

### 目前确实可用的中文源（都不需要 CDP）

`bing` / `searxng`（内含 brave·google·yandex·quark）/ `sogou` / `360search` /
**`bilibili`（API，实测稳定 30 条）** / `sogou-videos` / `github` / `npm`

**不要再用 shell 去测这些平台是否"能抓"** —— 直接跑
`bun scripts/diagnose-engines.ts "查询" general "引擎1,引擎2"` 就有明细。

## 哥给的四个方向与进度（2026-09-16）

| 方向 | 状态 | commit |
|---|---|---|
| ① 中文友好度（结巴分词/停用词） | ✅ 完成 | `cea6ddf` |
| ② AI 易用性 | ✅ 完成 | `7106558` |
| ③ 搜索速度 | ⬜ 未做 | — |
| ④ SearXNG 未覆盖网站的收录 | ⬜ 调研完成，未实现 | — |

### ① 中文友好度（已完成）

- **结巴完整词典**（34.9 万词、4.8MB）随包发布在 `data/zh-dict.txt`，
  停用词用 cn_stopwords。**不要精简** —— 哥明确说过 4.8MB 很小、也不必塞进 npm。
- 自己实现**逆向最大匹配**分词（`src/search/zh-cn.ts`，纯 JS 零原生依赖 —
  不用 nodejieba 是因为它要编译，属部署负担）。
  - 为什么逆向：「设计师兼程序员怎么赚钱」正向会切成「设计师/兼程/赚钱」，
    「兼程」吃掉了「兼」导致**「程序员」切不出来**；逆向得「设计师/程序员/赚钱」。
  - 中文中心语在后，从后往前扫更稳。经典歧义「硕士研究生招生简章」也切对。
- 相关性下界一路降到 **0.02**（0.15 → 0.05 → 0.02，每次都有实测依据）：
  0.05 时仍有一条 Solana 币价混进第 4 名 —— 它在 bing 排第 1（基础分 0.9），
  ×0.05 后 0.045，反而高于「相关但排位靠后」的 0.1×0.36=0.036，
  **基础分的差距压过了相关性**。0.02 后相关性才稳定压得住。
- 回归测试：`bun scripts/check-relevance.ts`（13 项，无关用例要求 ≤0.05）。

### ② AI 易用性（已完成）

- **跳转链接还原**（`unwrapRedirectUrl`，在**去重之前**做）：Bing 的 `u=a1<base64>`、
  Google 的 `/url?q=`。除了可读性，更重要的是**去重** —— 同一页面经不同引擎的跳转链接
  外层不同，不还原就是两条，共识信号被稀释。百度/搜狗的不透明参数不还原（要额外网络往返）。
- **摘要清理与截断 600 字**：API 类引擎会把整篇文档当摘要（实测几万字符一条），
  另有结果带几百个全角空格。600 是刻意的 —— 够放完整菜谱（实测约 500 字）。
- **工具描述校准**：原描述已与行为脱节（写「默认 8 最大 50」，实际 30/200；
  写「不传时使用全部引擎」，实际是精选集）。现在说清了 stats 漏斗怎么读。
  ⚠️ **改了 `lib/index.js`（手写文件，不在 src 里），需要重载插件才生效。**

### ③ 搜索速度（未做，思路）

现状：47 个引擎并发、`MAX_CONCURRENCY = 10`、耗时 8~12 秒。
- 可提高并发数（`src/search/executor.ts` 的 `MAX_CONCURRENCY`）
- 引擎分流：慢引擎（SearXNG 要 3~10 秒）不该拖累快的
- 缓存已有（`src/search/cache.ts`），但命中率要看
- **注意**：提高并发可能加剧被反爬限流，要实测权衡

### ④ SearXNG 未覆盖网站的收录（调研完成）

**参考对象**：BettaFish(`D:\dev\BettaFish`) → 它的内容获取是子模块
[MediaCrawler](https://github.com/NanmiCoder/MediaCrawler)（已 clone 到 `D:\dev\MediaCrawler`）。
覆盖平台：`xhs 小红书 / dy 抖音 / ks 快手 / bili B站 / wb 微博 / tieba 贴吧 / zhihu 知乎`
—— **这正是 SearXNG 覆盖不到的中文源**。

⚠️ **哥的关键纠正**：「是不是纯 HTTP 无所谓的，node 的能力还没有那么弱鸡」。
我原来把"纯 HTTP 能抓"当成筛选条件，是自我设限。Node 能跑 native 模块、
能驱动浏览器（CDP/Playwright）、能实现签名算法；而且**本机 Chrome 是现成的**
（DSH 自带 browser bridge，我在 dsh-reader 项目里也用 CDP 做过测试）。
所以方向④应当用 **CDP 驱动本机 Chrome** 去抓需要渲染/登录的平台，
不要因为"需要浏览器"就放弃。

**下一步**：先用 CDP 试抓知乎/小红书/抖音的搜索结果页（各平台难度差异大，
先摸清哪些不登录就能搜），再决定加哪几个引擎。

## 已达成的三处根因修复（commit 0f17b8d）

### 1. 引擎选择
- **原来**：通用引擎条件是 `if (!flags)` → `queryType: "general"` 反而**丢掉 Google/百度/Startpage**，
  只剩 pubmed/igdb/openweather 这类垂直引擎；无 flags 则是 201 个引擎一锅烩。
- **现在**：`!flags` 与 `general` 统一语义；垂直引擎按类型隔离（对齐 SearXNG 的 category）；
  再加 `GENERAL_ENGINE_NAMES` 精选名单收敛到 40+ 个。
- ⚠️ 教训：我第一版脚本把 `!flags || X` 机械改成 `isType("X")`，**反而把 Wikipedia/GitHub/MDN/新闻
  挤出通用搜索**（召回变窄）。正解是 `isGeneral || isType("X")`，收敛只由白名单一处负责。

### 2. 过度截断（哥指出的最大问题）
- 默认输出 8 → **30**，上限 50 → **200**。
- stats 现在报漏斗：`召回 282 → 去重 265 → 合并 233 → 显示 20`。

### 3. 排序
- 对齐 SearXNG `calculate_score`：**权重连乘 × 命中次数线性放大**（原来 `1+0.2(n-1)` 饱和增长，共识失效）。
- 文本相关性从**加法**改**乘法**（原来最大 +3.0 而基础分仅 ~1，等于让"碰巧含查询词"压过共识）。
- CJK 用 **bigram** 切分（原来 `split(/\s+/)` 对中文完全失效 → 中文查询相关性恒为 0）。

### 4. 代理分流（重要 bug）
- **undici 6.x 的 `ProxyAgent` 没有 `noProxy` 参数** —— 原来传的被**静默忽略**，
  所有请求（含百度/360/豆瓣/微博）全被塞进代理。改用 `EnvHttpProxyAgent`。
- 连通性实测（这张表是决定分流依据的）：

| 站点 | 直连 | 代理 | 结论 |
|---|---|---|---|
| so.com / douban / weibo | 200 | **000** | 必须直连 |
| sogou | 200 | 302 | 直连 |
| ddg / google / wikipedia | **000** | 200/202/301 | 必须走代理 |
| bing / baidu | 302 | 200/302 | 都行 |

## 已完成：SearXNG 候选引擎（commit c145dc4）

- `src/search/engines/searxng.ts` + selector 三处注册 + `docs/searxng.md`
- **定位：可选**。不部署照常工作（端口没服务立刻 ECONNREFUSED，不等超时；
  熔断器还会跳过它），部署了召回明显提升。
- **关键设计**：把 SearXNG 结果的 `engines` 数组**展开成多条**，
  于是我们的 URL 去重与共识评分原样生效（`positions.length` = 命中几个上游引擎）。
  实测引擎分布：`searxng:brave 8 / quark 6 / google 5 / bing 4 / yandex 3`。

## 已完成：中文相关性区分度（commit 2298262）

实测「设计师兼程序员怎么赚钱」，无关结果排 2~4 名（BrainyQuote、法语出版站）。
根因：中文 bigram 把长查询切成 9 个词项，相关结果常只命中 1 个→`rel≈0.11`，
无关是 0，经 `score *= 0.15+0.85*rel` 后只差 0.24 vs 0.15，排序退化成纯共识分。

三处改动：
1. `relevance` 补**中文字符覆盖率**，与词项命中率**取较大者**
   （两者擅长的情况不同，加权平均会互相稀释）。
2. 排除**中文高频虚字**（怎/么/的/是…）—— 「怎么利用AI赚钱」里两个虚字
   会让任何含「怎么」的文本都拿高分。只收最没歧义的一批
   （中/上/下/能/会 有实义，不排除）。
3. 相关性**下界 0.15 → 0.05**：无关 ×0.05 vs 相关 ×0.37，差 7 倍（原来只差 2 倍）。
   保留非零下界是为了算法误判时不至于全军覆没。

回归测试：`bun scripts/check-relevance.ts`（13 条手工用例，纯函数秒出，无关用例要求 ≤0.05）。

## 已知遗留：SEO 垃圾页

「怎么利用AI赚钱」的第 2 名是 `linkedin.com/company/vikkai`，
标题**恰好等于查询词**、摘要为空 —— 算法认为它高度相关（标题完全匹配确实是强信号），
但内容是聚合页/无价值页。

**可能的修法**：摘要为空的结果打个折（SEO 垃圾页往往没有有效摘要；
实测 LinkedIn 公司页、应用商店页都是这样）。但要小心真·内容页也可能没摘要。

## 参考 SearXNG 得到的硬结论（2026-09-16）

> ⚠️ **不要把 SearXNG 接成运行时依赖**。哥明确否掉了这条路：
> 让用户装完 DSH 还要装 Python + SearXNG 是不可接受的部署负担。
> 它的价值是**当参考实现来读**（源码已在 `D:\dev\searxng`，可随时查）。

### 1. Google 抓不到的根本原因：TLS 指纹

SearXNG 的 `searx/engines/google.py` 用三招（文件头注释写得很清楚）：
```python
params["url"] = f"https://www.google.com/wml/search?..."
params["headers"]["User-Agent"] = random.choice(nokia_useragents)   # Nokia 手机 UA
params["impersonate"] = "chrome99_android"                          # ← 关键
```
前两招我照搬试过（curl + Nokia UA + `/wml/search`），**返回 302 → `/sorry/index`**
（Google 的"异常流量"页，带 `x-hallmonitor-challenge` 头）。
所以拦住我们的是第三招：**TLS 指纹伪装**（curl_cffi 的能力，Node/undici 做不到）。

> 顺带纠正一个认知：**UA 不是障碍**。实测脚本 UA 与 Chrome UA 的响应
> 完全一样（google 都是 200/92KB）。真正卡住的是 TLS 层。

### 2. SearXNG 本机实例的实际战果（只作对照基准）

| 查询 | 工作的引擎 |
|---|---|
| react virtuoso prepend | google 10 + yandex 15 + bing 10 + quark 9 = 42 条 |

**这几个引擎里，bing/yandex/quark 值得逐个验证"是否真的需要 TLS 指纹"** ——
如果需要，就放弃；如果不需要，照搬 SearXNG 的请求参数就能修好。

### 3. 从它源码里学到的、已经用上的东西

- 排序：`calculate_score` 的权重连乘 × 命中次数线性放大 → 已进 `aggregator.ts`
- 引擎隔离：按 category 分而不是一锅烩 → 已进 `selector.ts` 的 `isGeneral/isType`
- `keep_only` 不会启用 `disabled: true` 的引擎（配置坑）→ 见 `D:\dev\searxng\README-dsh.md`

### 4. 下一步该做的（符合"参考而非依赖"）

1. 逐个验证 bing / yandex / quark / mojeek / marginalia 在**普通 Node fetch** 下能否抓到。
   能抓到的照 SearXNG 的参数与解析方式修我们的引擎（这些是**纯代码改动**，无部署负担）。
2. 抓不到的（google/baidu/sogou）如实接受，不再投入 —— 把力气花在能拿到的召回上。
3. 把"哪些引擎实际可用"反映到 stats 里，让每次搜索都能看出召回来源。

## 当前瓶颈：反爬（不是配置）

实测 46 个引擎里只有 4~7 个真正返回结果。分工：
- **能工作**：github-issues、npm、bing、sogou（时好时坏）、yandex、github、duckduckgo（易被挑战）
- **报 Transport error**：360search、douban、weibo（直连 200 但 undici 119ms 就失败 → TLS/UA 层面被拒）
- **静默 0 条**（请求成功但解析不到）：baidu、zhihu、google、brave、startpage、wikipedia、mdn、hackernews…

> `curl` 直连 douban 得到 200，而 undici 直连失败 —— 说明差异在 **TLS 指纹 / 请求头**，
> 不是网络。这是下一步要啃的方向。

## 下一步（按价值排序）

1. **提高单引擎召回量**：bing 配了 `maxResults: 50` 却只回 10 条 → 解析器只取了第一页。
   把能工作的几个引擎的召回拉满，比修 10 个失败引擎更有效。
2. **中文引擎**（对哥的查询最关键）：sogou/baidu/360/zhihu 的请求头与解析器需要逐个看。
   连通性没问题，是反爬与解析。
3. **DDG 稳定性**：`202` = 挑战页（历史坑：POST 会 202、GET 才 200）。
   被挑战后应冷却而不是立即重试。
4. 引擎健康度应在 stats 里体现，让调用方知道"这次有多少引擎真的工作了"。

## 排查工具（已留在仓库）

- `scripts/diagnose-engines.ts` —— 逐引擎成败明细（**必须用 node 跑**，bun 不认 undici dispatcher）
- `scripts/list-selected-engines.mjs` —— 看不同 flags 下选了哪些引擎
- `scripts/verify-proxy-bypass.mjs` —— 验证 noProxy 分流是否生效
- `DSH_WEBSEARCH_DEBUG=1` —— 真实运行时把引擎级明细打到 stderr
