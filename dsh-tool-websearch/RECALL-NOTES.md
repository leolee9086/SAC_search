# 召回优化笔记（dsh-tool-websearch）

> 这个引擎主要给织自己用，**召回质量由织判定**。
> 泛化目标（哥给的）：设计师兼程序员怎么赚钱 / 妊娠糖尿病妈妈的全日菜谱 / 怎么利用 AI 赚钱。
> 更新时间：2026-09-16

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
