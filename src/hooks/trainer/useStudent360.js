import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useStudent360Overview(studentId) {
  return useQuery({
    queryKey: ['student360-overview', studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_360_overview', {
        p_student_id: studentId,
      })
      if (error) throw error
      return data
    },
    enabled: !!studentId,
    staleTime: 60_000,
  })
}

export function useStudentTimeline(studentId, days = 14) {
  return useQuery({
    queryKey: ['student360-timeline', studentId, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_activity_timeline', {
        p_student_id: studentId,
        p_days: days,
        p_limit: 40,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!studentId,
    staleTime: 60_000,
  })
}

export function useStudentInsight(studentId, forceRefresh = false) {
  return useQuery({
    queryKey: ['student360-insight', studentId, forceRefresh],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-insight-ai`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ student_id: studentId, force_refresh: forceRefresh }),
      })
      if (!res.ok) throw new Error(`insight-ai ${res.status}`)
      return res.json()
    },
    enabled: !!studentId,
    staleTime: 11 * 3_600_000,
    retry: 1,
  })
}

export function useAddTrainerNote(studentId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ text, type = 'observation' }) => {
      const { data, error } = await supabase.rpc('add_trainer_note', {
        p_student_id: studentId,
        p_note_text: text,
        p_note_type: type,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student360-notes', studentId] })
    },
  })
}

export function useStudentNotes(studentId) {
  return useQuery({
    queryKey: ['student360-notes', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainer_notes')
        .select('id, content, note_type, created_at, trainer_id')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
    enabled: !!studentId,
    staleTime: 30_000,
  })
}
