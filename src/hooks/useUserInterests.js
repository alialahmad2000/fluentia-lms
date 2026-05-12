import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useUserInterests() {
  const userId = useAuthStore(s => s.profile?.id)

  return useQuery({
    queryKey: ['user-interests', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('user_interests')
        .select('user_id, interests, has_completed_survey, dismissed_at, survey_completed_at')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data ?? {
        user_id: userId,
        interests: [],
        has_completed_survey: false,
        dismissed_at: null,
        survey_completed_at: null,
      }
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateUserInterests() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(s => s.profile?.id)

  return useMutation({
    mutationFn: async ({ interests, completed = false, dismissed = false }) => {
      if (!userId) throw new Error('No user id')
      const patch = {
        user_id: userId,
        interests,
        updated_at: new Date().toISOString(),
      }
      if (completed) {
        patch.has_completed_survey = true
        patch.survey_completed_at = new Date().toISOString()
      }
      if (dismissed) {
        patch.dismissed_at = new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('user_interests')
        .upsert(patch, { onConflict: 'user_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-interests', userId] })
    },
  })
}

export function shouldShowInterestSurvey(interestsRow) {
  if (!interestsRow) return false
  if (interestsRow.has_completed_survey) return false
  if (interestsRow.dismissed_at) {
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    if (Date.now() - new Date(interestsRow.dismissed_at).getTime() < sevenDays) {
      return false
    }
  }
  return true
}
