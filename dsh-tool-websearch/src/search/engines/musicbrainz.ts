/**
 * MusicBrainz 音乐数据库搜索引擎适配器
 *
 * 搜索 MusicBrainz 上的音乐数据。
 * API: https://musicbrainz.org/doc/MusicBrainz_API
 * 公开 API，无需 key，有速率限制
 * 参考 SearXNG: 未直接收录，Discogs 模式参考
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const USER_AGENT = "opencode-search/1.0 ( musicbrainz )"

export function makeMusicBrainz(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchMb(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchMb(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(query)}&limit=${Math.min(numResults, 25)}&fmt=json`
    const response = yield* http.execute(
      HttpClientRequest.get(url).pipe(
        HttpClientRequest.setHeaders({ "User-Agent": USER_AGENT, Accept: "application/json" }),
      ),
    ).pipe(Effect.timeout(timeout))
    if (response.status < 200 || response.status >= 400) return []
    const raw = yield* response.text
    return parseMbResults(raw, numResults)
  })
}

interface MbArtist {
  id?: string
  name?: string
  type?: string
  country?: string
  disambiguation?: string
  tags?: Array<{ name: string }>
  "life-span"?: { begin?: string; end?: string }
}

function parseMbResults(raw: string, max: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  const data = parsed as { artists?: MbArtist[] }
  if (!data?.artists) return []
  return data.artists.slice(0, max).map((a, i) => {
    const tags = a.tags?.map((t) => t.name).join(", ") || ""
    const lifespan = a["life-span"]?.begin ? `(${a["life-span"].begin}${a["life-span"]?.end ? `-${a["life-span"].end}` : "-present"})` : ""
    return makeSearchResult({
      title: a.name || "Unknown",
      url: `https://musicbrainz.org/artist/${a.id || ""}`,
      snippet: `${a.type || "Artist"} · ${a.country || ""} · ${tags} ${lifespan}`,
      engine: "musicbrainz",
      position: i + 1,
      category: "music",
    })
  })
}

export * as MusicBrainzEngine from "./musicbrainz"
