// lib/notice-rules.js — 提示规则:本插件声明「什么情况下该提醒模型做什么」。
//
// 分工(2026-09-22 与哥哥定的):
//   · 索引插件只给规则:一个纯数据数组,不知道谁在读,也不判断谁该提示;
//   · context_care 负责判断和发起:它取这个服务,接进规则引擎,命中后走 agent.inject。
//
// 规则形状与匹配语义见 @leolee9086/dsh-rule-engine 的 README。
// 要点:全部条件都是 AND(OR 写两条规则);id 与 order 必填;order 决定优先级。

/** 本插件注册的提示规则服务名。 */
export const NOTICE_RULES_SERVICE = "memoryNoticeRules";

/**
 * 提示规则。纯数据,不带函数——跨插件传函数既不能序列化也没法检查。
 *
 * 正则写成字符串(`/pattern/flags`),不传 RegExp 对象:规则要能跨边界、能序列化。
 *
 * @type {object[]}
 */
export const NOTICE_RULES = [
  {
    id: "memory-remember-request",
    order: 10,
    // 只看用户输入:助手自己说「记住」不该触发。
    placement: ["user"],
    when: { said: "/记住|记一下|记下来/" },
    action: {
      kind: "notify",
      by: "context-care",
      say: [
        "用户说了「记住」。",
        "",
        "如果他同时说清楚了要记什么,用 session_blocks_remember 把它写下来——",
        "那个工具不需要额外落盘,调用本身就把内容写进了会话流,以后搜得到。",
        "如果没说清楚要记什么,先问一句,不要替他猜。",
      ].join("\n"),
    },
    // 冷却 0:这是用户明确下的指令,每说一次就该提醒一次,时间不该挡它。
    // 「同一段输入不重复提醒」由 oncePerSurface 管 —— 冷却管的是时间,去重管的是内容,两回事。
    cooldownMinutes: 0,
    oncePerSurface: true,
  },
];
