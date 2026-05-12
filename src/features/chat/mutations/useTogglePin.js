import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useTogglePin(channelId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId }) => {
      // Atomic RPC: updates is_pinned + inserts system message in one transaction
      const { error } = await supabase.rpc('pin_message_with_system_note', {
        p_message_id: messageId,
      })
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['channel-messages', channelId] })
      qc.invalidateQueries({ queryKey: ['pinned-messages', channelId] })
    },
  })
}
