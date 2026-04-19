import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { computeNextReview } from '@/lib/srs'

const LIST_KEY = (sid, filters) => ['ielts-error-list', sid, JSON.stringify(filters)]
const SUMMARY_KEY = (sid) => ['ielts-error-summary', sid]
const DUE_KEY = (sid) => ['ielts-errors-due', sid]

export function useErrorBankSummary(studentId) {
  return useQuery({
    queryKey: SUMMARY_KEY(studentId),
    enabled: !!studentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_error_bank')
        .select('skill_type, mastered, next_review_at')
        .eq('student_id', studentId)
      if (error) throw error
      const rows = data || []
      const total = rows.length
      const mastered = rows.filter(r => r.mastered).length
      const now = new Date()
      const due = rows.filter(
        r => !r.mastered && (!r.next_review_at || new Date(r.next_review_at) <= now)
      ).length
      const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0

      const bySkill = {}
      for (const r of rows) {
        if (!bySkill[r.skill_type]) bySkill[r.skill_type] = { total: 0, mastered: 0 }
        bySkill[r.skill_type].total++
        if (r.mastered) bySkill[r.skill_type].mastered++
      }
      return { total, mastered, due, masteryRate, bySkill }
    },
  })
}

export function useErrorBankList(studentId, filters = {}) {
  const { skill, showMastered = false, page = 0, pageSize = 30 } = filters
  return useQuery({
    queryKey: LIST_KEY(studentId, filters),
    enabled: !!studentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('ielts_error_bank')
        .select('id, skill_type, question_type, question_text, student_answer, correct_answer, times_seen, times_correct, mastered, next_review_at')
        .eq('student_id', studentId)
        .order('next_review_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (skill) q = q.eq('skill_type', skill)
      if (!showMastered) q = q.eq('mastered', false)

      const { data, error } = await q
      if (error) throw error
      return data || []
    },
  })
}

export function useErrorsDueForReview(studentId, limit = 20) {
  return useQuery({
    queryKey: DUE_KEY(studentId),
    enabled: !!studentId,
    staleTime: 10 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_error_bank')
        .select('id, skill_type, question_type, question_text, student_answer, correct_answer, explanation, times_seen, times_correct, mastered, next_review_at')
        .eq('student_id', studentId)
        .eq('mastered', false)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

export function useSubmitErrorReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, errorId, wasCorrect, timesSeen, timesCorrect }) => {
      const { nextReviewAt, mastered } = computeNextReview({ timesSeen, timesCorrect, wasCorrect })
      const { data, error } = await supabase
        .from('ielts_error_bank')
        .update({
          times_seen: (timesSeen || 0) + 1,
          times_correct: (timesCorrect || 0) + (wasCorrect ? 1 : 0),
          mastered,
          next_review_at: nextReviewAt.toISOString(),
        })
        .eq('id', errorId)
        .eq('student_id', studentId)
        .select('id')
        .single()
      if (error) throw error
      if (!data?.id) throw new Error('Error review submit failed — 0 rows affected')
      return { ...data, mastered, nextReviewAt }
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: DUE_KEY(studentId) })
      qc.invalidateQueries({ queryKey: SUMMARY_KEY(studentId) })
      qc.invalidateQueries({ queryKey: ['ielts-errors-count', studentId] })
    },
  })
}

export function useArchiveError() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, errorId }) => {
      // Never hard-delete — set mastered=true + push next_review_at 180d into future
      const farFuture = new Date(Date.now() + 180 * 86400000).toISOString()
      const { data, error } = await supabase
        .from('ielts_error_bank')
        .update({ mastered: true, next_review_at: farFuture })
        .eq('id', errorId)
        .eq('student_id', studentId)
        .select('id')
        .single()
      if (error) throw error
      if (!data?.id) throw new Error('Error archive failed — 0 rows affected')
      return data
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: DUE_KEY(studentId) })
      qc.invalidateQueries({ queryKey: SUMMARY_KEY(studentId) })
      qc.invalidateQueries({ queryKey: LIST_KEY(studentId, {}) })
      qc.invalidateQueries({ queryKey: ['ielts-errors-count', studentId] })
    },
  })
}
