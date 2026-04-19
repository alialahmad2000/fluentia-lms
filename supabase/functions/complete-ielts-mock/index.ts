// Fluentia LMS — complete-ielts-mock Edge Function
// Grades Reading+Listening objectively; evaluates Writing (Task1+Task2) and Speaking (Parts 1+2+3) via Claude/Whisper.
// New function — does NOT modify complete-ielts-diagnostic.
// Deploy: supabase functions deploy complete-ielts-mock --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

// ─── Shared: IELTS band conversion (same table as diagnostic) ───────────────
function rawToBand(correct: number, total: number): number {
  if (total === 0) return 0
  const scaled = Math.round((correct / total) * 40)
  if (scaled >= 39) return 9.0
  if (scaled >= 37) return 8.5
  if (scaled >= 35) return 8.0
  if (scaled >= 33) return 7.5
  if (scaled >= 30) return 7.0
  if (scaled >= 27) return 6.5
  if (scaled >= 23) return 6.0
  if (scaled >= 19) return 5.5
  if (scaled >= 15) return 5.0
  if (scaled >= 13) return 4.5
  if (scaled >= 10) return 4.0
  if (scaled >= 8) return 3.5
  if (scaled >= 6) return 3.0
  return 2.5
}

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2
}

// ─── Grade reading/listening objectively ────────────────────────────────────
function gradeObjective(
  contentList: Array<{ id: string; answer_key: unknown }> | null,
  studentAnswers: Record<string, string>
): { correct: number; total: number; band: number; wrong_question_ids: string[] } {
  let correct = 0
  let total = 0
  const wrong_question_ids: string[] = []

  for (const content of contentList || []) {
    const key = content.answer_key
    if (!key || typeof key !== 'object') continue
    for (const [qId, expected] of Object.entries(key as Record<string, unknown>)) {
      const entry = expected as Record<string, string> | string
      const correctAnswer = typeof entry === 'object' ? entry.answer : entry
      const studentAnswer = studentAnswers[qId]
      total++
      if (
        studentAnswer != null &&
        String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()
      ) {
        correct++
      } else {
        wrong_question_ids.push(qId)
      }
    }
  }

  return { correct, total, band: rawToBand(correct, total), wrong_question_ids }
}

// ─── Evaluate writing inline with Claude ────────────────────────────────────
async function evaluateWritingInline(
  text: string,
  taskType: 'ielts_task1' | 'ielts_task2'
): Promise<{ band: number; criteria: Record<string, number>; feedback_ar: string }> {
  if (!text || text.trim().length < 30) {
    return { band: 3.0, criteria: {}, feedback_ar: 'لم يتم تقديم إجابة كافية.' }
  }

  const isTask1 = taskType === 'ielts_task1'
  const criteriaKeys = isTask1
    ? ['task_achievement', 'coherence_cohesion', 'lexical_resource', 'grammatical_range']
    : ['task_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range']
  const firstCriteria = isTask1 ? 'Task Achievement' : 'Task Response'

  const prompt = `You are an expert IELTS Writing examiner. Evaluate this IELTS ${isTask1 ? 'Academic Task 1' : 'Task 2'} response and return ONLY valid JSON.

Student response:
${text.substring(0, 2000)}

Evaluate on IELTS 4 criteria (0.5-9.0 scale):
- ${firstCriteria}
- Coherence & Cohesion
- Lexical Resource
- Grammatical Range & Accuracy

Band descriptor reference: 5.0=limited/adequate, 6.0=competent, 6.5=competent+, 7.0=good, 7.5=good+

Return ONLY this JSON:
{
  "band": <overall band 0.5-9.0>,
  "${criteriaKeys[0]}": <score 0.5-9.0>,
  "coherence_cohesion": <score 0.5-9.0>,
  "lexical_resource": <score 0.5-9.0>,
  "grammatical_range": <score 0.5-9.0>,
  "feedback_ar": "<2-3 sentences in Arabic — strengths then what to improve>"
}`

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!resp.ok) return { band: 5.0, criteria: {}, feedback_ar: 'تم تقييم إجابتك.' }

  const respJson = await resp.json()
  const raw = respJson.content?.[0]?.text || '{}'
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1))
    const band = typeof parsed.band === 'number' ? Math.min(9, Math.max(0, parsed.band)) : 5.0
    const criteria: Record<string, number> = {}
    for (const k of criteriaKeys) {
      if (typeof parsed[k] === 'number') criteria[k] = parsed[k]
    }
    if (typeof parsed.coherence_cohesion === 'number') criteria.coherence_cohesion = parsed.coherence_cohesion
    if (typeof parsed.lexical_resource === 'number') criteria.lexical_resource = parsed.lexical_resource
    if (typeof parsed.grammatical_range === 'number') criteria.grammatical_range = parsed.grammatical_range
    return { band: roundToHalf(band), criteria, feedback_ar: parsed.feedback_ar || '' }
  } catch {
    return { band: 5.0, criteria: {}, feedback_ar: 'تم تقييم إجابتك.' }
  }
}

// ─── Transcribe audio via Whisper API ───────────────────────────────────────
async function transcribeAudio(supabase: ReturnType<typeof createClient>, audioPath: string): Promise<string> {
  if (!audioPath) return ''
  const { data: fileData, error } = await supabase.storage
    .from('ielts-speaking-submissions')
    .download(audioPath)
  if (error || !fileData) return ''

  const arrayBuffer = await fileData.arrayBuffer()
  const ext = audioPath.split('.').pop() || 'webm'
  const mime = ext === 'mp4' ? 'audio/mp4' : 'audio/webm'

  const formData = new FormData()
  formData.append('file', new Blob([arrayBuffer], { type: mime }), `audio.${ext}`)
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  })
  if (!resp.ok) return ''
  const json = await resp.json()
  return json.text || ''
}

// ─── Evaluate speaking part via Claude ──────────────────────────────────────
async function evaluateSpeakingPart(
  transcripts: string[],
  partNum: number,
  questions: string[]
): Promise<{ band: number; criteria: Record<string, number>; feedback_ar: string }> {
  const combinedTranscript = transcripts.filter(Boolean).join('\n\n')
  if (!combinedTranscript || combinedTranscript.trim().length < 10) {
    return { band: 3.5, criteria: {}, feedback_ar: 'لم يتم التعرف على إجابة واضحة.' }
  }

  const partLabel = partNum === 1 ? 'Part 1 (Introduction & Interview)'
    : partNum === 2 ? 'Part 2 (Long Turn / Cue Card)'
    : 'Part 3 (Two-way Discussion)'

  const prompt = `You are an expert IELTS Speaking examiner. Evaluate this ${partLabel} response and return ONLY valid JSON.

Questions: ${questions.slice(0, 5).join(' | ')}
Transcript: ${combinedTranscript.substring(0, 2000)}

Rate each IELTS criterion (0.5-9.0):
- Fluency & Coherence
- Lexical Resource
- Grammatical Range & Accuracy
- Pronunciation

Return ONLY this JSON:
{
  "band": <overall 0.5-9.0>,
  "fluency_coherence": <score>,
  "lexical_resource": <score>,
  "grammatical_range": <score>,
  "pronunciation": <score>,
  "feedback_ar": "<2-3 sentences Arabic feedback>"
}`

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!resp.ok) return { band: 5.0, criteria: {}, feedback_ar: 'تم تقييم إجابتك.' }

  const respJson = await resp.json()
  const raw = respJson.content?.[0]?.text || '{}'
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1))
    const band = typeof parsed.band === 'number' ? Math.min(9, Math.max(0, parsed.band)) : 5.0
    return {
      band: roundToHalf(band),
      criteria: {
        fluency_coherence: parsed.fluency_coherence || 5,
        lexical_resource: parsed.lexical_resource || 5,
        grammatical_range: parsed.grammatical_range || 5,
        pronunciation: parsed.pronunciation || 5,
      },
      feedback_ar: parsed.feedback_ar || '',
    }
  } catch {
    return { band: 5.0, criteria: {}, feedback_ar: 'تم تقييم إجابتك.' }
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const body = await req.json()
    const { attempt_id } = body
    if (!attempt_id) return jsonResponse({ error: 'attempt_id required' }, 400)

    // 1. Load attempt + mock test
    const { data: attempt, error: aErr } = await supabase
      .from('ielts_mock_attempts')
      .select('*, ielts_mock_tests(*)')
      .eq('id', attempt_id)
      .single()
    if (aErr || !attempt) return jsonResponse({ error: 'Attempt not found' }, 404)
    if (attempt.status === 'completed') {
      // Idempotent — return existing result
      if (attempt.result_id) {
        const { data: existingResult } = await supabase
          .from('ielts_student_results')
          .select('id, overall_band, reading_score, listening_score, writing_score, speaking_score')
          .eq('id', attempt.result_id)
          .single()
        if (existingResult) {
          return jsonResponse({
            result_id: existingResult.id,
            overall_band: existingResult.overall_band,
            reading_band: existingResult.reading_score,
            listening_band: existingResult.listening_score,
            writing_band: existingResult.writing_score,
            speaking_band: existingResult.speaking_score,
            comparison: null,
          })
        }
      }
      return jsonResponse({ error: 'Already completed' }, 409)
    }

    const mock = attempt.ielts_mock_tests
    if (!mock) return jsonResponse({ error: 'Mock test not found' }, 404)

    const testVariant = attempt.answers?.meta?.test_variant || 'academic'

    // 2. Load reading + listening content
    const [{ data: passages }, { data: listeningSections }] = await Promise.all([
      supabase.from('ielts_reading_passages')
        .select('id, answer_key')
        .in('id', mock.reading_passage_ids || []),
      supabase.from('ielts_listening_sections')
        .select('id, answer_key')
        .eq('test_id', mock.listening_test_id),
    ])

    // 3. Auto-grade Reading
    const readingResult = gradeObjective(passages, attempt.answers?.reading || {})

    // 4. Auto-grade Listening
    const listeningResult = gradeObjective(listeningSections, attempt.answers?.listening || {})

    // 5. AI-grade Writing — Task1 + Task2 in parallel
    const task1Text = attempt.writing_task1_submission || attempt.answers?.writing?.task1 || ''
    const task2Text = attempt.writing_task2_submission || attempt.answers?.writing?.task2 || ''

    const [writingT1, writingT2] = await Promise.all([
      task1Text.trim().length > 30 ? evaluateWritingInline(task1Text, 'ielts_task1') : Promise.resolve(null),
      task2Text.trim().length > 30 ? evaluateWritingInline(task2Text, 'ielts_task2') : Promise.resolve(null),
    ])

    const writingBands = [writingT1?.band, writingT2?.band].filter((b): b is number => b != null)
    const writingBand = writingBands.length
      ? roundToHalf(writingBands.reduce((a, b) => a + b, 0) / writingBands.length)
      : null

    // 6. AI-grade Speaking — Parts 1, 2, 3
    const speakingData = attempt.speaking_submissions || {}
    const speakingQuestions = mock.speaking_questions || {}
    const speakingPerPart: Record<string, unknown> = {}

    // Build part configs
    const partConfigs = [
      { key: 'part1', num: 1 },
      { key: 'part2', num: 2 },
      { key: 'part3', num: 3 },
    ]

    for (const { key, num } of partConfigs) {
      const partData = speakingData[key]
      if (!partData) continue

      // Collect audio paths and transcripts for this part
      const audioPaths: string[] = Array.isArray(partData.audio_paths)
        ? partData.audio_paths
        : (partData.audio_path ? [partData.audio_path] : [])

      let transcripts: string[] = Array.isArray(partData.transcripts)
        ? partData.transcripts
        : (partData.transcript ? [partData.transcript] : [])

      // If no transcripts yet, transcribe from audio
      if (transcripts.filter(Boolean).length === 0 && audioPaths.length > 0) {
        transcripts = await Promise.all(audioPaths.map(p => transcribeAudio(supabase, p)))
      }

      // Get question context
      const partQuestions = (() => {
        const pq = speakingQuestions[key]
        if (!pq) return []
        if (Array.isArray(pq)) return pq.flatMap(row => Array.isArray(row.questions) ? row.questions.map((q: unknown) => typeof q === 'string' ? q : (q as { q: string }).q) : [])
        if (pq.questions) return (Array.isArray(pq.questions) ? pq.questions : []).map((q: unknown) => typeof q === 'string' ? q : (q as { q: string }).q)
        return []
      })()

      const evalResult = await evaluateSpeakingPart(transcripts.filter(Boolean), num, partQuestions)
      speakingPerPart[key] = { ...evalResult, transcripts }
    }

    const partBands = Object.values(speakingPerPart)
      .map((x: unknown) => (x as { band: number }).band)
      .filter((b): b is number => b != null)
    const speakingBand = partBands.length
      ? roundToHalf(partBands.reduce((a, b) => a + b, 0) / partBands.length)
      : null

    // 7. Overall band (average of available skills, rounded to 0.5)
    const skillBands = {
      reading: readingResult.band,
      listening: listeningResult.band,
      writing: writingBand,
      speaking: speakingBand,
    }
    const validBands = Object.values(skillBands).filter((b): b is number => b != null)
    const overallBand = validBands.length
      ? roundToHalf(validBands.reduce((a, b) => a + b, 0) / validBands.length)
      : 0

    // 8. Strengths/weaknesses
    const entries = Object.entries(skillBands).filter(([, b]) => b != null) as [string, number][]
    entries.sort(([, a], [, b]) => b - a)
    const skillAr: Record<string, string> = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }
    const strengths = entries.slice(0, 2).map(([s]) => skillAr[s] || s)
    const weaknesses = entries.slice(-2).reverse().map(([s]) => skillAr[s] || s)

    // 9. Insert ielts_student_results
    const { data: resultRow, error: rErr } = await supabase
      .from('ielts_student_results')
      .insert({
        student_id: attempt.student_id,
        mock_test_id: mock.id,
        result_type: 'mock',
        test_variant: testVariant,
        reading_score: readingResult.band,
        reading_details: readingResult,
        listening_score: listeningResult.band,
        listening_details: listeningResult,
        writing_score: writingBand,
        writing_feedback: {
          task1: writingT1 ? { band: writingT1.band, criteria: writingT1.criteria, feedback_ar: writingT1.feedback_ar } : null,
          task2: writingT2 ? { band: writingT2.band, criteria: writingT2.criteria, feedback_ar: writingT2.feedback_ar } : null,
        },
        speaking_score: speakingBand,
        speaking_feedback: { per_part: speakingPerPart },
        overall_band: overallBand,
        strengths,
        weaknesses,
        recommendations: [
          weaknesses[0] ? `ركّز على تحسين ${weaknesses[0]} أولاً` : 'واصل التدريب المنتظم',
          `band هدفك القادم: ${roundToHalf(overallBand + 0.5)}`,
        ],
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (rErr || !resultRow) throw rErr || new Error('Failed to write result')

    // 10. Update attempt status
    const { data: updatedAttempt, error: upErr } = await supabase
      .from('ielts_mock_attempts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_id: resultRow.id,
      })
      .eq('id', attempt.id)
      .select('id')
      .single()
    if (upErr || !updatedAttempt) throw upErr || new Error('Failed to update attempt status')

    // 11. Write ai_usage entries (2 writing + up to 3 speaking)
    const usageRows = []
    if (writingT1) usageRows.push({ student_id: attempt.student_id, type: 'writing_evaluation', feature_key: 'ielts_mock_task1', metadata: { attempt_id } })
    if (writingT2) usageRows.push({ student_id: attempt.student_id, type: 'writing_evaluation', feature_key: 'ielts_mock_task2', metadata: { attempt_id } })
    for (const key of ['part1', 'part2', 'part3']) {
      if (speakingPerPart[key]) usageRows.push({ student_id: attempt.student_id, type: 'speaking_analysis', feature_key: `ielts_mock_${key}`, metadata: { attempt_id } })
    }
    if (usageRows.length > 0) {
      await supabase.from('ai_usage').insert(usageRows)
    }

    // 12. Comparison with previous mock
    const { data: prev } = await supabase
      .from('ielts_student_results')
      .select('overall_band, completed_at')
      .eq('student_id', attempt.student_id)
      .eq('result_type', 'mock')
      .neq('id', resultRow.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return jsonResponse({
      result_id: resultRow.id,
      overall_band: overallBand,
      reading_band: readingResult.band,
      listening_band: listeningResult.band,
      writing_band: writingBand,
      speaking_band: speakingBand,
      comparison: prev
        ? { previous_band: prev.overall_band, delta: +(overallBand - Number(prev.overall_band)).toFixed(1) }
        : null,
    })
  } catch (err) {
    console.error('complete-ielts-mock error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})
