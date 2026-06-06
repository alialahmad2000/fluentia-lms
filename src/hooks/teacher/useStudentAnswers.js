import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const SECTIONS = ['reading', 'grammar', 'listening', 'writing', 'vocabulary', 'vocabulary_exercise', 'assessment', 'pronunciation']

/**
 * Everything a teacher needs to see a student's actual work, grouped by unit.
 * Reads student_curriculum_progress (self-describing answers/ai_feedback JSONB)
 * + speaking_recordings, enriched with unit names and reading question text.
 * RLS already permits all of these reads for a trainer.
 */
export function useStudentAnswers(studentId, { unitId = null } = {}) {
  return useQuery({
    queryKey: ['teacher-student-answers', studentId, unitId],
    enabled: !!studentId,
    staleTime: 30_000,
    queryFn: async () => {
      // 1) curriculum-progress rows (latest attempt per section). Speaking handled via recordings.
      let pq = supabase
        .from('student_curriculum_progress')
        .select('id, unit_id, section_type, status, score, answers, ai_feedback, recording_url, trainer_feedback, trainer_grade, trainer_graded_at, attempt_number, is_latest, updated_at, reading_id, grammar_id, listening_id, writing_id, assessment_id')
        .eq('student_id', studentId)
        .eq('is_latest', true)
        .in('section_type', SECTIONS)
        .order('updated_at', { ascending: false })
      if (unitId) pq = pq.eq('unit_id', unitId)
      const { data: progress, error } = await pq
      if (error) throw error

      // 2) speaking recordings (richer than the progress speaking rows)
      let sq = supabase
        .from('speaking_recordings')
        .select('id, unit_id, question_index, audio_url, audio_duration_seconds, ai_evaluation, trainer_reviewed, trainer_feedback, trainer_grade, trainer_reviewed_at, created_at, is_latest')
        .eq('student_id', studentId)
        .eq('is_latest', true)
        .order('created_at', { ascending: false })
      if (unitId) sq = sq.eq('unit_id', unitId)
      const { data: recs } = await sq

      // 3) unit names
      const unitIds = [...new Set([...(progress || []).map((r) => r.unit_id), ...(recs || []).map((r) => r.unit_id)].filter(Boolean))]
      const units = {}
      if (unitIds.length) {
        const { data: u } = await supabase
          .from('curriculum_units')
          .select('id, unit_number, theme_ar, theme_en, level_id')
          .in('id', unitIds)
        for (const row of u || []) units[row.id] = row
      }

      // 4) reading comprehension question text (answers are keyed by question id)
      const readingIds = [...new Set((progress || []).filter((r) => r.section_type === 'reading' && r.reading_id).map((r) => r.reading_id))]
      const readingQ = {}
      if (readingIds.length) {
        const { data: cq } = await supabase
          .from('curriculum_comprehension_questions')
          .select('id, reading_id, question_en, question_ar, choices, correct_answer, section, sort_order')
          .in('reading_id', readingIds)
        for (const qq of cq || []) readingQ[qq.id] = qq
      }

      // normalize into items
      const items = (progress || []).map((r) => ({ ...r, kind: r.section_type }))
      for (const rec of recs || []) {
        items.push({
          id: rec.id,
          kind: 'speaking',
          section_type: 'speaking',
          unit_id: rec.unit_id,
          status: rec.trainer_reviewed ? 'reviewed' : 'submitted',
          score: rec.trainer_grade ?? null,
          recording_url: rec.audio_url,
          duration: rec.audio_duration_seconds,
          ai_feedback: rec.ai_evaluation,
          trainer_feedback: rec.trainer_feedback,
          trainer_grade: rec.trainer_grade,
          trainer_graded_at: rec.trainer_reviewed_at,
          question_index: rec.question_index,
          updated_at: rec.created_at,
          isRecording: true,
        })
      }

      // group by unit, ordered by unit_number
      const map = new Map()
      for (const it of items) {
        const uid = it.unit_id || '__none__'
        if (!map.has(uid)) map.set(uid, [])
        map.get(uid).push(it)
      }
      const unitGroups = [...map.entries()]
        .map(([uid, list]) => ({ unitId: uid, unit: units[uid] || null, items: list }))
        .sort((a, b) => (a.unit?.unit_number || 999) - (b.unit?.unit_number || 999))

      return { unitGroups, readingQ, units, totalItems: items.length }
    },
  })
}
