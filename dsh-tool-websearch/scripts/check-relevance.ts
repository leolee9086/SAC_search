/**
 * 验证相关性函数对"相关 / 无关"的区分度。
 *
 * 这是修「无关结果排进前几名」的直接检验 —— 纯函数，秒出结果，
 * 比每次跑完整搜索快得多。
 *
 * 用法：bun scripts/check-relevance.ts
 */
import { relevance, queryTerms } from '../src/search/aggregator.ts'

const CASES: Array<{ q: string; text: string; expect: 'high' | 'low'; note?: string }> = [
  // ── 中文长查询：这次要修的场景 ──
  { q: '设计师兼程序员怎么赚钱', text: '程序员副业赚钱指南 - 掘金', expect: 'high' },
  { q: '设计师兼程序员怎么赚钱', text: '作为一名设计师，如何开展自己的副业？月赚三万的真实故事', expect: 'high' },
  { q: '设计师兼程序员怎么赚钱', text: '独立开发者靠什么赚钱？ - 知乎', expect: 'high' },
  // 这几条是实测里错误排进前 4 名的
  { q: '设计师兼程序员怎么赚钱', text: 'Quote of the Day - BrainyQuote', expect: 'low', note: '实测排第 2' },
  { q: '设计师兼程序员怎么赚钱', text: 'Auto-édition gratuite de livres en ligne - TheBookEdition', expect: 'low', note: '实测排第 4' },
  { q: '设计师兼程序员怎么赚钱', text: 'Dujltqzv/Some-Many-Books', expect: 'low', note: '实测排第 3' },
  { q: '设计师兼程序员怎么赚钱', text: '🔀 Add Chinese patterns & costume/objects course markdown docs', expect: 'low' },

  // ── 英文查询：不能被改坏 ──
  { q: 'react virtuoso prepend', text: 'Prevent Scroll Jumping When Prepending New Items in React Table Virtuoso', expect: 'high' },
  { q: 'react virtuoso prepend', text: 'React Virtuoso | Virtuoso', expect: 'high' },
  { q: 'react virtuoso prepend', text: 'R410A Scroll Compressor Design Verification', expect: 'low' },
  { q: 'react virtuoso prepend', text: 'Continuous Scroll Speed App - App Store', expect: 'low' },

  // ── 短中文查询 ──
  { q: '妊娠糖尿病食谱', text: '妊娠糖尿病一日三餐食谱推荐（附热量表）', expect: 'high' },
  // 同属糖尿病话题但没提食谱 —— 算"部分相关"是合理的，不该要求它归零
  { q: '妊娠糖尿病食谱', text: '糖尿病患者用药指南', expect: 'high', note: '同主题、部分相关' },
]

/*
 * 阈值怎么定：
 *
 * 中文长查询的"相关"分数天然偏低（bigram 被切得碎，字符覆盖率也难拿高分），
 * 实测相关结果落在 0.20~0.35。所以 high 的门槛定 0.18 ——
 * 卡在 0.3 会把「作为一名设计师，如何开展自己的副业」这种
 * 明显相关的结果判成失败，那是阈值错了不是算法错了。
 *
 * 而"无关"这一侧要求很严（≤0.05）：实测无关结果全部是 0.000，
 * 这个门槛才真正能抓住"排错序"的回归。
 */
const HIGH_MIN = 0.18
const LOW_MAX = 0.05

let pass = 0
let fail = 0

console.log(`查询词项示例「设计师兼程序员怎么赚钱」→ ${queryTerms('设计师兼程序员怎么赚钱').join(' / ')}\n`)
console.log(`${'期望'.padEnd(6)}${'实际'.padEnd(8)}文本`)
console.log('-'.repeat(78))

for (const c of CASES) {
  const r = relevance(c.text, c.q)
  const ok = c.expect === 'high' ? r >= HIGH_MIN : r <= LOW_MAX
  if (ok) pass++
  else fail++
  const mark = ok ? ' OK ' : 'FAIL'
  console.log(
    `${mark} ${c.expect.padEnd(5)}${r.toFixed(3).padEnd(8)}${c.text.slice(0, 52)}`
    + (c.note !== undefined ? `   ← ${c.note}` : ''),
  )
}

console.log('-'.repeat(78))
console.log(`阈值：相关 ≥ ${HIGH_MIN}，无关 ≤ ${LOW_MAX}`)
console.log(`合计 ${pass + fail} 项，失败 ${fail} 项`)
process.exit(fail === 0 ? 0 : 1)
