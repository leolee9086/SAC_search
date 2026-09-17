/**
 * 检查 DSH 页面里「元搜索」页签到底加载了没有。
 *
 * ## 为什么要专门写一个
 *
 * HTTP 层验不出来：鉴权发生在**路由匹配之前**，连不存在的路径都返回 401，
 * 所以"非 404 即存在"这种判据在这里失效。唯一能确认的办法是**在真实页面里找**。
 *
 * 它借用用户已登录的 Chrome profile（DSH 的凭证是绑定 authority 的签名 Cookie），
 * 在页面里执行几段查询，把结果打出来。
 *
 * 用法（先起 CDP：见文件末尾注释）：
 *   node scripts/check-metatab.mjs [url]
 */
const CDP = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9223'
const target = process.argv[2] ?? 'http://127.0.0.1:3080/'

/** 在页面里跑的一段代码：找入口按钮、页签、以及注册面是否可达 */
const PROBE = `(() => {
  const out = {};
  const text = document.body ? document.body.innerText : '';
  out.pageTitle = document.title;
  out.bodyLength = text.length;
  out.hasMetaSearchText = text.includes('元搜索');
  // 侧栏底部那一排按钮的文案，看看我们那一格在不在
  const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
  out.buttonLabels = buttons
    .map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim())
    .filter((s) => s.length > 0 && s.length < 30)
    .slice(0, 40);
  // 页签 chip 是否已经存在（要打开过才有）
  out.hasPaneTabSlot = !!document.querySelector('[data-slot="sidebar.right.pane.tab"]');
  out.hasFooterSlot = !!document.querySelector('[data-slot="sidebar.footer.action"]');
  return JSON.stringify(out);
})()`

async function newTarget(pageUrl) {
  const res = await fetch(`${CDP}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' })
  if (!res.ok) throw new Error(`创建标签页失败: HTTP ${res.status}`)
  return res.json()
}

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
        /* 关闭失败无所谓 */
      }
    },
  }
}

const page = await newTarget(target)
const client = await connect(page.webSocketDebuggerUrl)
try {
  await client.send('Page.enable')
  await client.send('Page.navigate', { url: target })
  // SPA 要等它自己把插件加载完
  await new Promise((r) => setTimeout(r, 12_000))

  const res = await client.send('Runtime.evaluate', { expression: PROBE, returnByValue: true })
  const raw = res?.result?.value
  if (typeof raw !== 'string') {
    console.log('探测失败：页面没有返回结果')
  } else {
    const info = JSON.parse(raw)
    console.log(`页面标题: ${info.pageTitle}`)
    console.log(`正文长度: ${info.bodyLength}`)
    console.log(`正文含"元搜索": ${info.hasMetaSearchText ? '是 ✓' : '否 ✗'}`)
    console.log(`sidebar.footer.action 槽位在 DOM 里: ${info.hasFooterSlot ? '是' : '否'}`)
    console.log(`sidebar.right.pane.tab 槽位在 DOM 里: ${info.hasPaneTabSlot ? '是' : '否（正常，要打开页签才有）'}`)
    console.log('页面上的按钮/入口文案（前 40 个）：')
    for (const s of info.buttonLabels) console.log(`   ${s}`)
  }
} finally {
  client.close()
  await fetch(`${CDP}/json/close/${page.id}`).catch(() => undefined)
}
