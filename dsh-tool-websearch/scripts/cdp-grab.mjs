/**
 * 用 CDP 驱动本机 Chrome 抓取渲染后的 DOM。
 *
 * ## 为什么需要它（方向四：收录 SearXNG 覆盖不到的站点）
 *
 * 知乎/小红书/抖音/微博这些平台，SearXNG 覆盖不到，我们用纯 HTTP 也抓不到：
 * 它们要么要登录态、要么靠 JS 渲染结果、要么有签名校验。
 * 而**本机就有 Chrome**，用 CDP 驱动它等于"用一个真实浏览器去访问" ——
 * 这是 Node 侧完全做得到的事（不必引入 Playwright 这类额外依赖）。
 *
 * ## 用法
 *
 *   node scripts/cdp-grab.mjs <url> [waitMs] [--direct]
 *
 * 前置：先用 `--remote-debugging-port=9222` 起一个 headless Chrome
 * （见 docs/ 或本文件末尾的命令）。
 *
 * 这个脚本先用作**调研工具**：判断某个平台能不能抓到、抓到的是什么，
 * 再决定要不要为它写正式引擎。
 */

const CDP = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9222'

const url = process.argv[2]
const waitMs = Number(process.argv[3] ?? 4000)

if (url === undefined) {
  console.error('用法: node scripts/cdp-grab.mjs <url> [waitMs]')
  process.exit(1)
}

/** 打开一个标签页并返回它的调试目标信息 */
async function newTarget(pageUrl) {
  // 新版 Chrome 要求用 PUT 创建标签页（GET 会 405）
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' })
  if (!res.ok) throw new Error(`创建标签页失败: HTTP ${res.status}`)
  return res.json()
}

/** 在标签页上执行 CDP 命令（走 WebSocket） */
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  const pending = new Map()
  let nextId = 0

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
    setTimeout(() => reject(new Error('WebSocket 连接超时')), 10_000)
  })

  ws.addEventListener('message', (ev) => {
    let msg
    try {
      msg = JSON.parse(ev.data)
    } catch {
      return
    }
    const resolve = msg.id === undefined ? undefined : pending.get(msg.id)
    if (resolve !== undefined) {
      pending.delete(msg.id)
      resolve(msg.result)
    }
  })

  return {
    send(method, params) {
      return new Promise((resolve) => {
        const id = ++nextId
        pending.set(id, resolve)
        ws.send(JSON.stringify({ id, method, params }))
      })
    },
    close() {
      try {
        ws.close()
      } catch {
        // 关闭失败无所谓，Chrome 会自己回收
      }
    },
  }
}

const target = await newTarget(url)
const client = await connect(target.webSocketDebuggerUrl)

try {
  await client.send('Page.enable')
  await client.send('Page.navigate', { url })
  // 给页面留出执行 JS / 发请求的时间。这里刻意用固定等待而不是等
  // loadEventFired —— 结果往往是加载完再异步填充的。
  await new Promise((r) => setTimeout(r, waitMs))

  const res = await client.send('Runtime.evaluate', {
    expression: 'document.documentElement.outerHTML',
    returnByValue: true,
  })
  const html = res?.result?.value ?? ''

  const title = await client.send('Runtime.evaluate', {
    expression: 'document.title',
    returnByValue: true,
  })

  console.log(`URL: ${url}`)
  console.log(`标题: ${title?.result?.value ?? ''}`)
  console.log(`DOM 长度: ${html.length}`)

  // 几个通用信号，用来快速判断"抓到了什么"
  const signals = {
    '登录墙': /登录|登陆|sign in|log in|请先登录/i,
    '验证码/风控': /验证码|captcha|安全验证|异常流量|unusual traffic/i,
    '要求JS': /enable javascript|需要启用.*javascript|noscript/i,
    '结果容器': /search-result|search_result|SearchResult|feed|list-item|result-item/i,
    '链接数': /<a\s[^>]*href="https?:/gi,
  }
  for (const [label, re] of Object.entries(signals)) {
    const m = html.match(re)
    console.log(`  ${label}: ${m === null ? 0 : m.length}`)
  }

  console.log(`\n--- 纯文本前 400 字 ---`)
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  console.log(text.slice(0, 400))
} finally {
  client.close()
  // 关掉这个标签页，别在用户的 Chrome 里留一堆垃圾页
  await fetch(`${CDP}/json/close/${target.id}`).catch(() => undefined)
}
