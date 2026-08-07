#!/usr/bin/env node
/* Seed «محادثات جاهزة» for مصعب جمال العمري. Idempotent: re-running replaces the
 * lines/expressions of each scenario in place, so the scenario ids (and therefore
 * his progress rows) survive. Audio urls are written by generate-mosab-dialogue-audio.mjs
 * and are NEVER cleared here — that is why lines are updated, not deleted, when the
 * text is unchanged.
 *
 *   node scripts/seed-mosab-dialogues.cjs [--dry]
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const { GROUPS, SCENARIOS } = require('./mosab-dialogues/dialogues.cjs')

const STUDENT_ID = '4fb98807-526d-4675-adb5-eb938b31b948'
const DRY = process.argv.includes('--dry')

const svc = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

function validate() {
  const problems = []
  const keys = new Set()
  SCENARIOS.forEach((s, si) => {
    if (keys.has(s.key)) problems.push(`duplicate scenario key ${s.key}`)
    keys.add(s.key)
    if (!GROUPS[s.group]) problems.push(`${s.key}: unknown group ${s.group}`)
    if (!s.lines?.length) problems.push(`${s.key}: no lines`)
    if (!s.expressions?.length) problems.push(`${s.key}: no expressions`)
    // he must actually speak in his own scene, and the scene must alternate
    const mine = s.lines.filter((l) => l.s === 'A')
    if (mine.length < 4) problems.push(`${s.key}: only ${mine.length} lines for the student`)
    s.lines.forEach((l, i) => {
      if (!['A', 'B'].includes(l.s)) problems.push(`${s.key}[${i}]: bad speaker ${l.s}`)
      if (!l.en?.trim()) problems.push(`${s.key}[${i}]: empty en`)
      if (!l.ar?.trim()) problems.push(`${s.key}[${i}]: empty ar`)
      if (i > 0 && s.lines[i - 1].s === l.s) problems.push(`${s.key}[${i}]: two ${l.s} lines in a row`)
      if (l.s === 'A' && !l.note) problems.push(`${s.key}[${i}]: student line with no note`)
      if (l.wrong && l.wrong.some((w) => w.trim() === l.en.trim())) problems.push(`${s.key}[${i}]: distractor equals the answer`)
      if (l.wrong && new Set(l.wrong).size !== l.wrong.length) problems.push(`${s.key}[${i}]: duplicate distractors`)
      // the word-chip recall drill gets unusable past ~14 words
      if (l.s === 'A' && l.en.split(/\s+/).length > 16) problems.push(`${s.key}[${i}]: student line too long (${l.en.split(/\s+/).length} words)`)
    })
    // «دورك» needs real choices on most of his turns
    const withWrong = mine.filter((l) => l.wrong?.length >= 2).length
    if (withWrong < mine.length) problems.push(`${s.key}: ${mine.length - withWrong} student line(s) without 2 distractors`)
    if (si === 0 && problems.length) return
  })
  return problems
}

async function main() {
  const problems = validate()
  if (problems.length) {
    console.error('CONTENT INVALID:\n  ' + problems.join('\n  '))
    process.exit(1)
  }
  const lineCount = SCENARIOS.reduce((n, s) => n + s.lines.length, 0)
  const exprCount = SCENARIOS.reduce((n, s) => n + s.expressions.length, 0)
  console.log(`validated: ${SCENARIOS.length} scenarios · ${lineCount} lines · ${exprCount} expressions`)
  if (DRY) return

  for (const [i, s] of SCENARIOS.entries()) {
    const g = GROUPS[s.group]
    const payload = {
      student_id: STUDENT_ID,
      scenario_key: s.key,
      group_key: s.group,
      group_label_ar: g.label_ar,
      group_label_en: g.label_en,
      title_ar: s.title_ar,
      title_en: s.title_en,
      place_ar: s.place_ar,
      situation_ar: s.situation_ar,
      goal_ar: s.goal_ar,
      your_speaker: 'A',
      a_name: 'Mosab',
      a_role_ar: 'أنت',
      b_name: s.b_name,
      b_role_ar: s.b_role_ar,
      level: 'A2',
      sort_order: i + 1,
    }
    const { data: scen, error: sErr } = await svc
      .from('dialogue_scenarios')
      .upsert(payload, { onConflict: 'student_id,scenario_key' })
      .select('id')
      .single()
    if (sErr) throw new Error(`${s.key}: ${sErr.message}`)

    // lines — upsert on (scenario_id, idx) so audio_url/start_ms survive re-seeds
    const rows = s.lines.map((l, idx) => ({
      scenario_id: scen.id,
      idx,
      speaker: l.s,
      text_en: l.en,
      text_ar: l.ar,
      note_ar: l.note || null,
      distractors: l.wrong?.length ? l.wrong : null,
    }))
    const { error: lErr } = await svc.from('dialogue_lines').upsert(rows, { onConflict: 'scenario_id,idx' })
    if (lErr) throw new Error(`${s.key} lines: ${lErr.message}`)
    // drop any trailing lines from a previous, longer version
    const { error: tErr } = await svc.from('dialogue_lines').delete().eq('scenario_id', scen.id).gte('idx', rows.length)
    if (tErr) throw new Error(`${s.key} trim: ${tErr.message}`)

    // expressions — small and free of foreign keys, so replace wholesale
    await svc.from('dialogue_expressions').delete().eq('scenario_id', scen.id)
    const { error: eErr } = await svc.from('dialogue_expressions').insert(
      s.expressions.map((e, k) => ({
        scenario_id: scen.id,
        phrase_en: e.en,
        meaning_ar: e.ar,
        when_to_use_ar: e.when,
        sort_order: k,
      })),
    )
    if (eErr) throw new Error(`${s.key} expressions: ${eErr.message}`)

    console.log(`  ✓ ${String(i + 1).padStart(2)} ${s.key.padEnd(20)} ${rows.length} lines · ${s.expressions.length} expressions`)
  }

  // remove scenarios that are no longer in the content file
  const live = SCENARIOS.map((s) => s.key)
  const { data: stale } = await svc.from('dialogue_scenarios').select('id, scenario_key').eq('student_id', STUDENT_ID)
  for (const row of stale || []) {
    if (!live.includes(row.scenario_key)) {
      await svc.from('dialogue_scenarios').delete().eq('id', row.id)
      console.log(`  – removed stale scenario ${row.scenario_key}`)
    }
  }

  // open the gate
  const { error: gErr } = await svc.from('students').update({ uses_dialogues: true }).eq('id', STUDENT_ID)
  if (gErr) throw new Error(`gate: ${gErr.message}`)
  console.log('\nuses_dialogues = true for مصعب. Done.')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
