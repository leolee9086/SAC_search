/**
 * 开放 API 搜索引擎集合
 *
 * 使用 JSON API 工厂批量创建的只读搜索引擎。
 * 所有引擎均使用公开 API，零风险。
 */
import { makeJsonApiEngine, makeSearchResult } from "./json-api"
import type { EngineConfig, SearchEngine } from "../engine"

// ── Unsplash（图片搜索）────────────────────────────────
// API: https://unsplash.com/documentation
// 无需 API key，但免费版有速率限制（50次/小时）
export function makeUnsplash(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "unsplash",
    category: "image",
    requiresKey: false,
    url: (q, n) => `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${n}`,
    parse: (json: unknown, max: number) => {
      const data = json as { results?: Array<{ id: string; urls: { regular: string }; user: { name: string }; description?: string; links: { html: string } }> }
      if (!data?.results) return []
      return data.results.slice(0, max).map((p, i) =>
        makeSearchResult({ title: p.description || `Unsplash ${p.id}`, url: p.links.html, snippet: `Photo by ${p.user.name}`, engine: "unsplash", position: i + 1, category: "image" }))
    },
    debugLabel: "unsplash",
  })(config)
}

// ── Pixabay（图片/视频搜索）────────────────────────────
// API: https://pixabay.com/api/docs/
// 免费 API key 可用
export function makePixabay(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "pixabay",
    category: "image",
    requiresKey: false,
    userAgent: "opencode-search/1.0",
    url: (q, n) => `https://pixabay.com/api/?key=&q=${encodeURIComponent(q)}&per_page=${n}&safesearch=true`,
    parse: (json: unknown, max: number) => {
      const data = json as { hits?: Array<{ id: number; pageURL: string; tags: string; user: string; type: string }> }
      if (!data?.hits) return []
      return data.hits.slice(0, max).map((p, i) =>
        makeSearchResult({ title: p.tags?.split(",")[0]?.trim() || `Pixabay ${p.id}`, url: p.pageURL, snippet: `By ${p.user} · ${p.type}`, engine: "pixabay", position: i + 1, category: p.type === "video" ? "video" : "image" }))
    },
  })(config)
}

// ── PubMed（医学文献）─────────────────────────────────
// API: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
// 公开 API，无需 key
export function makePubMed(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "pubmed",
    category: "academic",
    url: (q, n) => `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&retmax=${n}&retmode=json&sort=relevance`,
    parse: (json: unknown, max: number) => {
      const data = json as { esearchresult?: { idlist?: string[]; count?: string } }
      const ids = data?.esearchresult?.idlist
      if (!ids || ids.length === 0) return []
      return ids.slice(0, max).map((id, i) =>
        makeSearchResult({ title: `PubMed ID: ${id}`, url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, snippet: `Total results: ${data.esearchresult?.count || "?"}`, engine: "pubmed", position: i + 1, category: "academic" }))
    },
  })(config)
}

// ── Hacker News（技术新闻）────────────────────────────
// API: https://hn.algolia.com/api
// 公开 API，无限制
export function makeHackerNews(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "hackernews",
    category: "news",
    url: (q, n) => `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=${n}`,
    parse: (json: unknown, max: number) => {
      const data = json as { hits?: Array<{ title: string; url?: string; objectID: string; points?: number; author: string; created_at: string }> }
      if (!data?.hits) return []
      return data.hits.slice(0, max).map((h, i) =>
        makeSearchResult({ title: h.title || "HN post", url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, snippet: `${h.points || 0} points by ${h.author}`, engine: "hackernews", position: i + 1, category: "news", publishedDate: h.created_at ? new Date(h.created_at).getTime() : undefined }))
    },
  })(config)
}

// ── Docker Hub（容器镜像搜索）─────────────────────────
// API: https://docs.docker.com/docker-hub/api/latest/
export function makeDockerHub(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "dockerhub",
    category: "code",
    url: (q, n) => `https://hub.docker.com/v2/repositories/library/${encodeURIComponent(q)}/?page_size=${n}`,
    parse: (json: unknown, max: number) => {
      // Docker Hub 的 API 结构特殊，按名称搜索仓库
      const data = json as { results?: Array<{ name: string; repo_name: string; short_description: string; pull_count: number; star_count: number }> }
      if (!data?.results) return []
      return data.results.slice(0, max).map((r, i) =>
        makeSearchResult({ title: r.repo_name || r.name, url: `https://hub.docker.com/r/${r.repo_name || r.name}`, snippet: r.short_description || `${r.pull_count || 0} pulls`, engine: "dockerhub", position: i + 1, category: "code" }))
    },
  })(config)
}

// ── NPM（包搜索）──────────────────────────────────────
// API: https://registry.npmjs.org/
export function makeNpm(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "npm",
    category: "code",
    url: (q, n) => `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=${n}`,
    parse: (json: unknown, max: number) => {
      const data = json as { objects?: Array<{ package: { name: string; version: string; description?: string; links: { npm: string }; publisher?: { username: string } } }> }
      if (!data?.objects) return []
      return data.objects.slice(0, max).map((o, i) => {
        const pkg = o.package
        return makeSearchResult({ title: pkg.name, url: pkg.links.npm, snippet: `${pkg.version} — ${pkg.description || ""}`.trim(), engine: "npm", position: i + 1, category: "code" })
      })
    },
  })(config)
}

// ── PyPI（Python 包搜索）─────────────────────────────
// API: https://warehouse.pypa.io/api-reference/
// ── PyPI（Python 包搜索）─────────────────────────────
// 使用 libraries.io API（需要 API key）或 pypi.org 搜索 HTML
// 当前：用 pypi.org 搜索 HTML 作降级方案
export function makePyPI(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "pypi",
    category: "code",
    url: (q, n) => `https://pypi.org/search/?q=${encodeURIComponent(q)}`,
    parse: (_json: unknown, _max: number) => [] as never[], // HTML 解析暂未实现
  })(config)
}

// ── CoinGecko（加密货币数据）──────────────────────
// API: https://www.coingecko.com/api/documentation
// 免费公开 API，无 key 但有限速（30次/分钟）
export function makeCoinGecko(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "coingecko",
    category: "finance",
    url: (q, n) => `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
    parse: (json: unknown, max: number) => {
      const data = json as { coins?: Array<{ id: string; name: string; symbol: string; market_cap_rank?: number; large?: string }> }
      if (!data?.coins) return []
      return data.coins.slice(0, max).map((c, i) =>
        makeSearchResult({
          title: `${c.name} (${c.symbol?.toUpperCase()})`,
          url: `https://www.coingecko.com/en/coins/${c.id}`,
          snippet: c.market_cap_rank ? `Market cap rank #${c.market_cap_rank}` : c.id,
          engine: "coingecko", position: i + 1, category: "finance",
        }))
    },
    debugLabel: "coingecko",
  })(config)
}

// ── OpenStreetMap Nominatim（地理编码）─────────────────
// API: https://nominatim.org/release-docs/
// 免费公开 API，1次/秒限速
export function makeNominatim(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "nominatim",
    category: "map",
    userAgent: "opencode-search/1.0 (nominatim)",
    url: (q, n) => `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${n}&addressdetails=1`,
    parse: (json: unknown, max: number) => {
      const data = json as Array<{ place_id: number; display_name: string; lat: string; lon: string; type: string; importance: number }>
      if (!Array.isArray(data)) return []
      return data.slice(0, max).map((p, i) =>
        makeSearchResult({
          title: p.display_name?.split(",")[0] || `Location ${p.place_id}`,
          url: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}`,
          snippet: `${p.display_name} · type: ${p.type}`,
          engine: "nominatim", position: i + 1, category: "map",
        }))
    },
  })(config)
}

// ── CORE（学术开放获取论文）───────────────────────────
// API: https://api.core.ac.uk/docs/
export function makeCore(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "core",
    category: "academic",
    url: (q, n) => `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(q)}&limit=${n}`,
    parse: (json: unknown, max: number) => {
      const data = json as { results?: Array<{ title: string; downloadUrl?: string; doi?: string; authors?: Array<{ name: string }>; publishedDate?: string }> }
      if (!data?.results) return []
      return data.results.slice(0, max).map((r, i) => {
        const authors = r.authors?.map((a) => a.name).join(", ") || ""
        return makeSearchResult({
          title: r.title || "Untitled",
          url: r.downloadUrl || `https://doi.org/${r.doi || ""}`,
          snippet: `${authors} · ${r.publishedDate || ""}`.trim(),
          engine: "core", position: i + 1, category: "academic",
          publishedDate: r.publishedDate ? new Date(r.publishedDate).getTime() : undefined,
        })
      })
    },
  })(config)
}

// ── Marginalia（独立小众网络搜索引擎）─────────────────
// API: https://api.marginalia.nu/
export function makeMarginalia(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "marginalia",
    category: "general",
    url: (q, n) => `https://api.marginalia.nu/search?query=${encodeURIComponent(q)}&count=${n}&index=0`,
    parse: (json: unknown, max: number) => {
      const data = json as { results?: Array<{ title: string; url: string; description: string; format?: string; pubDate?: string }> }
      if (!data?.results) return []
      return data.results.slice(0, max).map((r, i) =>
        makeSearchResult({
          title: r.title || r.url,
          url: r.url,
          snippet: r.description || "",
          engine: "marginalia", position: i + 1,
          publishedDate: r.pubDate ? new Date(r.pubDate).getTime() : undefined,
        }))
    },
    debugLabel: "marginalia",
  })(config)
}

// ── Podchaser（播客搜索）──────────────────────────────
export function makePodchaser(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "podchaser",
    category: "podcast",
    userAgent: "opencode-search/1.0",
    url: (q, n) => `https://api.podchaser.com/podcasts?search=${encodeURIComponent(q)}&limit=${n}`,
    parse: (json: unknown, max: number) => {
      const data = json as { data?: Array<{ id: string; title: string; description?: string; network?: string; imageUrl?: string }> }
      if (!data?.data) return []
      return data.data.slice(0, max).map((p, i) =>
        makeSearchResult({
          title: p.title || `Podcast ${p.id}`,
          url: `https://www.podchaser.com/podcasts/${p.id}`,
          snippet: `${p.network || ""} · ${p.description?.slice(0, 120) || ""}`.trim(),
          engine: "podchaser", position: i + 1, category: "podcast",
        }))
    },
  })(config)
}

// ── 9GAG（趣味内容）─────────────────────────────────
export function make9GAG(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "9gag",
    category: "social",
    userAgent: "opencode-search/1.0",
    url: (q, n) => `https://9gag.com/v1/search-posts?query=${encodeURIComponent(q)}&count=${n}`,
    parse: (json: unknown, max: number) => {
      const data = json as { data?: { posts?: Array<{ id: string; title: string; url: string; description?: string; creationTs?: number; upVoteCount?: number }> } }
      const posts = data?.data?.posts
      if (!Array.isArray(posts)) return []
      return posts.slice(0, max).map((p, i) =>
        makeSearchResult({
          title: p.title || `9GAG ${p.id}`,
          url: p.url || `https://9gag.com/gag/${p.id}`,
          snippet: `${p.description || ""} · ${p.upVoteCount || 0} votes`,
          engine: "9gag", position: i + 1, category: "social",
          publishedDate: p.creationTs ? p.creationTs * 1000 : undefined,
        }))
    },
  })(config)
}

// ── Frinkiac（辛普森家庭表情搜索）───────────────────
export function makeFrinkiac(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "frinkiac",
    category: "image",
    url: (q, _n) => `https://frinkiac.com/api/search?q=${encodeURIComponent(q)}`,
    parse: (json: unknown, max: number) => {
      const data = json as Array<{ Id: number; Episode: string; Timestamp: number }>
      if (!Array.isArray(data)) return []
      return data.slice(0, max).map((f, i) => {
        const imgUrl = `https://frinkiac.com/img/${f.Episode}/${f.Timestamp}.jpg`
        return makeSearchResult({
          title: `Simpsons S${f.Episode.split("S")[1]?.split("E")[0] || "?"}E${f.Episode.split("E")[1] || "?"}`,
          url: imgUrl,
          snippet: `Episode ${f.Episode} at ${f.Timestamp}ms`,
          engine: "frinkiac", position: i + 1, category: "image",
        })
      })
    },
    debugLabel: "frinkiac",
  })(config)
}
// ── Apple App Store（应用搜索）───────────────────────
export function makeAppleAppStore(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "apple-app-store",
    category: "software",
    url: (q, n) => `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=${n}&entity=software`,
    parse: (json: unknown, max: number) => {
      const data = json as { results?: Array<{ trackId: number; trackName: string; trackViewUrl: string; description: string; sellerName: string; formattedPrice?: string; averageUserRating?: number }> }
      if (!data?.results) return []
      return data.results.slice(0, max).map((a, i) =>
        makeSearchResult({
          title: a.trackName,
          url: a.trackViewUrl,
          snippet: `${a.sellerName} · ${a.formattedPrice || "Free"} · ⭐${a.averageUserRating?.toFixed(1) || "?"}`,
          engine: "apple-app-store", position: i + 1, category: "software",
        }))
    },
    debugLabel: "apple-app-store",
  })(config)
}

// ── MediaWiki 搜索工厂 ────────────────────────────────
export function makeMediaWiki(config: EngineConfig, wikiHost: string): SearchEngine {
  return makeJsonApiEngine({
    name: config.name,
    category: "general",
    url: (q, n) => `https://${wikiHost}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=${n}&format=json&origin=*`,
    parse: (json: unknown, max: number) => {
      const data = json as { query?: { search?: Array<{ title: string; snippet: string; timestamp: string }> } }
      if (!data?.query?.search) return []
      return data.query.search.slice(0, max).map((r, i) => {
        const encodedTitle = encodeURIComponent(r.title.replace(/ /g, "_"))
        return makeSearchResult({
          title: r.title,
          url: `https://${wikiHost}/wiki/${encodedTitle}`,
          snippet: r.snippet?.replace(/<[^>]*>/g, "") || "",
          engine: config.name, position: i + 1,
          publishedDate: r.timestamp ? new Date(r.timestamp).getTime() : undefined,
        })
      })
    },
    debugLabel: config.name,
  })(config)
}

// ── Packagist（PHP 包搜索）─────────────────────────────
export function makePackagist(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "packagist",
    category: "code",
    url: (q, n) => `https://packagist.org/search.json?q=${encodeURIComponent(q)}&per_page=${n}`,
    parse: (json: unknown, max: number) => {
      const data = json as { results?: Array<{ name: string; url: string; description: string; downloads: number; favers: number }> }
      if (!data?.results) return []
      return data.results.slice(0, max).map((p, i) =>
        makeSearchResult({
          title: p.name,
          url: p.url,
          snippet: `${p.description || ""} · ⬇${p.downloads || 0} · ⭐${p.favers || 0}`,
          engine: "packagist", position: i + 1, category: "code",
        }))
    },
  })(config)
}

// ── RubyGems（Ruby gem 搜索）──────────────────────────
export function makeRubyGems(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "rubygems",
    category: "code",
    url: (q, n) => `https://rubygems.org/api/v1/search.json?query=${encodeURIComponent(q)}`,
    parse: (json: unknown, max: number) => {
      const data = json as Array<{ name: string; project_uri: string; info: string; downloads: number; version: string }>
      if (!Array.isArray(data)) return []
      return data.slice(0, max).map((g, i) =>
        makeSearchResult({
          title: `${g.name} ${g.version || ""}`,
          url: g.project_uri,
          snippet: `${g.info?.slice(0, 120) || ""} · ⬇${g.downloads || 0}`,
          engine: "rubygems", position: i + 1, category: "code",
        }))
    },
  })(config)
}

// ── Pub.dev（Dart/Flutter 包搜索）─────────────────────
export function makePubDev(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "pub-dev",
    category: "code",
    url: (q, n) => `https://pub.dev/api/search?q=${encodeURIComponent(q)}`,
    parse: (json: unknown, max: number) => {
      const data = json as { packages?: Array<{ package: string; url?: string }> }
      if (!data?.packages) return []
      return data.packages.slice(0, max).map((p, i) =>
        makeSearchResult({
          title: p.package,
          url: p.url || `https://pub.dev/packages/${p.package}`,
          snippet: `Dart/Flutter package: ${p.package}`,
          engine: "pub-dev", position: i + 1, category: "code",
        }))
    },
    debugLabel: "pub-dev",
  })(config)
}

// ── Mankier（man 手册搜索）────────────────────────────
export function makeMankier(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "mankier",
    category: "code",
    url: (q, _n) => `https://www.mankier.com/api/v2/mans/?q=${encodeURIComponent(q)}`,
    parse: (json: unknown, max: number) => {
      const data = json as { results?: Array<{ name: string; url: string; description: string }> }
      if (!data?.results) return []
      return data.results.slice(0, max).map((m, i) =>
        makeSearchResult({
          title: m.name,
          url: m.url,
          snippet: m.description || `man page: ${m.name}`,
          engine: "mankier", position: i + 1, category: "code",
        }))
    },
  })(config)
}

// ── Wiby（小众网页搜索）───────────────────────────────
export function makeWiby(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "wiby",
    category: "general",
    url: (q, _n) => `https://wiby.me/json/?q=${encodeURIComponent(q)}`,
    parse: (json: unknown, max: number) => {
      const data = json as Array<{ title: string; url: string; snippet: string }>
      if (!Array.isArray(data)) return []
      return data.slice(0, max).map((w, i) =>
        makeSearchResult({
          title: w.title || w.url,
          url: w.url,
          snippet: w.snippet || "",
          engine: "wiby", position: i + 1,
        }))
    },
  })(config)
}

// ── Encyclopaedia Search（百科搜索）──────────────────
export function makeEncyclosearch(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "encyclosearch",
    category: "general",
    url: (q, n) => `https://encyclosearch.org/encyclosphere/search?q=${encodeURIComponent(q)}&resultsPerPage=${n}`,
    parse: (json: unknown, max: number) => {
      const data = json as { Results?: Array<{ Title: string; SourceURL: string; Description: string }> }
      if (!data?.Results) return []
      return data.Results.slice(0, max).map((r, i) =>
        makeSearchResult({
          title: r.Title || "Untitled",
          url: r.SourceURL,
          snippet: r.Description || "",
          engine: "encyclosearch", position: i + 1,
        }))
    },
  })(config)
}

// ── OpenAIRE（学术出版物/数据集）─────────────────────
// ── OpenAIRE（学术出版物）─────────────────────────
export function makeOpenAirePublications(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "openaire-publications",
    category: "academic",
    url: (q, n) => `https://api.openaire.eu/search/publications?format=json&size=${n}&title=${encodeURIComponent(q)}`,
    parse: (json: unknown, max: number) => {
      const data = json as Record<string, unknown>
      const response = data.response as Record<string, unknown> | undefined
      const resultsObj = response?.results as { result?: Array<Record<string, unknown>> } | undefined
      const results = resultsObj?.result
      if (!Array.isArray(results)) return []
      return results.slice(0, max).map((r: Record<string, unknown>, i: number) => {
        const metadata = r.metadata as Record<string, unknown> | undefined
        const entity = metadata?.["oaf:entity"] as Record<string, unknown> | undefined
        const oafResult = entity?.["oaf:result"] as Record<string, unknown> | undefined
        const titleArr = oafResult?.title as Array<Record<string, unknown>> | undefined
        const descArr = oafResult?.description as Array<Record<string, unknown>> | undefined
        const children = oafResult?.children as { instance?: { webresource?: { url?: Array<Record<string, unknown>> } } } | undefined
        const title = (titleArr?.[0]?.["$"] as string) || "Untitled"
        const desc = (descArr?.[0]?.["$"] as string) || ""
        const url = (children?.instance?.webresource?.url?.[0]?.["$"] as string) || ""
        return makeSearchResult({
          title, url, snippet: desc.slice(0, 150),
          engine: "openaire", position: i + 1, category: "academic",
        })
      })
    },
    debugLabel: "openaire",
  })(config)
}

// ── Hoogle（Haskell 函数搜索）────────────────────────
export function makeHoogle(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "hoogle",
    category: "code",
    url: (q, _n) => `https://hoogle.haskell.org/?hoogle=${encodeURIComponent(q)}&mode=json`,
    parse: (json: unknown, max: number) => {
      const data = json as Array<{ name: string; url: string; docs: string; package: { name: string } }>
      if (!Array.isArray(data)) return []
      return data.slice(0, max).map((h, i) =>
        makeSearchResult({
          title: h.name,
          url: h.url,
          snippet: `${h.docs?.slice(0, 120) || ""} · ${h.package?.name || ""}`,
          engine: "hoogle", position: i + 1, category: "code",
        }))
    },
    debugLabel: "hoogle",
  })(config)
}

// ── Etymonline（词源词典）─────────────────────────────
export function makeEtymonline(config: EngineConfig): SearchEngine {
  return makeJsonApiEngine({
    name: "etymonline",
    category: "dictionary",
    url: (q, _n) => `https://www.etymonline.com/search?q=${encodeURIComponent(q)}`,
    parse: (_json: unknown, _max: number) => [] as never[],
    debugLabel: "etymonline",
  })(config)
}

export * as OpenApi from "./open-api"
