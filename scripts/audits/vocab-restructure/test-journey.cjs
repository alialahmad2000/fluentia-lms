const { query } = require('./_db.cjs')
const one = async (s) => (await query(s))[0]
;(async () => {
  const MOCK = 'a82486b6-9472-4aba-b902-a0ec354ca170' // mock-test-a1 (empty)
  const RICH = 'de70db0c-1d87-4328-86d8-aa37344980a7' // الهنوف (1313 mastered)

  for (const [label, id] of [['mock-test-a1 (empty)', MOCK], ['الهنوف (data-rich)', RICH]]) {
    const j = (await query(`SELECT public.vocab_get_journey('${id}') AS j;`))[0].j
    const regions = j.regions || []
    const done = regions.filter((r) => r.status === 'complete').length
    console.log(`\n=== ${label} ===`)
    console.log(`  words_known=${j.words_known} due=${j.due_count} level=${j.level} | regions=${regions.length} (complete=${done})`)
    console.log(`  current stop:`, j.current ? `${j.current.theme_ar} · constellation ${j.current.constellation_index + 1} (${j.current.mastered}/${j.current.total} mastered)` : '(journey complete!)')
    if (j.current) {
      const stop = (await query(`SELECT public.vocab_get_stop('${id}', '${j.current.unit_id}', ${j.current.constellation_index}) AS s;`))[0].s
      console.log(`  stop words: new=${(stop.new||[]).length} review=${(stop.review||[]).length} hard=${(stop.hard||[]).length}`)
      console.log(`  sample new words:`, (stop.new || []).slice(0, 4).map((w) => w.word).join(', '))
    }
    // show the first few regions + their status
    console.log('  first regions:')
    for (const r of regions.slice(0, 4)) console.log(`    L${r.level_number}.U${r.unit_number} ${r.theme_ar} — ${r.mastered_words}/${r.total_words} words · ${r.constellations_done}/${r.constellations} stops · ${r.status}`)
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
