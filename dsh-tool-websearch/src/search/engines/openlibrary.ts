/**
 * Open Library 图书搜索引擎适配器
 *
 * 搜索 Open Library 上的书籍。
 * API: https://openlibrary.org/search.json?q=QUERY&limit=N
 *
 * 参考 SearXNG: searx/engines/openlibrary.py
 * 零风险：公开 API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const API_URL = "https://openlibrary.org/search.json"
const BASE_URL = "https://openlibrary.org"
const USER_AGENT = "opencode-search/1.0"

export function makeOpenLibrary(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchOpenLibrary(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchOpenLibrary(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(numResults, 50)),
      fields: "*",
    })

    const response = yield* http.execute(
      HttpClientRequest.get(`${API_URL}?${params.toString()}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parseOpenLibraryResults(raw, numResults)
  })
}

interface OpenLibraryBook {
  key?: string
  title?: string
  author_name?: string[]
  first_publish_year?: number
  isbn?: string[]
  subject?: string[]
  first_sentence?: string[]
  lending_identifier_s?: string
}

function parseOpenLibraryResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { docs?: OpenLibraryBook[] }
  const books = data?.docs
  if (!Array.isArray(books)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const book of books) {
    if (results.length >= maxResults) break
    if (!book.title || !book.key) continue

    const url = `${BASE_URL}${book.key}`
    const authors = book.author_name?.slice(0, 3).join(", ") || ""
    const year = book.first_publish_year || ""
    const firstSentence = book.first_sentence?.[0] || ""

    const parts: string[] = []
    if (authors) parts.push(authors)
    if (year) parts.push(String(year))
    if (book.isbn?.length) parts.push(`ISBN: ${book.isbn[0]}`)

    // 封面图片
    let thumbnail: string | undefined
    if (book.lending_identifier_s) {
      thumbnail = `https://archive.org/services/img/${book.lending_identifier_s}`
    }

    pos++
    results.push(
      makeSearchResult({
        title: `${book.title}${year ? ` (${year})` : ""}`,
        url,
        snippet: parts.join(" · ") || "Open Library book",
        engine: "openlibrary",
        position: pos,
        publishedDate: book.first_publish_year ? new Date(`${book.first_publish_year}-01-01`).getTime() : undefined,
        category: "books",
      }),
    )
  }

  return results
}

export * as OpenLibraryEngine from "./openlibrary"
