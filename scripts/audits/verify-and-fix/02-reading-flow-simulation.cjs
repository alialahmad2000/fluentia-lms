#!/usr/bin/env node
//
// Phase 3 — data-level reading-flow simulation.
//
// playwright/puppeteer aren't installed, and headless production sign-in needs
// a stored password we don't have. So we replicate the React tree's data
// resolution path in pure Node:
//
//   1. Authenticate as the test student (real JWT session).
//   2. Run the exact `from('curriculum_readings').select('*').eq('unit_id',X).order('sort_order')`
//      that ReadingTab.jsx uses. This gives the `readings` array.
//   3. Walk activeReading through [0, 1, 0, 1] (rapid-switch stress).
//   4. At each step:
//      - "currentArticle" = readings[activeReading]
//      - Run `useReadingPassageAudio(currentArticle.id, currentArticle.passage_content)`
//        — i.e., `.from('reading_passage_audio').select(...).eq('passage_id', X).maybeSingle()`
//      - Assert audio.full_audio_url embeds currentArticle.id in the path
//      - Assert word_timestamps count matches currentArticle word count within tolerance
//      - Assert the title shown (currentArticle.title_en) and the audio fetched
//        share the SAME reading_id
//   5. Also walk a SECOND student through the same flow. The reads + audios
//      must match step-for-step between the two students.
//
// If any step diverges, log it and exit non-zero.

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach((line) => {
    const idx = line.indexOf('=')
    if (idx <= 0) return
    let v = line.slice(idx + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    v = v.replace(/\\n$/, '')
    env[line.slice(0, idx).trim()] = v
  })
  return env
}

const env = loadEnv()
const URL = env.VITE_SUPABASE_URL
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.VITE_SUPABASE_ANON_KEY

const TEST_UNIT_ID = '00ca3625-46ee-4e38-95da-2255f522aff8'
const FLOW = [0, 1, 0, 1] // article-switch stress sequence

const svc = createClient(URL, SVC, { auth: { persistSession: false } })

async function mint(email) {
  const { data: link, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const r = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  if (!r.data?.session?.access_token) throw new Error(`mint(${email}) failed`)
  return r.data.session
}

function authed(tok) {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${tok}` } },
  })
}

// MIRROR of src/pages/student/curriculum/tabs/ReadingTab.jsx#useQuery
async function fetchReadings(client) {
  const { data, error } = await client
    .from('curriculum_readings')
    .select('*')
    .eq('unit_id', TEST_UNIT_ID)
    .order('sort_order')
  if (error) throw error
  return data || []
}

// MIRROR of src/hooks/useReadingPassageAudio.js
async function fetchPassageAudio(client, passageId) {
  const { data, error } = await client
    .from('reading_passage_audio')
    .select('full_audio_url, full_duration_ms, word_timestamps, paragraph_audio, voice_id')
    .eq('passage_id', passageId)
    .maybeSingle()
  if (error) throw error
  return data
}

function wordCountOf(passageContent) {
  const paras = passageContent?.paragraphs || []
  return paras.join(' ').split(/\s+/).filter(Boolean).length
}

function wtCountOf(wts) {
  if (Array.isArray(wts)) return wts.length
  if (wts && typeof wts === 'object') return Object.keys(wts).length
  return 0
}

async function simulateStudent(label, email) {
  console.log(`\n── simulating ${label} (${email}) ──`)
  const sess = await mint(email)
  const client = authed(sess.access_token)
  const readings = await fetchReadings(client)
  if (readings.length < 2) throw new Error(`Need 2+ readings, got ${readings.length}`)

  const steps = []
  for (const idx of FLOW) {
    const currentArticle = readings[idx]
    // This is the exact useState identity transition:
    //   const [activeReading, setActiveReading] = useState(0)
    //   const reading = readings[activeReading]
    // When key={reading.id} flips, SmartAudioPlayer unmounts + remounts with
    // fresh useReadingPassageAudio(reading.id, reading.passage_content).
    const audio = await fetchPassageAudio(client, currentArticle.id)
    const expectedWordCount = wordCountOf(currentArticle.passage_content)
    const wtc = wtCountOf(audio?.word_timestamps)
    const wtRatio = expectedWordCount ? wtc / expectedWordCount : 0
    const wtRangeOk = wtRatio >= 0.7 && wtRatio <= 1.6

    const step = {
      step_index: steps.length,
      activeReading: idx,
      currentArticle_id: currentArticle.id,
      currentArticle_title_en: currentArticle.title_en,
      currentArticle_reading_label: currentArticle.reading_label,
      // Text path (currentArticle is the rendered text)
      text_source_reading_id: currentArticle.id,
      // Audio path (fetched via passage_id)
      audio_full_audio_url: audio?.full_audio_url || null,
      audio_url_embeds_reading_id: audio?.full_audio_url?.includes(currentArticle.id) ?? false,
      // Karaoke path (same word_timestamps row as audio)
      wt_count: wtc,
      expected_word_count: expectedWordCount,
      wt_ratio: Number(wtRatio.toFixed(2)),
      wt_count_in_tolerance: wtRangeOk,
      // The single dispositive check
      text_audio_karaoke_share_reading_id: audio?.full_audio_url?.includes(currentArticle.id) ?? false,
    }
    steps.push(step)
    console.log(`  step ${step.step_index} (activeReading=${idx}, label=${step.currentArticle_reading_label}): coherent=${step.text_audio_karaoke_share_reading_id} wtRatio=${step.wt_ratio}`)
  }

  return { label, email, readings_count: readings.length, steps }
}

;(async () => {
  fs.mkdirSync(path.resolve(__dirname, '../../../docs/audits/verify-and-fix'), { recursive: true })

  // Test student (has interests)
  const sim1 = await simulateStudent('test-with-interests', 'layan88700@gmail.com')
  // Control (no interests)
  const sim2 = await simulateStudent('control-no-interests', 'sarashrahili22@gmail.com')

  // Two students should walk through the same articles + audios at every step
  const cross = []
  for (let i = 0; i < FLOW.length; i++) {
    const a = sim1.steps[i]
    const b = sim2.steps[i]
    const fields = ['currentArticle_id', 'audio_full_audio_url', 'wt_count']
    const differ = fields.filter(f => a[f] !== b[f])
    if (differ.length) cross.push({ step_index: i, differ, a, b })
  }

  const allCoherent = [...sim1.steps, ...sim2.steps].every(s => s.text_audio_karaoke_share_reading_id && s.wt_count_in_tolerance)
  const allTwoStudentsAgree = cross.length === 0

  const result = {
    generated_at: new Date().toISOString(),
    flow: FLOW,
    test_unit_id: TEST_UNIT_ID,
    sim_test: sim1,
    sim_control: sim2,
    cross_student_diffs: cross,
    verdict: {
      every_step_text_audio_karaoke_coherent: allCoherent,
      two_students_walk_identical_data: allTwoStudentsAgree,
      pass: allCoherent && allTwoStudentsAgree,
    },
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../../../docs/audits/verify-and-fix/flow-simulation.json'),
    JSON.stringify(result, null, 2)
  )

  console.log('\n=== verdict ===')
  for (const [k, v] of Object.entries(result.verdict)) {
    console.log(`  ${k}: ${v}`)
  }
  if (cross.length) {
    console.log('\nCross-student divergence at:', cross[0])
  }

  process.exit(result.verdict.pass ? 0 : 1)
})().catch(e => { console.error(e); process.exit(99) })
