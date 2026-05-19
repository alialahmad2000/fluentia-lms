#!/usr/bin/env node
//
// Audio Drift Check — runs in <30s, exits non-zero if any row's stored
// source_text_hash differs from the hash of its current text.
//
// Used as a pre-deploy gate (`npm run predeploy:audio-drift`). If a transcript
// was rewritten without regenerating audio, this script catches it BEFORE
// students hit it in production — and BEFORE we burn ElevenLabs budget on
// reactive regen.
//
// Tables currently checked: curriculum_listening (transcript)
// Easy retrofit: curriculum_readings (passage text), curriculum_vocabulary
// (example_sentence) — add a row to TABLES_TO_CHECK after adding their
// source_text_hash columns via migration.
//
// Usage:
//   node scripts/audits/audio-drift-check.cjs            # human output, exit 1 on drift
//   node scripts/audits/audio-drift-check.cjs --json     # machine-readable
//   node scripts/audits/audio-drift-check.cjs --listening # listening only

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { sourceTextHash } = require('../lib/text-hash.cjs')

function loadEnv() { const env = {}; fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').split('\n').forEach(l => { const i = l.indexOf('='); if (i <= 0) return; let v = l.slice(i+1).trim(); if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); v=v.replace(/\\n$/,''); env[l.slice(0,i).trim()]=v }); return env }
const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const TABLES_TO_CHECK = [
  { table: 'curriculum_listening', text_field: 'transcript', label: 'listening' },
  // Future: { table: 'curriculum_readings', text_field: 'passage_content', label: 'reading' },
]

;(async () => {
  const args = process.argv.slice(2)
  const isJson = args.includes('--json')
  const onlyListening = args.includes('--listening')

  let totalDrifted = 0
  let totalMissingHash = 0
  let totalChecked = 0
  const drifted = []
  const missingHash = []

  for (const t of TABLES_TO_CHECK) {
    if (onlyListening && t.label !== 'listening') continue

    const { data, error } = await sb
      .from(t.table)
      .select(`id, unit_id, title_ar, ${t.text_field}, source_text_hash, audio_url, audio_generated_at`)
      .not('audio_url', 'is', null)
    if (error) {
      console.error(`Error querying ${t.table}: ${error.message}`)
      process.exit(2)
    }

    for (const row of data) {
      totalChecked++
      const current = sourceTextHash(row[t.text_field])
      const stored = row.source_text_hash

      if (!stored) {
        totalMissingHash++
        missingHash.push({ table: t.label, id: row.id, title: row.title_ar })
        continue
      }
      if (!current) continue // text empty — separate issue, not drift

      if (stored !== current) {
        totalDrifted++
        drifted.push({
          table: t.label,
          id: row.id,
          unit_id: row.unit_id,
          title: row.title_ar,
          audio_generated_at: row.audio_generated_at,
          stored_hash: stored.slice(0, 12),
          current_hash: current.slice(0, 12),
        })
      }
    }
  }

  const summary = {
    generated_at: new Date().toISOString(),
    tables_checked: TABLES_TO_CHECK.filter(t => !onlyListening || t.label === 'listening').map(t => t.label),
    total_rows_checked: totalChecked,
    drifted_count: totalDrifted,
    missing_hash_count: totalMissingHash,
    drifted_rows: drifted,
    missing_hash_rows: missingHash.slice(0, 20),
  }

  if (isJson) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`Audio drift check`)
    console.log(`  tables checked:    ${summary.tables_checked.join(', ')}`)
    console.log(`  rows checked:      ${totalChecked}`)
    console.log(`  drifted:           ${totalDrifted}`)
    console.log(`  missing baseline:  ${totalMissingHash}`)
    if (totalDrifted === 0 && totalMissingHash === 0) {
      console.log(`\n✅ No audio drift detected.`)
    } else if (totalDrifted === 0) {
      console.log(`\n⚠️  No drift, but ${totalMissingHash} rows have no baseline hash.`)
      console.log(`     Run \`node scripts/audits/listening-fix/03-backfill-hashes.cjs\` to populate.`)
    } else {
      console.log(`\n❌ ${totalDrifted} row(s) have audio that doesn't match current text:`)
      console.table(drifted)
      console.log(`\nTo fix: regenerate audio for these rows (and the generator will update the hash).`)
      console.log(`See: scripts/audits/listening-fix/03-backfill-hashes.cjs (after regeneration)`)
      console.log(`    or scripts/audits/audio-text-mismatch-fix/10-regen-drifted.mjs as a template.`)
    }
  }

  process.exit(totalDrifted > 0 ? 1 : 0)
})().catch(e => { console.error(e); process.exit(2) })
