import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthProfile } from '../../../stores/authStore'
import { cancelMessageQueries, patchMessage, restoreSnapshot, invalidateMessage } from './messageCache'

export function useReact() {
  const qc = useQueryClient()
  const profile = useAuthProfile()

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
    onMutate: async ({ emoji, message }) => {
      if (!message) return {}
      await cancelMessageQueries(qc, message)
      const snapshot = patchMessage(qc, message, (msg) => {
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
      return { snapshot }
    },
    onError: (_err, _vars, context) => restoreSnapshot(qc, context?.snapshot),
    onSettled: (_data, _err, vars) => { if (vars?.message) invalidateMessage(qc, vars.message) },
  })
}
