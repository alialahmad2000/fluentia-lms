import { useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useRecordingProgress(recordingId) {
  const { studentData } = useAuthStore()
  const studentId = studentData?.id
  const queryClient = useQueryClient()
  const lastSaveRef = useRef(0)

  const { data: progress, isLoading } = useQuery({
    queryKey: ['recording-progress', studentId, recordingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recording_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('recording_id', recordingId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!studentId && !!recordingId,
    staleTime: 30_000,
  })

  const save = useCallback(async ({ position, percent, speed, completed }) => {
    if (!studentId || !recordingId) return

    // Throttle: max once per 5 seconds
    const now = Date.now()
    if (now - lastSaveRef.current < 5000) return
    lastSaveRef.current = now

    const payload = {
      student_id: studentId,
      recording_id: recordingId,
      position: Math.round(position),
      watched_percent: Math.round(percent * 10) / 10,
      speed,
      updated_at: new Date().toISOString(),
    }

    if (completed) {
      payload.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('recording_progress')
      .upsert(payload, { onConflict: 'student_id,recording_id' })
      .select()

    if (error) {
      console.error('[useRecordingProgress] save error:', error)
    } else {
      queryClient.setQueryData(['recording-progress', studentId, recordingId], data?.[0] || null)
    }

    return data?.[0]
  }, [studentId, recordingId, queryClient])

  // Force save (bypasses throttle)
  const forceSave = useCallback(async (params) => {
    lastSaveRef.current = 0
    return save(params)
  }, [save])

  return { progress, isLoading, save, forceSave }
}
