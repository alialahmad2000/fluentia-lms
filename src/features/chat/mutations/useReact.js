import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

export function useReact(channelId) {
  const qc = useQueryClient()
  const { profile } = useAuthStore()

  return useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      // Check if reaction exists → toggle
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', profile.id)
        .eq('emoji', emoji)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id)
        if (error) throw error
        return { action: 'removed' }
      } else {
        const { error } = await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: profile.id, emoji })
        if (error) throw error
        return { action: 'added' }
      }
    },
    onMutate: async ({ messageId, emoji }) => {
      await qc.cancelQueries({ queryKey: ['channel-messages', channelId] })
      const previous = qc.getQueryData(['channel-messages', channelId])

      qc.setQueryData(['channel-messages', channelId], (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((msg) => {
              if (msg.id !== messageId) return msg
              const hasReaction = msg.reactions?.some(
                (r) => r.emoji === emoji && r.user_id === profile.id
              )
              return {
                ...msg,
                reactions: hasReaction
                  ? msg.reactions.filter((r) => !(r.emoji === emoji && r.user_id === profile.id))
                  : [...(msg.reactions ?? []), { emoji, user_id: profile.id }],
              }
            })
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
