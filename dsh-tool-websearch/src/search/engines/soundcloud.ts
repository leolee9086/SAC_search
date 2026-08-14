/**
 * SoundCloud 音频搜索引擎适配器
 *
 * 使用 SoundCloud 搜索页面 HTML 解析。
 * https://soundcloud.com/search?q=KEYWORD
 *
 * 参考 SearXNG soundcloud.py 模式
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SEARCH_URL = "https://soundcloud.com/search"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"

export function makeSoundCloud(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) => searchSoundCloud(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchSoundCloud(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const response = yield* http.execute(
      HttpClientRequest.get(`${SEARCH_URL}?q=${encodeURIComponent(query)}`).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        }),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const html: string = yield* response.text
    if (!html) return []

    return parseSoundCloudResults(html, numResults)
  })
}

export function parseSoundCloudResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []
  let pos = 0

  // SoundCloud 搜索结果在 sound 列表中
  const itemRegex = /<li[^>]*class="[^"]*soundList__item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(html)) !== null) {
    if (results.length >= maxResults) break
    const url = match[1].startsWith("http") ? match[1] : `https://soundcloud.com${match[1]}`
    const title = match[2].replace(/<[^>]*>/g, "").trim()
    if (!title || !url) continue

    pos++
    results.push(makeSearchResult({
      title, url, snippet: "",
      engine: "soundcloud", position: pos, category: "music",
    }))
  }

  return results
}

export * as SoundCloud from "./soundcloud"
