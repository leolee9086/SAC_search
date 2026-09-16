# SearXNG 作为候选引擎（可选）

> **这是可选的**。不部署它，`web_search_meta` 照常工作；部署了它，召回质量会明显提升。

## 为什么会有这个选项

我们自己的引擎抓不住几个主流搜索：Google 返回的是 JS 跳转壳
（90KB 响应里 `/url?q=`、`data-ved`、`<h3>` 出现次数**全为 0**），
百度/搜狗直接要验证码。根因是 **TLS 指纹** —— SearXNG 的 google 引擎靠
`impersonate = "chrome99_android"`（curl_cffi）伪装成 Chrome，这是 Node 侧做不到的。
（顺带纠正一个常见误判：**UA 不是障碍**，实测脚本 UA 与 Chrome UA 的响应完全一致。）

SearXNG 有专职维护者持续跟进各家反爬，所以让它做上游、我们只负责排序，
是分工而不是妥协。

## 效果对照（同一查询，实测）

| 查询 | 不部署 SearXNG | 部署后 |
|---|---|---|
| 设计师兼程序员怎么赚钱 | CSDN 1 条模糊 + 搜狐 2 条 + 无关 GitHub 项目 | 掘金「程序员赚钱案例库」、程序员客栈接单平台、知乎/CSDN 多篇 |
| react-virtuoso prepend | 表情包、日本漫画、翻译页 | 42 条（google 10 + yandex 15 + bing 10 + quark 9） |

## 不部署时的开销

**接近于零**：本机端口没服务会立刻 `ECONNREFUSED`（不会等到 25 秒超时），
而且 executor 的熔断器在连续失败后会自动跳过它。所以它被无条件放进引擎列表是安全的。

## 部署（Windows）

```powershell
# 1. 克隆（Windows 必须 sparse-checkout：utils/ 下有文件名带冒号，
#    Windows 文件系统不允许，不排除会直接 checkout 失败）
git clone --depth 1 https://github.com/searxng/searxng.git D:\dev\searxng
cd D:\dev\searxng
git sparse-checkout init --cone
git sparse-checkout set searx
git checkout

# 2. 虚拟环境 + 依赖
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m pip install tzdata
```

### Windows 适配（两个文件放 `.venv/Lib/site-packages/`，**不改上游源码**）

不改源码是有意的：SearXNG 的引擎反爬更新频繁，改了将来 `git pull` 必冲突。

1. **`pwd.py`** —— Windows 没有 Unix 的 `pwd` 模块，而 `searx/valkeydb.py`
   顶部就 `import pwd`，整个服务起不来。那个 import 实际只用于日志打印用户名，
   给个最小实现即可（顺带补上 Windows 缺失的 `os.getuid`）。
2. **`sitecustomize.py`** —— 强制 asyncio 用 `WindowsSelectorEventLoopPolicy`。
   Windows 默认的 Proactor 事件循环不实现 `add_reader`，curl_cffi 会退化到
   不可靠的兜底路径。`sitecustomize.py` 由解释器自动导入，怎么启动都生效。
3. `tzdata` 包 —— Windows 的 Python 没有时区库，缺了报
   `ZoneInfoNotFoundError: 'Asia/Shanghai'`。

### 配置要点（每个都踩过）

```yaml
use_default_settings:
  engines:
    keep_only: [google, bing, yandex, quark, brave, ...]

# ⚠️ 最容易上当的坑：keep_only 只决定"可用列表里保留谁"，
#    它**不会把默认 `disabled: true` 的引擎打开**。
#    实测 keep_only 列了 22 个、/config 显示 19 个"已启用"，
#    但真正跑的只有默认启用的 9 个，能出结果的只有 brave ——
#    组合查询 1.1 秒返回 0 条、google/bing/yandex 连报错都没有（压根没执行）。
#    所以必须再写一段逐个 disabled: false：
engines:
  - name: google
    disabled: false
  - name: bing
    disabled: false
  # ...

server:
  port: 8899          # 别用 8888：本机 unsloth_studio 占着它，
                      # 撞端口报 WSAEACCES(10013)「socket 访问权限不允许」，
                      # 极易误判成防火墙问题
  limiter: false
  public_instance: false

outgoing:
  request_timeout: 10.0        # 默认 3.0 太短，墙外引擎全 timeout
  proxies:                     # 不配则所有墙外引擎 timeout
    http: http://127.0.0.1:7890
    https: http://127.0.0.1:7890

search:
  formats: [html, json]        # ⚠️ 必须显式加 json，默认只有 html
                               # （这也是公共实例普遍拿不到 JSON 的原因）
```

### 启动与验证

```powershell
$env:SEARXNG_SETTINGS_PATH = 'D:\dev\searxng\settings.yml'
cd D:\dev\searxng
.venv\Scripts\python.exe -m searx.webapp
```

```powershell
curl "http://127.0.0.1:8899/config"                    # 看启用了哪些引擎
curl "http://127.0.0.1:8899/search?q=test&format=json" # JSON 搜索
curl "http://127.0.0.1:8899/search?q=%21google+test&format=json"  # 单引擎排错
```

换地址/端口：设 `DSH_SEARXNG_ENDPOINT=http://host:port` 即可。

## 排查提示

- **缓存会骗人**：同一查询第二次会秒回缓存。排查引擎时**必须换新词**，
  否则会把"缓存里只有 brave"误判成"只有 brave 能工作"。
- 引擎被 CAPTCHA 后会 `suspended` 一段时间（百度 3600 秒），这段时间不再尝试。
- 已知不稳定：`brave` 密集查询会 `too many requests`；
  `sogou` 在 SearXNG 里有 bug（`AttributeError: resp.next_request`）；
  `360search` 偶发 SSL 证书校验失败。
