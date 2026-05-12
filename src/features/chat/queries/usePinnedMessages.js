import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function usePinnedMessages(channelId) {
  return useQuery({
    queryKey: ['pinned-messages', channelId],
    enabled: !!channelId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_messages')
        .select('id, body, content, type, created_at, sender:profiles!sender_id(first_name_ar)')
        .eq('channel_id', channelId)
        .eq('is_pinned', true)
        .is('deleted_at', null)
        .order('pinned_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data ?? []
    },
  })
}
