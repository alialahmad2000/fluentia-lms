import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

export function useTogglePin(channelId) {
  const qc = useQueryClient()
  const { profile } = useAuthStore()

  return useMutation({
    mutationFn: async ({ messageId, isPinned }) => {
      const { error } = await supabase
        .from('group_messages')
        .update({
          is_pinned: !isPinned,
          pinned_at: !isPinned ? new Date().toISOString() : null,
          pinned_by: !isPinned ? profile.id : null,
        })
        .eq('id', messageId)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['channel-messages', channelId] })
      qc.invalidateQueries({ queryKey: ['pinned-messages', channelId] })
    },
  })
}
