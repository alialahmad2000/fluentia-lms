// Curriculum Integrity Audit — Phase 0 — Phases B-H master runner
// READ-ONLY. Zero writes to curriculum content.
'use strict'

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DB = {
  host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432,
  database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false },
}

const OUT = path.join(__dirname, '..', '..', 'docs', 'audits')
fs.mkdirSync(OUT, { recursive: true })

// ─── helpers ───────────────────────────────────────────────────────────────
const flags = { CRITICAL: [], WARNING: [], INFO: [] }

function flag(severity, phase, id, field, issue, extra = {}) {
  flags[severity].push({ phase, id: String(id), field, issue, ...extra })
}

function countWords(text) {
  if (!text || typeof text !== 'string') return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

const ARABIC_RE = /[؀-ۿݐ-ݿ]/
const TEMPLATE_RES = [
  /\{\{[^}]+\}\}/, /\[TBD\]/i, /\[TODO\]/i, /\[PLACEHOLDER\]/i,
  /\bLOREM\b/i, /\bIPSUM\b/i, /XXX+/, /<[A-Za-z][^>]*>/,
]
const MOJIBAKE_RE = /Ã[©¨ªœ]|â€[™œ"]|Ã±|Ã¼/

const STOPWORDS = new Set([
  'a','an','the','is','are','was','were','be','been','do','does','did',
  'have','has','had','will','would','can','could','should','may','might',
  'of','in','on','at','to','for','with','by','from','as','that','this',
  'these','those','it','its','they','them','their','he','she','his','her',
  'you','your','we','our','what','when','where','which','who','why','how',
  'not','but','and','or','so','if','then','than','there','here','about',
  'into','through','during','before','after','above','below','between',
])

function contentWords(text) {
  if (!text) return []
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
}

// ─── gender dictionary ─────────────────────────────────────────────────────
const MALE_NAMES = new Set([
  'Mohammed','Muhammad','Ahmad','Ahmed','Ali','Khalid','Omar','Umar','Yousef',
  'Yusuf','Saud','Fahad','Abdullah','Faisal','Saad','Bandar','Sultan','Tariq',
  'Hassan','Hussain','Hussein','Karim','Kareem','Bilal','Zaid','Zayed','Nasser',
  'Tom','John','James','David','Michael','Robert','William','Richard','Daniel',
  'Mark','Paul','Peter','Andrew','George','Charles','Edward','Thomas','Harry',
  'Luke','Jack','Adam','Sam','Nathan','Ryan','Kevin','Brian','Eric','Jason',
  'Doctor','Dr','Teacher','Professor','Manager','Boss','Director','President',
])

const FEMALE_NAMES = new Set([
  'Sarah','Sara','Maryam','Mariam','Aisha','Aishah','Fatima','Fatimah',
  'Hala','Reem','Lina','Nora','Nour','Layla','Leila','Hanan','Amal',
  'Dana','Rania','Yasmin','Yasmine','Rana','Ruba','Layan','Nouf','Abeer',
  'Mary','Jane','Emma','Sophia','Olivia','Ava','Isabella','Mia','Charlotte',
  'Amelia','Harper','Evelyn','Abigail','Emily','Ella','Madison','Scarlett',
  'Alice','Matilda','Anna','Lisa','Kate','Laura','Rachel','Jessica','Linda',
  'Susan','Karen','Nancy','Betty','Dorothy','Sandra','Ashley','Melissa',
  'Nurse','Teacher',
])

function inferGender(name) {
  const n = name.trim()
  if (MALE_NAMES.has(n)) return { gender: 'male', confidence: 'dictionary' }
  if (FEMALE_NAMES.has(n)) return { gender: 'female', confidence: 'dictionary' }
  // Check case-insensitive
  for (const m of MALE_NAMES) if (m.toLowerCase() === n.toLowerCase()) return { gender: 'male', confidence: 'dictionary' }
  for (const f of FEMALE_NAMES) if (f.toLowerCase() === n.toLowerCase()) return { gender: 'female', confidence: 'dictionary' }
  return { gender: 'unknown', confidence: 'needs_review' }
}

const DIALOGUE_RE = /(?:^|\n)\s*([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]+)?):\s+/gm

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const client = new Client(DB)
  await client.connect()
  console.log('Connected to DB\n')

  const results = {
    generatedAt: new Date().toISOString(),
    gitHead: null,
    phases: {},
  }

  // Git HEAD
  try {
    const { execSync } = require('child_process')
    results.gitHead = execSync('git rev-parse HEAD', { cwd: path.join(__dirname, '../..') }).toString().trim()
  } catch {}

  // ─── PHASE B — Completeness ───────────────────────────────────────────────
  console.log('─── Phase B: Completeness ───')

  // B.1 counts
  const { rows: levelRows } = await client.query(`SELECT id, level_number, name_en FROM curriculum_levels ORDER BY level_number`)
  const levelMap = {} // level_number → id
  for (const r of levelRows) levelMap[r.level_number] = r.id

  const { rows: unitsByLevel } = await client.query(`
    SELECT l.level_number, count(u.id) AS unit_count
    FROM curriculum_units u
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY l.level_number ORDER BY l.level_number
  `)
  const { rows: readingsByLevel } = await client.query(`
    SELECT l.level_number, count(r.id) AS reading_count
    FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY l.level_number ORDER BY l.level_number
  `)
  const { rows: listeningByLevel } = await client.query(`
    SELECT l.level_number, count(li.id) AS listening_count
    FROM curriculum_listening li
    JOIN curriculum_units u ON u.id = li.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY l.level_number ORDER BY l.level_number
  `)
  const { rows: vocabByLevel } = await client.query(`
    SELECT l.level_number, count(v.id) AS vocab_count
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    GROUP BY l.level_number ORDER BY l.level_number
  `)
  const { rows: [{ iv_count }] } = await client.query(`SELECT count(*) AS iv_count FROM curriculum_irregular_verbs`)

  const totalUnits = unitsByLevel.reduce((s, r) => s + parseInt(r.unit_count), 0)
  const totalReadings = readingsByLevel.reduce((s, r) => s + parseInt(r.reading_count), 0)
  const totalListening = listeningByLevel.reduce((s, r) => s + parseInt(r.listening_count), 0)
  const totalVocab = vocabByLevel.reduce((s, r) => s + parseInt(r.vocab_count), 0)

  console.log(`  Levels: ${levelRows.length} (expected 6)`)
  console.log(`  Units total: ${totalUnits} (expected 72)`)
  console.log(`  Readings total: ${totalReadings} (expected 144)`)
  console.log(`  Listening total: ${totalListening} (expected 72)`)
  console.log(`  Vocabulary total: ${totalVocab} (expected ~2183)`)
  console.log(`  Irregular verbs: ${iv_count}`)

  if (levelRows.length < 5 || levelRows.length > 7) flag('CRITICAL','B.1','levels','count',`Expected 6 levels, found ${levelRows.length}`)
  if (Math.abs(totalUnits - 72) / 72 > 0.05) flag('WARNING','B.1','units','count',`Expected 72 units, found ${totalUnits}`)
  if (Math.abs(totalReadings - 144) / 144 > 0.05) flag('WARNING','B.1','readings','count',`Expected 144 readings, found ${totalReadings}`)
  if (Math.abs(totalListening - 72) / 72 > 0.05) flag('WARNING','B.1','listening','count',`Expected 72 listening, found ${totalListening}`)
  if (Math.abs(totalVocab - 2183) / 2183 > 0.05) flag('WARNING','B.1','vocabulary','count',`Expected ~2183 vocab, found ${totalVocab}`)

  results.phases.B = { totalUnits, totalReadings, totalListening, totalVocab, iv_count: parseInt(iv_count), unitsByLevel, readingsByLevel, listeningByLevel, vocabByLevel }

  // B.2 — NULL/empty content
  // Reading: passage_content->paragraphs array
  const { rows: emptyReadings } = await client.query(`
    SELECT r.id, l.level_number, u.unit_number, r.reading_label, r.passage_word_count,
           jsonb_array_length(COALESCE(r.passage_content->'paragraphs','[]'::jsonb)) AS para_count
    FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE r.passage_content IS NULL
       OR jsonb_typeof(r.passage_content->'paragraphs') != 'array'
       OR jsonb_array_length(r.passage_content->'paragraphs') = 0
    ORDER BY l.level_number, u.unit_number
  `)
  emptyReadings.forEach(r => flag('CRITICAL','B.2',r.id,'passage_content',`Empty/null passage (L${r.level_number} U${r.unit_number} ${r.reading_label||''})`))

  // Listening: null/short transcript
  const { rows: emptyListening } = await client.query(`
    SELECT li.id, l.level_number, u.unit_number
    FROM curriculum_listening li
    JOIN curriculum_units u ON u.id = li.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE li.transcript IS NULL OR length(trim(li.transcript)) < 100
    ORDER BY l.level_number, u.unit_number
  `)
  emptyListening.forEach(r => flag('CRITICAL','B.2',r.id,'transcript',`Empty/short transcript (L${r.level_number} U${r.unit_number})`))

  // Vocab: missing word or example
  const { rows: emptyVocabWord } = await client.query(`
    SELECT v.id, l.level_number, v.word
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE v.word IS NULL OR length(trim(v.word)) < 1
    ORDER BY l.level_number
  `)
  emptyVocabWord.forEach(r => flag('CRITICAL','B.2',r.id,'word',`Empty word (L${r.level_number})`))

  const { rows: missingExamples } = await client.query(`
    SELECT v.id, l.level_number, v.word
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE v.example_sentence IS NULL OR length(trim(v.example_sentence)) < 5
    ORDER BY l.level_number
  `)
  missingExamples.forEach(r => flag('CRITICAL','B.2',r.id,'example_sentence',`Missing/empty example sentence for "${r.word}" (L${r.level_number})`))

  const { rows: missingMeaningAr } = await client.query(`
    SELECT l.level_number, count(*) AS cnt
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE v.definition_ar IS NULL OR length(trim(v.definition_ar)) < 1
    GROUP BY l.level_number ORDER BY l.level_number
  `)
  missingMeaningAr.forEach(r => {
    if (parseInt(r.cnt) > 0) flag('WARNING','B.2',`L${r.level_number}`,'definition_ar',`${r.cnt} vocab entries missing Arabic definition in L${r.level_number}`)
  })

  console.log(`  Empty readings: ${emptyReadings.length}`)
  console.log(`  Empty/short listening: ${emptyListening.length}`)
  console.log(`  Vocab missing example: ${missingExamples.length}`)

  // ─── PHASE C — Language Sanity ────────────────────────────────────────────
  console.log('\n─── Phase C: Language Sanity ───')

  // Load all reading passages (extract text from JSONB)
  const { rows: readings } = await client.query(`
    SELECT r.id, l.level_number, u.unit_number, r.reading_label,
      r.passage_word_count,
      (SELECT string_agg(p, ' ') FROM jsonb_array_elements_text(
        COALESCE(r.passage_content->'paragraphs','[]'::jsonb)
      ) AS p) AS full_text
    FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    ORDER BY l.level_number, u.unit_number, r.reading_label
  `)

  const { rows: listenings } = await client.query(`
    SELECT li.id, l.level_number, u.unit_number, li.audio_type, li.transcript
    FROM curriculum_listening li
    JOIN curriculum_units u ON u.id = li.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE li.transcript IS NOT NULL
    ORDER BY l.level_number, u.unit_number
  `)

  const { rows: vocabs } = await client.query(`
    SELECT v.id, l.level_number, v.word, v.definition_ar, v.example_sentence
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE v.word IS NOT NULL
    ORDER BY l.level_number, v.word
  `)

  let c1count = 0, c2count = 0, c3count = 0, c4count = 0

  // C.1 Arabic in English fields
  for (const r of readings) {
    if (r.full_text && ARABIC_RE.test(r.full_text)) {
      flag('CRITICAL','C.1',r.id,'passage_content',`Arabic chars in English passage (L${r.level_number} U${r.unit_number} ${r.reading_label||''})`)
      c1count++
    }
  }
  for (const li of listenings) {
    if (li.transcript && ARABIC_RE.test(li.transcript)) {
      flag('CRITICAL','C.1',li.id,'transcript',`Arabic chars in English transcript (L${li.level_number} U${li.unit_number})`)
      c1count++
    }
  }
  for (const v of vocabs) {
    if (v.word && ARABIC_RE.test(v.word)) {
      flag('CRITICAL','C.1',v.id,'word',`Arabic in word field: "${v.word}" (L${v.level_number})`)
      c1count++
    }
    if (v.example_sentence && ARABIC_RE.test(v.example_sentence)) {
      flag('CRITICAL','C.1',v.id,'example_sentence',`Arabic in example (L${v.level_number}, word: "${v.word}")`)
      c1count++
    }
  }

  // C.2 Template placeholders
  function checkTemplate(text, id, field, label) {
    for (const re of TEMPLATE_RES) {
      const m = text.match(re)
      if (m) {
        flag('CRITICAL','C.2',id,field,`Template placeholder "${m[0]}" in ${label}`)
        return true
      }
    }
    return false
  }
  for (const r of readings) { if (r.full_text) { if (checkTemplate(r.full_text, r.id, 'passage_content', `L${r.level_number} U${r.unit_number} ${r.reading_label||''}`)) c2count++ } }
  for (const li of listenings) { if (li.transcript) { if (checkTemplate(li.transcript, li.id, 'transcript', `L${li.level_number} U${li.unit_number}`)) c2count++ } }
  for (const v of vocabs) {
    if (v.example_sentence) { if (checkTemplate(v.example_sentence, v.id, 'example_sentence', `word "${v.word}" L${v.level_number}`)) c2count++ }
  }

  // C.3 Mojibake
  for (const r of readings) {
    if (r.full_text && MOJIBAKE_RE.test(r.full_text)) {
      flag('WARNING','C.3',r.id,'passage_content',`Possible encoding issue (L${r.level_number} U${r.unit_number})`)
      c3count++
    }
  }
  for (const li of listenings) {
    if (li.transcript && MOJIBAKE_RE.test(li.transcript)) {
      flag('WARNING','C.3',li.id,'transcript',`Possible encoding issue (L${li.level_number} U${li.unit_number})`)
      c3count++
    }
  }

  // C.4 Truncation
  for (const r of readings) {
    if (r.full_text) {
      const last = r.full_text.trim().slice(-1)
      if (!/[.!?"')\]]/.test(last)) {
        flag('WARNING','C.4',r.id,'passage_content',`Possible truncation — ends with "${last}" (L${r.level_number} U${r.unit_number} ${r.reading_label||''})`)
        c4count++
      }
    }
  }
  for (const li of listenings) {
    if (li.transcript) {
      const last = li.transcript.trim().slice(-1)
      if (!/[.!?"')\]]/.test(last)) {
        flag('WARNING','C.4',li.id,'transcript',`Possible truncation — ends with "${last}" (L${li.level_number} U${li.unit_number})`)
        c4count++
      }
    }
  }

  console.log(`  C.1 Arabic in English: ${c1count}`)
  console.log(`  C.2 Placeholders: ${c2count}`)
  console.log(`  C.3 Mojibake: ${c3count}`)
  console.log(`  C.4 Truncations: ${c4count}`)
  results.phases.C = { c1count, c2count, c3count, c4count }

  // ─── PHASE D — Length / Level Match ──────────────────────────────────────
  console.log('\n─── Phase D: Length/Level Match ───')

  const LEVEL_RANGES = {
    0: { min: 80,  max: 150 },
    1: { min: 150, max: 250 },
    2: { min: 250, max: 400 },
    3: { min: 400, max: 550 },
    4: { min: 550, max: 700 },
    5: { min: 700, max: 900 },
  }
  let dWarnCount = 0, dCritCount = 0

  for (const r of readings) {
    if (!r.full_text) continue
    const wc = countWords(r.full_text)
    const range = LEVEL_RANGES[r.level_number]
    if (!range) continue
    const tolerance = 0.2
    const lo = range.min * (1 - tolerance)
    const hi = range.max * (1 + tolerance)
    const lo2 = range.min * (1 - 0.5)
    const hi2 = range.max * (1 + 1.0)
    const label = `L${r.level_number} U${r.unit_number} ${r.reading_label||''}`
    if (wc < lo2 || wc > hi2) {
      flag('CRITICAL','D',r.id,'passage_content',`Word count ${wc} outside 2× variance [${Math.floor(lo2)}-${Math.floor(hi2)}] for ${label} (target ${range.min}-${range.max})`)
      dCritCount++
    } else if (wc < lo || wc > hi) {
      flag('WARNING','D',r.id,'passage_content',`Word count ${wc} outside ±20% [${Math.floor(lo)}-${Math.floor(hi)}] for ${label} (target ${range.min}-${range.max})`)
      dWarnCount++
    }
  }

  // Listening transcripts (±30% tolerance)
  for (const li of listenings) {
    if (!li.transcript) continue
    const wc = countWords(li.transcript)
    const range = LEVEL_RANGES[li.level_number]
    if (!range) continue
    const lo = range.min * 0.7
    const hi = range.max * 1.3
    const lo2 = range.min * 0.4
    const hi2 = range.max * 2.0
    if (wc < lo2 || wc > hi2) {
      flag('CRITICAL','D',li.id,'transcript',`Transcript word count ${wc} outside 2× variance for L${li.level_number} U${li.unit_number}`)
      dCritCount++
    } else if (wc < lo || wc > hi) {
      flag('WARNING','D',li.id,'transcript',`Transcript word count ${wc} outside ±30% for L${li.level_number} U${li.unit_number}`)
      dWarnCount++
    }
  }

  console.log(`  CRITICAL length issues: ${dCritCount}`)
  console.log(`  WARNING length issues: ${dWarnCount}`)
  results.phases.D = { dCritCount, dWarnCount }

  // ─── PHASE E — Question / Passage Alignment ───────────────────────────────
  console.log('\n─── Phase E: Q/Passage Alignment ───')

  const { rows: questions } = await client.query(`
    SELECT q.id, q.reading_id, q.question_en, q.question_type
    FROM curriculum_comprehension_questions q
    WHERE q.question_en IS NOT NULL
  `)

  // Group questions by reading_id
  const qByReading = {}
  for (const q of questions) {
    if (!qByReading[q.reading_id]) qByReading[q.reading_id] = []
    qByReading[q.reading_id].push(q)
  }

  let eCount = 0
  const passagesWithMisalignment = []
  for (const r of readings) {
    if (!r.full_text) continue
    const qs = qByReading[r.id] || []
    if (qs.length === 0) continue
    const passageWords = new Set(contentWords(r.full_text))
    let misalignedCount = 0
    for (const q of qs) {
      const qWords = contentWords(q.question_en)
      if (qWords.length === 0) continue
      const overlap = qWords.filter(w => passageWords.has(w)).length
      const ratio = overlap / qWords.length
      if (ratio < 0.15) misalignedCount++
    }
    const misalignRatio = misalignedCount / qs.length
    if (misalignRatio > 0.30) {
      flag('CRITICAL','E',r.id,'comprehension_questions',
        `${misalignedCount}/${qs.length} questions fail overlap test (${Math.round(misalignRatio*100)}%) — L${r.level_number} U${r.unit_number} ${r.reading_label||''}`)
      passagesWithMisalignment.push({ id: r.id, level: r.level_number, unit: r.unit_number, misalignedCount, total: qs.length })
      eCount++
    }
  }

  console.log(`  Passages with >30% misaligned questions: ${eCount}`)
  results.phases.E = { eCount, passagesWithMisalignment }

  // ─── PHASE F — Dialogue Detection ─────────────────────────────────────────
  console.log('\n─── Phase F: Dialogue Detection ───')

  const dialogueItems = []
  const allSpeakerNames = new Map() // name → { count, samples }

  function detectDialogue(text, id, sourceTable, levelNum, unitNum, sectionOrAudioType) {
    if (!text) return
    DIALOGUE_RE.lastIndex = 0
    const matches = [...text.matchAll(DIALOGUE_RE)]
    if (matches.length === 0) return

    const speakerSet = new Set()
    const turns = []
    for (const m of matches) {
      const name = m[1].trim()
      // Filter out false positives (common English words that look like names at line start)
      if (['Note','Source','From','To','Re','Ps','Dear','The','This','That','Chapter','Section','Part','Unit'].includes(name)) continue
      speakerSet.add(name)
      turns.push(name)
      if (!allSpeakerNames.has(name)) allSpeakerNames.set(name, { count: 0, samples: [] })
      const entry = allSpeakerNames.get(name)
      entry.count++
      if (entry.samples.length < 3) {
        const idx = m.index
        entry.samples.push(text.slice(idx, idx + 100).replace(/\n/g, ' '))
      }
    }

    if (speakerSet.size === 0) return

    const speakers = [...speakerSet].map(name => ({
      name,
      ...inferGender(name),
    }))

    const excerpt = text.slice(0, 300).replace(/\n/g, ' ')
    const inferredType = speakerSet.size >= 2 ? 'dialogue' : 'monologue'

    dialogueItems.push({
      id, sourceTable,
      level: levelNum, unit: unitNum,
      section: sectionOrAudioType,
      speakers,
      total_turns: turns.length,
      audio_type_declared: sourceTable === 'curriculum_listening' ? sectionOrAudioType : null,
      audio_type_inferred: inferredType,
      excerpt: excerpt + (text.length > 300 ? '...' : ''),
    })
  }

  for (const r of readings) {
    if (r.full_text) detectDialogue(r.full_text, r.id, 'curriculum_readings', r.level_number, r.unit_number, r.reading_label)
  }
  for (const li of listenings) {
    if (li.transcript) detectDialogue(li.transcript, li.id, 'curriculum_listening', li.level_number, li.unit_number, li.audio_type)
  }

  // F.4 audio_type consistency
  let audioTypeMismatches = 0
  for (const item of dialogueItems) {
    if (item.sourceTable !== 'curriculum_listening') continue
    const declared = (item.audio_type_declared || '').toLowerCase()
    const speakerCount = item.speakers.length
    if (['monologue','lecture'].includes(declared) && speakerCount >= 2) {
      flag('CRITICAL','F.4',item.id,'audio_type',
        `Declared "${declared}" but ${speakerCount} speakers detected (${item.speakers.map(s=>s.name).join(', ')}) — L${item.level} U${item.unit}`)
      audioTypeMismatches++
    }
    if (['dialogue','interview','conversation'].includes(declared) && speakerCount === 0) {
      flag('WARNING','F.4',item.id,'audio_type',
        `Declared "${declared}" but no "Name:" speaker pattern detected — L${item.level} U${item.unit} (may use different format)`)
      audioTypeMismatches++
    }
  }

  const speakersNeedingReview = []
  for (const [name, data] of allSpeakerNames) {
    const g = inferGender(name)
    if (g.confidence === 'needs_review') {
      speakersNeedingReview.push({ name, occurrences: data.count, sample_lines: data.samples })
    }
  }

  const readingDialogue = dialogueItems.filter(d => d.sourceTable === 'curriculum_readings').length
  const listeningDialogue = dialogueItems.filter(d => d.sourceTable === 'curriculum_listening').length

  console.log(`  Items with dialogue: ${dialogueItems.length} (readings: ${readingDialogue}, listening: ${listeningDialogue})`)
  console.log(`  Unique speakers: ${allSpeakerNames.size}`)
  console.log(`  Speakers needing review: ${speakersNeedingReview.length}`)
  console.log(`  audio_type mismatches: ${audioTypeMismatches}`)
  results.phases.F = { dialogueItems, allSpeakerNames: Object.fromEntries(allSpeakerNames), speakersNeedingReview, audioTypeMismatches, readingDialogue, listeningDialogue }

  // Save dialogue inventory
  const dialogueInventory = {
    generated_at: results.generatedAt,
    total_items_with_dialogue: dialogueItems.length,
    total_unique_speakers: allSpeakerNames.size,
    items: dialogueItems.map(d => ({
      id: d.id,
      source_table: d.sourceTable,
      level: d.level, unit: d.unit, section: d.section,
      speakers: d.speakers,
      total_turns: d.total_turns,
      audio_type_declared: d.audio_type_declared,
      audio_type_inferred: d.audio_type_inferred,
      excerpt: d.excerpt,
    })),
    speakers_needing_manual_confirmation: speakersNeedingReview,
  }
  fs.writeFileSync(path.join(OUT, 'dialogue-inventory.json'), JSON.stringify(dialogueInventory, null, 2))
  console.log('  Saved dialogue-inventory.json')

  // ─── PHASE G — Vocab Sanity ───────────────────────────────────────────────
  console.log('\n─── Phase G: Vocab Sanity ───')

  let g1count = 0, g2count = 0, g4count = 0

  for (const v of vocabs) {
    const word = (v.word || '').toLowerCase().trim()
    const ex = (v.example_sentence || '').toLowerCase().trim()

    // G.1 — Example must contain the word
    if (word && ex) {
      const root = word.replace(/(s|es|ed|ing|ies|er|est|ly)$/, '')
      const hasWord = ex.includes(word) || (root.length > 2 && (
        ex.includes(root) || ex.includes(root+'s') || ex.includes(root+'ed') ||
        ex.includes(root+'ing') || ex.includes(root+'es') || ex.includes(root+'er')
      ))
      if (!hasWord) {
        flag('CRITICAL','G.1',v.id,'example_sentence',`Example "${ex.slice(0,60)}..." doesn't contain word "${word}" (L${v.level_number})`)
        g1count++
      }
    }

    // G.2 — Example too short
    if (ex && (countWords(ex) < 4 || ex.length < 20)) {
      flag('WARNING','G.2',v.id,'example_sentence',`Very short example "${ex}" for word "${word}" (L${v.level_number})`)
      g2count++
    }

    // G.4 — Special characters in word
    if (word && /[\/,();]/.test(word)) {
      flag('INFO','G.4',v.id,'word',`Special chars in word "${word}" (L${v.level_number}) — may be compound entry`)
      g4count++
    }
  }

  // G.3 — Duplicate words per level
  const { rows: dupVocabs } = await client.query(`
    SELECT l.level_number, lower(v.word) AS w, count(*) AS cnt
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE v.word IS NOT NULL
    GROUP BY l.level_number, lower(v.word)
    HAVING count(*) > 1
    ORDER BY l.level_number, w
  `)
  let g3count = dupVocabs.length
  dupVocabs.forEach(d => flag('WARNING','G.3',`L${d.level_number}:${d.w}`,'word',`Duplicate word "${d.w}" appears ${d.cnt}× in L${d.level_number}`))

  console.log(`  G.1 example missing word: ${g1count}`)
  console.log(`  G.2 example too short: ${g2count}`)
  console.log(`  G.3 duplicate words: ${g3count}`)
  console.log(`  G.4 special chars in word: ${g4count}`)
  results.phases.G = { g1count, g2count, g3count, g4count }

  // ─── PHASE H — Irregular Verbs ────────────────────────────────────────────
  console.log('\n─── Phase H: Irregular Verbs ───')

  const { rows: irregVerbs } = await client.query(`
    SELECT iv.id, iv.level_id, iv.verb_base, iv.verb_past, iv.verb_past_participle,
           iv.example_sentence, l.level_number
    FROM curriculum_irregular_verbs iv
    LEFT JOIN curriculum_levels l ON l.id = iv.level_id
    ORDER BY l.level_number, iv.verb_base
  `)

  let h1count = 0, h2count = 0
  for (const v of irregVerbs) {
    if (!v.verb_base || !v.verb_past || !v.verb_past_participle) {
      flag('CRITICAL','H',v.id,'verb_forms',`Missing verb form (base="${v.verb_base}" past="${v.verb_past}" pp="${v.verb_past_participle}") L${v.level_number}`)
      h1count++
    }
    if (!v.example_sentence || v.example_sentence.trim().length < 5) {
      flag('WARNING','H',v.id,'example_sentence',`Missing example for "${v.verb_base}" (L${v.level_number})`)
      h2count++
    } else {
      // Check example contains the verb in some form
      const ex = v.example_sentence.toLowerCase()
      const forms = [v.verb_base, v.verb_past, v.verb_past_participle].filter(Boolean).map(f => f.toLowerCase())
      if (!forms.some(f => ex.includes(f))) {
        flag('WARNING','H',v.id,'example_sentence',`Example doesn't contain "${v.verb_base}" or its forms — "${ex.slice(0,60)}"`)
        h2count++
      }
    }
  }

  console.log(`  Irregular verbs total: ${irregVerbs.length}`)
  console.log(`  Missing verb forms: ${h1count}`)
  console.log(`  Example issues: ${h2count}`)
  results.phases.H = { total: irregVerbs.length, h1count, h2count }

  // ─── Totals ────────────────────────────────────────────────────────────────
  const totalCritical = flags.CRITICAL.length
  const totalWarning  = flags.WARNING.length
  const totalInfo     = flags.INFO.length

  // Character estimates for audio generation
  let totalCleanChars = 0
  let wastedChars = 0
  const criticalIds = new Set(flags.CRITICAL.filter(f => ['B.2','C.1','C.2'].includes(f.phase)).map(f => f.id))

  for (const r of readings) {
    const chars = (r.full_text || '').length
    if (criticalIds.has(r.id)) wastedChars += chars
    else totalCleanChars += chars
  }
  for (const li of listenings) {
    const chars = (li.transcript || '').length
    if (criticalIds.has(li.id)) wastedChars += chars
    else totalCleanChars += chars
  }
  for (const v of vocabs) {
    const chars = (v.example_sentence || '').length + (v.word || '').length + 2
    if (criticalIds.has(v.id)) wastedChars += chars
    else totalCleanChars += chars
  }
  for (const iv of irregVerbs) {
    const chars = ((iv.verb_base||'').length + (iv.verb_past||'').length + (iv.verb_past_participle||'').length + (iv.example_sentence||'').length) * 3
    totalCleanChars += chars
  }

  // Verdict
  let verdict = 'GO'
  if (totalCritical > 20) verdict = 'NO-GO'
  else if (totalCritical > 0) verdict = 'GO-WITH-FIXES'

  console.log(`\n─── Summary ───`)
  console.log(`  CRITICAL: ${totalCritical}`)
  console.log(`  WARNING:  ${totalWarning}`)
  console.log(`  INFO:     ${totalInfo}`)
  console.log(`  Verdict:  ${verdict}`)

  // Save raw flags
  fs.writeFileSync(path.join(OUT, 'raw-flags.json'), JSON.stringify({ generated_at: results.generatedAt, flags }, null, 2))

  await client.end()

  return {
    verdict, totalCritical, totalWarning, totalInfo,
    totalReadings, totalListening, totalVocab, iv_count,
    dialogueItems, speakersNeedingReview,
    totalCleanChars, wastedChars,
    flags, readings, listenings, vocabs, irregVerbs,
    vocabByLevel, readingsByLevel, listeningByLevel, unitsByLevel,
  }
}

module.exports = { main }

if (require.main === module) {
  main().then(r => {
    console.log('\nPhases B-H complete.')
    process.exit(0)
  }).catch(e => { console.error(e.message); process.exit(1) })
}
