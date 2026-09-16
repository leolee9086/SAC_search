/**
 * 中文分词与停用词 —— 用于**相关性判断**，不是做完整的中文分词器。
 *
 * ## 素材来源与为什么不精简
 *
 * 词典用**结巴（jieba）的完整 dict.txt**：34.9 万词、4.8MB。
 * 一开始我想精简成"高频词子集"来省体积，但那是自找麻烦 ——
 * 它随包发布在 `data/` 下，4.8MB 对本地文件是很小的量，
 * 而完整词典能切出专有名词（「金字塔原理」「妊娠糖尿病」这类），
 * 精简版会把它们切碎，反而伤相关性。
 *
 * 停用词表用社区维护的 cn_stopwords（746 词），同样随包发布。
 *
 * ## 为什么自己实现分词而不用现成的库
 *
 * Node 侧的中文分词库要么是 native 模块（`nodejieba` 要编译，部署负担），
 * 要么是 Python（更不可能）。而我们要的能力很窄：**把查询切成实义词**。
 * 正向最大匹配（FMM）对这个目的足够，且是纯函数、零依赖、可解释。
 *
 * ## 降级
 *
 * 词典或停用词文件读不到时，`segmentCjk` 返回 null，
 * 调用方退回原来的 bigram 方案 —— 功能降级但不崩。
 */
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

/** 词典里最长的词不会超过这个长度（用于限制匹配窗口） */
const MAX_WORD_LEN = 8

/**
 * data/ 目录的定位。
 *
 * 为什么要试多个候选：源码在 `src/search/` 下，而发布产物是
 * `lib/search.bundle.mjs`（单文件 bundle）—— 两者到 `data/` 的相对层级不同。
 * 与其在构建配置里绕，不如运行时按顺序探测，取第一个真实存在的。
 */
function resolveDataFile(name: string): string | null {
  const candidates = [
    new URL(`../data/${name}`, import.meta.url), // lib/search.bundle.mjs → data/
    new URL(`../../data/${name}`, import.meta.url), // src/search/xxx.ts → data/
  ]
  for (const url of candidates) {
    try {
      const p = fileURLToPath(url)
      if (existsSync(p)) return p
    } catch {
      // 非 file: URL（例如被打进某些宿主环境）时跳过
    }
  }
  return null
}

/**
 * 词典状态：undefined = 尚未尝试加载；null = 不可用（走 bigram 降级）
 */
let dict: Set<string> | null | undefined

/**
 * undefined = 尚未尝试加载（加载失败时会给一个空 Set —— "没有停用词"
 * 本身就是合理的降级，没必要再区分 null）
 */
let stopwords: Set<string> | undefined

/** 停用词表（懒加载）。只保留含中文的停用词 —— 纯数字/符号不该被剔掉，
 *  否则「2026年AI赚钱」里的年份会被当成停用词丢掉。 */
function getStopwords(): Set<string> {
  if (stopwords !== undefined) return stopwords
  const path = resolveDataFile("zh-stopwords.txt")
  if (path === null) {
    stopwords = new Set()
    return stopwords
  }
  try {
    const raw = readFileSync(path, "utf8")
    stopwords = new Set(
      raw.split("\n").map((w) => w.trim()).filter((w) => w !== "" && /[\u4e00-\u9fff]/.test(w)),
    )
  } catch {
    stopwords = new Set()
  }
  return stopwords
}

/**
 * 词典（懒加载 + 缓存）。
 *
 * 34.9 万词构建 Set 有一次性开销（几十到上百毫秒），所以不在模块加载时做，
 * 而是第一次真正要用分词时再做 —— 不搜中文查询的会话完全不会付这个成本。
 */
function getDict(): Set<string> | null {
  if (dict !== undefined) return dict
  const path = resolveDataFile("zh-dict.txt")
  if (path === null) {
    dict = null
    return dict
  }
  try {
    const raw = readFileSync(path, "utf8")
    const set = new Set<string>()
    for (const line of raw.split("\n")) {
      // 原格式是 `词 词频 词性`，我们只取词
      const sp = line.indexOf(" ")
      const w = sp === -1 ? line : line.slice(0, sp)
      if (w !== "") set.add(w)
    }
    dict = set.size > 0 ? set : null
  } catch {
    dict = null
  }
  return dict
}

/**
 * 逆向最大匹配分词（从后往前）。
 *
 * ## 为什么不用正向
 *
 * 正向最大匹配在下面这种句子上会切错，而且错得很伤：
 *   设计师兼程序员怎么赚钱
 *   → 正向：「设计师 / 兼程 / 赚钱」  ← 「兼程」（日夜兼程）吃掉了「兼」，
 *      导致「程序员」根本切不出来，而它恰恰是这条查询最关键的词
 *   → 逆向：「设计师 / 兼 / 程序员 / 怎么 / 赚钱」 ✓
 *
 * 原因是中文的**中心语在后**，从后往前扫更容易先锁定关键成分。
 * 这也是中文分词里 RMM 通常略优于 FMM 的原因。
 *
 * ## 已知不足
 *
 * 歧义切分仍会出错。真正严谨的做法是基于词频的动态规划（维特比），
 * 那需要把词频也带进词表、并做一次全切分搜索 —— 对"判断结果是否相关"
 * 这个用途来说收益不抵复杂度。先用 RMM，实测不够再说。
 */
function segment(text: string, dictionary: Set<string>): string[] {
  const out: string[] = []
  let end = text.length
  while (end > 0) {
    let matched = ""
    const maxLen = Math.min(MAX_WORD_LEN, end)
    for (let len = maxLen; len >= 2; len--) {
      const candidate = text.slice(end - len, end)
      if (dictionary.has(candidate)) {
        matched = candidate
        break
      }
    }
    if (matched !== "") {
      out.unshift(matched)
      end -= matched.length
    } else {
      out.unshift(text[end - 1]!)
      end -= 1
    }
  }
  return out
}

/**
 * 把一段中文切成**实义词**。
 *
 * 返回 null 表示词典不可用，调用方应退回 bigram 方案。
 * 单词（长度 1）会被丢掉：它们多是虚字或单字词，对相关性判断是噪声；
 * 停用词同样剔除。
 */
export function segmentCjk(text: string): string[] | null {
  const dictionary = getDict()
  if (dictionary === null) return null
  const sw = getStopwords()
  return segment(text, dictionary).filter((w) => w.length >= 2 && !sw.has(w))
}

/** 词典是否可用（供诊断/状态输出用） */
export function zhDictAvailable(): boolean {
  return getDict() !== null
}

/** 当前词典规模（供诊断用；未加载时返回 0） */
export function zhDictSize(): number {
  return getDict()?.size ?? 0
}
