/**
 * 扫描所有引擎的 User-Agent，找出"一眼就会被搜索引擎拒"的那些。
 *
 * 动机：请求头配置看起来都齐全，但 UA 值是硬伤 ——
 * `opencode-search/1.0` 这种自报家门的字符串，任何有反爬的站点都会直接拒。
 * 这类问题批量扫一遍比逐个读文件快得多。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'src/search/engines'
const files = readdirSync(dir).filter((f) => f.endsWith('.ts'))

/** 看起来像真实浏览器的 UA */
const browserLike = (ua) => /Mozilla\/5\.0|AppleWebKit|Chrome\/|Firefox\/|Safari\//i.test(ua)
/** 自报家门的脚本 UA */
const scriptLike = (ua) => /opencode|search\/|bot|crawler|spider|node-fetch|axios|undici/i.test(ua)

const buckets = { browser: [], script: [], other: [], missing: [] }

for (const f of files) {
  const src = readFileSync(join(dir, f), 'utf8')
  // 抓 `const USER_AGENT = "..."` 或 `= \n  "..."` 两种写法
  const m = /USER_AGENT\s*=\s*\n?\s*["'`]([^"'`]+)["'`]/.exec(src)
  const name = f.replace(/\.ts$/, '')
  if (m === null) {
    // 没有自己的 UA（可能从别处导入或用默认）
    buckets.missing.push(name)
    continue
  }
  const ua = m[1]
  if (scriptLike(ua)) buckets.script.push([name, ua])
  else if (browserLike(ua)) buckets.browser.push(name)
  else buckets.other.push([name, ua])
}

console.log(`共 ${files.length} 个引擎文件\n`)
console.log(`=== 自报家门的脚本式 UA（${buckets.script.length} 个 —— 这些必然被拒）===`)
for (const [n, ua] of buckets.script) console.log(`  ${n.padEnd(22)} ${ua}`)
console.log(`\n=== 其它非浏览器 UA（${buckets.other.length} 个 —— 同样可疑）===`)
for (const [n, ua] of buckets.other) console.log(`  ${n.padEnd(22)} ${ua}`)
console.log(`\n=== 使用真实浏览器 UA（${buckets.browser.length} 个 —— 正常）===`)
console.log('  ' + buckets.browser.slice(0, 30).join(', '))
console.log(`\n=== 文件里没有 UA 定义（${buckets.missing.length} 个）===`)
console.log('  ' + buckets.missing.slice(0, 40).join(', '))
