// Module 5 hooks — lesson brief deliveries.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuthUserId } from '../../stores/authStore'

export function usePendingBriefs() {
  const userId = useAuthUserId()

  return useQuery({
    queryKey: ['retention-pending-briefs', userId],
    queryFn: async () => {
      if (!userId) return []
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('retention_lesson_brief_deliveries')
        .select(
          `id, scheduled_for, delivered_at, opened_at, self_check_answer, self_check_correct,
           brief:retention_lesson_briefs (id, brief_type, title_ar, body_ar, vocab_words,
             grammar_concept_ar, warmup_question_ar, self_check_question_ar,
             self_check_options, self_check_correct, mini_task_ar, audio_path)`
        )
        .eq('student_id', userId)
        .gte('delivered_at', cutoff)
        .is('opened_at', null)
        .order('delivered_at', { ascending: false })
      if (error) throw error
      // SHIP-AUTONOMOUS §2.3: only surface deliveries whose brief has audio.
      return (data || []).filter((d) => Boolean(d.brief?.audio_path))
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useBriefDelivery(deliveryId) {
  return useQuery({
    queryKey: ['retention-brief-delivery', deliveryId],
    queryFn: async () => {
      if (!deliveryId) return null
      const { data, error } = await supabase
        .from('retention_lesson_brief_deliveries')
        .select(
          `id, scheduled_for, delivered_at, opened_at, self_check_answer, self_check_correct,
           brief:retention_lesson_briefs (id, brief_type, title_ar, body_ar, vocab_words,
             grammar_concept_ar, warmup_question_ar, self_check_question_ar,
             self_check_options, self_check_correct, mini_task_ar, audio_path)`
        )
        .eq('id', deliveryId)
        .single()
      if (error) throw error
      return data
    },
    enabled: Boolean(deliveryId),
  })
}

export function useMarkBriefOpened() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (deliveryId) => {
      const { error } = await supabase
        .from('retention_lesson_brief_deliveries')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', deliveryId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retention-pending-briefs'] })
    },
  })
}

export function useSubmitBriefSelfCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ deliveryId, answer, isCorrect }) => {
      const { error } = await supabase
        .from('retention_lesson_brief_deliveries')
        .update({
          self_check_answer: answer,
          self_check_correct: isCorrect,
        })
        .eq('id', deliveryId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['retention-brief-delivery', vars.deliveryId] })
    },
  })
}
