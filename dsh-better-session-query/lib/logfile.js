// lib/logfile.js — 落盘诊断日志。
//
// 为什么必须有:这个部署里进程 stdout 不落地,而索引失败原因这类诊断恰恰是"事后才要翻"的——
// 只写 stdout 等于没写。这里做一个有上限、单代轮换的追加日志,
// 并且**绝不**让日志反过来打断索引与检索的主流程(写失败一律静默)。
import { appendFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname } from "node:path";

/**
 * 造一个落盘日志器。
 * @param options - `{ path, maxBytes }`;path 为空串时返回空实现(显式关闭)。
 * @returns `{ write(message), path }`。
 */
export function createFileLog(options = {}) {
  const file = typeof options.path === "string" ? options.path.trim() : "";
  if (file === "") return { path: "", write() {} };
  const maxBytes = Number(options.maxBytes ?? 2 * 1024 * 1024);
  let dirReady = false;
  return {
    path: file,
    write(message) {
      try {
        if (!dirReady) {
          mkdirSync(dirname(file), { recursive: true });
          dirReady = true;
        }
        let size = 0;
        try {
          size = statSync(file).size;
        } catch {
          size = 0; // 首次写,文件还不存在。
        }
        if (size > maxBytes) {
          try {
            renameSync(file, `${file}.1`); // 单代轮换:写满就归档,不无限涨。
          } catch {
            // 归档失败(被占用等)就继续原文件追加,宁可暂时超限也不丢诊断。
          }
        }
        appendFileSync(file, `${new Date().toISOString()} ${message}\n`);
      } catch {
        // 日志写失败必须静默:它不能打断索引与检索。
      }
    },
  };
}
