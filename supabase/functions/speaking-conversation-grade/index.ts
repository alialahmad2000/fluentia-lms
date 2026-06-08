// Fluentia LMS — Speaking Conversation: grader + completion writer
// Scores a finished conversation using the SAME rubric/shape as evaluate-speaking, then:
//   1) writes ONE summary speaking_recordings row (conversation_id link) so trainers + the
//      unit-progress trigger see the work and the student-facing AIEvaluationCard renders it,
//   2) upserts the student_curriculum_progress 'speaking' completion row EXACTLY like
//      evaluate-speaking does (status/score only — block_phantom_submission skips 'speaking'),
//   3) marks the conversation completed.
// Idempotent: an atomic in_progress→completed claim means a second call returns the existing
// result without re-grading or duplicating rows.
//
// Deploy: node scripts/_deploy-fn.cjs speaking-conversation-grade   (verify_jwt:false)
// Env: CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: s })

async function fetchWithTimeout(url: string, init: RequestInit, ms = 60000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...init, signal: ctrl.signal }) }
  catch (e: any) { if (e.name === 'AbortError') throw new Error(`timeout ${ms}ms`); throw e }
  finally { clearTimeout(t) }
}

const LEVEL_DESCRIPTORS: Record<number, string> = {
  1: 'A1 Beginner — expects very simple sentences, basic vocabulary. Grammatical errors are normal. A score of 5 means good for this level.',
  2: 'A2 Elementary — expects short responses on everyday topics. A score of 5 means meeting expectations.',
  3: 'B1 Intermediate — expects connected speech on familiar topics, linking words, some complex sentences.',
  4: 'B2 Upper-intermediate — expects detailed responses, variety of tenses, nuanced vocabulary.',
  5: 'C1 Advanced — expects complex, well-structured speech with nuanced expression.',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  let body: any
  try { body = await req.json() } catch { return json({ error: 'bad body' }, 400) }
  const { conversation_id } = body
  if (!conversation_id) return json({ error: 'conversation_id required' }, 400)

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)
  const studentId = user.id

  const { data: convo } = await sb.from('speaking_conversations').select('*').eq('id', conversation_id).maybeSingle()
  if (!convo) return json({ error: 'conversation not found' }, 404)
  if (convo.student_id !== studentId) return json({ error: 'Forbidden' }, 403)

  // Already graded → return existing
  if (convo.status === 'completed' && convo.ai_evaluation) {
    return json({ ok: true, evaluation: convo.ai_evaluation, recording_id: convo.speaking_recording_id, already: true })
  }

  // Need real conversation to grade
  const { data: turns } = await sb.from('speaking_conversation_turns')
    .select('*').eq('conversation_id', conversation_id).order('turn_index')
  const studentTurns = (turns || []).filter((t: any) => t.role === 'student' && t.content && t.content.trim())
  if (studentTurns.length < 2) {
    return json({ ok: false, reason: 'need_more', message: 'تحتاجين لتبادل بضع جُمل قبل إنهاء المحادثة' }, 200)
  }

  // ── Atomic claim: in_progress → completed (only the first caller proceeds) ──
  const { data: claimed } = await sb.from('speaking_conversations')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', conversation_id).eq('status', 'in_progress').select().maybeSingle()
  if (!claimed) {
    const { data: fresh } = await sb.from('speaking_conversations').select('ai_evaluation, speaking_recording_id').eq('id', conversation_id).maybeSingle()
    if (fresh?.ai_evaluation) return json({ ok: true, evaluation: fresh.ai_evaluation, recording_id: fresh.speaking_recording_id, already: true })
    return json({ ok: false, reason: 'claimed_by_other' }, 200)
  }

  async function revert(msg: string) {
    await sb.from('speaking_conversations').update({ status: 'in_progress', completed_at: null }).eq('id', conversation_id)
    return json({ ok: false, error: msg }, 200)
  }

  // ── Context (topic + level) ──
  let topic: any = null
  if (convo.speaking_id) {
    const { data } = await sb.from('curriculum_speaking').select('*').eq('id', convo.speaking_id).maybeSingle()
    topic = data
  }
  if (!topic) {
    const { data } = await sb.from('curriculum_speaking').select('*').eq('unit_id', convo.unit_id).order('sort_order').limit(1).maybeSingle()
    topic = data
  }
  let level = 1, unitTitle = topic?.title_en || 'Speaking Conversation'
  const { data: unitData } = await sb.from('curriculum_units').select('title_en, level:curriculum_levels(level_number)').eq('id', convo.unit_id).maybeSingle()
  if (unitData?.title_en) unitTitle = unitData.title_en
  if ((unitData?.level as any)?.level_number) level = (unitData?.level as any).level_number
  if (level === 1) {
    const { data: s } = await sb.from('students').select('academic_level').eq('id', studentId).maybeSingle()
    if (s?.academic_level) level = s.academic_level
  }
  const levelDesc = LEVEL_DESCRIPTORS[level] || LEVEL_DESCRIPTORS[1]

  // ── Build the dialogue + student-only transcript ──
  const dialogue = (turns || []).filter((t: any) => t.content).map((t: any) => `${t.role === 'ai' ? 'Coach' : 'Student'}: ${t.content}`).join('\n')
  const studentTranscript = studentTurns.map((t: any) => t.content.trim()).join(' ')
  const wordCount = studentTranscript.split(/\s+/).filter(Boolean).length

  // (no CLAUDE_API_KEY → tryGrade returns null → graceful fallback completion below)

  const systemPrompt = `You are a strict but encouraging ESL speaking examiner at Fluentia Academy (Saudi Arabia). You evaluate an Arabic-speaking student's spoken English from a transcript of a short CONVERSATION they had with an AI coach. Score ONLY the STUDENT's English (their own turns), judged for their level. The coach's lines are context only.

MANDATORY PROCESS:
Step 1 ANALYZE: Quote 3 specific phrases the STUDENT said as evidence of strengths, and 3 as evidence of weaknesses (put these in "analysis").
Step 2 SCORE each dimension, derivable from the quoted evidence. Use 0.5 increments.
Step 3 overall_score = grammar×0.25 + vocabulary×0.20 + fluency×0.30 + task_completion×0.25, rounded to one decimal.

Reward genuine engagement: a beginner who kept the conversation going, took turns, and tried to answer questions is doing well for their level. Do NOT over-penalize short turns — this is a live spoken conversation, not an essay. Whisper may add minor transcription artifacts — ignore those.

GRAMMAR/VOCABULARY/FLUENCY/TASK_COMPLETION are each 0–10. Use the full range; do not default to mid-range. For task_completion, judge how well the student engaged with the coach's questions and stayed on topic across the conversation.

Student level context: ${levelDesc}
All Arabic text: warm, simple, encouraging. The word "AI" must never appear in Arabic-facing text. Refer to the conversation as "محادثتك".`

  const userPrompt = `Evaluate this student's spoken English from their conversation.

Topic: ${unitTitle}${topic?.prompt_en ? `\nPrompt: ${topic.prompt_en}` : ''}
Student Level: L${level}
Student turns: ${studentTurns.length} | Student word count: ${wordCount}

Full conversation:
"""
${dialogue}
"""

Respond ONLY with valid JSON (no markdown, no backticks). Be CONCISE — short phrases, no long paragraphs:
{
  "analysis": { "strengths": ["<short quoted student phrase + why good>", "<quoted>"], "weaknesses": ["<short quoted phrase + what's off>", "<quoted>"] },
  "grammar_score": 0, "vocabulary_score": 0, "fluency_score": 0, "task_completion_score": 0, "overall_score": 0,
  "errors": [{"spoken": "", "corrected": "", "rule": "<short Arabic>", "category": "grammar|vocabulary"}],
  "better_expressions": [{"basic": "", "natural": "", "context": "<short Arabic>"}],
  "strengths": "<Arabic — warm specific praise, 1 sentence>",
  "improvement_tip": "<Arabic — ONE specific next step>",
  "feedback_ar": "<Arabic — 2-3 short sentences: what was good in محادثتك, one thing to improve, encouragement>"
}
Keep "errors" to AT MOST 3 and "better_expressions" to AT MOST 2 (only the most useful ones).`

  // Grade with Haiku (fast) + one retry. SUBMIT MUST NEVER FAIL: if grading can't complete,
  // fall back to a graceful engagement-based result so the conversation always finishes.
  let inT = 0, outT = 0
  async function tryGrade(): Promise<any | null> {
    if (!CLAUDE_API_KEY) return null
    try {
      const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1500, temperature: 0.2, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
      }, 35000)
      if (!r.ok) return null
      const j = await r.json()
      inT = j.usage?.input_tokens || 0; outT = j.usage?.output_tokens || 0
      const text: string = j.content?.[0]?.text || ''
      const s = text.indexOf('{'), e = text.lastIndexOf('}') + 1
      if (s === -1 || e <= s) return null
      try { return JSON.parse(text.slice(s, e)) } catch { try { return JSON.parse(text.slice(s, text.slice(0, e).lastIndexOf('}') + 1)) } catch { return null } }
    } catch { return null }
  }
  let aiEvaluation: any = (await tryGrade()) || (await tryGrade())
  let isFallback = false
  if (!aiEvaluation) {
    isFallback = true
    const vt = studentTurns.length
    const base = Math.round(Math.min(7.5, Math.max(5, 5 + vt * 0.3)) * 10) / 10
    aiEvaluation = {
      grammar_score: base, vocabulary_score: base, fluency_score: base, task_completion_score: base, overall_score: base,
      analysis: { strengths: [], weaknesses: [] }, errors: [], better_expressions: [], fluency_tips: [], suggestions: [],
      strengths: 'أكملتِ محادثة كاملة بالإنجليزي — هذا إنجاز جميل.',
      improvement_tip: 'واصلي التدرّب على المحادثة لتزداد طلاقتك.',
      feedback_ar: 'تم استلام محادثتك بنجاح! 🤍 تكلّمتِ بالإنجليزي اليوم وهذا أهم شيء. سيراجع معلّمك محادثتك ويعطيك ملاحظات أدق قريباً.',
      needs_review: true,
    }
  }

  // Recompute overall from subscores (anti-anchoring), attach transcript
  const g = Number(aiEvaluation.grammar_score) || 0
  const v = Number(aiEvaluation.vocabulary_score) || 0
  const f = Number(aiEvaluation.fluency_score) || 0
  const t = Number(aiEvaluation.task_completion_score) || 0
  aiEvaluation.overall_score = Math.round((g * 0.25 + v * 0.20 + f * 0.30 + t * 0.25) * 10) / 10
  aiEvaluation.score = aiEvaluation.overall_score
  aiEvaluation.transcript = studentTranscript
  aiEvaluation.mode = 'conversation'
  aiEvaluation.fallback = isFallback

  // ── Summary speaking_recordings row (trainer visibility + progress trigger) ──
  // Use the longest student turn's audio for playback.
  const longest = [...studentTurns].sort((a: any, b: any) => (b.audio_duration_seconds || 0) - (a.audio_duration_seconds || 0))[0]
  let signedUrl: string | null = null
  if (longest?.audio_path) {
    const { data: urlData } = await sb.storage.from('voice-notes').createSignedUrl(longest.audio_path, 60 * 60 * 24 * 365)
    signedUrl = urlData?.signedUrl || null
  }
  let recordingId: string | null = null
  if (signedUrl) {
    const { data: rec } = await sb.from('speaking_recordings').insert({
      student_id: studentId, unit_id: convo.unit_id, question_index: convo.question_index || 0,
      audio_url: signedUrl, audio_path: longest.audio_path,
      audio_duration_seconds: convo.total_speaking_seconds || longest.audio_duration_seconds || 0,
      ai_evaluation: aiEvaluation, ai_evaluated_at: new Date().toISOString(),
      ai_model: 'claude-haiku-4-5 + whisper-1 (conversation)',
      evaluation_status: 'completed', conversation_id,
    }).select('id').maybeSingle()
    recordingId = rec?.id || null
  }

  // ── Finalize the conversation row ──
  await sb.from('speaking_conversations').update({
    ai_evaluation: aiEvaluation, ai_evaluated_at: new Date().toISOString(),
    ai_model: 'claude-haiku-4-5 + whisper-1', score: aiEvaluation.overall_score,
    speaking_recording_id: recordingId, updated_at: new Date().toISOString(),
  }).eq('id', conversation_id)

  // ── Curriculum progress (mirror evaluate-speaking exactly — phantom guard skips 'speaking') ──
  const scoreOutOf100 = aiEvaluation.overall_score * 10
  const { data: existing } = await sb.from('student_curriculum_progress')
    .select('id').eq('student_id', studentId).eq('unit_id', convo.unit_id).eq('section_type', 'speaking').maybeSingle()
  if (existing) {
    await sb.from('student_curriculum_progress').update({ status: 'completed', score: scoreOutOf100, completed_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await sb.from('student_curriculum_progress').insert({
      student_id: studentId, unit_id: convo.unit_id, section_type: 'speaking',
      status: 'completed', score: scoreOutOf100, completed_at: new Date().toISOString(),
    })
  }

  // Usage log
  try {
    const costSAR = ((inT * 1 + outT * 5) / 1_000_000) * 3.75
    await sb.from('ai_usage').insert({ type: 'speaking_analysis', student_id: studentId, model: 'claude-haiku-4-5', input_tokens: inT, output_tokens: outT, estimated_cost_sar: costSAR.toFixed(4) })
  } catch { /* non-blocking */ }

  return json({
    ok: true, evaluation: aiEvaluation, recording_id: recordingId,
    your_words: studentTurns.map((t: any) => t.content.trim()),
    topic_title: unitTitle,
  })
})
