/**
 * 搜索引擎选择器
 * 根据环境配置选择可用引擎
 * 借鉴 SearXNG 的引擎选择逻辑：按优先级和可用性动态选择
 */
import { Duration } from "effect"
import { makeEngineConfig } from "./engine"
import type { SearchEngine } from "./engine"
import { makeDuckDuckGo } from "./engines/duckduckgo"
import { makeBrave } from "./engines/brave"
import { makeBing } from "./engines/bing"
import { makeBingNews } from "./engines/bing-news"
import { makeBilibili } from "./engines/bilibili"
import { makeSogouWeChat } from "./engines/sogou-wechat"
import { makeBaidu } from "./engines/baidu"
import { makeWikipedia } from "./engines/wikipedia"
import { makeArxiv } from "./engines/arxiv"
import { makeSemanticScholar } from "./engines/semantic-scholar"
import { makeGitHub } from "./engines/github"
import { makeGitHubCode } from "./engines/github-code"
import { makeMDN } from "./engines/mdn"
import { makeDocsRs } from "./engines/docsrs"
import { makeReactDocs } from "./engines/react-docs"
import { makeVueDocs } from "./engines/vue-docs"
import { makePythonDocs } from "./engines/python-docs"
import { makeGitHubIssues } from "./engines/github-issues"
import { makeGitHubRepoFiles } from "./engines/github-repo-files"
import { makeUnsplash, makePixabay, makePubMed, makeHackerNews, makeDockerHub, makeNpm, makeCoinGecko, makeNominatim, makeCore, makeMarginalia, makePodchaser, make9GAG, makeFrinkiac, makeAppleAppStore, makeMediaWiki, makePackagist, makeRubyGems, makePubDev, makeMankier, makeWiby, makeEncyclosearch, makeOpenAirePublications, makeHoogle, makeEtymonline } from "./engines/open-api"
import { makeZLibrary } from "./engines/z-library"
import { makeBingImages } from "./engines/bing-images"
import { makeSogou } from "./engines/sogou"
import { make360Search } from "./engines/360search"
import { makeGoogle } from "./engines/google"
import { makeYandex } from "./engines/yandex"
import { makeNaver } from "./engines/naver"
import { makeGoogleImages } from "./engines/google-images"
import { makeBingVideos } from "./engines/bing-videos"
import { makeDailymotion } from "./engines/dailymotion"
import { makeSoundCloud } from "./engines/soundcloud"
import { makeFlickr } from "./engines/flickr"
import { makeDouban } from "./engines/douban"
import { makeWeibo } from "./engines/weibo"
import { makeReddit } from "./engines/reddit"
import { makeVimeo } from "./engines/vimeo"
import { makeStackExchange } from "./engines/stackexchange"
import { makeGoogleNews } from "./engines/google-news"
import { makeYouTube } from "./engines/youtube"
import { makeGoogleScholar } from "./engines/google-scholar"
import { makeTwitter } from "./engines/twitter"
import { makeHuggingFace } from "./engines/huggingface"
import { makeGitLab } from "./engines/gitlab"
import { makeIMDb } from "./engines/imdb"
import { makeGooglePlay } from "./engines/google-play"
import { makeGoodreads } from "./engines/goodreads"
import { makeCrates } from "./engines/crates"
import { makePyPIHtml } from "./engines/pypi"
import { makeOpenLibrary } from "./engines/openlibrary"
import { makeWallhaven } from "./engines/wallhaven"
import { makeCrossRef } from "./engines/crossref"
import { makeOpenverse } from "./engines/openverse"
import { makeEbay } from "./engines/ebay"
import { makePinterest } from "./engines/pinterest"
import { makeQwant } from "./engines/qwant"
import { makeYahoo } from "./engines/yahoo"
import { makeRottenTomatoes } from "./engines/rottentomatoes"
import { makeSteam } from "./engines/steam"
import { makePexels } from "./engines/pexels"
import { makeOpenAlex } from "./engines/openalex"
import { makeNiconico } from "./engines/niconico"
import { makeDeviantArt } from "./engines/deviantart"
import { makeGoogleVideos } from "./engines/google-videos"
import { makeBandcamp } from "./engines/bandcamp"
import { makeGenius } from "./engines/genius"
import { makeImgur } from "./engines/imgur"
import { makeRumble } from "./engines/rumble"
import { makePkgGoDev } from "./engines/pkg-go-dev"
import { makePeerTube } from "./engines/peertube"
import { makePixiv } from "./engines/pixiv"
import { makeDeezer } from "./engines/deezer"
import { makeReuters } from "./engines/reuters"
import { makeWttr } from "./engines/wttr"
import { makeYahooNews } from "./engines/yahoo-news"
import { makeMixcloud } from "./engines/mixcloud"
import { makeLibRs } from "./engines/lib-rs"
import { makeFDroid } from "./engines/fdroid"
import { makeMastodon } from "./engines/mastodon"
import { makeCurrencyConvert } from "./engines/currency-convert"
import { makeArtStation } from "./engines/artstation"
import { makeWikidata } from "./engines/wikidata"
import { makeWikimediaCommons } from "./engines/wikicommons"
import { makeMetacpan } from "./engines/metacpan"
import { makeArchLinux } from "./engines/archlinux"
import { makeAlpineLinux } from "./engines/alpinelinux"
import { makeVoidLinux } from "./engines/voidlinux"
import { make500px } from "./engines/500px"
import { makeFreesound } from "./engines/freesound"
import { makeSpotify } from "./engines/spotify"
import { makeOpenMeteo } from "./engines/open-meteo"
import { makeLemmy } from "./engines/lemmy"
import { makeStartpage } from "./engines/startpage"
import { makeChinaso } from "./engines/chinaso"
import { makePiped } from "./engines/piped"
import { makeInvidious } from "./engines/invidious"
import { makeDiscourse } from "./engines/discourse"
import { makeQuark } from "./engines/quark"
import { makeOdysee } from "./engines/odysee"
import { makeBoardreader } from "./engines/boardreader"
import { makeMwmbl } from "./engines/mwmbl"
import { makeSeznam } from "./engines/seznam"
import { makeAol } from "./engines/aol"
import { makeGmx } from "./engines/gmx"
import { makeYep } from "./engines/yep"
import { makeTinEye } from "./engines/tineye"
import { makeYandexMusic } from "./engines/yandex-music"
import { makeLingva } from "./engines/lingva"
import { makeLibreTranslate } from "./engines/libretranslate"
import { makeDeepL } from "./engines/deepl"
import { makeGitea } from "./engines/gitea"
import { makeSourceHut } from "./engines/sourcehut"
import { makeDictzone } from "./engines/dictzone"
import { makeDuden } from "./engines/duden"
import { makeBitchute } from "./engines/bitchute"
import { makeAcfun } from "./engines/acfun"
import { makeSogouVideos } from "./engines/sogou-videos"
import { makeSogouImages } from "./engines/sogou-images"
import { makeZhihu } from "./engines/zhihu"
import { makeXiaohongshu } from "./engines/xiaohongshu"
import { makeEmojipedia } from "./engines/emojipedia"
import { makeCara } from "./engines/cara"
import { makeOpenClipArt } from "./engines/openclipart"
import { makeIpernity } from "./engines/ipernity"
import { makeUxwing } from "./engines/uxwing"
import { makeFlaticon } from "./engines/flaticon"
import { makeTagesschau } from "./engines/tagesschau"
import { makeSelfhst } from "./engines/selfhst"
import { makeDevicons } from "./engines/devicons"
import { makeLucide } from "./engines/lucide"
import { makeMaterialIcons } from "./engines/material-icons"
import { makeHex } from "./engines/hex"
import { makeMicrosoftLearn } from "./engines/microsoft-learn"
import { makeAnsa } from "./engines/ansa"
import { makeSensCritique } from "./engines/senscritique"
import { makePdbe } from "./engines/pdbe"
import { makeMoviepilot } from "./engines/moviepilot"
import { makeAnnasArchive } from "./engines/annas-archive"
import { makeIqiyi } from "./engines/iqiyi"
import { makeAdobeStock } from "./engines/adobe-stock"
import { makeMojeek } from "./engines/mojeek"
import { makeJisho } from "./engines/jisho"
import { makeRadioBrowser } from "./engines/radio-browser"
import { makeSepiaSearch } from "./engines/sepiasearch"
import { makeRepology } from "./engines/repology"
import { makeArtic } from "./engines/artic"
import { makeNvd } from "./engines/nvd"
import { makeLoc } from "./engines/loc"
import { make1x } from "./engines/1x"
import { makeTootfinder } from "./engines/tootfinder"
import { makeGrokipedia } from "./engines/grokipedia"
import { makeFindThatMeme } from "./engines/findthatmeme"
import { makeApkMirror } from "./engines/apkmirror"
import { makeFyyd } from "./engines/fyyd"
import { makeScanr } from "./engines/scanr"
import { makeSmzdm } from "./engines/smzdm"
import { makeJd } from "./engines/jd"
import { makeTaobao } from "./engines/taobao"
import { makePdd } from "./engines/pdd"
import { makeAmazonCn } from "./engines/amazon-cn"
import { makeSuning } from "./engines/suning"
import { makeGome } from "./engines/gome"
import { makeAmazonUs } from "./engines/amazon-us"
import { makeVip } from "./engines/vip"
import { makeYipin } from "./engines/yipin"
import { makeDangdang } from "./engines/dangdang"
import { makeKaola } from "./engines/kaola"
// 新增专用引擎导入
import { makeBbcNews } from "./engines/bbc-news"
import { makeTheGuardian } from "./engines/theguardian"
import { makeTechCrunch } from "./engines/techcrunch"
import { makeTheVerge } from "./engines/theverge"
import { makeArsTechnica } from "./engines/arstechnica"
import { makeYahooFinance } from "./engines/yahoo-finance"
import { makeFred } from "./engines/fred"
import { makeZenodo } from "./engines/zenodo"
import { makeOpenFoodFacts } from "./engines/openfoodfacts"
import { makeMusicBrainz } from "./engines/musicbrainz"
import { makeAds } from "./engines/ads"
import { makeIgdb } from "./engines/igdb"
import { makeRawg } from "./engines/rawg"
import { makeTvMaze } from "./engines/tvmaze"
import { makeOpenWeather } from "./engines/openweather"

export interface SelectFlags {
  exa?: boolean
  parallel?: boolean
  brave?: boolean
  xiaohongshu?: boolean
  zhihu?: boolean
  bilibili?: boolean
  /** 查询类型提示，用于智能选择相关引擎 */
  queryType?: "general" | "code" | "news" | "academic" | "social" | "video" | "shopping"
  /** 优先返回最新结果 */
  timeRange?: "day" | "week" | "month" | "year"
  /** 语言偏好 */
  lang?: string
}

export function selectEngines(
  flags?: SelectFlags,
): SearchEngine[] {
  const engines: SearchEngine[] = []

  // DuckDuckGo 始终可用（免费、零配置）
  engines.push(makeDuckDuckGo(makeEngineConfig({
    name: "duckduckgo",
    weight: 1.0,
    timeout: Duration.toMillis(Duration.seconds(15)),
    maxResults: 50,
  })))

  // Bing 搜索 — 无需 API key，通过 HTML 解析实现
  // 在 DuckDuckGo 不可用时作为可靠备用
  engines.push(makeBing(makeEngineConfig({
    name: "bing",
    weight: 0.9,
    timeout: Duration.toMillis(Duration.seconds(15)),
    maxResults: 50,
    priority: 1,
    requiresKey: false,
  })))

  // Brave Search — 有 API key 时使用认证调用提高额度
  // Brave 免费版无需 API key 即可使用（每月 2000 次查询）
  const hasBraveKey = !!process.env.BRAVE_API_KEY
  if (flags?.brave || hasBraveKey || !flags) {
    engines.push(makeBrave(makeEngineConfig({
      name: "brave",
      weight: 1.2,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 50,
      priority: 1,
      requiresKey: false,
    })))
  }

  // Startpage — Google 隐私代理，无需 key
  if (!flags) {
    engines.push(makeStartpage(makeEngineConfig({
      name: "startpage",
      weight: 1.1,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 50,
      priority: 1,
      requiresKey: false,
    })))
  }

  // Mwmbl — 开源社区搜索引擎，无需 key
  if (!flags) {
    engines.push(makeMwmbl(makeEngineConfig({
      name: "mwmbl",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Seznam — 捷克搜索引擎
  if (!flags) {
    engines.push(makeSeznam(makeEngineConfig({
      name: "seznam",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // AOL — 美国老牌搜索引擎（代理 Bing 结果）
  if (!flags) {
    engines.push(makeAol(makeEngineConfig({
      name: "aol",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // GMX — 德国搜索引擎（代理 Bing 结果）
  if (!flags) {
    engines.push(makeGmx(makeEngineConfig({
      name: "gmx",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Yep — AI 驱动的搜索引擎
  if (!flags) {
    engines.push(makeYep(makeEngineConfig({
      name: "yep",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Mojeek — 独立隐私搜索引擎（拥有自己的索引）
  if (!flags) {
    engines.push(makeMojeek(makeEngineConfig({
      name: "mojeek",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Grokipedia — 技术百科
  if (!flags) {
    engines.push(makeGrokipedia(makeEngineConfig({
      name: "grokipedia",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Bilibili 视频搜索 — 调用 Bilibili 内部 JSON API
  // 无需 API key，通过随机 buvid3 cookie 绕过基础反爬
  if (flags?.bilibili || !flags || flags?.queryType === "video") {
    engines.push(makeBilibili(makeEngineConfig({
      name: "bilibili",
      weight: 1.0,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
    })))
  }

  // YouTube 视频搜索 — 全球最大视频平台
  // 通过 HTML 解析 YouTube 搜索结果页
  if (!flags || flags?.queryType === "video") {
    engines.push(makeYouTube(makeEngineConfig({
      name: "youtube",
      weight: 1.2,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 50,
      priority: 2,
      requiresKey: false,
    })))
  }

  // Piped — YouTube 隐私友好前端（多实例）
  if (!flags || flags?.queryType === "video") {
    engines.push(makePiped(makeEngineConfig({
      name: "piped",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // Invidious — YouTube 隐私友好前端（多实例）
  if (!flags || flags?.queryType === "video") {
    engines.push(makeInvidious(makeEngineConfig({
      name: "invidious",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Odysee — 去中心化视频平台
  if (!flags || flags?.queryType === "video") {
    engines.push(makeOdysee(makeEngineConfig({
      name: "odysee",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // BitChute — 替代视频平台
  if (!flags || flags?.queryType === "video") {
    engines.push(makeBitchute(makeEngineConfig({
      name: "bitchute",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // AcFun — 中文视频平台
  if (!flags || flags?.queryType === "video") {
    engines.push(makeAcfun(makeEngineConfig({
      name: "acfun",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // iQiyi — 中文视频搜索
  if (!flags || flags?.queryType === "video") {
    engines.push(makeIqiyi(makeEngineConfig({
      name: "iqiyi",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 搜狗视频 — 中文短视频搜索
  if (!flags || flags?.queryType === "video") {
    engines.push(makeSogouVideos(makeEngineConfig({
      name: "sogou-videos",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 搜狗微信 — 微信公众号文章搜索
  if (!flags || flags?.queryType === "news" || flags?.queryType === "social") {
    engines.push(makeSogouWeChat(makeEngineConfig({
      name: "sogou-wechat",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 百度搜索 — 中文网页搜索
  // 使用百度 JSON API (https://www.baidu.com/s?tn=json)
  if (!flags || flags?.lang?.startsWith("zh")) {
    engines.push(makeBaidu(makeEngineConfig({
      name: "baidu",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 50,
      priority: 1,
      requiresKey: false,
    })))
  }

  // ChinaSo — 中文综合搜索
  if (!flags || flags?.lang?.startsWith("zh")) {
    engines.push(makeChinaso(makeEngineConfig({
      name: "chinaso",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Quark — 夸克中文搜索（阿里旗下）
  if (!flags || flags?.lang?.startsWith("zh")) {
    engines.push(makeQuark(makeEngineConfig({
      name: "quark",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Google 搜索 — 全球最大搜索引擎（HTTP HTML 解析）
  // 参考 SearXNG google.py，含 CAPTCHA 检测 + CONSENT cookie
  if (!flags) {
    engines.push(makeGoogle(makeEngineConfig({
      name: "google",
      weight: 1.3,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 50,
      priority: 2,
      requiresKey: false,
    })))
  }

  // Yandex 搜索 — 俄语区主要搜索引擎
  if (!flags) {
    engines.push(makeYandex(makeEngineConfig({
      name: "yandex",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Naver 搜索 — 韩语区主要搜索引擎
  if (!flags) {
    engines.push(makeNaver(makeEngineConfig({
      name: "naver",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 搜狗搜索 — 中文网页搜索（SearXNG sogou.py 参考）
  if (!flags) {
    engines.push(makeSogou(makeEngineConfig({
      name: "sogou",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 360搜索 — 中文网页搜索
  if (!flags) {
    engines.push(make360Search(makeEngineConfig({
      name: "360search",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Bing Images — 图片搜索
  if (!flags) {
    engines.push(makeBingImages(makeEngineConfig({
      name: "bing-images",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 搜狗图片 — 中文图片搜索
  if (!flags) {
    engines.push(makeSogouImages(makeEngineConfig({
      name: "sogou-images",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Bing Videos — 视频搜索
  if (!flags) {
    engines.push(makeBingVideos(makeEngineConfig({
      name: "bing-videos",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Dailymotion — 视频搜索（Dailymotion REST API）
  if (!flags) {
    engines.push(makeDailymotion(makeEngineConfig({
      name: "dailymotion",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Vimeo — 视频搜索
  if (!flags) {
    engines.push(makeVimeo(makeEngineConfig({
      name: "vimeo",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // APKMirror — Android APK 文件搜索
  if (!flags) {
    engines.push(makeApkMirror(makeEngineConfig({
      name: "apkmirror",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // SoundCloud — 音频/音乐搜索
  if (!flags) {
    engines.push(makeSoundCloud(makeEngineConfig({
      name: "soundcloud",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Flickr — 图片搜索
  if (!flags) {
    engines.push(makeFlickr(makeEngineConfig({
      name: "flickr",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 豆瓣 — 中文内容搜索（国内直连）
  if (!flags) {
    engines.push(makeDouban(makeEngineConfig({
      name: "douban",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 微博 — 社交媒体搜索（国内直连）
  if (!flags) {
    engines.push(makeWeibo(makeEngineConfig({
      name: "weibo",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 知乎 — 中文问答平台（直连）
  if (!flags) {
    engines.push(makeZhihu(makeEngineConfig({
      name: "zhihu",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 小红书 — 中文生活方式平台（直连）
  if (!flags) {
    engines.push(makeXiaohongshu(makeEngineConfig({
      name: "xiaohongshu",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // Reddit — 社交搜索
  if (!flags) {
    engines.push(makeReddit(makeEngineConfig({
      name: "reddit",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Twitter/X — 社交搜索
  if (!flags || flags?.queryType === "social") {
    engines.push(makeTwitter(makeEngineConfig({
      name: "twitter",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Google Images — 图片搜索（Google JSON API）
  if (!flags) {
    engines.push(makeGoogleImages(makeEngineConfig({
      name: "google-images",
      weight: 1.0,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 学术类查询：Arxiv + Semantic Scholar + Google Scholar
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeArxiv(makeEngineConfig({
      name: "arxiv",
      weight: 1.0,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
    engines.push(makeSemanticScholar(makeEngineConfig({
      name: "semantic-scholar",
      weight: 1.1,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
    engines.push(makeGoogleScholar(makeEngineConfig({
      name: "google-scholar",
      weight: 1.2,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 2,
      requiresKey: false,
    })))
  }

  // 代码类查询：GitHub + GitLab + HuggingFace
  if (!flags || flags?.queryType === "code") {
    engines.push(makeGitHub(makeEngineConfig({
      name: "github",
      weight: 1.0,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: !!process.env.GITHUB_TOKEN,
    })))
    // GitHub Code Search — 在仓库内搜索代码片段
    engines.push(makeGitHubCode(makeEngineConfig({
      name: "github-code",
      weight: 1.1,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 2,
      requiresKey: !!process.env.GITHUB_TOKEN,
    })))
    // GitHub Issues/PR Search — 搜索 issues 和 pull requests
    engines.push(makeGitHubIssues(makeEngineConfig({
      name: "github-issues",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: !!process.env.GITHUB_TOKEN,
    })))
    // GitHub Repo Files — 读取仓库文件（query: "owner/repo" 或 "owner/repo:path"）
    engines.push(makeGitHubRepoFiles(makeEngineConfig({
      name: "github-repo-files",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 1,
      requiresKey: !!process.env.GITHUB_TOKEN,
    })))
    // MDN Web Docs — Web 开发文档搜索
    engines.push(makeMDN(makeEngineConfig({
      name: "mdn",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    // docs.rs — Rust 包文档搜索
    engines.push(makeDocsRs(makeEngineConfig({
      name: "docsrs",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    // React 官方文档
    engines.push(makeReactDocs(makeEngineConfig({
      name: "react-docs",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    // Vue.js 官方文档
    engines.push(makeVueDocs(makeEngineConfig({
      name: "vue-docs",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    // Python 官方文档
    engines.push(makePythonDocs(makeEngineConfig({
      name: "python-docs",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    engines.push(makeGitLab(makeEngineConfig({
      name: "gitlab",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: !!process.env.GITLAB_TOKEN,
    })))
    engines.push(makeHuggingFace(makeEngineConfig({
      name: "huggingface",
      weight: 1.0,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
    engines.push(makeGitea(makeEngineConfig({
      name: "gitea",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    engines.push(makeSourceHut(makeEngineConfig({
      name: "sourcehut",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 百科类查询：Wikipedia
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeWikipedia(makeEngineConfig({
      name: "wikipedia",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 开放 API 引擎族（图片、新闻、代码、书籍、金融等）
    // 图片
    engines.push(makeUnsplash(makeEngineConfig({ name: "unsplash", weight: 0.7, timeout: 10000, maxResults: 4, requiresKey: false })))
    // 新闻
    engines.push(makeHackerNews(makeEngineConfig({ name: "hackernews", weight: 0.8, timeout: 10000, maxResults: 5, requiresKey: false })))
    // 学术
    engines.push(makePubMed(makeEngineConfig({ name: "pubmed", weight: 0.8, timeout: 10000, maxResults: 5, requiresKey: false })))
    // 代码仓库
    engines.push(makeNpm(makeEngineConfig({ name: "npm", weight: 0.7, timeout: 10000, maxResults: 5, requiresKey: false })))
    engines.push(makeDockerHub(makeEngineConfig({ name: "dockerhub", weight: 0.6, timeout: 10000, maxResults: 5, requiresKey: false })))
    // 金融
    engines.push(makeCoinGecko(makeEngineConfig({ name: "coingecko", weight: 0.7, timeout: 10000, maxResults: 5, requiresKey: false })))
    // 地理
    engines.push(makeNominatim(makeEngineConfig({ name: "nominatim", weight: 0.6, timeout: 15000, maxResults: 5, requiresKey: false })))
    // 学术
    engines.push(makeCore(makeEngineConfig({ name: "core", weight: 0.7, timeout: 10000, maxResults: 5, requiresKey: false })))
    // 独立搜索
    engines.push(makeMarginalia(makeEngineConfig({ name: "marginalia", weight: 0.5, timeout: 15000, maxResults: 5, requiresKey: false })))
    // 播客
    engines.push(makePodchaser(makeEngineConfig({ name: "podchaser", weight: 0.5, timeout: 10000, maxResults: 5, requiresKey: false })))
    // 趣味内容
    engines.push(make9GAG(makeEngineConfig({ name: "9gag", weight: 0.4, timeout: 10000, maxResults: 5, requiresKey: false })))
    engines.push(makeFrinkiac(makeEngineConfig({ name: "frinkiac", weight: 0.3, timeout: 10000, maxResults: 3, requiresKey: false })))
    // 书籍
    engines.push(makeZLibrary(makeEngineConfig({ name: "z-library", weight: 0.5, timeout: 15000, maxResults: 5, requiresKey: false })))
    // 应用商店
    engines.push(makeAppleAppStore(makeEngineConfig({ name: "apple-app-store", weight: 0.5, timeout: 10000, maxResults: 5, requiresKey: false })))
    // 百科（非 Wikipedia）
    engines.push(makeMediaWiki(makeEngineConfig({ name: "britannica-wiki", weight: 0.5, timeout: 10000, maxResults: 5, requiresKey: false }), "en.wiktionary.org"))
    engines.push(makeMediaWiki(makeEngineConfig({ name: "wikivoyage", weight: 0.4, timeout: 10000, maxResults: 5, requiresKey: false }), "en.wikivoyage.org"))
    // Q&A
    engines.push(makeStackExchange(makeEngineConfig({ name: "stackexchange", weight: 0.8, timeout: 10000, maxResults: 5, requiresKey: false })))

  // 电影/娱乐类查询：IMDb
  if (!flags || flags?.queryType === "video") {
    engines.push(makeIMDb(makeEngineConfig({
      name: "imdb",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 应用搜索：Google Play
  if (!flags) {
    engines.push(makeGooglePlay(makeEngineConfig({
      name: "google-play",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 图书搜索：Goodreads
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeGoodreads(makeEngineConfig({
      name: "goodreads",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Rust 包搜索：crates.io
  if (!flags || flags?.queryType === "code") {
    engines.push(makeCrates(makeEngineConfig({
      name: "crates",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    engines.push(makeHex(makeEngineConfig({
      name: "hex",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    engines.push(makeMicrosoftLearn(makeEngineConfig({
      name: "microsoft-learn",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Python 包搜索：PyPI
  if (!flags || flags?.queryType === "code") {
    engines.push(makePyPIHtml(makeEngineConfig({
      name: "pypi-html",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 图书搜索：Open Library（JSON API，免费）
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeOpenLibrary(makeEngineConfig({
      name: "openlibrary",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 壁纸搜索：Wallhaven
  if (!flags) {
    engines.push(makeWallhaven(makeEngineConfig({
      name: "wallhaven",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 免版税图库搜索：Adobe Stock
  if (!flags) {
    engines.push(makeAdobeStock(makeEngineConfig({
      name: "adobe-stock",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // FindThatMeme — 表情包搜索
  if (!flags) {
    engines.push(makeFindThatMeme(makeEngineConfig({
      name: "findthatmeme",
      weight: 0.4,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 学术 DOI 搜索：Crossref
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeCrossRef(makeEngineConfig({
      name: "crossref",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
    engines.push(makePdbe(makeEngineConfig({
      name: "pdbe",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    engines.push(makeScanr(makeEngineConfig({
      name: "scanr",
      weight: 0.4,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    engines.push(makeMoviepilot(makeEngineConfig({
      name: "moviepilot",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    engines.push(makeAnnasArchive(makeEngineConfig({
      name: "annas-archive",
      weight: 0.4,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 开放媒体搜索：Openverse（Creative Commons 图片）
  if (!flags) {
    engines.push(makeOpenverse(makeEngineConfig({
      name: "openverse",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 购物搜索：eBay
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeEbay(makeEngineConfig({
      name: "ebay",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 比价购物：什么值得买 (SMZDM)
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeSmzdm(makeEngineConfig({
      name: "smzdm",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 50,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：京东 (JD.com)
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeJd(makeEngineConfig({
      name: "jd",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：淘宝/天猫
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeTaobao(makeEngineConfig({
      name: "taobao",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：拼多多
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makePdd(makeEngineConfig({
      name: "pdd",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：亚马逊中国
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeAmazonCn(makeEngineConfig({
      name: "amazon-cn",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：苏宁易购
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeSuning(makeEngineConfig({
      name: "suning",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：国美
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeGome(makeEngineConfig({
      name: "gome",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：Amazon.com (US)
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeAmazonUs(makeEngineConfig({
      name: "amazon-us",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：唯品会
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeVip(makeEngineConfig({
      name: "vip",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：1688（阿里巴巴批发）
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeYipin(makeEngineConfig({
      name: "1688",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：当当网
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeDangdang(makeEngineConfig({
      name: "dangdang",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 比价购物：考拉海购
  if (!flags || flags?.queryType === "shopping") {
    engines.push(makeKaola(makeEngineConfig({
      name: "kaola",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 图片搜索：Pinterest
  if (!flags) {
    engines.push(makePinterest(makeEngineConfig({
      name: "pinterest",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 通用搜索：Qwant（法国搜索引擎）
  if (!flags) {
    engines.push(makeQwant(makeEngineConfig({
      name: "qwant",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 通用搜索：Yahoo
  if (!flags) {
    engines.push(makeYahoo(makeEngineConfig({
      name: "yahoo",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 电影评价搜索：Rotten Tomatoes
  if (!flags || flags?.queryType === "video") {
    engines.push(makeRottenTomatoes(makeEngineConfig({
      name: "rottentomatoes",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 游戏搜索：Steam
  if (!flags) {
    engines.push(makeSteam(makeEngineConfig({
      name: "steam",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 图片搜索：Pexels（免费图库）
  if (!flags) {
    engines.push(makePexels(makeEngineConfig({
      name: "pexels",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 学术搜索：OpenAlex
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeOpenAlex(makeEngineConfig({
      name: "openalex",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 日本视频搜索：Niconico
  if (!flags || flags?.queryType === "video") {
    engines.push(makeNiconico(makeEngineConfig({
      name: "niconico",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 艺术作品搜索：DeviantArt
  if (!flags) {
    engines.push(makeDeviantArt(makeEngineConfig({
      name: "deviantart",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Google 视频搜索
  if (!flags || flags?.queryType === "video") {
    engines.push(makeGoogleVideos(makeEngineConfig({
      name: "google-videos",
      weight: 0.9,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 音乐搜索：Bandcamp
  if (!flags || flags?.queryType === "social") {
    engines.push(makeBandcamp(makeEngineConfig({
      name: "bandcamp",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 歌词搜索：Genius
  if (!flags || flags?.queryType === "social") {
    engines.push(makeGenius(makeEngineConfig({
      name: "genius",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 图片搜索：Imgur
  if (!flags) {
    engines.push(makeImgur(makeEngineConfig({
      name: "imgur",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 视频搜索：Rumble
  if (!flags || flags?.queryType === "video") {
    engines.push(makeRumble(makeEngineConfig({
      name: "rumble",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Go 包搜索：pkg.go.dev
  if (!flags || flags?.queryType === "code") {
    engines.push(makePkgGoDev(makeEngineConfig({
      name: "pkg-go-dev",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 去中心化视频搜索：PeerTube
  if (!flags || flags?.queryType === "video") {
    engines.push(makePeerTube(makeEngineConfig({
      name: "peertube",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Sepia Search — 联邦视频搜索（PeerTube 视频聚合）
  if (!flags || flags?.queryType === "video") {
    engines.push(makeSepiaSearch(makeEngineConfig({
      name: "sepiasearch",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 插画搜索：Pixiv
  if (!flags) {
    engines.push(makePixiv(makeEngineConfig({
      name: "pixiv",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 音乐搜索：Deezer
  if (!flags || flags?.queryType === "social") {
    engines.push(makeDeezer(makeEngineConfig({
      name: "deezer",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 播客搜索：Fyyd
  if (!flags) {
    engines.push(makeFyyd(makeEngineConfig({
      name: "fyyd",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 新闻搜索：Reuters
  if (!flags || flags?.queryType === "news") {
    engines.push(makeReuters(makeEngineConfig({
      name: "reuters",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // 广播电台搜索：Radio Browser
  if (!flags) {
    engines.push(makeRadioBrowser(makeEngineConfig({
      name: "radio-browser",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 天气搜索：wttr.in
  if (!flags) {
    engines.push(makeWttr(makeEngineConfig({
      name: "wttr",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 新闻搜索：Yahoo News
  if (!flags || flags?.queryType === "news") {
    engines.push(makeYahooNews(makeEngineConfig({
      name: "yahoo-news",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: false,
    })))
  }

  // Tagesschau — 德国新闻
  if (!flags || flags?.queryType === "news") {
    engines.push(makeTagesschau(makeEngineConfig({
      name: "tagesschau",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // ANSA — 意大利新闻
  if (!flags || flags?.queryType === "news") {
    engines.push(makeAnsa(makeEngineConfig({
      name: "ansa",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // SensCritique — 法国评论平台
  if (!flags || flags?.queryType === "general") {
    engines.push(makeSensCritique(makeEngineConfig({
      name: "senscritique",
      weight: 0.4,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 音乐搜索：Mixcloud
  if (!flags || flags?.queryType === "social") {
    engines.push(makeMixcloud(makeEngineConfig({
      name: "mixcloud",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Rust 文档搜索：lib.rs
  if (!flags || flags?.queryType === "code") {
    engines.push(makeLibRs(makeEngineConfig({
      name: "lib-rs",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // NVD — 国家漏洞数据库
  if (!flags || flags?.queryType === "code") {
    engines.push(makeNvd(makeEngineConfig({
      name: "nvd",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Repology — 软件包版本追踪
  if (!flags || flags?.queryType === "code") {
    engines.push(makeRepology(makeEngineConfig({
      name: "repology",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Android 应用搜索：F-Droid
  if (!flags) {
    engines.push(makeFDroid(makeEngineConfig({
      name: "fdroid",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 社交搜索：Mastodon
  if (!flags || flags?.queryType === "social") {
    engines.push(makeMastodon(makeEngineConfig({
      name: "mastodon",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 货币转换搜索：currency-convert
  if (!flags) {
    engines.push(makeCurrencyConvert(makeEngineConfig({
      name: "currency-convert",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 艺术作品搜索：ArtStation
  if (!flags) {
    engines.push(makeArtStation(makeEngineConfig({
      name: "artstation",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 芝加哥艺术博物馆搜索：Artic
  if (!flags) {
    engines.push(makeArtic(makeEngineConfig({
      name: "artic",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 1x — 艺术摄影社区
  if (!flags) {
    engines.push(make1x(makeEngineConfig({
      name: "1x",
      weight: 0.3,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Cara — 艺术家社区（反 AI 生成艺术）
  if (!flags) {
    engines.push(makeCara(makeEngineConfig({
      name: "cara",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // OpenClipArt — 免费矢量图搜索
  if (!flags) {
    engines.push(makeOpenClipArt(makeEngineConfig({
      name: "openclipart",
      weight: 0.4,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // LOC — 美国国会图书馆图片搜索
  if (!flags) {
    engines.push(makeLoc(makeEngineConfig({
      name: "loc",
      weight: 0.4,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Ipernity — 摄影社区
  if (!flags) {
    engines.push(makeIpernity(makeEngineConfig({
      name: "ipernity",
      weight: 0.4,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // UXWing — 免费图标
  if (!flags) {
    engines.push(makeUxwing(makeEngineConfig({
      name: "uxwing",
      weight: 0.3,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Flaticon — 免费图标
  if (!flags) {
    engines.push(makeFlaticon(makeEngineConfig({
      name: "flaticon",
      weight: 0.3,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Selfhst — 自托管图标
  if (!flags) {
    engines.push(makeSelfhst(makeEngineConfig({
      name: "selfhst",
      weight: 0.2,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Devicons — 开发者图标
  if (!flags) {
    engines.push(makeDevicons(makeEngineConfig({
      name: "devicons",
      weight: 0.2,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Lucide — 开源图标
  if (!flags) {
    engines.push(makeLucide(makeEngineConfig({
      name: "lucide",
      weight: 0.2,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Material Icons — Google 材质图标
  if (!flags) {
    engines.push(makeMaterialIcons(makeEngineConfig({
      name: "material-icons",
      weight: 0.2,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 知识图谱搜索：Wikidata
  if (!flags || flags?.queryType === "academic") {
    engines.push(makeWikidata(makeEngineConfig({
      name: "wikidata",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 媒体文件搜索：Wikimedia Commons
  if (!flags) {
    engines.push(makeWikimediaCommons(makeEngineConfig({
      name: "wikicommons",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Perl 包搜索：MetaCPAN
  if (!flags || flags?.queryType === "code") {
    engines.push(makeMetacpan(makeEngineConfig({
      name: "metacpan",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Arch Linux 包搜索：archlinux
  if (!flags || flags?.queryType === "code") {
    engines.push(makeArchLinux(makeEngineConfig({
      name: "archlinux",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Alpine Linux 包搜索：alpinelinux
  if (!flags || flags?.queryType === "code") {
    engines.push(makeAlpineLinux(makeEngineConfig({
      name: "alpinelinux",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Void Linux 包搜索：voidlinux
  if (!flags || flags?.queryType === "code") {
    engines.push(makeVoidLinux(makeEngineConfig({
      name: "voidlinux",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 摄影作品搜索：500px
  if (!flags || flags?.queryType === "video") {
    engines.push(make500px(makeEngineConfig({
      name: "500px",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 音频样本搜索：Freesound
  if (!flags || flags?.queryType === "social") {
    engines.push(makeFreesound(makeEngineConfig({
      name: "freesound",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 音乐搜索：Spotify（需要 SPOTIFY_ACCESS_TOKEN 环境变量）
  if (flags?.queryType === "social" || (!flags && !!process.env.SPOTIFY_ACCESS_TOKEN)) {
    engines.push(makeSpotify(makeEngineConfig({
      name: "spotify",
      weight: 0.8,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 1,
      requiresKey: true,
    })))
  }

  // 天气搜索：Open-Meteo（免费，无需 key）
  if (!flags) {
    engines.push(makeOpenMeteo(makeEngineConfig({
      name: "open-meteo",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 3,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 社交搜索：Lemmy（去中心化 Reddit 替代）
  if (!flags || flags?.queryType === "social") {
    engines.push(makeLemmy(makeEngineConfig({
      name: "lemmy",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 论坛搜索：Discourse（多实例）
  if (!flags || flags?.queryType === "social") {
    engines.push(makeDiscourse(makeEngineConfig({
      name: "discourse",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 论坛搜索：Boardreader（聚合多个论坛）
  if (!flags || flags?.queryType === "social") {
    engines.push(makeBoardreader(makeEngineConfig({
      name: "boardreader",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // Tootfinder — Mastodon 联邦社交搜索
  if (!flags || flags?.queryType === "social") {
    engines.push(makeTootfinder(makeEngineConfig({
      name: "tootfinder",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 词典类查询：Dictzone（多语互译）+ Duden（德语词典）
  if (!flags) {
    engines.push(makeDictzone(makeEngineConfig({
      name: "dictzone",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    engines.push(makeDuden(makeEngineConfig({
      name: "duden",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
    engines.push(makeEmojipedia(makeEngineConfig({
      name: "emojipedia",
      weight: 0.4,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false,
    })))
    // Jisho — 日英词典（JSON API，免费）
    engines.push(makeJisho(makeEngineConfig({
      name: "jisho",
      weight: 0.5,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 反向图片搜索：TinEye
  if (!flags) {
    engines.push(makeTinEye(makeEngineConfig({
      name: "tineye",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 音乐搜索：Yandex Music
  if (!flags || flags?.queryType === "social") {
    engines.push(makeYandexMusic(makeEngineConfig({
      name: "yandex-music",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 5,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 翻译搜索：Lingva
  if (!flags) {
    engines.push(makeLingva(makeEngineConfig({
      name: "lingva",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 翻译搜索：LibreTranslate
  if (!flags) {
    engines.push(makeLibreTranslate(makeEngineConfig({
      name: "libretranslate",
      weight: 0.6,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: false,
    })))
  }

  // 翻译搜索：DeepL（需要 DEEPL_API_KEY 环境变量）
  if (!flags) {
    engines.push(makeDeepL(makeEngineConfig({
      name: "deepl",
      weight: 0.7,
      timeout: Duration.toMillis(Duration.seconds(10)),
      maxResults: 3,
      priority: 0,
      requiresKey: true,
    })))
  }

  // 新闻类查询：添加 Bing News + Google News 专用引擎
  if (flags?.queryType === "news") {
    engines.push(makeBingNews(makeEngineConfig({
      name: "bing-news",
      weight: 1.1,
      timeout: Duration.toMillis(Duration.seconds(15)),
      maxResults: 10,
      priority: 2,
      requiresKey: false,
    })))
    engines.push(makeGoogleNews(makeEngineConfig({
      name: "google-news",
      weight: 1.2,
      timeout: Duration.toMillis(Duration.seconds(20)),
      maxResults: 10,
      priority: 3,
      requiresKey: false,
    })))
    for (const e of engines) {
      // @ts-ignore - 运行时调整 maxResults
      e.config.maxResults = Math.max(e.config.maxResults, 10)
    }
  }

  // ── 新增引擎注册（批量）─────────────────────────────
  // 新闻
  if (!flags || flags?.queryType === "news" || !flags?.queryType) {
    engines.push(makeBbcNews(makeEngineConfig({ name: "bbc-news", weight: 0.8, timeout: 12000, maxResults: 5, requiresKey: false })))
    engines.push(makeTheGuardian(makeEngineConfig({ name: "theguardian", weight: 0.7, timeout: 12000, maxResults: 5, requiresKey: false })))
    engines.push(makeTechCrunch(makeEngineConfig({ name: "techcrunch", weight: 0.7, timeout: 10000, maxResults: 5, requiresKey: false })))
    engines.push(makeTheVerge(makeEngineConfig({ name: "theverge", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })))
    engines.push(makeArsTechnica(makeEngineConfig({ name: "arstechnica", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })))
  }
  // 金融
  engines.push(makeYahooFinance(makeEngineConfig({ name: "yahoo-finance", weight: 0.7, timeout: 10000, maxResults: 5, requiresKey: false })))
  engines.push(makeFred(makeEngineConfig({ name: "fred", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })))
  // 学术
  engines.push(makeZenodo(makeEngineConfig({ name: "zenodo", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })))
  engines.push(makeAds(makeEngineConfig({ name: "ads", weight: 0.6, timeout: 15000, maxResults: 5, requiresKey: false })))
  engines.push(makeOpenAirePublications(makeEngineConfig({ name: "openaire", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })))
  // 包管理器
  engines.push(makePackagist(makeEngineConfig({ name: "packagist", weight: 0.6, timeout: 10000, maxResults: 5, requiresKey: false })))
  engines.push(makeRubyGems(makeEngineConfig({ name: "rubygems", weight: 0.6, timeout: 10000, maxResults: 5, requiresKey: false })))
  engines.push(makePubDev(makeEngineConfig({ name: "pub-dev", weight: 0.5, timeout: 10000, maxResults: 5, requiresKey: false })))
  engines.push(makeMankier(makeEngineConfig({ name: "mankier", weight: 0.5, timeout: 10000, maxResults: 5, requiresKey: false })))
  engines.push(makeHoogle(makeEngineConfig({ name: "hoogle", weight: 0.5, timeout: 10000, maxResults: 5, requiresKey: false })))
  // 通用/专项
  engines.push(makeWiby(makeEngineConfig({ name: "wiby", weight: 0.5, timeout: 12000, maxResults: 5, requiresKey: false })))
  engines.push(makeEncyclosearch(makeEngineConfig({ name: "encyclosearch", weight: 0.5, timeout: 12000, maxResults: 5, requiresKey: false })))
  engines.push(makeEtymonline(makeEngineConfig({ name: "etymonline", weight: 0.5, timeout: 10000, maxResults: 5, requiresKey: false })))
  // 食品/音乐/游戏/影视/天气
  engines.push(makeOpenFoodFacts(makeEngineConfig({ name: "openfoodfacts", weight: 0.5, timeout: 12000, maxResults: 5, requiresKey: false })))
  engines.push(makeMusicBrainz(makeEngineConfig({ name: "musicbrainz", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })))
  engines.push(makeIgdb(makeEngineConfig({ name: "igdb", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })))
  engines.push(makeRawg(makeEngineConfig({ name: "rawg", weight: 0.6, timeout: 12000, maxResults: 5, requiresKey: false })))
  engines.push(makeTvMaze(makeEngineConfig({ name: "tvmaze", weight: 0.6, timeout: 10000, maxResults: 5, requiresKey: false })))
  engines.push(makeOpenWeather(makeEngineConfig({ name: "openweather", weight: 0.6, timeout: 10000, maxResults: 1, requiresKey: true })))

  return engines
}

export function engineSummary(engines: SearchEngine[]): string {
  const names = engines.map((e) => `${e.name}(weight=${e.config.weight})`)
  return `已启用引擎: ${names.join(", ")}`
}

export * as Selector from "./selector"
