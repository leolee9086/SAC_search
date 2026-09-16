/**
 * 列出 `selectEngines` 在不同 flags 下到底选了哪些引擎。
 *
 * 目的：确认默认（general）搜索里是不是混进了窄领域引擎
 * （学术、应用商店、图片…）—— 那些引擎的结果会污染通用搜索的排序。
 */
import { selectEngines } from '../src/search/selector.ts'

for (const flags of [
  { label: '无 flags（现状：默认搜索）', v: undefined },
  { label: 'queryType=general', v: { queryType: 'general' } },
  { label: 'queryType=code', v: { queryType: 'code' } },
]) {
  const engines = selectEngines(flags.v)
  console.log(`\n=== ${flags.label}：${engines.length} 个引擎 ===`)
  const names = engines.map((e) => e.name)
  // 每行 8 个，方便看全
  for (let i = 0; i < names.length; i += 8) {
    console.log('  ' + names.slice(i, i + 8).join(', '))
  }
}
