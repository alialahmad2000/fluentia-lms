import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { scoreToBand } from '@/lib/ielts/grading'

const STALE = 30 * 1000

// All 16 skill catalog entries
export function useReadingSkills() {
  return useQuery({
    queryKey: ['ielts-reading-skills'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_reading_skills')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })
}

// A specific skill's content
export function useReadingSkill(questionType) {
  return useQuery({
    queryKey: ['ielts-reading-skill', questionType],
    enabled: !!questionType,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_reading_skills')
        .select('*')
        .eq('question_type', questionType)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// Student's reading progress keyed by question_type
export function useReadingProgress(studentId) {
  return useQuery({
    queryKey: ['ielts-reading-progress', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_student_progress')
        .select('question_type, attempts_count, correct_count, total_time_seconds, estimated_band, last_attempt_at')
        .eq('student_id', studentId)
        .eq('skill_type', 'reading')
      if (error) throw error
      const byType = {}
      for (const row of data || []) {
        byType[row.question_type || '__general__'] = row
      }
      return byType
    },
  })
}

// Recent reading sessions
export function useRecentReadingSessions(studentId, limit = 10) {
  return useQuery({
    queryKey: ['ielts-reading-sessions', studentId, limit],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_skill_sessions')
        .select('*')
        .eq('student_id', studentId)
        .eq('skill_type', 'reading')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

// All completed reading sessions for a student, reduced to a map keyed by the
// passage id (source_id) → the student's BEST attempt on that passage. Powers
// the sequential-path done-states and the answer-review screen.
export function useCompletedReadingSessions(studentId) {
  return useQuery({
    queryKey: ['ielts-reading-sessions-map', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_skill_sessions')
        .select('source_id, band_score, correct_count, incorrect_count, completed_at, session_data')
        .eq('student_id', studentId)
        .eq('skill_type', 'reading')
        .not('source_id', 'is', null)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
      if (error) throw error
      const byPassage = {}
      for (const row of data || []) {
        const key = row.source_id
        const prev = byPassage[key]
        // keep the highest band; ties → most recent (rows already sorted desc)
        if (!prev || Number(row.band_score || 0) > Number(prev.band_score || 0)) byPassage[key] = row
      }
      return byPassage
    },
  })
}

// Passages for practice.
// NOTE: passage questions DO carry a `type` (verified 2026-07-25) — the old
// comment here claimed otherwise and was wrong. Type-aware filtering is possible;
// this helper still returns a general set because a passage mixes several types.
// is_published filter omitted: only 1/43 passages published at this stage.
export function usePassagesForPractice(limit = 5, difficultyBand = null) {
  return useQuery({
    queryKey: ['ielts-passages-practice', limit, difficultyBand],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('ielts_reading_passages')
        .select('id, passage_number, title, content, word_count, difficulty_band, test_variant, questions, answer_key, time_limit_minutes')
        .order('passage_number')
      if (difficultyBand) q = q.eq('difficulty_band', difficultyBand)
      const { data, error } = await q.limit(limit * 3) // fetch extra, filter below
      if (error) throw error
      // Only include passages that actually have questions
      return (data || []).filter(p => Array.isArray(p.questions) && p.questions.length > 0).slice(0, limit)
    },
  })
}

// Submit a completed reading session
export function useSubmitReadingSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, questionType, passageId, gradeResult, durationSeconds }) => {
      const now = new Date().toISOString()
      const startedAt = new Date(Date.now() - durationSeconds * 1000).toISOString()

      // 1. Insert session row
      const { data: sessionRow, error: sessErr } = await supabase
        .from('ielts_skill_sessions')
        .insert({
          student_id: studentId,
          skill_type: 'reading',
          question_type: questionType || null,
          source_id: passageId || null,
          started_at: startedAt,
          completed_at: now,
          duration_seconds: durationSeconds,
          correct_count: gradeResult.correct,
          incorrect_count: gradeResult.total - gradeResult.correct,
          band_score: gradeResult.band,
          session_data: gradeResult,
        })
        .select('id')
        .single()
      if (sessErr || !sessionRow) throw sessErr || new Error('Session insert failed')

      // 2. Upsert progress (weighted rolling average: 60% new, 40% history)
      const { data: existing } = await supabase
        .from('ielts_student_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('skill_type', 'reading')
        .is('question_type', questionType ? null : null) // handle null vs string
        .then(async ({ data }) => {
          // Filter in JS for null/string comparison
          const row = (data || []).find(r =>
            questionType ? r.question_type === questionType : r.question_type == null
          )
          return { data: row }
        })

      const prev = existing || {}
      const prevAttempts = prev.attempts_count || 0
      const prevCorrect = prev.correct_count || 0
      const prevTime = prev.total_time_seconds || 0
      const prevBand = prev.estimated_band != null ? Number(prev.estimated_band) : null
      const newBand = prevBand != null
        ? Math.round(((0.4 * prevBand) + (0.6 * (gradeResult.band || 0))) * 2) / 2
        : gradeResult.band

      const { error: progErr } = await supabase
        .from('ielts_student_progress')
        .upsert({
          student_id: studentId,
          skill_type: 'reading',
          question_type: questionType || null,
          attempts_count: prevAttempts + 1,
          correct_count: prevCorrect + gradeResult.correct,
          total_time_seconds: prevTime + durationSeconds,
          estimated_band: newBand,
          last_attempt_at: now,
          updated_at: now,
        }, { onConflict: 'student_id,skill_type,question_type' })
      if (progErr) throw progErr

      // 3. Insert wrong answers to error bank (non-fatal)
      const wrong = (gradeResult.perQuestion || []).filter(q => !q.isCorrect)
      if (wrong.length && passageId) {
        const errorRows = wrong.map(w => ({
          student_id: studentId,
          skill_type: 'reading',
          question_type: w.type || questionType || null,
          cause: w.cause || null,
          seconds_spent: w.secs != null ? Math.round(Number(w.secs)) : null,
          source_table: 'ielts_reading_passages',
          source_id: passageId,
          question_text: w.text ? String(w.text).substring(0, 500) : String(w.qNum),
          student_answer: w.given != null ? String(w.given) : null,
          correct_answer: w.expected != null ? String(w.expected) : null,
          explanation: w.explanation ? String(w.explanation).substring(0, 500) : null,
          times_seen: 1,
          times_correct: 0,
          mastered: false,
          next_review_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        }))
        const { error: ebErr } = await supabase.from('ielts_error_bank').insert(errorRows)
        if (ebErr) console.warn('Error bank insert failed (non-fatal):', ebErr.message)
      }

      return { sessionId: sessionRow.id }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ielts-reading-progress'] })
      qc.invalidateQueries({ queryKey: ['ielts-reading-sessions'] })
      qc.invalidateQueries({ queryKey: ['ielts-progress'] })
    },
  })
}

// Count of published passages per question type (for skill card availability badges)
export function useQuestionTypeAvailability() {
  return useQuery({
    queryKey: ['ielts-reading-type-availability'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_reading_passages')
        .select('questions')
        .eq('is_published', true)
      if (error) throw error
      const counts = {}
      for (const p of data || []) {
        if (!Array.isArray(p.questions)) continue
        const typesInPassage = new Set(p.questions.map(q => q.type).filter(Boolean))
        for (const t of typesInPassage) {
          counts[t] = (counts[t] || 0) + 1
        }
      }
      return counts
    },
  })
}

// ── Full 3-passage READING TESTS (real IELTS Academic format) ──────────────────

// Published reading tests (each = 3 passages of rising difficulty, 40 questions, 60 min)
export function useReadingTests() {
  return useQuery({
    queryKey: ['ielts-reading-tests'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_reading_tests')
        .select('id, test_number, title_ar, title_en, passage_ids, total_questions, total_time_minutes')
        .eq('is_published', true)
        .order('test_number')
      if (error) throw error
      return data || []
    },
  })
}

// Lightweight metadata for every published passage (id → title/topic/band) — for test cards
export function usePassageMeta() {
  return useQuery({
    queryKey: ['ielts-passage-meta'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_reading_passages')
        .select('id, title, topic_category, difficulty_band')
      if (error) throw error
      const map = {}
      for (const p of (data || [])) map[p.id] = p
      return map
    },
  })
}

// Submit a completed reading test OR single passage (one session row + progress + error bank).
// Pass sourceId (defaults to test.id) so a single-passage attempt is tagged to the passage,
// not the test — keeping the library's per-test "best band" badge to full-test attempts only.
export function useSubmitReadingTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, test, result, durationSeconds, sourceId, kind }) => {
      const now = new Date().toISOString()
      const startedAt = new Date(Date.now() - durationSeconds * 1000).toISOString()

      // 1. One combined session row
      const { data: sessionRow, error: sessErr } = await supabase
        .from('ielts_skill_sessions')
        .insert({
          student_id: studentId,
          skill_type: 'reading',
          question_type: null,
          source_id: sourceId ?? test.id,
          started_at: startedAt,
          completed_at: now,
          duration_seconds: durationSeconds,
          correct_count: result.correct,
          incorrect_count: result.total - result.correct,
          band_score: result.band,
          session_data: { kind: kind || 'reading_test', test_number: test.test_number, ...result },
        })
        .select('id')
        .single()
      if (sessErr || !sessionRow) throw sessErr || new Error('Session insert failed')

      // 2. Rolling-average reading progress (60% new / 40% history).
      //    Two levels are written: the general row (question_type null) that
      //    drives the section band, AND one row per question type — the latter
      //    is what «أنواع الأسئلة» reads to colour the heatmap, so a student who
      //    is 90% on tables and 40% on True/False can see exactly that.
      const { data: progRows } = await supabase
        .from('ielts_student_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('skill_type', 'reading')
      const byType = new Map((progRows || []).map(r => [r.question_type ?? '__all__', r]))
      const roll = (prevBand, nextBand) => prevBand != null
        ? Math.round(((0.4 * prevBand) + (0.6 * (nextBand || 0))) * 2) / 2
        : nextBand

      const allQuestions = (result.perPassage || []).flatMap(pp => pp.perQuestion || [])
      const typeAgg = {}
      for (const q of allQuestions) {
        if (!q.type) continue
        const a = (typeAgg[q.type] ||= { n: 0, correct: 0, secs: 0 })
        a.n += 1
        if (q.isCorrect) a.correct += 1
        a.secs += Number(q.secs) || 0
      }

      const prev = byType.get('__all__') || {}
      const upserts = [{
        student_id: studentId,
        skill_type: 'reading',
        question_type: null,
        attempts_count: (prev.attempts_count || 0) + 1,
        correct_count: (prev.correct_count || 0) + result.correct,
        total_time_seconds: (prev.total_time_seconds || 0) + durationSeconds,
        estimated_band: roll(prev.estimated_band != null ? Number(prev.estimated_band) : null, result.band),
        last_attempt_at: now,
        updated_at: now,
      }]
      for (const [qtype, a] of Object.entries(typeAgg)) {
        const p = byType.get(qtype) || {}
        upserts.push({
          student_id: studentId,
          skill_type: 'reading',
          question_type: qtype,
          attempts_count: (p.attempts_count || 0) + a.n,
          correct_count: (p.correct_count || 0) + a.correct,
          total_time_seconds: (p.total_time_seconds || 0) + Math.round(a.secs),
          estimated_band: roll(
            p.estimated_band != null ? Number(p.estimated_band) : null,
            scoreToBand(a.correct, a.n),
          ),
          last_attempt_at: now,
          updated_at: now,
        })
      }
      const { error: progErr } = await supabase
        .from('ielts_student_progress')
        .upsert(upserts, { onConflict: 'student_id,skill_type,question_type' })
      if (progErr) throw progErr

      // 3. Wrong answers → error bank, tagged to their real passage, their real
      //    question type, and — the part that makes «أخطائي» a coach rather than
      //    a list — the CAUSE the grader inferred. (non-fatal)
      const errorRows = []
      for (const pp of (result.perPassage || [])) {
        const pid = test.passages?.[pp.pi]?.id || null
        for (const w of (pp.perQuestion || []).filter(q => !q.isCorrect)) {
          errorRows.push({
            student_id: studentId,
            skill_type: 'reading',
            question_type: w.type || null,
            cause: w.cause || null,
            seconds_spent: w.secs != null ? Math.round(Number(w.secs)) : null,
            source_table: 'ielts_reading_passages',
            source_id: pid,
            question_text: w.text ? String(w.text).substring(0, 500) : String(w.qNum),
            student_answer: w.given != null ? String(w.given) : null,
            correct_answer: w.expected != null ? String(w.expected) : null,
            explanation: w.explanation ? String(w.explanation).substring(0, 500) : null,
            times_seen: 1,
            times_correct: 0,
            mastered: false,
            next_review_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          })
        }
      }
      if (errorRows.length) {
        const { error: ebErr } = await supabase.from('ielts_error_bank').insert(errorRows)
        if (ebErr) console.warn('Error bank insert failed (non-fatal):', ebErr.message)
      }

      return { sessionId: sessionRow.id }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ielts-reading-progress'] })
      qc.invalidateQueries({ queryKey: ['ielts-reading-sessions'] })
      qc.invalidateQueries({ queryKey: ['ielts-progress'] })
    },
  })
}
// ════════════════════════════════════════════════════════════════════════════
// Reading ladder (2026-07-25) — data for the six reading subsections.
// ════════════════════════════════════════════════════════════════════════════

// Per-question-type accuracy + seconds. This is the heatmap. Computed server-side
// out of the perQuestion JSON every session already writes, so it needs no
// backfill and stays correct as soon as a student sits one more test.
export function useReadingTypeStats(studentId) {
  return useQuery({
    queryKey: ['ielts-reading-type-stats', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ielts_reading_type_stats', { p_student: studentId })
      if (error) throw error
      const byType = {}
      for (const r of data || []) byType[r.question_type] = r
      return byType
    },
  })
}

// Wrong answers grouped by WHY, not by what. Drives the «أخطائي» verdict.
export function useReadingErrorCauses(studentId) {
  return useQuery({
    queryKey: ['ielts-reading-error-causes', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ielts_reading_error_causes', { p_student: studentId })
      if (error) throw error
      const out = { paraphrase_trap: 0, not_located: 0, misread: 0, ran_out_of_time: 0, unclassified: 0 }
      for (const r of data || []) out[r.cause] = r.n
      return out
    },
  })
}

// The individual wrong answers, newest first — the review list under the verdict.
export function useReadingErrors(studentId, limit = 40) {
  return useQuery({
    queryKey: ['ielts-reading-errors', studentId, limit],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_error_bank')
        .select('id, question_type, cause, seconds_spent, question_text, student_answer, correct_answer, explanation, first_seen_at, mastered, source_id')
        .eq('student_id', studentId)
        .eq('skill_type', 'reading')
        .order('first_seen_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

// ── Micro-drills ────────────────────────────────────────────────────────────
// A drill set is small and static, so it is fetched once and shuffled on the
// client; a rep must never wait on the network.
export function useMicroDrills(kind) {
  return useQuery({
    queryKey: ['ielts-micro-drills', kind],
    enabled: !!kind,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_micro_drills')
        .select('id, drill_kind, difficulty, payload')
        .eq('drill_kind', kind)
        .eq('is_published', true)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })
}

// How many items exist per kind — for the drill cards' availability badges.
export function useMicroDrillCounts() {
  return useQuery({
    queryKey: ['ielts-micro-drill-counts'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_micro_drills')
        .select('drill_kind')
        .eq('is_published', true)
      if (error) throw error
      const counts = {}
      for (const r of data || []) counts[r.drill_kind] = (counts[r.drill_kind] || 0) + 1
      return counts
    },
  })
}

// Last-round score + best time per drill kind, for the card meta chips.
export function useMicroDrillStats(studentId) {
  return useQuery({
    queryKey: ['ielts-micro-drill-stats', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_micro_drill_attempts')
        .select('drill_kind, is_correct, ms, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(400)
      if (error) throw error
      const byKind = {}
      for (const r of data || []) {
        const k = (byKind[r.drill_kind] ||= { n: 0, correct: 0, bestMs: null, lastAt: r.created_at })
        k.n += 1
        if (r.is_correct) k.correct += 1
        if (r.is_correct && r.ms != null && (k.bestMs == null || r.ms < k.bestMs)) k.bestMs = r.ms
      }
      return byKind
    },
  })
}

// Log a rep. Fire-and-forget by design: a failed log must never block the drill.
export function useLogMicroAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, drillKind, drillId, isCorrect, ms }) => {
      if (!studentId) return null
      const { error } = await supabase.from('ielts_micro_drill_attempts').insert({
        student_id: studentId,
        drill_kind: drillKind,
        drill_id: drillId || null,
        is_correct: !!isCorrect,
        ms: ms != null ? Math.round(ms) : null,
      })
      if (error) { console.warn('micro-drill log failed (non-fatal):', error.message); return null }
      return true
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ielts-micro-drill-stats'] })
    },
  })
}
