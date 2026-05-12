import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export function useDeleteMessage(channelId) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId }) => {
      const { error } = await supabase
        .from('group_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
      if (error) throw error
    },
    onMutate: async ({ messageId }) => {
      await qc.cancelQueries({ queryKey: ['channel-messages', channelId] })
      const previous = qc.getQueryData(['channel-messages', channelId])
      qc.setQueryData(['channel-messages', channelId], (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((msg) =>
              msg.id === messageId ? { ...msg, deleted_at: new Date().toISOString() } : msg
            )
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['channel-messages', channelId], context.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['channel-messages', channelId] })
    },
  })
}
