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
  {
    id: "memory-idle",
    // order 比上面那条大:用户明说「记住」时那条措辞更贴切,先让它赢。
    order: 20,
    // 跟上面那条同一个 surface:提醒都发生在"用户刚说话"那一刻,不打断助手自己的输出。
    placement: ["user"],
    // idle 的语义是「**调用过**这个工具,但已经过了 15 分钟」——
    // 引擎刻意让「从来没调用过」不命中,否则每个会话开头都会先响一次。
    when: { idle: { since: "session_blocks_remember", minutes: 15 } },
    action: {
      kind: "notify",
      by: "context-care",
      say: [
        "上一次用 session_blocks_remember 记东西,已经是 15 分钟以前了。",
        "",
        "回头看一眼这段时间里有没有值得留下的:踩过的坑、定下来的约定、临时结论、人的偏好。",
        "有就用 session_blocks_remember 记下来,注意这几件事:",
        "",
        "- q 写成以后真会拿来搜的措辞,不要写成总结标题 —— 索引是连续子串匹配,换个说法就找不到了。",
        "- a 只写结论,不写过程。",
        "- tag 给一两个检索用的关键字(如 环境/约定/踩坑/人),它是检索标签,不是分类。",
        "- perspective 三选一:superego(做事的方式)/ ego(与人相处的方式)/ id(本能的偏好),凭感觉标,不用纠结。",
        "",
        "确实没有值得记的就跳过 —— 不要为了回应这条提醒硬凑一条。",
      ].join("\n"),
    },
    // idle 的条件是「距离上次**记东西**多久」,不是「距离上次**提醒**多久」——
    // 不压冷却的话 15 分钟一过每一轮都满足条件。这里让它 15 分钟最多响一次。
    cooldownMinutes: 15,
    // 同一段用户输入只提醒一次:去重管内容,冷却管时间。
    oncePerSurface: true,
  },
];
