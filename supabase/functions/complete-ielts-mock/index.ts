// Fluentia LMS — complete-ielts-mock (Atelier)
// Consolidates a completed mock attempt into ielts_student_results (type 'mock')
// + ielts_student_progress, so mocks show a band trend on the home + readiness.
// Mirrors complete-ielts-diagnostic: the segments already produced per-skill
// bands (reading/listening graded client-side; writing/speaking by AI edge fns);
// this reads them, re-grades reading/listening server-side for integrity, and
// updates progress ONLY for the skills actually attempted (single-skill mocks
// leave the other skills' estimates untouched).
//
// Deploy: supabase functions deploy complete-ielts-mock --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })
}

const SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const
type Skill = typeof SKILLS[number]
const SKILL_LABEL_AR: Record<string, string> = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }

function roundToHalf(n: number): number { return Math.round(n * 2) / 2 }
function rawToBand(correct: number, total: number): number | null {
  if (!total || total <= 0) return null
  const scaled = Math.round((correct / total) * 40)
  const table: [number, number][] = [[39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5], [30, 7.0], [27, 6.5], [23, 6.0], [19, 5.5], [15, 5.0], [13, 4.5], [10, 4.0], [8, 3.5], [6, 3.0], [4, 2.5], [0, 2.0]]
  for (const [t, b] of table) if (scaled >= t) return b
  return 2.0
}
function normalize(v: unknown): string { return String(v ?? '').trim().toLowerCase() }
function answersMatch(given: unknown, expected: unknown): boolean {
  if (given == null || expected == null) return false
  if (Array.isArray(expected)) return expected.some((e) => answersMatch(given, e))
  const s = String(expected)
  if (s.includes('/')) return s.split('/').some((alt) => answersMatch(given, alt.trim()))
  const tf: Record<string, string> = { t: 'true', f: 'false', ng: 'not given', true: 'true', false: 'false', 'not given': 'not given', yes: 'yes', no: 'no' }
  const g = normalize(given), e = normalize(s)
  return (tf[g] ?? g) === (tf[e] ?? e)
}
function regradeObjective(rows: Array<{ questions: unknown; answer_key: unknown }>, studentAnswers: Record<string, string>): { correct: number; total: number } {
  let correct = 0, total = 0
  rows.forEach((row, idx) => {
    const key: Record<string, unknown> = {}
    if (Array.isArray(row.answer_key)) {
      for (const entry of row.answer_key as Record<string, unknown>[]) {
        const num = entry.question_number ?? entry.q_number ?? entry.number
        if (num != null) key[String(num)] = entry.correct_answer ?? entry.answer
      }
    } else if (row.answer_key && typeof row.answer_key === 'object') {
      for (const [k, v] of Object.entries(row.answer_key as Record<string, unknown>)) key[String(k)] = v && typeof v === 'object' ? (v as Record<string, unknown>).answer : v
    }
    const qs = Array.isArray(row.questions) ? row.questions : []
    for (const q of qs as Record<string, unknown>[]) {
      const qNum = q.question_number ?? q.number ?? q.q_number
      if (qNum == null) continue
      const expected = key[String(qNum)]
      if (expected == null) continue
      total++
      if (answersMatch(studentAnswers[`${idx}_${qNum}`], expected)) correct++
    }
  })
  return { correct, total }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    const { attempt_id } = await req.json().catch(() => ({}))
    if (!attempt_id) return jsonResponse({ error: 'attempt_id required' }, 400)

    const { data: attempt, error: aErr } = await supabase
      .from('ielts_mock_attempts')
      .select('id, student_id, answers, status, result_id')
      .eq('id', attempt_id)
      .single()
    if (aErr || !attempt) return jsonResponse({ error: 'Attempt not found' }, 404)

    if (attempt.status === 'completed' && attempt.result_id) {
      const { data: ex } = await supabase.from('ielts_student_results')
        .select('id, overall_band, reading_score, listening_score, writing_score, speaking_score')
        .eq('id', attempt.result_id).maybeSingle()
      if (ex) return jsonResponse({ result_id: ex.id, overall_band: ex.overall_band, per_skill: { reading: ex.reading_score, listening: ex.listening_score, writing: ex.writing_score, speaking: ex.speaking_score }, idempotent: true })
    }

    const answers = (attempt.answers || {}) as Record<string, any>
    const content = (answers.content || {}) as Record<string, any>
    const studentId = attempt.student_id

    // Skills actually attempted (full mock = all 4; single-skill mock = one).
    const attempted = SKILLS.filter((s) => answers[s]?.done)

    const bands: Record<Skill, number | null> = { listening: null, reading: null, writing: null, speaking: null }
    const details: Record<string, unknown> = {}

    if (attempted.includes('reading')) {
      const seg = answers.reading || {}
      let band: number | null = null
      const ids: string[] = content.reading || []
      if (ids.length && seg.answers) {
        const { data: rows } = await supabase.from('ielts_reading_passages').select('id, questions, answer_key').in('id', ids)
        const ordered = ids.map((id) => (rows || []).find((r) => r.id === id)).filter(Boolean) as any[]
        const { correct, total } = regradeObjective(ordered, seg.answers)
        band = rawToBand(correct, total)
        details.reading = { correct, total, band }
      }
      bands.reading = band ?? (typeof seg.band === 'number' ? seg.band : null)
    }
    if (attempted.includes('listening')) {
      const seg = answers.listening || {}
      let band: number | null = null
      const ids: string[] = content.listening || []
      if (ids.length && seg.answers) {
        const { data: rows } = await supabase.from('ielts_listening_sections').select('id, section_number, questions, answer_key').in('id', ids).order('section_number')
        const { correct, total } = regradeObjective(rows || [], seg.answers)
        band = rawToBand(correct, total)
        details.listening = { correct, total, band }
      }
      bands.listening = band ?? (typeof seg.band === 'number' ? seg.band : null)
    }
    if (attempted.includes('writing')) bands.writing = typeof answers.writing?.band === 'number' ? answers.writing.band : null
    if (attempted.includes('speaking')) bands.speaking = typeof answers.speaking?.band === 'number' ? answers.speaking.band : null

    const valid = attempted.map((s) => bands[s]).filter((b): b is number => b != null)
    const overall = valid.length ? roundToHalf(valid.reduce((a, b) => a + b, 0) / valid.length) : null

    const ranked = (Object.entries(bands).filter(([, b]) => b != null) as [Skill, number][]).sort((a, b) => b[1] - a[1])
    const strengths = ranked.slice(0, 2).map(([s]) => SKILL_LABEL_AR[s])
    const weaknesses = ranked.slice(-2).reverse().map(([s]) => SKILL_LABEL_AR[s])

    const nowIso = new Date().toISOString()
    const { data: resultRow, error: rErr } = await supabase
      .from('ielts_student_results')
      .insert({
        student_id: studentId,
        result_type: 'mock',
        test_variant: 'academic',
        reading_score: bands.reading,
        reading_details: (details.reading as unknown) ?? answers.reading ?? {},
        listening_score: bands.listening,
        listening_details: (details.listening as unknown) ?? answers.listening ?? {},
        writing_score: bands.writing,
        writing_feedback: answers.writing?.feedback ?? {},
        speaking_score: bands.speaking,
        speaking_feedback: answers.speaking?.feedback ?? {},
        overall_band: overall,
        strengths,
        weaknesses,
        recommendations: [
          weaknesses[0] ? `ركّزي على ${weaknesses[0]} — أكبر فجوة في هذه المحاكاة.` : 'واصلي التدريب المنتظم.',
          overall != null ? `هدفك القادم: Band ${roundToHalf(overall + 0.5).toFixed(1)}.` : 'أكملي محاكاة كاملة لقياس أدق.',
        ],
        completed_at: nowIso,
      })
      .select('id')
      .single()
    if (rErr || !resultRow) throw rErr || new Error('Failed to write result')

    // Update progress ONLY for attempted skills (no unique constraint → delete-then-insert).
    for (const skill of attempted) {
      await supabase.from('ielts_student_progress').delete().eq('student_id', studentId).eq('skill_type', skill)
      const d = details[skill] as { correct?: number } | undefined
      await supabase.from('ielts_student_progress').insert({
        student_id: studentId, skill_type: skill, attempts_count: 1,
        correct_count: d?.correct ?? null, estimated_band: bands[skill], last_attempt_at: nowIso,
      })
    }

    await supabase.from('ielts_mock_attempts').update({ status: 'completed', completed_at: nowIso, result_id: resultRow.id }).eq('id', attempt_id)

    // Band trend vs the previous mock.
    const { data: prev } = await supabase.from('ielts_student_results')
      .select('overall_band, completed_at').eq('student_id', studentId).eq('result_type', 'mock')
      .neq('id', resultRow.id).order('completed_at', { ascending: false }).limit(1).maybeSingle()

    return jsonResponse({
      result_id: resultRow.id,
      overall_band: overall,
      per_skill: bands,
      comparison: prev && prev.overall_band != null && overall != null
        ? { previous_band: prev.overall_band, delta: +(overall - Number(prev.overall_band)).toFixed(1) }
        : null,
    })
  } catch (err) {
    console.error('complete-ielts-mock error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})
