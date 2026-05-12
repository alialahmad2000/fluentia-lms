import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

export function useMarkRead(channelId) {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const pendingRef = useRef(new Set())
  const flushRef = useRef(null)

  const markMessageRead = useCallback(async (messageId) => {
    if (!channelId || !profile?.id || !messageId) return
    pendingRef.current.add(messageId)

    if (flushRef.current) clearTimeout(flushRef.current)
    flushRef.current = setTimeout(async () => {
      const ids = [...pendingRef.current]
      pendingRef.current.clear()

      // Upsert message_reads for each visible message
      await supabase.from('message_reads').upsert(
        ids.map((id) => ({ message_id: id, user_id: profile.id })),
        { onConflict: 'message_id,user_id', ignoreDuplicates: true }
      )

      // Update channel_read_cursors (most recent message seen)
      const { data: msg } = await supabase
        .from('group_messages')
        .select('id, created_at')
        .in('id', ids)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (msg) {
        await supabase.from('channel_read_cursors').upsert({
          channel_id: channelId,
          user_id: profile.id,
          last_read_message_id: msg.id,
          last_read_at: msg.created_at,
        }, { onConflict: 'channel_id,user_id' })
      }

      qc.invalidateQueries({ queryKey: ['channel-unread-counts'] })
    }, 500)
  }, [channelId, profile?.id, qc])

  return { markMessageRead }
}
