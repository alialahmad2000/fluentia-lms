import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthProfile } from '../../../stores/authStore'

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h (was 15m) — pro chats allow long edit windows

export function useEditMessage(channelId) {
  const qc = useQueryClient()
  const profile = useAuthProfile()

  return useMutation({
    mutationFn: async ({ messageId, body, createdAt }) => {
      if (Date.now() - new Date(createdAt).getTime() > EDIT_WINDOW_MS) {
        throw new Error('edit_window_expired')
      }
      const { error } = await supabase
        .from('group_messages')
        .update({ body, is_edited: true, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', profile.id)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['channel-messages', channelId] })
    },
  })
}
