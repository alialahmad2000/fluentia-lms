// Fluentia LMS — Evaluate Speaking Edge Function (Bulletproof v2)
// Layers: atomic claim → Whisper (60s timeout) → Claude (60s timeout) → status update → notify
// Deploy: supabase functions deploy evaluate-speaking --no-verify-jwt
// Env: OPENAI_API_KEY, CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

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

// AbortController wrapper with 60s timeout
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 60000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    return res
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`)
    throw e
  } finally {
    clearTimeout(timer)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Parse body ──
  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const { recording_id, source } = body
  if (!recording_id) return jsonResponse({ error: 'recording_id required' }, 400)

  // ── Auth ──
  // Sweeper calls arrive with the service role key — bypass user JWT check
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  const isSweeperCall = source === 'sweeper' && token === SERVICE_KEY

  if (!isSweeperCall) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    // Verify student owns the recording (skip for trainers/admins checked below)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'student') {
      const { data: rec } = await supabase
        .from('speaking_recordings')
        .select('student_id')
        .eq('id', recording_id)
        .single()
      if (rec?.student_id !== user.id) return jsonResponse({ error: 'Forbidden' }, 403)
    }
  }

  // ── Fetch recording ──
  const { data: recording, error: recError } = await supabase
    .from('speaking_recordings')
    .select('*')
    .eq('id', recording_id)
    .single()

  if (recError || !recording) {
    return jsonResponse({ error: 'Recording not found' }, 404)
  }

  // ── Already completed — skip ──
  if (recording.evaluation_status === 'completed') {
    return jsonResponse({ skipped: true, reason: 'already_completed' })
  }

  const existingAttempts = recording.evaluation_attempts ?? 0

  // ── Atomic claim: set status to 'evaluating' ──
  const { data: claimed } = await supabase
    .from('speaking_recordings')
    .update({
      evaluation_status: 'evaluating',
      last_attempt_at: new Date().toISOString(),
      evaluation_attempts: existingAttempts + 1,
    })
    .eq('id', recording_id)
    .in('evaluation_status', ['pending', 'failed_retrying', 'evaluating'])
    .select()
    .maybeSingle()

  if (!claimed) {
    // Another worker already claimed this row
    return jsonResponse({ skipped: true, reason: 'claimed_by_other_worker' })
  }

  const attemptNumber = existingAttempts + 1

  // ── Helper: mark failure and optionally escalate ──
  async function markFailure(errMsg: string) {
    const isFinal = attemptNumber >= 5
    await supabase
      .from('speaking_recordings')
      .update({
        evaluation_status: isFinal ? 'failed_manual' : 'failed_retrying',
        last_error: String(errMsg).slice(0, 500),
      })
      .eq('id', recording_id)

    if (isFinal) {
      // Find trainer via student → group → trainer
      const { data: studentRow } = await supabase
        .from('students')
        .select('group_id, groups(trainer_id)')
        .eq('id', recording.student_id)
        .maybeSingle()

      const trainerId = (studentRow?.groups as any)?.trainer_id
      if (trainerId) {
        await supabase.from('notifications').insert({
          user_id: trainerId,
          type: 'speaking_needs_manual_review',
          title: 'تسجيل يحتاج مراجعة يدوية',
          body: `تعذّر التقييم التلقائي بعد 5 محاولات — اضغط للمراجعة`,
          data: {
            recording_id,
            student_id: recording.student_id,
            unit_id: recording.unit_id,
          },
        })
      }
    }

    return jsonResponse({ ok: false, retried: !isFinal, attempt: attemptNumber, error: errMsg })
  }

  // ── Lookup context ──
  let unitTitle = 'Speaking Activity'
  let studentLevel = 1
  const { data: unitData } = await supabase
    .from('curriculum_units')
    .select('title_en, level:curriculum_levels(level_number)')
    .eq('id', recording.unit_id)
    .maybeSingle()
  if (unitData?.title_en) unitTitle = unitData.title_en
  if ((unitData?.level as any)?.level_number) studentLevel = (unitData?.level as any).level_number

  // Fallback: get level from student row directly
  if (studentLevel === 1) {
    const { data: studentRow } = await supabase
      .from('students')
      .select('academic_level, groups(level)')
      .eq('id', recording.student_id)
      .maybeSingle()
    const directLevel = studentRow?.academic_level ?? (studentRow?.groups as any)?.level
    if (directLevel) studentLevel = directLevel
  }

  let topicPrompt = ''
  const { data: speakingTopic } = await supabase
    .from('curriculum_speaking')
    .select('prompt_en')
    .eq('unit_id', recording.unit_id)
    .order('sort_order')
    .limit(1)
    .maybeSingle()
  if (speakingTopic?.prompt_en) topicPrompt = speakingTopic.prompt_en

  // ── Download audio via storage (service role — no signed URL expiry) ──
  let audioBytes: Uint8Array
  let mimeType = recording.audio_format || 'audio/webm'

  if (recording.audio_path) {
    const { data: audioBlob, error: dlErr } = await supabase.storage
      .from('voice-notes')
      .download(recording.audio_path)
    if (dlErr || !audioBlob) return markFailure(`Audio download failed: ${dlErr?.message}`)
    audioBytes = new Uint8Array(await audioBlob.arrayBuffer())
    mimeType = audioBlob.type || mimeType
  } else if (recording.audio_url) {
    // Fallback to URL (may be expired if old)
    const r = await fetch(recording.audio_url).catch(e => null)
    if (!r?.ok) return markFailure(`Audio fetch from URL failed: status ${r?.status}`)
    audioBytes = new Uint8Array(await r.arrayBuffer())
    mimeType = r.headers.get('content-type') || mimeType
  } else {
    return markFailure('No audio_path or audio_url found on recording')
  }

  // ── Whisper transcription (60s timeout) ──
  const ext =
    mimeType.includes('mp4')  ? 'mp4'  :
    mimeType.includes('m4a')  ? 'm4a'  :
    mimeType.includes('wav')  ? 'wav'  :
    mimeType.includes('webm') ? 'webm' :
    mimeType.includes('mpeg') ? 'mp3'  : 'webm'

  let transcript = ''
  const durationSec = recording.audio_duration_seconds || 0

  if (!OPENAI_API_KEY) return markFailure('OPENAI_API_KEY not set')

  try {
    const formData = new FormData()
    formData.append('file', new Blob([audioBytes], { type: mimeType }), `recording.${ext}`)
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')
    formData.append('response_format', 'verbose_json')

    const whisperRes = await fetchWithTimeout(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      },
      60000
    )

    if (!whisperRes.ok) {
      const errText = await whisperRes.text()
      return markFailure(`Whisper ${whisperRes.status}: ${errText.slice(0, 200)}`)
    }

    const whisperJson = await whisperRes.json()
    transcript = (whisperJson.text || '').trim()

    // Log usage
    const minutes = Math.max(1, durationSec) / 60
    await supabase.from('ai_usage').insert({
      type: 'whisper_transcription',
      student_id: recording.student_id,
      model: 'whisper-1',
      audio_seconds: durationSec,
      estimated_cost_sar: (minutes * 0.006 * 3.75).toFixed(4),
    })
  } catch (e: any) {
    return markFailure(`Whisper error: ${e.message}`)
  }

  if (!transcript) return markFailure('Whisper returned empty transcript')

  // ── Claude evaluation (60s timeout) ──
  if (!CLAUDE_API_KEY) return markFailure('CLAUDE_API_KEY not set')

  const LEVEL_DESCRIPTORS: Record<number, string> = {
    1: 'A1 Beginner — expects very simple sentences, basic vocabulary (family, food, daily routine). Grammatical errors are normal. A score of 5 means good for this level.',
    2: 'A2 Elementary — expects short responses on everyday topics. Some variety in vocabulary. A score of 5 means meeting expectations.',
    3: 'B1 Intermediate — expects connected speech on familiar topics, use of linking words, some complex sentences. Hold to higher standards.',
    4: 'B2 Upper-intermediate — expects detailed responses, variety of tenses, nuanced vocabulary. Accuracy matters more.',
    5: 'C1 Advanced — expects complex, well-structured speech with nuanced expression. Near-native accuracy expected.',
  }
  const levelDesc = LEVEL_DESCRIPTORS[studentLevel] || LEVEL_DESCRIPTORS[1]
  const wordCount = transcript.split(/\s+/).filter(Boolean).length
  const wordsPerMinute = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0

  const systemPrompt = `You are a strict but encouraging ESL speaking examiner at Fluentia Academy (Saudi Arabia). You evaluate Arabic-speaking students' spoken English from Whisper transcripts.

MANDATORY PROCESS — follow in order:
Step 1 ANALYZE: Before scoring ANYTHING, quote 3 specific phrases from the transcript as evidence of strengths, and 3 specific phrases as evidence of weaknesses. This analysis must appear in the "analysis" field.
Step 2 SCORE: Use your quoted evidence to justify each dimension score. Scores must be derivable from the quoted evidence.
Step 3 COMPUTE: overall_score = (grammar_score×0.25 + vocabulary_score×0.20 + fluency_score×0.30 + task_completion_score×0.25), rounded to one decimal.

SCORING — use 0.5 increments (e.g. 5.5, 6.5, 7.5). Do NOT round everything to whole numbers.

GRAMMAR (0-10):
0-2: No control of basic structures. Every sentence has errors.
3-4: Frequent errors in basic tenses and agreement. Only present simple, often wrong.
5-6: Basic structures mostly correct. Attempts past/future tense with some errors.
7-8: Good control. Occasional errors in complex grammar. Uses multiple tenses.
9-10: Near-native accuracy. Complex structures used correctly.

VOCABULARY (0-10):
0-2: Fewer than 20 unique words. Cannot express basic ideas.
3-4: Very limited range. Heavy repetition. No descriptive language.
5-6: Adequate. Some repetition but gets meaning across. Mostly high-frequency words.
7-8: Good range. Some less common words and collocations.
9-10: Rich, precise, idiomatic throughout.

FLUENCY (0-10):
0-2: Cannot produce connected speech. Isolated words only.
3-4: Very hesitant. Long pauses. Under 40 words per minute.
5-6: Noticeable hesitation but completes thoughts. 40-80 wpm.
7-8: Generally smooth. 80-120 wpm. Uses some linking words.
9-10: Natural flow. Self-corrects smoothly. Over 120 wpm.

TASK COMPLETION (0-10):
0-2: Does not address topic at all.
3-4: Barely touches topic. Under 3 sentences.
5-6: Addresses topic superficially. Some relevant content.
7-8: Good coverage. Provides details and examples.
9-10: Thorough, well-developed, clear structure.

⚠️ ANTI-CONVERGENCE: Do not default to mid-range scores. Use the full 1–10 range based on the rubric. A student speaking far below their level should score 3–4. A student exceeding their level should score 9–10. A whole number score of 7 requires quoted-phrase justification.

CALIBRATION:
- A1 student, 20 words, multiple errors, topic barely addressed → overall ≈ 3.5
- A1 student, 60 words, basic but mostly correct, addresses topic → overall ≈ 5.5
- B1 student, 100 words, good variety, minor errors, well-structured → overall ≈ 7.5

Student level context: ${levelDesc}
Whisper may introduce minor transcription artifacts — do not penalize obvious Whisper errors.
All Arabic text: Modern Standard Arabic or simple colloquial. Be warm but honest.
The word "AI" must never appear in Arabic-facing text.`

  const userPrompt = `Evaluate this student's speaking recording.

Topic: ${unitTitle}${topicPrompt ? `\nPrompt given to student: ${topicPrompt}` : ''}
Student Level: L${studentLevel}
Audio Duration: ${durationSec} seconds
Word Count: ${wordCount} words
Speaking Rate: ${wordsPerMinute} words/minute
Transcript:
"""
${transcript}
"""

Respond ONLY with valid JSON (no markdown, no backticks, no explanation outside the JSON):
{
  "level_context": "Level ${studentLevel} (${(LEVEL_DESCRIPTORS[studentLevel] || LEVEL_DESCRIPTORS[1]).split(' — ')[0]})",
  "analysis": {
    "strengths": ["<quoted phrase from transcript + why it is good>", "<quoted phrase>", "<quoted phrase>"],
    "weaknesses": ["<quoted phrase from transcript + what is wrong>", "<quoted phrase>", "<quoted phrase>"]
  },
  "grammar_score": 0,
  "vocabulary_score": 0,
  "fluency_score": 0,
  "task_completion_score": 0,
  "overall_score": 0,
  "score_justification": "<1 sentence tying overall_score to specific evidence quoted above>",
  "corrected_transcript": "<student content rewritten with correct grammar and better vocabulary>",
  "errors": [{"spoken": "", "corrected": "", "rule": "<Arabic explanation>", "category": "grammar|vocabulary"}],
  "better_expressions": [{"basic": "", "natural": "", "context": "<Arabic usage note>"}],
  "fluency_tips": ["<Arabic practical tip>"],
  "model_answer": "<How a good L${studentLevel} speaker would answer — 2-3 sentences>",
  "strengths": "<Arabic — warm, specific praise for what they did well>",
  "improvement_tip": "<Arabic — ONE specific next step>",
  "feedback_ar": "<Arabic summary — 3-4 sentences covering strengths, areas to improve, encouragement>",
  "feedback_en": "<English summary>",
  "suggestions": ["<actionable tip 1>", "<actionable tip 2>"]
}`

  let aiEvaluation: any = null

  try {
    const claudeRes = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          temperature: 0.2,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      },
      60000
    )

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return markFailure(`Claude ${claudeRes.status}: ${errText.slice(0, 200)}`)
    }

    const claudeData = await claudeRes.json()
    const responseText: string = claudeData.content?.[0]?.text || ''
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    // Robust JSON extraction
    const start = responseText.indexOf('{')
    const end   = responseText.lastIndexOf('}') + 1
    if (start === -1 || end <= start) return markFailure('Claude returned no JSON object')

    try {
      aiEvaluation = JSON.parse(responseText.slice(start, end))
    } catch {
      // Try trimming trailing incomplete content
      const fallbackEnd = responseText.slice(0, end).lastIndexOf('}') + 1
      try {
        aiEvaluation = JSON.parse(responseText.slice(start, fallbackEnd))
      } catch {
        return markFailure('Claude JSON parse failed after repair attempt')
      }
    }

    // Validate scores are numbers in [1,10]
    const scoreKeys = ['grammar_score','vocabulary_score','fluency_score','task_completion_score']
    for (const k of scoreKeys) {
      const v = Number(aiEvaluation[k])
      if (isNaN(v) || v < 0 || v > 10) {
        return markFailure(`Invalid score for ${k}: ${aiEvaluation[k]}`)
      }
    }

    // Always recompute overall_score from subscores — prevents model-side anchoring
    const g = Number(aiEvaluation.grammar_score)
    const v = Number(aiEvaluation.vocabulary_score)
    const f = Number(aiEvaluation.fluency_score)
    const t = Number(aiEvaluation.task_completion_score)
    aiEvaluation.overall_score = Math.round((g * 0.25 + v * 0.20 + f * 0.30 + t * 0.25) * 10) / 10
    aiEvaluation.score = aiEvaluation.overall_score // legacy key
    aiEvaluation.transcript = transcript

    // Log usage
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
    await supabase.from('ai_usage').insert({
      type: 'speaking_analysis',
      student_id: recording.student_id,
      model: 'claude-sonnet-4-6',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      audio_seconds: durationSec,
      estimated_cost_sar: costSAR.toFixed(4),
    })
  } catch (e: any) {
    return markFailure(`Claude error: ${e.message}`)
  }

  // ── Save evaluation + mark completed ──
  const { error: updateError } = await supabase
    .from('speaking_recordings')
    .update({
      ai_evaluation: aiEvaluation,
      ai_evaluated_at: new Date().toISOString(),
      ai_model: 'claude-sonnet-4-6 + whisper-1',
      transcript: transcript,
      evaluation_status: 'completed',
      last_error: null,
    })
    .eq('id', recording_id)

  if (updateError) {
    console.error('[evaluate-speaking] Save error:', updateError.message)
  }

  // ── Notify student ──
  await supabase.from('notifications').insert({
    user_id: recording.student_id,
    type: 'speaking_evaluated',
    title: 'تم تقييم تسجيلك',
    body: 'تم التقييم — اضغط للاطلاع على النتيجة',
    data: {
      recording_id,
      unit_id: recording.unit_id,
      overall_score: aiEvaluation.overall_score,
    },
  })

  // ── Update curriculum progress ──
  if (aiEvaluation.overall_score) {
    const progressRow = {
      student_id: recording.student_id,
      unit_id: recording.unit_id,
      section_type: 'speaking',
      status: 'completed',
      score: aiEvaluation.overall_score * 10,
      completed_at: new Date().toISOString(),
    }
    const { data: existing } = await supabase
      .from('student_curriculum_progress')
      .select('id')
      .eq('student_id', recording.student_id)
      .eq('unit_id', recording.unit_id)
      .eq('section_type', 'speaking')
      .maybeSingle()

    if (existing) {
      await supabase.from('student_curriculum_progress')
        .update({ score: aiEvaluation.overall_score * 10 })
        .eq('id', existing.id)
    } else {
      await supabase.from('student_curriculum_progress')
        .insert(progressRow)
    }
  }

  return jsonResponse({ ok: true, evaluation: aiEvaluation, transcript })
})
