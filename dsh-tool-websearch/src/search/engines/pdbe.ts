/**
 * PDBe 蛋白质数据库搜索引擎适配器
 *
 * 搜索欧洲蛋白质数据库 (PDBe) 中的蛋白质结构。
 * API: POST https://www.ebi.ac.uk/pdbe/search/pdb/select
 *
 * 参考 SearXNG: searx/engines/pdbe.py
 * 零风险：公开 JSON API，无需 key
 */
import { Effect } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import type { EngineConfig, SearchEngine, SearchOptions, SearchResult } from "../engine"
import { makeSearchResult } from "../engine"

const SOLR_URL = "https://www.ebi.ac.uk/pdbe/search/pdb/select"
const ENTRY_URL = "https://www.ebi.ac.uk/pdbe/entry/pdb"
const USER_AGENT = "opencode-search/1.0"

export function makePdbe(config: EngineConfig): SearchEngine {
  return {
    name: config.name,
    config,
    search: (http, query, opts) =>
      searchPdbe(http, query, opts.numResults || config.maxResults, config.timeout),
  }
}

function searchPdbe(
  http: HttpClient.HttpClient,
  query: string,
  numResults: number,
  timeout: number,
): Effect.Effect<readonly SearchResult[], unknown, never> {
  return Effect.gen(function* () {
    const body = new URLSearchParams({
      q: query,
      wt: "json",
      rows: String(Math.min(numResults, 20)),
    }).toString()

    const response = yield* http.execute(
      HttpClientRequest.post(SOLR_URL).pipe(
        HttpClientRequest.setHeaders({
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        }),
        HttpClientRequest.bodyText(body),
      ),
    ).pipe(Effect.timeout(timeout))

    if (response.status < 200 || response.status >= 400) return []
    const raw: string = yield* response.text
    if (!raw) return []

    return parsePdbeResults(raw, numResults)
  })
}

interface PdbeResult {
  pdb_id?: string
  title?: string
  status?: string
  citation_title?: string
  entry_author_list?: string[]
  journal?: string
  journal_volume?: string
  journal_page?: string
  citation_year?: number
  release_year?: number
  superseded_by?: string
}

export function parsePdbeResults(raw: string, maxResults: number): SearchResult[] {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }

  const data = parsed as { response?: { docs?: PdbeResult[] } }
  const docs = data?.response?.docs
  if (!Array.isArray(docs)) return []

  const results: SearchResult[] = []
  let pos = 0

  for (const doc of docs) {
    if (results.length >= maxResults) break
    if (!doc.pdb_id) continue

    const isObsolete = doc.status === "OBS"
    const title = isObsolete
      ? `${doc.title || "Unknown"} (OBSOLETE)`
      : doc.citation_title || doc.title || `PDB ${doc.pdb_id}`

    const authors = doc.entry_author_list?.[0] || ""
    const year = doc.citation_year || doc.release_year || ""
    const snippet = isObsolete
      ? `This entry has been superseded`
      : `${authors}${year ? ` (${year})` : ""}`.trim()

    pos++
    results.push(
      makeSearchResult({
        title,
        url: `${ENTRY_URL}/${doc.pdb_id}`,
        snippet: snippet || `PDBe entry: ${doc.pdb_id}`,
        engine: "pdbe",
        position: pos,
        category: "academic",
      }),
    )
  }

  return results
}

export * as PdbeEngine from "./pdbe"
