import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const STALE = 30 * 1000

// All published sections grouped by section_number
export function useListeningSections() {
  return useQuery({
    queryKey: ['ielts-listening-sections'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_listening_sections')
        .select('id, section_number, title, accent, audio_duration_seconds, is_published, context_description')
        .eq('is_published', true)
        .order('section_number')
      if (error) throw error
      const grouped = { 1: [], 2: [], 3: [], 4: [] }
      for (const s of data || []) {
        if (grouped[s.section_number]) grouped[s.section_number].push(s)
      }
      return grouped
    },
  })
}

// Single section with full detail — audio_url is already a full URL
export function useListeningSection(sectionId) {
  return useQuery({
    queryKey: ['ielts-listening-section', sectionId],
    enabled: !!sectionId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_listening_sections')
        .select('*')
        .eq('id', sectionId)
        .single()
      if (error) throw error
      if (!data) throw new Error('Section not found')
      return data
    },
  })
}

// Student's listening progress by section number (question_type='section_N')
export function useListeningProgress(studentId) {
  return useQuery({
    queryKey: ['ielts-listening-progress', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_student_progress')
        .select('question_type, attempts_count, correct_count, total_time_seconds, estimated_band, last_attempt_at')
        .eq('student_id', studentId)
        .eq('skill_type', 'listening')
      if (error) throw error
      const bySection = { 1: null, 2: null, 3: null, 4: null }
      for (const row of data || []) {
        if (row.question_type?.startsWith('section_')) {
          const n = parseInt(row.question_type.replace('section_', ''), 10)
          if (bySection[n] !== undefined) bySection[n] = row
        }
      }
      return bySection
    },
  })
}

// Recent listening sessions
export function useRecentListeningSessions(studentId, limit = 10) {
  return useQuery({
    queryKey: ['ielts-listening-sessions', studentId, limit],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_skill_sessions')
        .select('*')
        .eq('student_id', studentId)
        .eq('skill_type', 'listening')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

// Submit a completed listening session
export function useSubmitListeningSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, sectionId, sectionNumber, gradeResult, durationSeconds }) => {
      const questionTypeKey = `section_${sectionNumber}`
      const now = new Date().toISOString()
      const startedAt = new Date(Date.now() - durationSeconds * 1000).toISOString()

      // 1. Insert session row
      const { data: sessionRow, error: sessErr } = await supabase
        .from('ielts_skill_sessions')
        .insert({
          student_id: studentId,
          skill_type: 'listening',
          question_type: questionTypeKey,
          source_id: sectionId,
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

      // 2. Upsert progress — 60/40 weighted rolling band
      const { data: existing } = await supabase
        .from('ielts_student_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('skill_type', 'listening')
        .eq('question_type', questionTypeKey)
        .maybeSingle()

      const prevAttempts = existing?.attempts_count || 0
      const prevCorrect = existing?.correct_count || 0
      const prevTime = existing?.total_time_seconds || 0
      const prevBand = existing?.estimated_band != null ? Number(existing.estimated_band) : null
      const newBand = prevBand != null
        ? Math.round(((0.4 * prevBand) + (0.6 * (gradeResult.band || 0))) * 2) / 2
        : gradeResult.band

      const { error: progErr } = await supabase
        .from('ielts_student_progress')
        .upsert({
          student_id: studentId,
          skill_type: 'listening',
          question_type: questionTypeKey,
          attempts_count: prevAttempts + 1,
          correct_count: prevCorrect + gradeResult.correct,
          total_time_seconds: prevTime + durationSeconds,
          estimated_band: newBand,
          last_attempt_at: now,
          updated_at: now,
        }, { onConflict: 'student_id,skill_type,question_type' })
      if (progErr) throw progErr

      // 3. Error bank (non-fatal)
      const wrong = (gradeResult.perQuestion || []).filter(q => !q.isCorrect)
      if (wrong.length && sectionId) {
        const errorRows = wrong.map(w => ({
          student_id: studentId,
          skill_type: 'listening',
          question_type: questionTypeKey,
          source_table: 'ielts_listening_sections',
          source_id: sectionId,
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

      return { sessionId: sessionRow.id, band: gradeResult.band }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ielts-listening-progress'] })
      qc.invalidateQueries({ queryKey: ['ielts-listening-sessions'] })
      qc.invalidateQueries({ queryKey: ['ielts-progress'] })
    },
  })
}
