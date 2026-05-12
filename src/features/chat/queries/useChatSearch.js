import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useChatSearch({ groupId, query, channelId, senderId, fromDate, toDate, enabled = false }) {
  return useQuery({
    queryKey: ['chat-search', groupId, query, channelId, senderId, fromDate, toDate],
    enabled: enabled && !!groupId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('chat_search', {
          p_group_id: groupId,
          p_query: query || null,
          p_channel_id: channelId || null,
          p_sender_id: senderId || null,
          p_from_date: fromDate || null,
          p_to_date: toDate || null,
          p_limit: 50,
        })
      if (error) throw error
      return data ?? []
    },
  })
}
