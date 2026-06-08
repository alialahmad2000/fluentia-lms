import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Re-export the existing per-student AI insight hook so the teacher app has one
// import surface. (student-insight-ai → radar / strengths / weaknesses / tips.)
export { useStudentInsight } from '@/hooks/trainer/useStudent360'

/** On-demand AI analysis of a whole group (strengths/weaknesses, at-risk, top
 *  performers, weekly summary). Backed by the generate-trainer-insights edge fn.
 *  Disabled by default — fetched only when the teacher asks (it's a Claude call). */
export function useClassInsight(groupId, { enabled = false } = {}) {
  return useQuery({
    queryKey: ['teacher-class-insight', groupId],
    enabled: !!groupId && enabled,
    staleTime: 6 * 3_600_000,
    retry: 1,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-trainer-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ group_id: groupId }),
      })
      if (!res.ok) throw new Error(`trainer-insights ${res.status}`)
      return res.json()
    },
  })
}
