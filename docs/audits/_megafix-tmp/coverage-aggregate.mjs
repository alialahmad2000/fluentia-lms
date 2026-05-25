import { admin } from '../../../scripts/lib/supa.mjs'

const { data: allVocab } = await admin.from('curriculum_vocabulary').select('word, audio_url')
const vocabMap = new Map()
for (const v of (allVocab||[])) {
  const w = (v.word||'').toLowerCase().trim()
  const e = vocabMap.get(w)
  if (!e || (!e.audio_url && v.audio_url)) vocabMap.set(w, { audio_url: v.audio_url })
}

const { data: levels } = await admin.from('curriculum_levels').select('id, level_number').order('level_number')
const l1 = levels.find(l => l.level_number === 1)
const { data: units } = await admin.from('curriculum_units').select('id').eq('level_id', l1.id)
const uids = units.map(u=>u.id)
const { data: readings } = await admin.from('curriculum_readings').select('id, title_en, passage_content, passage_word_count').in('unit_id', uids)

let aggDistinct=0, aggCoveredAudio=0
const perArticle=[]
for (const r of readings) {
  const paras = r.passage_content?.paragraphs || []
  const text = paras.join(' ').replace(/\*/g,' ').toLowerCase()
  const toks = text.match(/[a-z][a-z'-]*[a-z]|[a-z]/g) || []
  const distinct = [...new Set(toks)]
  let cov=0
  for (const t of distinct) { if (vocabMap.get(t)?.audio_url) cov++ }
  perArticle.push({ title: r.title_en, paras: paras.length, distinct: distinct.length, coveredAudio: cov, pct: distinct.length? (100*cov/distinct.length).toFixed(0):0 })
  aggDistinct += distinct.length
  aggCoveredAudio += cov
}
console.log('L1 readings:', readings.length)
console.table(perArticle)
console.log(`\nL1 AGGREGATE: distinct=${aggDistinct} coveredWithAudio=${aggCoveredAudio} = ${(100*aggCoveredAudio/aggDistinct).toFixed(1)}%`)
console.log(`paragraph counts: min=${Math.min(...perArticle.map(a=>a.paras))} max=${Math.max(...perArticle.map(a=>a.paras))}`)
