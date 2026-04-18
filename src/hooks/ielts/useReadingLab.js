import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

// Passages for practice.
// NOTE: passage questions have no 'type' field, so type filtering is not possible.
// We return passages for any requested questionType — the session is tagged with
// the skill's question_type even though passage questions aren't typed.
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
          question_type: questionType || null,
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
