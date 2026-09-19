# dsh-better-session-query

DSH 插件：给会话历史再挂一套**块级并行索引**。

官方 `@deepseek-ai/dsh-session-query-sqlite` 的索引单元是**事件**——一条事件抽出一段文本、落成一行文档，命中只能回答"哪个会话的第几号事件"。本插件把粒度下沉到**块**：一条消息里的 text / reasoning / tool-call / tool-result 各自成块，块是索引行，于是"思考块里 2000~5000 字的块""某一段时间的 agent 消息"这类问题才可答。

三条硬边界：

- **不替换 provider。** 官方 `sessionQuery` 服务照旧由原插件提供，本插件只是它的消费者；两者可以同时开着（官方那套 `openAt: never` 也不影响本插件，因为它自己读会话日志）。
- **不改任何 DSH 源码。** 只通过运行时服务契约（注入 `sessionQuery`）读会话，不 import 任何 `@deepseek-ai/*` 包。
- **零运行时依赖。** 存储用 Node 自带的 `node:sqlite`（FTS5）。

## 能回答什么

| 问题 | 走哪条路 |
|---|---|
| 哪些块含这个词？ | 全文检索（FTS5 + bm25，字面短语；中文按**子串**召回，1 个字也能查） |
| **思考块里 2000~5000 字的块有哪些？** | 元数据查询：`blockTypes:["reasoning"]` + `lengthMin/lengthMax`（不走倒排，所以思考块查得到） |
| **某一段时间的 agent 消息有哪些？** | 元数据查询 + 事件级聚合：`granularity:"messages"`、`eventTypes:["assistant/message"]`、`timeFrom/timeTo` |
| **某个工作区里有哪些会话／内容？** | 工作区清单 `session_blocks_workspaces`；检索与查询都带 `workspace` 参数（工作区 = 会话头的 cwd） |
| **标题里含某个词的会话有哪些？** | `session_blocks_workspaces(groupBy="session", titleContains="…")`（标题在索引更新时落库，不是现取） |
| 这个块到底写了什么？ | 按块 id 取正文，或按 `sessionId + seq (+ path)` 读该事件的块 |

长度按 **Unicode 码点**计（不是 UTF-16 长度），时间就是事件自带的 **Unix epoch 毫秒**（`SessionEvent.time`）。

### 中文召回：存与查过同一个拆字变换

`unicode61` 不切分中文——"工作区甲的回答"整串是一个词项，查「回答」命不中。所以索引侧与查询侧对文本做**同一个**变换：每个 CJK 字两侧插入零宽空格（`\u200b`，`unicode61` 视其为分隔符、不出词项），于是每个汉字成为独立词项且位置连续，原来的字面短语匹配自然升级为**任意 ≥1 字的中文子串召回**。这与 s-forge 的自定义分词器同构——它那边 `fts5SiYuanTokenize()` 也是逐码点出词项，只是用 C 实现。

- 1 字（「答」）、2 字（「回答」）、3 字（「工作区」）都能命中；改造前只有整串能命中。
- **英文行为刻意不变**：`hello` 命中、`ell` 不命中（不做英文子串召回）。
- 必须**逐字两侧**隔离，不能只在相邻汉字之间插：`🙂工作区`、`DSH工作区索引`、`第2个工作区` 里的「工作」否则一个都命不中（emoji/拉丁/数字也是 token 字符）。
- 精度变化：中文从"整段等值"变成"子串包含"——搜「苹果」也会命中「苹果酱」；单字查询会很宽，建议配小 `limit`。
- 代价：索引体积 +14%（中英混排）～+71%（纯中文）；写入慢一些；**升级后必须重建索引**（`STORE_SCHEMA_VERSION` 变了，`openStore` 会自动 DROP 派生表重建，不用手工删库）。
- 正文里本来就有的零宽空格会被归一化掉（它不可见）；读回与 snippet 都已反拆干净。

## 块模型

`lib/blocks.js` 把 DSH 自己的 `ContentBlockMap`（text / reasoning / image / file / tool-call / tool-result，可扩展）手写了一遍，不 import 它：

- 块身份 `blockId = <sessionId>#<seq>#<path>`；`path` 是块在事件里的位置，顶层 `"0"`/`"1"`，`tool-result` 的内层内容再往下取 `"3.0"`。已定稿事件里它是稳定的。
- `surface`（`current` / `log-only`）直接取官方 `listEvents` 给的结果，本插件不重算——不 import 它的实现，也不跟它抢语义。两次读取（`listEvents` 给 surface、`readSession` 给正文）之间会话还会继续写入，正文里多出来的新 seq 这一轮**跳过不产出**，等下一轮 records 追上再索引（指纹取自 records，所以下一轮必然重跑）；落在 records 范围内却缺 surface 属于两次读取对不上，**直接抛错**。不替拿不到的值编一个默认值：那会把「还没拿到」伪装成「已经不在表层」，而下游正是靠 `surface === "current"` 判断一条记忆是否还在眼前。
- 默认**入倒排**：text、tool-call、todo。
- 默认**不进倒排但可查可读**：reasoning（与官方"思考块不入索引"的语义一致，但正文单独存一份，长度与原文都还在）、tool-result 外壳、image/file（无正文，只登记元数据）。
- `tool/call` 事件默认不单独成块——助手消息里已经带了 tool-call 块，避免同一件事索引两遍（`include.toolCallEvent` 可打开）。

## 索引怎么建（后台更新）

`lib/indexer.js`。索引是**后台渐进**的（默认 `reconcileOnSearch: "background"` + 每 30s 一轮定时），检索永远不等它。一轮的边界由配置卡住：

1. `listSessions()` 列出逻辑会话（带 `live` / `persisted`），结果按 `listingTtlMs`（默认 15s）**缓存**——上千会话时它一次要好几秒。手动触发（面板按钮、`status {reindex:true}`）会强制取新鲜清单。
2. 选谁要检查：**从未索引的会话优先**（每轮至少留一半名额给它，否则已索引的实时会话会把名额吃光、backlog 永不前进）；其余按实时/`recheckMs`（默认 10 分钟）节流；单轮最多 `maxSessionsPerReconcile`（默认 25）个；读不出来的会话进 `failureCooldownMs` 冷却。
3. **变更令牌**（便宜路径）：`sessionPersistence.stat(id)` 只读会话头 + 一次文件 `stat`，返回的 `revision` 就是文件物理身份，**不读事件日志**。令牌与库里记的相同 → 直接放过，连轻量事件都不读。这是稳态下几乎零成本的原因。
4. 令牌不同或拿不到 → `listEvents(id)` 取轻量记录（seq / type / time / **surface**）算滚动哈希当指纹；指纹没变就顺手把新令牌补上。
5. 真变了 → `readSession(id)` 读完整事件，抽块，**整会话**在一个事务里差量替换；令牌**写成功之后**才落库（先记后写一旦失败，下一轮会因为"令牌没变"永远跳过该会话）。

**没有令牌时（服务缺席）**自动退回第 4 步的指纹路径，功能不降级，只是每轮要多读一次轻量事件。

**首次是冷启动全量**：索引里没有的会话都要走一遍 5 步（每个会话一次完整日志读取，这步省不掉——不读日志就没法建块）。所以第一次跑完 1489 个会话需要一段时间，之后每轮只处理真变了的。想立刻把某个会话拉进来，用 `session_blocks_list` 带上它的 id，或 `session_blocks_status {reindex:true}`。

## 存储布局

`node:sqlite` 一个库文件（默认 `<DSH_HOME>/session-blocks.db`），借的是 s-forge《后端性能瓶颈 Phase4》的结论：**倒排与过滤分离**。

```
block_fts       FTS5(text)                          只放正文，专职 MATCH 与 bm25
block_meta      会话/事件/块路径/类型/surface/时间/长度/cwd  过滤全落这里（按会话、类型+长度、事件+时间、cwd+时间建索引）
block_text      有正文但不进倒排的块（reasoning 等）      只付存储，不付倒排
indexed_sessions 每会话的 cwd、标题、修订指纹与检查时间   索引更新、工作区清单与按标题查会话的簿记
index_state     世代 + 更新时间                       游标与状态用
```

**工作区就是会话头的 `cwd`**（DSH 自己也是这么取 workspaceRoot 的：`header.cwd ?? sandboxPolicy.workspaceRoot`）。本插件把 `cwd` 从会话头抄进 `indexed_sessions` 与 `block_meta`，因此按工作区检索/清点都是一次等值过滤，不需要回会话头条目去找；匹配用 `COLLATE NOCASE`，因为 Windows 路径大小写不敏感。没有 cwd 的会话不会被丢掉，归到 `(无 cwd)` 桶里。

**包含与排除分两层，语义各管一段：**

- **索引层**（`includeWorkspaces` / `excludeWorkspaces` / `includeWithoutWorkspace`）：被排除的工作区**连日志都不读**，已经在索引里的会在下一轮索引更新里被清掉（索引更新摘要中的 `excluded` 就是清理条数），`reconcileOne` 精确刷新也不破例。白名单是**穷尽**的——列了白名单，没有 cwd 的会话就不在名单里；黑名单永远优先于白名单。
- **查询层**（工具与服务的 `excludeWorkspaces`）：临时收窄，不动索引。生成的谓词是 `(cwd IS NULL OR cwd COLLATE NOCASE NOT IN (…))`——**NULL 安全**，否则 SQL 里 `NULL NOT IN (…)` 求值为 NULL，会把"没有 cwd"的会话静默吞掉。
- 两层都按大小写不敏感 + 忽略尾部分隔符比较（`D:\work\` 与 `d:\WORK` 等价）。

正文不重复存：进倒排的块正文在 `block_fts`（按 rowid 等值取回），不进倒排的块正文在 `block_text`。库带自己的 `application_id`（`0x42535131`）与 schema 版本：打开时拒绝别人的库，认出是自己的派生库但版本不符就原地重建——**绝不碰 session 持久化（那是 JSONL，不是这个）**。

### 写入是差量的，追加走 O(1) 快路径

`replaceSession` 不再"整会话先删后插"，而是与该会话已索引的块逐块比对：新块 INSERT、正文变了就地 `UPDATE block_fts SET text=? WHERE rowid=?`、只有展示性元数据变了（如 cwd）就只更新 `block_meta`、没变的块**一行都不碰**。判定"没变"用正文指纹（长度 + 约 53 位哈希），等长改写也不会漏。

在此之上还有一条**追加快路径**：`indexed_sessions` 记着上一轮的水位（`tail_seq`）、尾部指纹（`tail_digest`）与块数（`carry`）。若这一轮"水位以下块数不变 + 尾部指纹不变 + 块开关配置不变"，就直接认定日志是追加写的——老块既不读也不比，只插水位之上的新块，**零元数据表读取**。日志被改写、块变少、块开关变了都会自动落回逐块比对的慢路径。

`npm run bench` 可复现（node 22.19 + `node:sqlite`，每轮追加 1 块，10 轮取均值）：

| 会话块数 | 改造前每轮 | 现在每轮 | 提速 | 走快路径 |
|---|---|---|---|---|
| 200 | 8.0ms | 0.21ms | 38.7× | 10/10 |
| 1000 | 32.3ms | 0.39ms | 83.4× | 10/10 |
| 3000 | 100.7ms | 0.43ms | 236.3× | 10/10 |

代价在**冷启动**（首轮把整会话写进索引）：拆字变换让 3000 块的会话从约 63ms 涨到约 141ms，索引体积也随之变大（中文占比重时更明显）。追加路径不受影响——它本来就只碰新增的那几个块。

### 体积：收缩出口与 WAL 参数

**删掉行不等于文件变小，而且只 VACUUM 也收不干净。** 实测（侦察，367 个真实会话/20.7MB 正文合成的库）：删掉按体积最大的 30% 会话后，库仍是 31.5MB；只 `VACUUM` 到 14.2MB；`optimize` + `VACUUM` 才是 **8.8MB**——中间差的 5.35MB 是 FTS5 段内死空间，只有 FTS 的 `'optimize'` 能放出来（`fts_data` 7.0MB → 1.7MB）。

所以有 `compact()`（服务方法 `ctx.sessionBlockQuery.compact()`、面板上的「回收空间」按钮、`POST /compact`）：

- **先** `INSERT INTO block_fts(block_fts) VALUES('optimize')`，**再** `VACUUM`；
- `vacuum: false` 只做前半段（便宜，约 4.7ms/MB），供卸载路径使用；
- **绝不放在检索热路径上**：`VACUUM` 不能在事务内跑、需要约 1× 临时空间且独占连接；`optimize` 还会先把文件撑大，必须紧跟页回收；
- `shouldCompact()` 给出"值不值得"的判断：`dbBytes > max(4MB, 文本字节 × 1.6)`；
- **schema 版本不符就地重建时会自动 VACUUM 一次**——这条最值钱：重建只是把页丢进 freelist，实测 65.8MB 的库 DROP 成 0 行后文件仍是 65.8MB，不回收就等于白占。
- 顺带：卸载（dispose）时若 `shouldCompact()` 为真，会做一次只 optimize 的轻量合并。

**WAL 的静息体积**也钉了两个 pragma（仅 WAL 模式）：`wal_autocheckpoint = 256` 与 `journal_size_limit = 1048576`。默认 `1000` 时实测静息 `-wal` 常驻 4.8MB，收到 256 变 2.2MB，再加 1MB 上限是 **1.0MB**（每库省约 3.8MB），写入耗时在噪声内。

**三个"看着该抄 s-forge 但别抄"的**（都实测过）：`page_size = 32768` 让体积 **+7.9%**；`synchronous` / `cache_size` / `temp_store` / `mmap_size` 在这个量级上量不出差别（写入 2021/2115/1798ms、2.2s 的重查询 1982–2608ms，全在噪声内）；external content 模式——它省掉的是"原文在 FTS 影子表里再存一遍"，而我们的正文**只存一份**，照搬反而 **+2.4%**。基线本身已经很紧：31.5MB / 20.7MB 正文 = 1.52×，其中 FTS 占 88%。

### 检索为什么快：排序必须交给 FTS5 原生 rank

`search()` 用的是 `ORDER BY rank`，**不是** `ORDER BY bm25(block_fts) ASC, m.time DESC`。差别是数量级的：只要排序键里有 bm25 表达式或跨表第二键，FTS5 就放弃自己的排序优化，计划退成 `SCAN block_fts VIRTUAL TABLE INDEX 0:M1` + `USE TEMP B-TREE FOR ORDER BY`——`LIMIT` 只能在"把**全部命中**物化进临时 B 树"之后生效。s-forge 的 `kernel/model/search.go:1960` 也是纯 `ORDER BY rank`。

另外两处配套，`npm run bench:search` 可复现（40k 块、命中 2000 条、每页 21 条）：

| 形状 | 耗时 | 计划 |
|---|---|---|
| `ORDER BY bm25(…) ASC, m.time DESC` | 13.4ms | `INDEX 0:M1` + **TEMP B-TREE** |
| `ORDER BY rank` | 3.5ms | `INDEX 32:M1`,无临时 B 树 |
| `ORDER BY rank` 但缺 `block_meta(fts_rowid)` 索引 | 161.5ms | `SCAN m`（每条命中全扫一遍元数据表） |

所以 `block_meta` 上有一个 `fts_rowid` 索引（JOIN 探测走它），`search()` 里也不再带恒真的 `searchable = 1` 谓词（JOIN 出来的行必然有 `fts_rowid`，那个谓词不筛掉任何行，只会干扰计划器选路）。丢掉跨表 tiebreak 的代价，用**当页内 JS 稳定重排**补回来：并列名次仍旧"新的在前"，只有跨页边界的并列次序可能与改造前不同。

## 模型工具

```
session_blocks_search(query="并发模型", sessionId?, workspace?, excludeWorkspaces?, blockTypes?, surface?, limit?, offset?)
session_blocks_query(granularity="blocks"|"messages", workspace?, excludeWorkspaces?, blockTypes?, eventTypes?, surface?, lengthMin?, lengthMax?, timeFrom?, timeTo?, orderBy?, descending?, limit?, offset?, withText?)
session_blocks_list(sessionId, seq?, limit?, offset?)
session_blocks_workspaces(groupBy="workspace"|"session", workspace?, titleContains?, limit?, offset?)
session_blocks_read(blockId) | session_blocks_read(sessionId, seq, path?)
session_blocks_sql(sql, limit?)
session_blocks_status(sessionId?, reindex?, force?)
```

例子：

```
# 思考块里 2000~5000 字的块
session_blocks_query(blockTypes=["reasoning"], lengthMin=2000, lengthMax=5000, orderBy="length")

# 昨天 10:00 到 12:00 之间的 agent 消息
session_blocks_query(granularity="messages", eventTypes=["assistant/message"], timeFrom="2026-09-13 10:00", timeTo="2026-09-13 12:00")

# 有哪些工作区、各有多少会话
session_blocks_workspaces()

# 只要 D:\work 这个工作区的会话与内容
session_blocks_workspaces(groupBy="session", workspace="D:\\work")
session_blocks_search(query="并发模型", workspace="D:\\work")

# 某条消息里的块原文
session_blocks_read(sessionId="session-xxxx", seq=42)
```

## 只读 SQL 通道：分析能力不内置，自己写语句

`session_blocks_sql` 在块索引库上执行**单条只读** `SELECT`/`WITH`（`INSERT`/`UPDATE`/`PRAGMA`/`ATTACH`/多语句一律拒绝；没写 `LIMIT` 会自动补一个上限）。索引结构是公开的，所以"某个统计口径"不需要等插件实现——写条语句就行：

| 表 | 内容 |
|---|---|
| `block_meta` | `block_id, session_id, cwd, seq, path, block_type, surface, event_type, time, length, searchable` |
| `block_text` | `block_id, text` —— **未进倒排块的原文**（`reasoning`、`tool-result` 外壳等） |
| `block_fts` | 倒排表，正文是**拆字变形**（中文逐字插了零宽空格），要原文请用 `block_text` 或 `joinCjk` |
| `indexed_sessions` | `id, cwd, title, revision, events, blocks, searchable, checked_ms` |

块 id 形如 `session-xxxx#seq#path`，**会话 id 是 `block_meta.session_id`**（不要拿 `indexed_sessions.id` 直接去等 `block_id`，那样永远 0 行——这条坑踩过）。

### 配方：查询带循环输出的思考块

判据与 context-care 的 `loop-guard` **同参**（末尾窗口内同一行重复 ≥15 次、占窗口 ≥20%、合格行数 ≥30），但**不由插件内置**——下面是可直接投喂 `session_blocks_sql` 的语句（完整版也在 `test/sql.test.mjs`）：

```sql
WITH RECURSIVE
split(block_id, n, line, rest) AS (
  SELECT bt.block_id, -1, '', bt.text || char(10)
  FROM block_text bt JOIN block_meta m ON m.block_id = bt.block_id
  WHERE m.block_type = 'reasoning'
  UNION ALL
  SELECT block_id, n + 1,
         substr(rest, 1, instr(rest, char(10)) - 1),
         substr(rest, instr(rest, char(10)) + 1)
  FROM split WHERE rest <> ''
),
lines AS (
  SELECT block_id, n, trim(line, char(9) || char(10) || char(13) || ' ') AS line
  FROM split WHERE n >= 0 AND length(trim(line, char(9) || char(10) || char(13) || ' ')) >= 3
),
per_block AS (SELECT block_id, COUNT(*) AS total FROM lines GROUP BY block_id),
ranked AS (
  -- 窗口必须这样取:按行号倒序排名后取前 80 条**合格行**。
  SELECT block_id, line, ROW_NUMBER() OVER (PARTITION BY block_id ORDER BY n DESC) AS rev FROM lines
),
tail AS (SELECT block_id, line FROM ranked WHERE rev <= 80),
counts AS (SELECT block_id, line, COUNT(*) AS cnt FROM tail GROUP BY block_id, line),
hits AS (
  SELECT c.block_id, c.line, c.cnt, p.total,
         ROW_NUMBER() OVER (PARTITION BY c.block_id ORDER BY c.cnt DESC) AS rn
  FROM counts c JOIN per_block p USING (block_id)
  WHERE c.cnt >= 15 AND c.cnt >= 0.2 * MIN(p.total, 80) AND p.total >= 30
),
best AS (SELECT block_id, line, cnt, total FROM hits WHERE rn = 1)
SELECT h.block_id, m.session_id, substr(s.title, 1, 30) AS title,
       h.line AS worst_line, h.cnt, h.total, m.length,
       CAST(ROUND(100.0 * h.cnt / MIN(h.total, 80)) AS INTEGER) AS pct
FROM best h
JOIN block_meta m ON m.block_id = h.block_id
LEFT JOIN indexed_sessions s ON s.id = m.session_id
ORDER BY h.cnt DESC;
```

两个坑（都是实测踩出来的，已写进回归测试）：

- **窗口不能写成 `n >= total - 80`**：`n` 是原始行序号、`total` 是合格行计数，夹杂短行/空行时窗口会远大于 80 行，于是"中段卡带、结尾正常"的块被误判成循环。必须用窗口函数取最后 80 条合格行——这也正是 loop-guard "循环总是拖在尾巴上"的语义。
- **占比分母是窗口长度**，即 `min(总合格行数, 80)`；写成 `total` 会在长块上把阈值放得过松。

实测（本机真实历史，索引覆盖 111/1489 会话时）：命中 20+ 个真实卡带思考块，全部来自一个会话，最严重的是某块末尾 80 行里 `go.` 重复 27 次（34%），更大规模的块里 `**做。**` 单块重复上千次——正是 DeepSeek V4 Flash 的"卡带"退化形态。阈值本身就是语句里的常量，想换口径（例如 `cnt >= 8`）改语句即可，不必改插件。

### 只读是引擎级强制，不只是"看开头"

最初这层只做**形状检查**（必须以 `SELECT`/`WITH` 开头、不含分号），实测发现真漏洞：SQLite 允许 `WITH … INSERT/UPDATE/DELETE`，**以 `WITH` 开头的写语句照样能落库**——探测时真的往里写进了一行。现在执行期间把连接切到 `PRAGMA query_only = 1`，由 SQLite 自己拒绝任何写/DDL/ATTACH，与语句长什么样无关；形状检查只保留下来尽早给出可读的错误信息。活库复验：同样的 `WITH … INSERT` 现在返回 `attempt to write a readonly database`，而重型递归 CTE（`GROUP BY` + 窗口函数、要落临时 B 树）照常跑通。

**残余风险（如实）**：没有语句超时。递归 CTE 若不收敛（例如漏掉终止条件），`node:sqlite` 是同步 API 且没有进度回调，会把事件循环占住——所以这个通道面向**可信作者**（本 agent），不是给不可信输入用的沙箱。


## 服务 API

插件同时提供 `ctx.sessionBlockQuery`（刻意不复用 `sessionQuery`，避免与官方 provider 抢注册）：

```js
await ctx.sessionBlockQuery.searchBlocks({ query, sessionId?, workspace?, blockTypes?, surface?, limit?, offset? })
await ctx.sessionBlockQuery.queryBlocks({ workspace?, blockTypes?, lengthMin?, lengthMax?, timeMin?, timeMax?, orderBy?, descending?, withText? })
await ctx.sessionBlockQuery.queryMessages({ workspace?, eventTypes?, timeMin?, timeMax?, limit?, offset? })
await ctx.sessionBlockQuery.queryWorkspaces({ limit? })
await ctx.sessionBlockQuery.querySessions({ workspace?, sessionId?, limit?, offset? })
await ctx.sessionBlockQuery.listBlocks({ sessionId, seq?, limit?, offset? })
await ctx.sessionBlockQuery.getBlock(blockId)
await ctx.sessionBlockQuery.sqlQuery({ sql, limit? })
await ctx.sessionBlockQuery.reconcile({ force?, sessionIds?, maxSessions? })
await ctx.sessionBlockQuery.stats()
```

`timeMin` / `timeMax` 是 epoch 毫秒；工具层的 `timeFrom` / `timeTo` 额外接受 ISO 串或 `YYYY-MM-DD HH:mm`。

## 界面监控（对照 s-forge）

原生右侧栏有一个「会话块索引」页签（侧栏底部也有入口按钮）。监控内容照 s-forge 那套组织——它给用户看的是索引状态 0 已索引 / 1 未索引、索引进度、待处理的索引队列、各库体积、订正状态，这里一一对应：

| s-forge | 本插件 |
|---|---|
| `Conf.DataIndexState`（0 已索引 / 1 未索引） | 状态点：空闲 / 正在索引 / 出错 + **覆盖率**（已索引会话 ÷ 会话总数） |
| 启动索引进度（树/块计数） | 进度条：`done/total`、百分比、当前会话、吞吐（会话/秒） |
| 索引队列长度 | **待索引会话数** + 本轮计划数与被单轮上限切掉的剩余 |
| `LogDatabaseSize`（按库打印体积） | 主库字节、WAL 字节、倒排与正文文本字节、每块均摊、分表行数 |
| 订正状态 / 上次索引 | 最近一轮摘要：列出 / 计划 / 更新 / 未变 / 失败 / 是否被取消 |
| 索引开关 | 生效配置摘要（库路径、索引更新模式、复查间隔、单轮上限、工作区白/黑名单、块开关） |

面板是**只读监控 + 两个真正需要人决定的动作**：后台服务自己会跟上进度，所以不给「跑一轮」这类机制按钮；剩下的开关是「暂停索引 / 继续索引」（暂停只掐**自动**更新：定时器与检索触发都停，在飞的一轮在下一个会话边界收尾；显式请求仍可执行）与「压缩索引占用」。要强制刷新某个会话，用工具（`session_blocks_list` 带 id，或 `session_blocks_status {reindex:true}`）。

**数据面**（宿主侧注册在 web 服务器上，**只服务本机 loopback**，非本机一律 403）：

```
GET  /session-blocks/monitor.json   一份完整快照
GET  /session-blocks/events         同一份快照的 SSE 流（每秒比对，有变化才推）
POST /session-blocks/reindex        手动更新一次索引（等价于 `session_blocks_status {reindex:true}`），body 可给 {"force":true}
POST /session-blocks/pause          暂停/继续后台索引，body 给 {"paused":true|false}
POST /session-blocks/compact        回收空间，body 可给 {"vacuum":false} 只做 FTS 段合并
```

改路径用配置 `monitor.path`；不需要界面就 `monitor.enabled: false`（宿主工具与服务照常工作）。

三件事要说清：

- **界面半边在 `lib/client.js`**（经典脚本 `window.__ModuleLoader__.load`，注册键 = 包名 `dsh-better-session-query`，只用基线模块 `react`），`package.json` 里靠 `dsh.client.platform: "web"` 声明。
- **它只在插件被装进 profile 之后才会出现**——现在这个包还没装（装它要改工作区外的 `$DSH_HOME/profiles/web`）。没装之前，宿主侧的 `session_blocks_status` 与 `ctx.sessionBlockQuery.monitor()` 仍然给同一份数据。
- 面板是**只读 + 一个触发按钮**，不做任何写入型配置修改。

## 配置

| 键 | 默认 | 说明 |
|---|---|---|
| `path` | `<DSH_HOME>/session-blocks.db` | 索引库；`:memory:` 表示不落盘（每次启动重建） |
| `journalMode` | `wal` | `wal`/`delete`/`truncate`/`persist` |
| `include` | 见上 | 逐类开关：`text` `reasoning` `toolCall` `toolResult` `todo` `turnEnd` `toolCallEvent` `images` `files` |
| `recheckMs` | `600000` | 冷会话复查间隔 |
| `maxSessionsPerReconcile` | `25` | 单轮索引更新上限 |
| `useTokens` | `true` | 用 `sessionPersistence.stat` 的文件物理身份做变更令牌（不读事件日志）；拿不到服务就自动退回指纹比对 |
| `listingTtlMs` | `15000` | 会话清单缓存；`0` = 每轮都重新取 |
| `failureCooldownMs` | `1800000` | 读不出来的会话的失败冷却，避免每轮白吃名额 |
| `includeCold` | `true` | 关掉就只索引实时会话 |
| `includeWorkspaces` | `[]` | 白名单：非空时**只**索引这些工作区（穷尽语义，没有 cwd 的会话也不收） |
| `excludeWorkspaces` | `[]` | 黑名单：这些工作区**连日志都不读**；已经在索引里的会在下一轮索引更新被清掉。黑名单优先于白名单 |
| `includeWithoutWorkspace` | `true` | 没有 cwd 的会话收不收（仅在白名单为空时生效） |
| `includeArchived` | `false` | 归档会话收不收。**默认不收**：归档只是工作区注册表里的一个 id 列表（`workspaceRegistry.archivedSessionIds`），日志原地不动、`listSessions()` 照样列出来，所以必须显式排除；已经在索引里的归档会话会被清掉，取消归档后下一轮自然回来 |
| `reconcileOnSearch` | `"background"` | 检索时怎么办：`"background"` 踢一轮后台（不等）/ `"await"` 同步等一轮 / `"off"` 不管 |
| `backgroundReconcileMs` | `30000` | 后台定时索引更新间隔；`0` = 关掉定时（库退化成按需打开） |
| `defaultLimit` / `maxLimit` | `20` / `100` | 检索返回条数 |
| `snippetTokens` | `24` | FTS5 snippet 的 token 预算 |
| `logFile` / `logMaxBytes` | `<DSH_HOME>/logs/session-blocks.log` / `2MB` | 诊断日志（stdout 不落地，诊断必须落盘）；`"off"` 关闭 |
| `monitor` | `{ enabled: true, path: "/session-blocks" }` | 界面监控数据面：关掉就不挂路由（宿主工具与服务不受影响） |

**没有 `openAt`。** 那是官方 `session-query-sqlite` 的配置词汇（shipped profile 用它关掉官方那套索引），本插件不抄它：启用后台索引更新就在加载时开库并把定时器接上——索引是后台渐进的过程，不能等"有人碰一下"才开始，否则每次重启都停在原地。不想要后台工作设 `backgroundReconcileMs: 0`；整个插件不要就在 profile 里禁用那一行。开库失败只记日志、不拒绝加载（一个后台索引不该把 profile 拖下水）。

## 安装

需要 Node.js **22.19.0 或更高版本**（`node:sqlite`）。

本包在 [SAC_search](https://github.com/leolee9086/SAC_search) 仓库的 `dsh-better-session-query/` 子目录里。开发时把该目录放进 `$DSH_HOME/plugins/`，或在 profile 里 link：

```
dsh-better-session-query/  # 会话块级并行索引
```

在该 profile 的 `cordis.patch.yml` 里挂载（已有 `insert` 列表时只追加这一项）：

```yaml
- insert:
    - id: dsh-better-session-query
      name: dsh-better-session-query
      config:
        # path 留空 = <DSH_HOME>/session-blocks.db;要关后台索引更新就设 backgroundReconcileMs: 0
        {}
```

包内已带 `cordis.patch.yml`，也可以直接作为 bundle 挂载：

```yaml
- name: dsh-better-session-query
```

重载插件或重启 DSH 后生效。它**不需要**改官方 `session-query-sqlite` 那一行：官方索引关着也能用。

## 已知边界

- 只有**被索引过**的会话才查得到；首次全量之前，没扫到的会话查不到（用 `session_blocks_list` 带 id 可以先把它拉进来）。
- 工作区按**会话头的 cwd 等值匹配**（大小写不敏感）：没有前缀/子目录归并，`D:\dev` 与其子目录里的会话算两个工作区；没有 cwd 的会话归 `(无 cwd)` 桶。工作区名没有独立实体——DSH 里工作区就是目录。
- **标题**在索引更新时批量取一次落库（`readTitleSnapshots`），改名会作为日志事件改变修订、下一轮自然刷新；取不到就只丢标题，不影响索引与检索。标题**不进倒排**，只做会话级片段过滤（`titleContains`，`%`/`_` 已转义），不能当全文检索条件；没有标题的会话照常返回，只是不显示标题。
- 思考块默认不进倒排：`search` 搜不到它，`query`（元数据）查得到、`read` 读得到。要让思考内容也能被检索，把 `include.reasoning` 打开并重建。
- 中文检索是**子串包含**语义（1 字起就能命中），不是整段等值：搜「苹果」也命中「苹果酱」；单字查询宽，建议配小 `limit`。英文仍是整词匹配。
- 改块开关（`include.*`）会让已索引块的 `searchable` 全变，追加快路径据此自动失效并落回逐块比对，所以不必手工重建；但改完那一次更新会明显更慢。
- 长度是块文本的码点数，含换行；空白块长度为 0。
- 时间来自事件自带的 `time`，不是文件写入时间；同一事件的所有块共享同一个时间。
- 检索不返回总命中数（省掉一次 COUNT），只有 `hasMore`。
- `node:sqlite` 在 Node 22.x 是实验特性，会打一条 ExperimentalWarning。
- 游标/世代目前只做到"库内世代号"这一级，没有实现官方那种跨页强一致；翻页用 `offset`。

## 测试

```sh
pnpm test        # node --test test/*.test.mjs
pnpm run bench   # node bench/write-bench.mjs —— 差量写入基准
pnpm run check   # node --check lib/*.js
```

14 个测试文件共 136 条：`blocks` 10 / `workspace` 7 / `title` 5 / `store` 25 / `indexer` 20 / `plugin` 19 / `async` 5 / `incremental` 8 / `cjk-recall` 8 / `monitor` 9 / `compact` 7 / `logfile` 5 / `sql` 6 / `client` 2。测试全部用假 ctx 与假 conversation 服务，不打网络、不读真实会话：块抽取、存储与过滤、差量写入、中文召回、后台更新（选批/令牌/清单缓存/失败冷却/归档排除/修订/节流/强制/错误隔离/工作区排除）、插件入口与工具的端到端文本输出、监控快照与路由守卫（含 loopback 403 与暂停路由）、库收缩与老版本库重建、只读 SQL 通道与循环判定语句、**界面半边的字典键一致性**（真加载 `lib/client.js`、抓出注册的 zh/en 字典比对，防"只改一份语言"这类漂移）。**不要在这个沙箱里用 `node --test`**（会 spawn 子进程被拦成 EPERM），逐个跑 `node test/xxx.test.mjs` 即可。

## 许可证

MIT
