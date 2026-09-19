// bench/write-bench.mjs — 差量写入基准:同规模会话「首轮全量 + 逐次追加」的每轮耗时与写入量。
//
// 参照基线来自只读侦察报告(未优化前的整会话重写,node 22.19 + node:sqlite):
//   200 块 8.0ms / 1000 块 32.3ms / 3000 块 100.7ms(每轮整会话重写)
// 跑法:node bench/write-bench.mjs [会话块数,逗号分隔]
import { openStore } from "../lib/store.js";

const SIZES = (process.argv[2] ?? "200,1000,3000").split(",").map((value) => Number(value.trim())).filter((n) => n > 0);
const APPENDS = 10;
const BASELINE = { 200: 8.0, 1000: 32.3, 3000: 100.7 };

/** 造一个块(正文约 120 字,模拟真实消息块)。 */
function makeBlock(sessionId, seq, path, text) {
  return {
    id: `${sessionId}#${seq}#${path}`,
    sessionId,
    seq,
    path,
    type: "text",
    text,
    surface: "current",
    eventType: "assistant/message",
    time: 1700000000000 + seq,
    searchable: true,
    length: Array.from(text).length,
  };
}

function body(seq) {
  return `第 ${seq} 块的正文:`.padEnd(20, "字") + "索引把一条消息拆成块,块是索引行。".repeat(3);
}

const rows = [];
for (const size of SIZES) {
  const store = await openStore({ path: ":memory:" });
  const sessionId = `bench-${size}`;
  try {
    const blocks = Array.from({ length: size }, (_, seq) => makeBlock(sessionId, seq, "0", body(seq)));
    const cold = process.hrtime.bigint();
    const first = store.replaceSession({ sessionId, cwd: "D:\\dev", title: "基准", revision: "r0", events: size, blocks, now: 1 });
    const coldMs = Number(process.hrtime.bigint() - cold) / 1e6;

    let appended = 0;
    let updated = 0;
    let unchanged = 0;
    let fastRounds = 0;
    const started = process.hrtime.bigint();
    const current = [...blocks];
    for (let i = 1; i <= APPENDS; i += 1) {
      // 真·追加:在上一轮的结果上继续加,而不是回到初始列表(否则等于每轮丢掉上一轮的新块)。
      const seq = size + i;
      current.push(makeBlock(sessionId, seq, "0", body(seq)));
      const written = store.replaceSession({
        sessionId,
        cwd: "D:\\dev",
        title: "基准",
        revision: `r${i}`,
        events: size + i,
        blocks: current,
        now: 1 + i,
      });
      appended += written.inserted;
      updated += written.updated;
      unchanged += written.unchanged;
      if (written.fast === true) fastRounds += 1;
    }
    const appendMs = Number(process.hrtime.bigint() - started) / 1e6 / APPENDS;
    const base = BASELINE[size];
    rows.push({
      size,
      冷启动ms: coldMs.toFixed(1),
      每次追加ms: appendMs.toFixed(2),
      侦察基线ms: base === undefined ? "-" : base.toFixed(1),
      提速: base === undefined ? "-" : `${(base / appendMs).toFixed(1)}x`,
      新增块: appended,
      改动块: updated,
      追加快路径: `${fastRounds}/${APPENDS}`,
      没动块: `${unchanged}(${((unchanged / APPENDS / (size + APPENDS)) * 100).toFixed(1)}%/轮)`,
      块总数: store.stats().blocks,
    });
    if (first.inserted !== size) throw new Error(`首轮应写入 ${size} 块,实际 ${first.inserted}`);
  } finally {
    store.close();
  }
}

console.log(`node ${process.version} · 每轮追加 1 个事件(1 块),共 ${APPENDS} 轮\n`);
console.table(rows);
console.log("说明:冷启动 = 首轮把整会话写进索引;每次追加 = 之后每轮的对账写入。");
console.log("侦察基线 = 未优化前(整会话先删后插)在同样规模下的每轮耗时,来自只读侦察报告。");
