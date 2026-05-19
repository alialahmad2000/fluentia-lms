#!/usr/bin/env node
// PRONUNCIATION-HIDDEN 2026-05-19 — backfill unit_progress rows with the new
// compute_unit_progress() function (which no longer counts pronunciation).
//
// Strategy: find every (student_id, unit_id) pair where the trigger has already
// produced a row, then call `compute_unit_progress` via RPC + write the new
// values back. Idempotent.
//
// Also handles the "orphan" case: if any student has submissions but no
// unit_progress row (none in current DB but the prompt requires the check),
// it will compute and INSERT a row for them.

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() { const env = {}; fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach(l => { const i = l.indexOf('='); if (i <= 0) return; let v = l.slice(i+1).trim(); if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); v=v.replace(/\\n$/,''); env[l.slice(0,i).trim()]=v }); return env }
const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function getPairs() {
  // From existing unit_progress rows
  const pairs = new Set()
  let from = 0
  const STEP = 1000
  while (true) {
    const { data, error } = await sb.from('unit_progress').select('student_id, unit_id').range(from, from + STEP - 1)
    if (error) throw error
    for (const r of data) pairs.add(`${r.student_id}|${r.unit_id}`)
    if (!data.length || data.length < STEP) break
    from += STEP
  }
  // Also from student_curriculum_progress (orphans)
  from = 0
  while (true) {
    const { data, error } = await sb.from('student_curriculum_progress').select('student_id, unit_id').eq('status', 'completed').range(from, from + STEP - 1)
    if (error) throw error
    for (const r of data) pairs.add(`${r.student_id}|${r.unit_id}`)
    if (!data.length || data.length < STEP) break
    from += STEP
  }
  return [...pairs].map(s => { const [student_id, unit_id] = s.split('|'); return { student_id, unit_id } })
}

;(async () => {
  const pairs = await getPairs()
  console.log(`Pairs to recompute: ${pairs.length}`)

  let updated = 0, inserted = 0, errors = 0
  for (let i = 0; i < pairs.length; i++) {
    const { student_id, unit_id } = pairs[i]
    // Call the function
    const { data: rows, error: rpcErr } = await sb.rpc('compute_unit_progress', { p_student_id: student_id, p_unit_id: unit_id })
    if (rpcErr || !rows || !rows.length) { errors++; console.error(`  ✗ ${student_id} ${unit_id}: ${rpcErr?.message || 'no rows'}`); continue }
    const r = rows[0]

    // Does unit_progress row exist?
    const { data: existing } = await sb.from('unit_progress').select('id').eq('student_id', student_id).eq('unit_id', unit_id).maybeSingle()
    if (existing) {
      const { error: updErr, data: upd } = await sb.from('unit_progress')
        .update({ numerator: r.numerator, denominator: r.denominator, percentage: r.percentage, breakdown: r.breakdown, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
      if (updErr || !upd?.length) { errors++; console.error(`  ✗ update ${existing.id}: ${updErr?.message}`); continue }
      updated++
    } else {
      const { error: insErr, data: ins } = await sb.from('unit_progress')
        .insert({ student_id, unit_id, numerator: r.numerator, denominator: r.denominator, percentage: r.percentage, breakdown: r.breakdown })
        .select()
      if (insErr || !ins?.length) { errors++; console.error(`  ✗ insert: ${insErr?.message}`); continue }
      inserted++
    }

    if ((i + 1) % 25 === 0) process.stdout.write(`  ${i + 1}/${pairs.length}\n`)
  }

  console.log(`\nBackfill result: updated=${updated}, inserted=${inserted}, errors=${errors}`)
  process.exit(errors === 0 ? 0 : 1)
})().catch(e => { console.error(e); process.exit(2) })
