#!/usr/bin/env node
/**
 * Builds the Tier-2 «شرح أعمق» payload for every grammar lesson and writes it to
 * curriculum_grammar.deep_content.
 *
 *   node scripts/grammar-depth/generate.cjs --dry
 *   node scripts/grammar-depth/generate.cjs
 *
 * Zero API calls: everything is assembled from the paradigm + spelling
 * libraries, so regenerating all 154 lessons costs nothing and stays consistent.
 * Writes are chunked, backed up, and read back — an UPDATE that matches no rows
 * must fail loudly rather than look like success.
 */
const fs = require('fs')
const path = require('path')
const { PARADIGMS } = require('./paradigms.cjs')
const { SPELLING } = require('./spelling.cjs')
const { paradigmsFor, extraSpellingFor } = require('./map.cjs')
const { CONTRASTS, contrastsFor } = require('./contrasts.cjs')

const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'
const DRY = process.argv.includes('--dry')
const TOKEN = fs.readFileSync(path.join(__dirname, '..', '..', '.mcp.json'), 'utf8').match(/sbp_[A-Za-z0-9]+/)[0]

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`)
  try { return JSON.parse(text) } catch { return text }
}
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`
const jsonLit = (o) => {
  const s = JSON.stringify(o)
  if (s.includes('$dg$')) throw new Error('dollar-quote collision')
  return `$dg$${s}$dg$::jsonb`
}

const COLS3 = [{ label_ar: 'الصيغة' }, { label_ar: 'البنية' }, { label_ar: 'مثال' }]

function buildSections(topic) {
  const keys = paradigmsFor(topic)
  const sections = []
  const spellingKeys = new Set(extraSpellingFor(topic))

  if (keys.length) {
    sections.push({ type: 'heading', content: 'كل الصيغ' })
    for (const k of keys) {
      const p = PARADIGMS[k]
      if (!p) continue
      sections.push({ type: 'table', title_ar: p.label_ar, columns: COLS3, rows: p.forms })
      if (p.persons) {
        sections.push({
          type: 'table',
          title_ar: 'مع الضمائر',
          columns: [{ label_ar: 'الضمير' }, { label_ar: 'الصيغة' }, { label_ar: 'مثال' }],
          rows: p.persons,
        })
      }
      if (p.note_ar) sections.push({ type: 'explanation', content_ar: p.note_ar })
      ;(p.spelling || []).forEach((s) => spellingKeys.add(s))
    }
  }

  if (spellingKeys.size) {
    sections.push({ type: 'heading', content: 'الإملاء وتغيّر الشكل' })
    for (const s of spellingKeys) {
      const r = SPELLING[s]
      if (!r) continue
      sections.push({
        type: 'table',
        title_ar: r.label_ar,
        columns: [{ label_ar: 'الحالة' }, { label_ar: 'القاعدة' }, { label_ar: 'مثال' }],
        rows: r.rows,
      })
      if (r.note_ar) sections.push({ type: 'explanation', content_ar: r.note_ar })
    }
  }

  // Contrast — the confusable neighbour. This is the layer the audit found
  // missing in 86% of lessons, and the one that turns "I know the rule" into
  // "I can choose it against the rule next to it".
  const contrastKeys = contrastsFor(topic)
  if (contrastKeys.length) {
    sections.push({ type: 'heading', content: 'الفروق' })
    for (const k of contrastKeys) {
      const c = CONTRASTS[k]
      if (!c) continue
      sections.push({ type: 'table', title_ar: c.title_ar, columns: c.columns, rows: c.rows })
      if (c.test_ar) sections.push({ type: 'explanation', content_ar: c.test_ar })
    }
  }

  return { sections, keys, spelling: [...spellingKeys], contrasts: contrastKeys }
}

async function main() {
  const lessons = await sql(`
    select g.id::text id, g.topic_name_en, l.cefr,
           coalesce(p.display_name, p.full_name, 'العام') who
    from curriculum_grammar g
    join curriculum_units u on u.id = g.unit_id
    join curriculum_levels l on l.id = u.level_id
    left join profiles p on p.id = u.owner_student_id
    order by l.sort_order, u.unit_number;`)

  const payloads = lessons.map((l) => {
    const { sections, keys, spelling, contrasts } = buildSections(l.topic_name_en)
    return { ...l, sections, keys, spelling, contrasts }
  })

  const withForms = payloads.filter((p) => p.keys.length).length
  const withAny = payloads.filter((p) => p.sections.length).length
  const withContrast = payloads.filter((p) => p.contrasts.length).length
  console.log(`lessons: ${payloads.length} · forms table: ${withForms} · contrast card: ${withContrast} · any depth section: ${withAny}`)
  console.log(`avg sections in depth layer: ${(payloads.reduce((a, p) => a + p.sections.length, 0) / payloads.length).toFixed(1)}`)

  if (DRY) {
    for (const p of payloads.slice(0, 6)) {
      console.log(`  ${p.cefr} · ${p.topic_name_en} → [${p.keys.join(', ') || '—'}] ${p.sections.length} sections`)
    }
    return
  }

  const targets = payloads.filter((p) => p.sections.length)
  let written = 0
  for (let i = 0; i < targets.length; i += 15) {
    const chunk = targets.slice(i, i + 15)
    const values = chunk
      .map((p) => `(${lit(p.id)}::uuid, ${jsonLit({ sections: p.sections })}, ${lit(p.keys.join(',') || null)})`)
      .join(',\n')
    const res = await sql(`
      update curriculum_grammar g
      set deep_content = v.deep, paradigm_id = nullif(v.pid,'null'), deep_generated_at = now()
      from (values\n${values}\n) as v(id, deep, pid)
      where g.id = v.id
      returning g.id::text, jsonb_array_length(g.deep_content->'sections') n;`)
    if (res.length !== chunk.length) throw new Error(`chunk ${i}: updated ${res.length} of ${chunk.length}`)
    for (const r of res) {
      const want = chunk.find((c) => c.id === r.id)
      if (r.n !== want.sections.length) throw new Error(`readback mismatch ${r.id}: ${r.n} != ${want.sections.length}`)
    }
    written += res.length
    process.stdout.write(`\r  written ${written}/${targets.length}`)
  }
  console.log('')

  const summary = await sql(`
    select count(*) total,
           count(deep_content) with_depth,
           count(paradigm_id) with_paradigm,
           round(avg(jsonb_array_length(deep_content->'sections')) filter (where deep_content is not null), 1) avg_sections
    from curriculum_grammar;`)
  console.table(summary)
}

main().catch((e) => { console.error(e.message || e); process.exit(1) })
