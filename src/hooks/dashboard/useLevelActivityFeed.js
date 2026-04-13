import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useLevelActivityFeed(studentId) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['levelActivityFeed', studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_level_activity_feed', {
        p_student_id: studentId,
        p_limit: 20,
      })
      if (error) throw error
      return data ?? []
    },
    enabled: !!studentId,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  })

  // Realtime subscription for new activity_feed inserts
  useEffect(() => {
    if (!studentId) return

    const channel = supabase
      .channel(`feed-${studentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['levelActivityFeed', studentId] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [studentId, queryClient])

  return query
}
