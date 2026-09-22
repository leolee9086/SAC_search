// lib/passive-recall.js — 被动召回:用户说的话跟以前记过的某条对得上时,主动把它推出来。
//
// 解决的问题:主动召回(session_blocks_recall)要求模型先意识到「这里可能需要查」,
// 而缺的恰恰是那一环 —— 你不知道自己不知道。所以反过来:索引插件盯着当前上下文,
// 够格就通过 context_care 的通用通知通道推过去。
//
// 通道不认识「召回」,也不认识「分数」:分数是这里自己设门槛用的,够格就推、不够格就不推。
// 以后加向量召回,再注册一个源就行 —— 通道和 context_care 都不用改。

/** 注册到通知通道的源名。 */
export const RECALL_SOURCE_NAME = "passive-recall";

/** 默认配置;可被 cordis.patch.yml 的 config.passiveRecall 覆盖。 */
export const PASSIVE_RECALL_DEFAULTS = {
  enabled: true,
  // 用户输入短于这个长度就不查:太短的句子抽不出有意义的词,查了也是噪声。
  minChars: 8,
  // 得分门槛。bm25 原始值是负数、越小越相关,这里比的是取负之后的"越大越好"。
  // 先给保守值,跑一段时间按日志调。
  minScore: 1,
  // 一次最多带出几条记忆。
  limit: 3,
  // 同一条通知(同一批 blockId)多久内不重复推。
  cooldownMinutes: 10,
};

/**
 * 从一段话里抽关键词:连续汉字串(2 字以上)+ 英文数字词(3 字符以上)。
 * 不引分词器 —— 召回是"够格就推",多抽几个词只是多几条候选,后面的分数门槛会把关。
 * @param {string} text 用户说的话。
 * @returns {string[]} 关键词。
 */
export function extractKeywords(text) {
  const source = String(text ?? "");
  const found = [
    ...source.matchAll(/[\u4e00-\u9fff]{2,}/g),
    ...source.matchAll(/[A-Za-z0-9_]{3,}/g),
  ].map((match) => match[0]);
  return [...new Set(found)].slice(0, 8);
}

/**
 * 把命中的记忆排成给模型看的一段话。
 * @param {object[]} items 召回结果。
 * @returns {string} 注入正文。
 */
export function formatRecall(items) {
  const lines = items.map((item) => {
    const when = new Date(Number(item.time)).toISOString().slice(0, 10);
    return `- [${when}] ${item.q} → ${item.a}`;
  });
  return [
    "<被动召回>",
    "你以前记过这些,可能和刚才说的事有关:",
    ...lines,
    "(自动召回的,不是你主动搜的。要不要用、用哪条,你自己判断。)",
    "</被动召回>",
  ].join("\n");
}

/**
 * 造一个通知源。
 *
 * @param {object} deps
 * @param {() => Promise<{memory: object|undefined}>} deps.open 打开库;拿不到 memory 就这一轮不召回。
 * @param {object} [deps.config] 配置。
 * @param {(message: string) => void} [deps.log] 日志。
 * @returns {(context: object) => Promise<object[]>} 通知源。
 */
export function createPassiveRecallSource({ open, config = {}, log = () => {} }) {
  const settings = { ...PASSIVE_RECALL_DEFAULTS, ...config };
  return async function passiveRecall({ userText, sessionId }) {
    if (settings.enabled !== true) return [];
    const text = String(userText ?? "");
    if (text.length < settings.minChars) return [];
    const keywords = extractKeywords(text);
    if (keywords.length === 0) return [];
    const opened = await open();
    if (opened.memory === undefined) return [];
    const outcome = opened.memory.recall({ keywords, limit: settings.limit, sessionId });
    const strong = outcome.items.filter((item) => -Number(item.score) >= settings.minScore);
    if (strong.length === 0) return [];
    log(`被动召回:${keywords.length} 个关键词 → ${outcome.total} 条候选 → ${strong.length} 条够格`);
    return [{
      id: `passive-recall:${strong.map((item) => item.blockId).join(",")}`,
      text: formatRecall(strong),
      summary: `Passive recall (${strong.length})`,
      cooldownMinutes: settings.cooldownMinutes,
    }];
  };
}
