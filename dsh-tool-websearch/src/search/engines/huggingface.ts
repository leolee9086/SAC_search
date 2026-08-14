/**
 * HuggingFace 搜索引擎适配器
 *
 * 搜索 AI/ML 模型、数据集、Spaces。
 * API: https://huggingface.co/api/{endpoint}?search=QUERY
 *
 * 参考 SearXNG: searx/engines/huggingface.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const BASE_URL = "https://huggingface.co"
const USER_AGENT = "opencode-search/1.0"

export type HuggingFaceEndpoint = "models" | "datasets" | "spaces"

export function makeHuggingFace(config: EngineConfig, endpoint: HuggingFaceEndpoint = "models"): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchHuggingFace(http, query, opts.numResults || config.maxResults, config.timeout, endpoint),
  }
}

function searchHuggingFace(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
  endpoint: HuggingFaceEndpoint,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      search: query,
      direction: "-1",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${BASE_URL}/api/${endpoint}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseHuggingFaceResults(raw, numResults, endpoint)
  })
}

interface HuggingFaceEntry {
  id: string
  likes?: number
  downloads?: number
  tags?: string[]
  description?: string
  createdAt?: string
  lastModified?: string
  pipeline_tag?: string
  library_name?: string
  author?: string
}

function parseHuggingFaceResults(raw: string, maxResults: number, endpoint: HuggingFaceEndpoint): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const entries = parsed as HuggingFaceEntry[]
  if (!Array.isArray(entries)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const entry of entries) {
    if (results.length >= maxResults) break

    const id = entry.id
    if (!id) continue

    const url = endpoint === "models"
      ? `${BASE_URL}/${id}`
      : `${BASE_URL}/${endpoint}/${id}`

    const parts: string[] = []
    if (entry.likes) parts.push(`${entry.likes} likes`)
    if (entry.downloads) parts.push(`${entry.downloads.toLocaleString()} downloads`)
    if (entry.pipeline_tag) parts.push(entry.pipeline_tag)
    if (entry.library_name) parts.push(entry.library_name)
    if (entry.tags?.length) parts.push(entry.tags.slice(0, 3).join(", "))

    const snippet = parts.join(" · ")
    const publishedDate = entry.lastModified
      ? new Date(entry.lastModified).getTime()
      : entry.createdAt
        ? new Date(entry.createdAt).getTime()
        : undefined

    pos++
    results.push(
      makeSearchResult({
        title: id,
        url,
        snippet: entry.description || snippet,
        engine: "huggingface",
        position: pos,
        publishedDate,
        category: "code",
      }),
    )
  }

  return results
}

export * as HuggingFaceEngine from "./huggingface"
