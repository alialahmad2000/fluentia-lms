// Data hooks for the Environment Track «مسار البيئة». Mirrors useBizTrack.js against env_track_*.
import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

function useProfileId() {
  const { profile } = useAuthStore(useShallow((s) => ({ profile: s.profile })))
  return profile?.id
}

// Stages + lessons (light — no heavy content) + this student's progress → a roadmap.
export function useEnvRoadmap() {
  const profileId = useProfileId()

  const { data: stages = [], isLoading: sLoading } = useQuery({
    queryKey: ['env-track', 'stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('env_track_stages')
        .select('id, sort_order, slug, title_en, title_ar, subtitle_ar, cefr, accent, icon')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60_000,
  })

  const { data: lessons = [], isLoading: lLoading } = useQuery({
    queryKey: ['env-track', 'lessons-light'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('env_track_lessons')
        .select('id, stage_id, sort_order, slug, title_en, title_ar, cefr')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60_000,
  })

  const { data: progress = [], isLoading: pLoading } = useQuery({
    queryKey: ['env-track', 'progress', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('env_track_progress')
        .select('lesson_id, status, score')
        .eq('student_id', profileId)
      if (error) throw error
      return data || []
    },
    enabled: !!profileId,
    staleTime: 30_000,
  })

  const doneSet = useMemo(
    () => new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id)),
    [progress]
  )
  const scoreByLesson = useMemo(
    () => new Map(progress.map((p) => [p.lesson_id, p.score])),
    [progress]
  )

  const roadmap = useMemo(() => {
    const byStage = new Map()
    for (const l of lessons) {
      if (!byStage.has(l.stage_id)) byStage.set(l.stage_id, [])
      byStage.get(l.stage_id).push({ ...l, done: doneSet.has(l.id), score: scoreByLesson.get(l.id) ?? null })
    }
    return stages.map((st) => ({ ...st, lessons: byStage.get(st.id) || [] }))
  }, [stages, lessons, doneSet, scoreByLesson])

  const totalLessons = lessons.length
  const doneLessons = doneSet.size
  // first not-yet-done lesson, in roadmap order → "continue here"
  const nextLesson = useMemo(() => {
    for (const st of roadmap) for (const l of st.lessons) if (!l.done) return l
    return null
  }, [roadmap])

  return {
    roadmap,
    totalLessons,
    doneLessons,
    nextLesson,
    isLoading: sLoading || lLoading || pLoading,
  }
}

// One lesson's full content by slug + its stage + this student's progress on it.
export function useEnvLesson(slug) {
  const profileId = useProfileId()

  const { data, isLoading } = useQuery({
    queryKey: ['env-track', 'lesson', slug],
    queryFn: async () => {
      const { data: lesson, error } = await supabase
        .from('env_track_lessons')
        .select('id, stage_id, sort_order, slug, title_en, title_ar, cefr, content')
        .eq('slug', slug)
        .maybeSingle()
      if (error) throw error
      if (!lesson) return { lesson: null, stage: null }
      const { data: stage } = await supabase
        .from('env_track_stages')
        .select('id, slug, title_en, title_ar, accent, icon, cefr')
        .eq('id', lesson.stage_id)
        .maybeSingle()
      return { lesson, stage }
    },
    enabled: !!slug,
    staleTime: 5 * 60_000,
  })

  const lessonId = data?.lesson?.id
  const { data: prog } = useQuery({
    queryKey: ['env-track', 'lesson-progress', profileId, lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('env_track_progress')
        .select('status, score')
        .eq('student_id', profileId)
        .eq('lesson_id', lessonId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!profileId && !!lessonId,
    staleTime: 10_000,
  })

  return {
    lesson: data?.lesson || null,
    stage: data?.stage || null,
    done: prog?.status === 'completed',
    score: prog?.score ?? null,
    isLoading,
  }
}

export function useCompleteEnvLesson() {
  const qc = useQueryClient()
  const profileId = useProfileId()
  return useMutation({
    mutationFn: async ({ lessonId, score }) => {
      const { data, error } = await supabase.rpc('env_track_complete_lesson', {
        p_lesson_id: lessonId,
        p_score: Number.isFinite(score) ? Math.round(score) : null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['env-track', 'progress', profileId] })
      qc.invalidateQueries({ queryKey: ['env-track', 'lesson-progress', profileId] })
    },
  })
}
