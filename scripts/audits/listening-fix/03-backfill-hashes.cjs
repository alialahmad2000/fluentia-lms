#!/usr/bin/env node
// Backfill source_text_hash for existing curriculum_listening rows.
//
// Treats the current (audio, transcript) pair as the baseline — assumes the
// audio currently matches the current transcript text. Future drift surfaces
// only when transcript is rewritten WITHOUT regenerating audio.
//
// Skips rows where source_text_hash is already populated (idempotent).
// Skips rows with no audio_url (nothing to baseline).

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { sourceTextHash } = require('../../lib/text-hash.cjs')

function loadEnv() { const env = {}; fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach(l => { const i = l.indexOf('='); if (i <= 0) return; let v = l.slice(i+1).trim(); if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); v=v.replace(/\\n$/,''); env[l.slice(0,i).trim()]=v }); return env }
const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  const { data: rows, error } = await sb
    .from('curriculum_listening')
    .select('id, transcript, audio_url, audio_generated_at, source_text_hash')
    .not('audio_url', 'is', null)
  if (error) throw error
  console.log(`Loaded ${rows.length} rows with audio_url`)

  let updated = 0, skipped = 0, missing_text = 0, errors = 0
  for (const r of rows) {
    if (r.source_text_hash) { skipped++; continue }
    const hash = sourceTextHash(r.transcript)
    if (!hash) { missing_text++; continue }

    const at = r.audio_generated_at || new Date().toISOString()
    const { error: updErr, data: upd } = await sb
      .from('curriculum_listening')
      .update({ source_text_hash: hash, source_text_hash_at: at })
      .eq('id', r.id)
      .select()
    if (updErr) { console.error(`  ✗ ${r.id}: ${updErr.message}`); errors++; continue }
    if (!upd || upd.length !== 1) { console.error(`  ✗ ${r.id}: update returned ${upd?.length || 0} rows`); errors++; continue }
    updated++
  }

  console.log(`\nBackfill result:`)
  console.log(`  updated:      ${updated}`)
  console.log(`  already_set:  ${skipped}`)
  console.log(`  missing_text: ${missing_text}`)
  console.log(`  errors:       ${errors}`)
  process.exit(errors === 0 ? 0 : 1)
})().catch(e => { console.error(e); process.exit(2) })
