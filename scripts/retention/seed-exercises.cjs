#!/usr/bin/env node
/* eslint-disable no-console */
// Seed retention_exercises from template banks.
// Idempotent: skips rows where (level, skill, type, prompt_en) already exists.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=... BRANCH_REF=... node scripts/retention/seed-exercises.cjs
//
// Levels currently shipped: L1, L3 (active student levels).
// L0/L2/L4/L5 templates will land in a follow-up pass (see blockers.md).

const https = require('https')

const SOURCES = [
  { level: 'L1', mod: require('./templates/exercise-templates-L1.cjs') },
  { level: 'L3', mod: require('./templates/exercise-templates-L3.cjs') },
]

function pgEscape(s) {
  if (s == null) return 'NULL'
  // Use dollar-quoted string with a tag unlikely to appear in content
  const tag = '$x_' + Math.random().toString(36).slice(2, 6) + '_x$'
  return `${tag}${s}${tag}`
}

function pgJsonb(v) {
  if (v == null) return 'NULL'
  return `${pgEscape(JSON.stringify(v))}::jsonb`
}

function pgArrayText(arr) {
  if (!arr || arr.length === 0) return "'{}'::text[]"
  const escaped = arr.map(s => `"${String(s).replace(/"/g, '\\"')}"`).join(',')
  return `'{${escaped}}'::text[]`
}

function call(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 800)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

;(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const ref = process.env.BRANCH_REF
  if (!token || !ref) throw new Error('SUPABASE_ACCESS_TOKEN and BRANCH_REF env vars required')

  let total = 0
  let inserted = 0
  let skipped = 0

  for (const { level, mod } of SOURCES) {
    console.log(`\nSeeding ${level} (${mod.length} templates)...`)
    for (const t of mod) {
      total += 1
      // Check existence (skill+type+level+prompt_en is the natural key)
      const check = await call(token, ref,
        `SELECT id FROM public.retention_exercises WHERE level = '${level}' AND skill = '${t.skill}' AND exercise_type = '${t.type}' AND prompt_en = ${pgEscape(t.prompt_en)} LIMIT 1`
      )
      if (Array.isArray(check) && check.length > 0) {
        skipped += 1
        continue
      }

      const sql = `INSERT INTO public.retention_exercises
        (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds)
        VALUES (
          '${t.type}',
          '${level}',
          '${t.skill}',
          ${pgArrayText(t.topic_tags)},
          ${t.difficulty},
          ${pgEscape(t.prompt_en)},
          ${pgEscape(t.prompt_ar)},
          ${pgJsonb({ value: t.correct })},
          ${pgJsonb(t.distractors)},
          ${pgEscape(t.explanation_ar)},
          ${t.estimated_seconds || 60}
        )`
      try {
        await call(token, ref, sql)
        inserted += 1
        if (inserted % 10 === 0) console.log(`  ${inserted}/${total}...`)
      } catch (e) {
        console.error(`  FAILED on ${level} ${t.skill} "${t.prompt_en.slice(0, 60)}…":`, e.message.slice(0, 200))
      }
    }
  }

  const rollup = await call(token, ref,
    `SELECT level, skill, exercise_type, count(*) FROM public.retention_exercises GROUP BY level, skill, exercise_type ORDER BY level, skill, exercise_type`
  )
  console.log(`\nDone. Total templates: ${total}. Inserted: ${inserted}. Skipped (already exist): ${skipped}.`)
  console.log('Bank rollup:')
  for (const r of rollup) {
    console.log(`  ${r.level} ${r.skill.padEnd(8)} ${r.exercise_type.padEnd(20)} ${r.count}`)
  }
})()
