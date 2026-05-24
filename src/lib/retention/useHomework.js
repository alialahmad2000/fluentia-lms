// Module 2 hooks — pull exercise bank, recent attempts, and produce/own
// homework sets for the calling student.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuthUserId } from '../../stores/authStore'
import { useStudentLevel } from './useStudentLevel.js'
import { useStudentMistakeTags } from './useStudentMistakeTags.js'
import { selectHomework } from './selectHomework.js'

export function useExerciseBank() {
  const userId = useAuthUserId()
  const { data: studentLevel } = useStudentLevel()
  const levelStr = studentLevel?.level_number ? `L${studentLevel.level_number}` : null

  return useQuery({
    queryKey: ['retention-exercise-bank', levelStr],
    queryFn: async () => {
      if (!levelStr) return []
      const { data, error } = await supabase
        .from('retention_exercises')
        .select('*')
        .eq('level', levelStr)
        .order('difficulty', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: Boolean(userId && levelStr),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useRecentlyAttempted({ days = 30 } = {}) {
  const userId = useAuthUserId()

  return useQuery({
    queryKey: ['retention-recent-attempts', userId, days],
    queryFn: async () => {
      if (!userId) return new Set()
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('retention_homework_attempts')
        .select('exercise_id')
        .eq('student_id', userId)
        .gte('attempted_at', cutoff)
      if (error) {
        if (error.code === '42P01') return new Set()
        throw error
      }
      return new Set((data || []).map((r) => r.exercise_id).filter(Boolean))
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useActiveHomeworkSet() {
  const userId = useAuthUserId()

  return useQuery({
    queryKey: ['retention-active-homework', userId],
    queryFn: async () => {
      if (!userId) return null
      // Latest in-progress set (not completed) created in the last 48h
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('retention_homework_sets')
        .select('*')
        .eq('student_id', userId)
        .is('completed_at', null)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useHomeworkHistory({ limit = 10 } = {}) {
  const userId = useAuthUserId()

  return useQuery({
    queryKey: ['retention-homework-history', userId, limit],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('retention_homework_sets')
        .select('id, triggered_by, created_at, completed_at, total_count, completed_count, xp_awarded')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

// Mutation: create a new homework set on demand.
export function useCreateHomeworkSet() {
  const userId = useAuthUserId()
  const { data: studentLevel } = useStudentLevel()
  const { data: mistakeTags } = useStudentMistakeTags({ limit: 5 })
  const { data: bank } = useExerciseBank()
  const { data: recentlyAttempted } = useRecentlyAttempted({ days: 30 })
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ triggeredBy = 'on_demand' } = {}) => {
      if (!userId) throw new Error('Not signed in')
      if (!bank || bank.length === 0) {
        throw new Error('No exercises available for your level yet')
      }
      const { selected, reason } = selectHomework({
        bank,
        mistakeTags: mistakeTags || [],
        recentlyAttemptedIds: recentlyAttempted || new Set(),
        preferredDifficulty:
          studentLevel?.academic_level === 1 ? 1
          : studentLevel?.academic_level === 5 ? 4
          : 2,
      })
      if (selected.length === 0) {
        throw new Error('You have completed all available exercises this month — great work!')
      }
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('retention_homework_sets')
        .insert({
          student_id: userId,
          triggered_by: triggeredBy,
          exercise_ids: selected.map((e) => e.id),
          total_count: selected.length,
          expires_at: expiresAt,
        })
        .select('*')
        .single()
      if (error) throw error
      return { set: data, exercises: selected, selectionReason: reason }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retention-active-homework'] })
      qc.invalidateQueries({ queryKey: ['retention-homework-history'] })
    },
  })
}
