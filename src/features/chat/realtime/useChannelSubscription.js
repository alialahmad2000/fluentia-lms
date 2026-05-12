import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useChannelSubscription(channelId) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!channelId) return

    const ch = supabase
      .channel(`chat:channel:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `channel_id=eq.${channelId}` },
        () => qc.invalidateQueries({ queryKey: ['channel-messages', channelId] })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `channel_id=eq.${channelId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['channel-messages', channelId] })
          qc.invalidateQueries({ queryKey: ['pinned-messages', channelId] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => qc.invalidateQueries({ queryKey: ['channel-messages', channelId] })
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [channelId, qc])
}
