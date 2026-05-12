import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

export function useSendMessage(channelId, groupId) {
  const qc = useQueryClient()
  const { profile } = useAuthStore()

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          channel_id: channelId,
          sender_id: profile.id,
          ...payload,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['channel-messages', channelId] })
      const previous = qc.getQueryData(['channel-messages', channelId])

      const optimistic = {
        id: `optimistic-${Date.now()}`,
        group_id: groupId,
        channel_id: channelId,
        sender_id: profile.id,
        sender: { id: profile.id, first_name_ar: profile.first_name_ar, last_name_ar: profile.last_name_ar, avatar_url: profile.avatar_url, role: profile.role },
        reactions: [],
        created_at: new Date().toISOString(),
        deleted_at: null,
        is_pinned: false,
        is_edited: false,
        _optimistic: true,
        ...payload,
      }

      qc.setQueryData(['channel-messages', channelId], (old) => {
        if (!old) return old
        return {
          ...old,
          pages: [
            [optimistic, ...(old.pages[0] ?? [])],
            ...old.pages.slice(1),
          ],
        }
      })

      return { previous }
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        qc.setQueryData(['channel-messages', channelId], context.previous)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['channel-messages', channelId] })
    },
  })
}
