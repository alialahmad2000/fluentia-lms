// Fluentia LMS — Complete IELTS Diagnostic (Atelier)
// Reads a diagnostic attempt whose 4 segments have ALREADY produced per-skill
// bands (reading/listening graded client-side against answer keys; writing &
// speaking graded by evaluate-writing / evaluate-ielts-speaking). This function
// consolidates those bands into ielts_student_results + ielts_adaptive_plans +
// ielts_student_progress — the tables the Atelier home + journey read from.
//
// For integrity it RE-GRADES reading/listening server-side from the stored raw
// answers when the content is available, and falls back to the stored band.
//
// Deploy: supabase functions deploy complete-ielts-diagnostic --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

const SKILLS = ['listening', 'reading', 'writing', 'speaking'] as const
type Skill = typeof SKILLS[number]

const SKILL_LABEL_AR: Record<string, string> = {
  reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة',
}

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2
}

// Proportional raw→band table (scales any raw/total to a 40-question equivalent).
function rawToBand(correct: number, total: number): number | null {
  if (!total || total <= 0) return null
  const scaled = Math.round((correct / total) * 40)
  const table: [number, number][] = [
    [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5], [30, 7.0], [27, 6.5], [23, 6.0],
    [19, 5.5], [15, 5.0], [13, 4.5], [10, 4.0], [8, 3.5], [6, 3.0], [4, 2.5], [0, 2.0],
  ]
  for (const [t, b] of table) if (scaled >= t) return b
  return 2.0
}

function normalize(v: unknown): string {
  return String(v ?? '').trim().toLowerCase()
}

// Flexible answer match — mirrors src/lib/ielts/grading.js (T/F/NG, slash alternatives).
function answersMatch(given: unknown, expected: unknown): boolean {
  if (given == null || expected == null) return false
  if (Array.isArray(expected)) return expected.some((e) => answersMatch(given, e))
  const expectedStr = String(expected)
  if (expectedStr.includes('/')) return expectedStr.split('/').some((alt) => answersMatch(given, alt.trim()))
  const tf: Record<string, string> = {
    t: 'true', f: 'false', ng: 'not given', true: 'true', false: 'false',
    'not given': 'not given', yes: 'yes', no: 'no',
  }
  const g = normalize(given), e = normalize(expectedStr)
  return (tf[g] ?? g) === (tf[e] ?? e)
}

// Re-grade reading (answer_key = array of {question_number, correct_answer}) or
// listening (answer_key = object {qNum: answer}) from the stored raw answers.
// studentAnswers keys are `${index}_${qNum}` where index is the row's position
// in the ordered content list (matches how the segments store them).
function regradeObjective(
  rows: Array<{ questions: unknown; answer_key: unknown }>,
  studentAnswers: Record<string, string>,
): { correct: number; total: number } {
  let correct = 0, total = 0
  rows.forEach((row, idx) => {
    // Build qNum → correctAnswer lookup from whichever shape the row uses.
    const key: Record<string, unknown> = {}
    if (Array.isArray(row.answer_key)) {
      for (const entry of row.answer_key as Record<string, unknown>[]) {
        const num = entry.question_number ?? entry.q_number ?? entry.number
        if (num != null) key[String(num)] = entry.correct_answer ?? entry.answer
      }
    } else if (row.answer_key && typeof row.answer_key === 'object') {
      for (const [k, v] of Object.entries(row.answer_key as Record<string, unknown>)) {
        key[String(k)] = v && typeof v === 'object' ? (v as Record<string, unknown>).answer : v
      }
    }
    const qs = Array.isArray(row.questions) ? row.questions : []
    for (const q of qs as Record<string, unknown>[]) {
      const qNum = q.question_number ?? q.number ?? q.q_number
      if (qNum == null) continue
      const expected = key[String(qNum)]
      if (expected == null) continue
      total++
      const given = studentAnswers[`${idx}_${qNum}`]
      if (answersMatch(given, expected)) correct++
    }
  })
  return { correct, total }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { attempt_id } = await req.json().catch(() => ({}))
    if (!attempt_id) return jsonResponse({ error: 'attempt_id required' }, 400)

    const { data: attempt, error: attemptErr } = await supabase
      .from('ielts_mock_attempts')
      .select('id, student_id, answers, status, result_id')
      .eq('id', attempt_id)
      .single()
    if (attemptErr || !attempt) return jsonResponse({ error: 'Attempt not found' }, 404)

    // Idempotent: if already completed with a result, return it.
    if (attempt.status === 'completed' && attempt.result_id) {
      const { data: existing } = await supabase
        .from('ielts_student_results')
        .select('id, overall_band, reading_score, listening_score, writing_score, speaking_score')
        .eq('id', attempt.result_id)
        .maybeSingle()
      if (existing) {
        return jsonResponse({
          result_id: existing.id,
          overall_band: existing.overall_band,
          per_skill: {
            reading: existing.reading_score, listening: existing.listening_score,
            writing: existing.writing_score, speaking: existing.speaking_score,
          },
          idempotent: true,
        })
      }
    }

    const answers = (attempt.answers || {}) as Record<string, any>
    const content = (answers.content || {}) as Record<string, any>
    const studentId = attempt.student_id
    const variant = 'academic'

    // ── Per-skill bands ──────────────────────────────────────────────────────
    const bands: Record<Skill, number | null> = { listening: null, reading: null, writing: null, speaking: null }
    const details: Record<string, unknown> = {}

    // Reading — re-grade server-side from stored raw answers, fallback to stored band.
    {
      const seg = answers.reading || {}
      let band: number | null = null
      const ids: string[] = content.reading || []
      if (ids.length && seg.answers) {
        const { data: rows } = await supabase
          .from('ielts_reading_passages')
          .select('id, questions, answer_key')
          .in('id', ids)
        // Preserve the content order the segment used when keying answers.
        const ordered = ids.map((id) => (rows || []).find((r) => r.id === id)).filter(Boolean) as any[]
        const { correct, total } = regradeObjective(ordered, seg.answers)
        band = rawToBand(correct, total)
        details.reading = { correct, total, band }
      }
      bands.reading = band ?? (typeof seg.band === 'number' ? seg.band : null)
    }

    // Listening — same treatment.
    {
      const seg = answers.listening || {}
      let band: number | null = null
      const ids: string[] = content.listening || []
      if (ids.length && seg.answers) {
        const { data: rows } = await supabase
          .from('ielts_listening_sections')
          .select('id, section_number, questions, answer_key')
          .in('id', ids)
          .order('section_number')
        const { correct, total } = regradeObjective(rows || [], seg.answers)
        band = rawToBand(correct, total)
        details.listening = { correct, total, band }
      }
      bands.listening = band ?? (typeof seg.band === 'number' ? seg.band : null)
    }

    // Writing & speaking — trust the AI-derived band the segment stored.
    bands.writing = typeof answers.writing?.band === 'number' ? answers.writing.band : null
    bands.speaking = typeof answers.speaking?.band === 'number' ? answers.speaking.band : null

    // ── Overall + strengths/weaknesses ───────────────────────────────────────
    const valid = SKILLS.map((s) => bands[s]).filter((b): b is number => b != null)
    const overall = valid.length ? roundToHalf(valid.reduce((a, b) => a + b, 0) / valid.length) : null

    const ranked = (Object.entries(bands).filter(([, b]) => b != null) as [Skill, number][])
      .sort((a, b) => b[1] - a[1])
    const strengths = ranked.slice(0, 2).map(([s]) => SKILL_LABEL_AR[s])
    const weaknesses = ranked.slice(-2).reverse().map(([s]) => SKILL_LABEL_AR[s])
    const weakestSkill = ranked.length ? ranked[ranked.length - 1][0] : 'reading'
    // Never DOWNGRADE a target the student/trainer has explicitly set (e.g. a
    // band-7 goal): re-running the diagnostic keeps their chosen target if it's
    // higher than the auto-suggested overall+1.0.
    const { data: existingPlan } = await supabase
      .from('ielts_adaptive_plans')
      .select('target_band')
      .eq('student_id', studentId)
      .maybeSingle()
    const autoTarget = Math.min(9.0, roundToHalf((overall ?? 5.0) + 1.0))
    const existingTarget = existingPlan?.target_band != null ? Number(existingPlan.target_band) : null
    const targetBand = existingTarget != null ? Math.max(existingTarget, autoTarget) : autoTarget

    // ── 1. ielts_student_results ─────────────────────────────────────────────
    const nowIso = new Date().toISOString()
    const { data: resultRow, error: resultErr } = await supabase
      .from('ielts_student_results')
      .insert({
        student_id: studentId,
        result_type: 'diagnostic',
        test_variant: variant,
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
          `ابدئي بـ${SKILL_LABEL_AR[weakestSkill]} — نقطة النمو الأكبر عندك الآن.`,
          `هدفك القادم: Band ${targetBand.toFixed(1)}. نقترب خطوة كل أسبوع.`,
        ],
        completed_at: nowIso,
      })
      .select()
      .single()
    if (resultErr) throw resultErr

    // ── 2. ielts_adaptive_plans (unique on student_id → upsert) ───────────────
    let planId: string | null = null
    const { data: planRow, error: planErr } = await supabase
      .from('ielts_adaptive_plans')
      .upsert({
        student_id: studentId,
        test_variant: variant,
        target_band: targetBand,
        current_band_estimate: overall,
        weak_areas: weaknesses,
        strong_areas: strengths,
        next_recommended_action: {
          skill_type: weakestSkill,
          title_ar: `ركّزي على ${SKILL_LABEL_AR[weakestSkill]}`,
          subtitle_ar: 'نقطة نموّك الأكبر الآن — جلسة تدريب مستهدفة',
          cta_ar: 'ابدئي الآن',
          route_path: `/student/ielts-atelier/${weakestSkill}`,
        },
        last_regenerated_at: nowIso,
      }, { onConflict: 'student_id' })
      .select('id')
      .single()
    if (planErr) console.error('plan upsert failed (non-fatal):', planErr.message)
    else planId = planRow?.id ?? null

    // ── 3. ielts_student_progress (no unique constraint → delete-then-insert) ──
    for (const skill of SKILLS) {
      await supabase.from('ielts_student_progress')
        .delete()
        .eq('student_id', studentId)
        .eq('skill_type', skill)
      const d = (details[skill] as { correct?: number } | undefined)
      await supabase.from('ielts_student_progress').insert({
        student_id: studentId,
        skill_type: skill,
        attempts_count: 1,
        correct_count: d?.correct ?? null,
        estimated_band: bands[skill],
        last_attempt_at: nowIso,
      })
    }

    // ── 4. Close the attempt ─────────────────────────────────────────────────
    await supabase
      .from('ielts_mock_attempts')
      .update({ status: 'completed', completed_at: nowIso, result_id: resultRow.id })
      .eq('id', attempt_id)

    return jsonResponse({
      result_id: resultRow.id,
      plan_id: planId,
      overall_band: overall,
      per_skill: bands,
    })
  } catch (err) {
    console.error('complete-ielts-diagnostic error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})
