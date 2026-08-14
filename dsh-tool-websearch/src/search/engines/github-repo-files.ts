/**
 * GitHub 仓库文件读取引擎
 *
 * 读取 GitHub 仓库中的文件内容作为参考上下文。
 * 端点: GET /repos/owner/name/contents/PATH
 *
 * 当 query 格式为 "owner/repo" 时，列出仓库根目录。
 * 当 query 格式为 "owner/repo:path/to/file" 时，读取指定文件。
 * 当 query 格式为 "owner/repo:path/to/dir" 时，列出目录。
 *
 * 此引擎专为"拉取项目参考上下文"场景设计，
 * 与 context7 ACP 工具的 resolve_library_id / get_library_docs 互补。
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_BASE = "https://api.github.com"
const RAW_CONTENT = "https://raw.githubusercontent.com"
const USER_AGENT = "opencode-search/1.0"

export function makeGitHubRepoFiles(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchGitHubRepoFiles(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

/**
 * 解析查询格式:
 * - "owner/repo" → 列出根目录
 * - "owner/repo:path" → 读取文件或目录
 * - "owner/repo:path?ref=branch" → 指定分支
 */
function parseQuery(query: string): { owner: string; repo: string; path: string; ref?: string } | undefined {
  // 移除可能的 ref 后缀
  let ref: string | undefined
  let mainQuery = query

  const refMatch = mainQuery.match(/\?ref=([a-zA-Z0-9_.\/-]+)$/)
  if (refMatch) {
    ref = refMatch[1]
    mainQuery = mainQuery.slice(0, refMatch.index)
  }

  // 解析 owner/repo:path
  const colonIdx = mainQuery.indexOf(":")
  let repoPart: string
  let path: string

  if (colonIdx >= 0) {
    repoPart = mainQuery.slice(0, colonIdx)
    path = mainQuery.slice(colonIdx + 1)
  } else {
    repoPart = mainQuery
    path = ""
  }

  const slashIdx = repoPart.indexOf("/")
  if (slashIdx < 0) return undefined

  const owner = repoPart.slice(0, slashIdx)
  const repo = repoPart.slice(slashIdx + 1)

  if (!owner || !repo) return undefined

  return { owner, repo, path: path.replace(/^\//, ""), ref }
}

function searchGitHubRepoFiles(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const parsed = parseQuery(query)
    if (!parsed) return []

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github.v3+json",
    }
    const token = process.env.GITHUB_TOKEN
    if (token) headers["Authorization"] = `Bearer ${token}`

    const { owner, repo, path, ref } = parsed
    let apiPath = `/repos/${owner}/${repo}/contents/${path}`
    if (ref) apiPath += `?ref=${ref}`

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_BASE}${apiPath}`).pipe(
        HttpClientRequest.setHeaders(headers),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseRepoContentsResults(raw, owner, repo, path, ref, numResults)
  })
}

interface GitHubFileItem {
  name?: string
  path?: string
  type?: "file" | "dir" | "symlink" | "submodule"
  size?: number
  sha?: string
  download_url?: string | null
  html_url?: string
  content?: string
  encoding?: string
}

/**
 * 解析 GitHub Contents API 响应
 * 可能是单个文件对象或目录数组
 */
export function parseRepoContentsResults(
  raw: string,
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  maxResults: number,
): SearchResult[] {
  let data: unknown
  try { data = JSON.parse(raw) } catch { return [] }

  const results: SearchResult[] = []
  let pos = 0

  if (Array.isArray(data)) {
    // 目录列表
    const items = data as GitHubFileItem[]
    // 区分文件和目录
    const dirs = items.filter((i) => i.type === "dir")
    const files = items.filter((i) => i.type === "file")

    // 目录优先，然后文件
    const sorted = [...dirs, ...files]

    for (const item of sorted) {
      if (results.length >= maxResults) break
      const name = item.name || ""
      const itemPath = item.path || ""
      const type = item.type === "dir" ? "📁" : "📄"
      const size = item.size ? `${(item.size / 1024).toFixed(1)}KB` : ""

      pos++
      results.push(
        makeSearchResult({
          title: `${type} ${name}`,
          url: item.html_url || `https://github.com/${owner}/${repo}/blob/${ref || "main"}/${itemPath}`,
          snippet: `${owner}/${repo}: ${itemPath}${size ? ` (${size})` : ""}`,
          engine: "github-repo-files",
          position: pos,
          category: "code",
        }),
      )
    }
  } else if (typeof data === "object" && data !== null) {
    // 单个文件内容
    const file = data as GitHubFileItem
    if (file.type === "file" && file.content) {
      // GitHub API 返回 base64 编码的内容
      const content = Buffer.from(file.content, "base64").toString("utf-8")
      const lines = content.split("\n")
      const totalLines = lines.length
      const previewLines = lines.slice(0, 50)
      const truncated = totalLines > 50

      pos++
      results.push(
        makeSearchResult({
          title: `📄 ${file.name || path}`,
          url: file.html_url || `https://github.com/${owner}/${repo}/blob/${ref || "main"}/${path}`,
          snippet: [
            `File: ${owner}/${repo}:${file.path || path}`,
            `Size: ${totalLines} lines${truncated ? ` (showing first 50 of ${totalLines})` : ""}`,
            `Language: ${extToLang(file.name || "")}`,
            "---",
            previewLines.join("\n"),
            truncated ? `... (${totalLines - 50} more lines)` : "",
          ].filter(Boolean).join("\n"),
          engine: "github-repo-files",
          position: pos,
          category: "code",
        }),
      )
    } else if (file.type === "dir" && Array.isArray(data)) {
      // 递归处理已由上面的 Array 分支处理
    }
  }

  return results
}

/** 从文件扩展名猜测语言 */
function extToLang(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  const map: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript JSX", js: "JavaScript",
    jsx: "JavaScript JSX", py: "Python", rs: "Rust",
    go: "Go", java: "Java", rb: "Ruby", php: "PHP",
    c: "C", cpp: "C++", cs: "C#", swift: "Swift",
    kt: "Kotlin", scala: "Scala", m: "Objective-C",
    sh: "Shell", bash: "Shell", zsh: "Shell",
    json: "JSON", yaml: "YAML", yml: "YAML",
    md: "Markdown", rmd: "R Markdown",
    css: "CSS", scss: "SCSS", less: "Less",
    html: "HTML", htm: "HTML", xml: "XML",
    sql: "SQL", r: "R", lua: "Lua",
    toml: "TOML", ini: "INI", cfg: "INI",
    dockerfile: "Dockerfile", makefile: "Makefile",
  }
  return map[ext] || ext.toUpperCase()
}

export * as GitHubRepoFilesEngine from "./github-repo-files"
