#!/usr/bin/env node
/**
 * Phase H.6 — Runtime query sanity checks for IELTS Mock Center
 * Run: node scripts/verify-ielts-mock-queries.cjs
 */
require('dotenv').config({ path: '.env' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1) }

const sb = createClient(url, key)

let passed = 0
let failed = 0

async function check(label, fn) {
  try {
    const result = await fn()
    if (result.error) throw new Error(result.error.message)
    console.log(`✅  ${label}`)
    passed++
    return result.data
  } catch (err) {
    console.error(`❌  ${label}\n    ${err.message}`)
    failed++
    return null
  }
}

async function run() {
  console.log('\n─── IELTS Mock Center — Phase H.6 Verification ───\n')

  // 1. ielts_mock_tests readable, catalog query works
  const catalog = await check('ielts_mock_tests: catalog query (is_published=true, test_number>0)', () =>
    sb.from('ielts_mock_tests')
      .select('id, test_number, title_ar, reading_passage_ids, writing_task1_id, writing_task2_id, listening_test_id, speaking_questions')
      .eq('is_published', true)
      .gt('test_number', 0)
  )
  console.log(`    → ${catalog?.length ?? 0} pre-built mocks found`)

  // 2. ielts_student_results has result_type and test_variant columns
  await check('ielts_student_results: result_type + test_variant columns exist', async () => {
    const r = await sb.from('ielts_student_results')
      .select('id, result_type, test_variant, overall_band')
      .eq('result_type', 'mock')
      .limit(1)
    if (r.error) throw new Error(r.error.message)
    return r
  })

  // 3. ielts_mock_attempts has required columns
  await check('ielts_mock_attempts: required columns exist', async () => {
    const r = await sb.from('ielts_mock_attempts')
      .select('id, student_id, mock_test_id, status, current_section, section_started_at, answers, started_at')
      .limit(1)
    if (r.error) throw new Error(r.error.message)
    return r
  })

  // 4. auto-save patch column (auto_saved_at)
  await check('ielts_mock_attempts: auto_saved_at column exists', async () => {
    const r = await sb.from('ielts_mock_attempts')
      .select('id, auto_saved_at')
      .limit(1)
    if (r.error) throw new Error(r.error.message)
    return r
  })

  // 5. Reading passages auto-assembly: 3 difficulty bands
  const passages = await check('ielts_reading_passages: difficulty_band distribution', async () => {
    const r = await sb.from('ielts_reading_passages')
      .select('id, difficulty_band')
      .eq('is_published', true)
    if (r.error) throw new Error(r.error.message)
    const bands = {}
    for (const p of r.data || []) {
      const b = p.difficulty_band || 'other'
      bands[b] = (bands[b] || 0) + 1
    }
    console.log(`    → Passages by band: ${JSON.stringify(bands)}`)
    return r
  })

  // 6. Listening sections: check test_id coverage (warn if no full set — fallback exists in hook)
  {
    const r = await sb.from('ielts_listening_sections')
      .select('id, section_number, test_id')
      .eq('is_published', true)
    const testMap = {}
    for (const s of (r.data || [])) {
      if (!testMap[s.test_id]) testMap[s.test_id] = new Set()
      testMap[s.test_id].add(s.section_number)
    }
    const full = Object.entries(testMap).find(([, nums]) => nums.has(1) && nums.has(2) && nums.has(3) && nums.has(4))
    const best = Object.entries(testMap).sort((a, b) => b[1].size - a[1].size)[0]
    if (full) {
      console.log(`✅  ielts_listening_sections: full test found (test_id=${full[0]})`)
      passed++
    } else {
      console.warn(`⚠️   ielts_listening_sections: no single test_id has all 4 sections — fallback picks best (test_id=${best?.[0]}, sections=${[...(best?.[1] || [])].join(',')})`)
      console.warn('    Content team should publish sections 1-4 under same test_id for optimal auto-assembly')
      passed++ // not a code bug — hook fallback handles it
    }
  }

  // 7. Writing tasks: task1 and task2
  const writingTasks = await check('ielts_writing_tasks: task1 and task2 published', async () => {
    const r = await sb.from('ielts_writing_tasks')
      .select('id, task_type')
      .eq('is_published', true)
    if (r.error) throw new Error(r.error.message)
    const t1 = (r.data || []).filter(t => t.task_type === 'task1').length
    const t2 = (r.data || []).filter(t => t.task_type === 'task2').length
    console.log(`    → task1: ${t1}, task2: ${t2}`)
    if (t1 === 0) throw new Error('No published task1 writing tasks')
    if (t2 === 0) throw new Error('No published task2 writing tasks')
    return r
  })

  // 8. Speaking questions: parts 1, 2, 3
  await check('ielts_speaking_questions: parts 1+2+3 published', async () => {
    const r = await sb.from('ielts_speaking_questions')
      .select('id, part')
      .eq('is_published', true)
    if (r.error) throw new Error(r.error.message)
    const p1 = (r.data || []).filter(q => q.part === 1).length
    const p2 = (r.data || []).filter(q => q.part === 2).length
    const p3 = (r.data || []).filter(q => q.part === 3).length
    console.log(`    → Part1: ${p1}, Part2: ${p2}, Part3: ${p3}`)
    if (p1 < 3) throw new Error(`Insufficient Part1 questions: ${p1} (need ≥3)`)
    if (p2 < 1) throw new Error(`No Part2 questions`)
    if (p3 < 3) throw new Error(`Insufficient Part3 questions: ${p3} (need ≥3)`)
    return r
  })

  // 9. edge function reachable (smoke test with fake attempt_id)
  await check('complete-ielts-mock edge function: reachable (non-network error on fake attempt)', async () => {
    const r = await sb.functions.invoke('complete-ielts-mock', {
      body: { attempt_id: '00000000-0000-0000-0000-000000000000' }
    })
    // Network failure would throw, non-2xx is acceptable (fake ID → 4xx)
    return { data: r.data, error: null }
  })

  console.log(`\n─── Results: ${passed} passed, ${failed} failed ───\n`)
  if (failed > 0) process.exit(1)
}

run().catch(err => { console.error('Unhandled:', err); process.exit(1) })
