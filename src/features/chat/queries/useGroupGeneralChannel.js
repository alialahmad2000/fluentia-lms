import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useGroupGeneralChannel(groupId) {
  return useQuery({
    queryKey: ['group-general-channel', groupId],
    enabled: !!groupId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_channels')
        .select('id, slug')
        .eq('group_id', groupId)
        .eq('slug', 'general')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useGroupAnnouncementChannel(groupId) {
  return useQuery({
    queryKey: ['group-announcement-channel', groupId],
    enabled: !!groupId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_channels')
        .select('id, slug')
        .eq('group_id', groupId)
        .eq('slug', 'announcements')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
