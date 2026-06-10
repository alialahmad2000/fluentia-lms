import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// The 5 stages of an individual-track module, in order.
export const MODULE_STAGES = ['brief', 'vocab', 'phrases', 'roleplay', 'writing']

export function stageDone(progress, stage) {
  return Boolean(progress?.stage_state?.[stage]?.done)
}

export function moduleCompletion(progress) {
  if (!progress) return 0
  const done = MODULE_STAGES.filter((s) => stageDone(progress, s)).length
  return Math.round((done / MODULE_STAGES.length) * 100)
}

/**
 * The individual student's whole track: specialization + ordered modules + own progress.
 * Group students never mount this (gated by studentData.study_mode === 'individual').
 */
export function useIndividualTrack() {
  const studentData = useAuthStore((s) => s.studentData)
  const profileId = useAuthStore((s) => s.profile?.id)
  const specializationId = studentData?.specialization_id || null

  const specialization = useQuery({
    queryKey: ['specialization', specializationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specializations').select('*').eq('id', specializationId).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!specializationId,
    staleTime: 10 * 60_000,
  })

  const modules = useQuery({
    queryKey: ['specialization-modules', specializationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialization_modules')
        .select('id, module_number, title_ar, title_en, scenario_ar, estimated_minutes, sort_order')
        .eq('specialization_id', specializationId)
        .eq('is_published', true)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!specializationId,
    staleTime: 10 * 60_000,
  })

  const progress = useQuery({
    queryKey: ['module-progress', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialization_module_progress')
        .select('*')
        .eq('student_id', profileId)
        .is('deleted_at', null)
      if (error) throw error
      return data || []
    },
    enabled: !!profileId && !!specializationId,
    staleTime: 30_000,
  })

  const derived = useMemo(() => {
    const list = modules.data || []
    const progByModule = new Map((progress.data || []).map((p) => [p.module_id, p]))
    const items = list.map((m) => {
      const p = progByModule.get(m.id) || null
      return { ...m, progress: p, completion: moduleCompletion(p), completed: p?.status === 'completed' }
    })
    const completedCount = items.filter((i) => i.completed).length
    // current = first not-completed module; everything after it is locked
    const currentIdx = items.findIndex((i) => !i.completed)
    const withLock = items.map((i, idx) => ({
      ...i,
      locked: currentIdx !== -1 && idx > currentIdx,
      isCurrent: idx === currentIdx,
    }))
    const scores = items.map((i) => i.progress?.score).filter((s) => s != null)
    const avgScore = scores.length ? Math.round((scores.reduce((a, b) => a + Number(b), 0) / scores.length) * 10) / 10 : null
    const wordsLearned = completedCount * 10 // 10 vocab terms per module
    return {
      items: withLock,
      completedCount,
      total: items.length,
      trackPercent: items.length ? Math.round((completedCount / items.length) * 100) : 0,
      nextModule: currentIdx === -1 ? null : withLock[currentIdx],
      avgScore,
      wordsLearned,
    }
  }, [modules.data, progress.data])

  return {
    specialization: specialization.data,
    loading: specialization.isLoading || modules.isLoading || progress.isLoading,
    ...derived,
  }
}

/** One module's full content + the student's progress row, with stage mutations. */
export function useModule(moduleId) {
  const profileId = useAuthStore((s) => s.profile?.id)
  const queryClient = useQueryClient()

  const module = useQuery({
    queryKey: ['specialization-module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialization_modules').select('*').eq('id', moduleId).maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!moduleId,
    staleTime: 10 * 60_000,
  })

  const progress = useQuery({
    queryKey: ['module-progress', profileId, moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialization_module_progress')
        .select('*')
        .eq('student_id', profileId).eq('module_id', moduleId)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!profileId && !!moduleId,
    staleTime: 10_000,
  })

  const completeStage = useMutation({
    // Server-authoritative + atomic: track_complete_stage() whitelists the stage
    // (roleplay/score are edge-fn-only) and merges stage_state in one statement,
    // so it can never race/clobber the grade fn's roleplay write.
    mutationFn: async ({ stage, extra = {} }) => {
      const { data, error } = await supabase.rpc('track_complete_stage', {
        p_module_id: moduleId,
        p_stage: stage,
        p_extra: extra,
      })
      if (error) throw error
      return data
    },
    onSuccess: (row) => {
      queryClient.setQueryData(['module-progress', profileId, moduleId], row)
      queryClient.invalidateQueries({ queryKey: ['module-progress', profileId] })
    },
  })

  return { module: module.data, progress: progress.data, loading: module.isLoading || progress.isLoading, completeStage }
}
