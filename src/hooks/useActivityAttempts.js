import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

// Loads all attempts for one student+activity, computes derived state.
// Re-exported so every activity page has a single source of truth.
export function useActivityAttempts(activityId) {
  const { profile } = useAuthStore()
  const studentId = profile?.id

  const [attempts,  setAttempts]  = useState(null)   // null = still loading
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    if (!activityId || !studentId) { setLoading(false); return }
    let isMounted = true

    const load = async () => {
      const { data, error } = await supabase
        .from('activity_attempts')
        .select('*')
        .eq('student_id',  studentId)
        .eq('activity_id', activityId)
        .is('deleted_at',  null)
        .order('attempt_number', { ascending: false })

      if (!isMounted) return
      if (error) setError(error.message)
      else       setAttempts(data ?? [])
      setLoading(false)
    }

    load()
    return () => { isMounted = false }
  }, [activityId, studentId])

  const inProgress       = attempts?.find(a => a.status === 'in_progress') ?? null
  const submittedHistory = attempts?.filter(a => a.status === 'submitted')  ?? []
  const bestScore        = submittedHistory.reduce((max, a) => Math.max(max, a.score ?? 0), 0)
  const latestSubmitted  = submittedHistory[0] ?? null  // already ordered DESC

  return {
    attempts,
    inProgress,
    submittedHistory,
    bestScore,
    latestSubmitted,
    loading,
    error,
    // Allow callers to refresh after creating/abandoning
    refresh: () => {
      setLoading(true)
      setError(null)
      setAttempts(null)
    },
  }
}
