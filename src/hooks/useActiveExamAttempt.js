import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * Returns true if the current user has an in-progress mock exam attempt
 * (is_submitted=false AND now() < expires_at). Used to DEFER auto-updates /
 * forced reloads so a student is never interrupted mid-exam. Polls every 30s.
 */
export function useActiveExamAttempt() {
  const profile = useAuthStore((s) => s.profile)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!profile?.id) {
      setIsActive(false)
      return
    }
    let cancelled = false

    const check = async () => {
      try {
        const { data, error } = await supabase
          .from('mock_exam_attempts')
          .select('id')
          .eq('student_id', profile.id)
          .eq('is_submitted', false)
          .gt('expires_at', new Date().toISOString())
          .limit(1)
          .maybeSingle()
        if (cancelled) return
        setIsActive(!error && !!data)
      } catch {
        if (!cancelled) setIsActive(false)
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [profile?.id])

  return isActive
}
