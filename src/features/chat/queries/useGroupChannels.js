import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

export function useGroupChannels(groupId) {
  const { profile } = useAuthStore()

  return useQuery({
    queryKey: ['group-channels', groupId],
    enabled: !!groupId && !!profile,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_channels')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_archived', false)
        .order('position')
      if (error) throw error
      return data
    },
  })
}

export function useChannelUnreadCounts(groupId) {
  const { profile } = useAuthStore()

  return useQuery({
    queryKey: ['channel-unread-counts', groupId, profile?.id],
    enabled: !!groupId && !!profile?.id,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_chat_unread_total')
      if (error) {
        console.warn('get_chat_unread_total RPC not yet available:', error.message)
        return 0
      }
      return data ?? 0
    },
  })
}
