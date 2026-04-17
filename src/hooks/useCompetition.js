import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../components/ui/FluentiaToast'

export function useActiveCompetition() {
  return useQuery({
    queryKey: ['active-competition'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_competition')
      if (error) throw error
      return data
    },
    staleTime: 10_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  })
}

export function useCompetitionContext() {
  const { profile, impersonation } = useAuthStore()
  const profileId = impersonation?.userId ?? profile?.id

  return useQuery({
    queryKey: ['competition-context', profileId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_competition_student_context', {
        p_profile_id: profileId,
      })
      if (error) throw error
      return data
    },
    enabled: !!profileId,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  })
}

export function useCompetitionLeaderboard(competitionId, team, limit = 10) {
  return useQuery({
    queryKey: ['competition-leaderboard', competitionId, team, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_competition_leaderboard', {
        p_competition_id: competitionId,
        p_team: team,
        p_limit: limit,
      })
      if (error) throw error
      return data ?? []
    },
    enabled: !!competitionId && !!team,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  })
}

export function useCompetitionFeed(competitionId, limit = 20) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['competition-feed', competitionId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_competition_feed', {
        p_competition_id: competitionId,
        p_limit: limit,
      })
      if (error) throw error
      return data ?? []
    },
    enabled: !!competitionId,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!competitionId) return

    const channel = supabase
      .channel(`comp-feed-${competitionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'xp_transactions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['competition-feed', competitionId] })
        queryClient.invalidateQueries({ queryKey: ['active-competition'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [competitionId, queryClient])

  return query
}

export function useSendEncouragement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ toStudentId, message }) => {
      const { data, error } = await supabase.rpc('send_peer_encouragement', {
        p_to_student_id: toStudentId,
        p_message: message,
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      toast.success(`تم إرسال التشجيع! 🎉 باقي اليوم: ${data.remaining_today}`)
      queryClient.invalidateQueries({ queryKey: ['competition-context'] })
    },
    onError: (error) => {
      if (error.message?.includes('daily_limit_reached')) {
        toast.error('وصلت للحد اليومي (5 تشجيعات)')
      } else if (error.message?.includes('self_encouragement_not_allowed')) {
        toast.error('لا يمكنك تشجيع نفسك')
      } else {
        toast.error('فشل إرسال التشجيع')
      }
    },
  })
}
