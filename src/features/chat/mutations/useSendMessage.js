import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthProfile } from '../../../stores/authStore'

// The unified stream reads ['unified-messages', groupId, lens]. Optimistic
// updates target the 'all' lens (the default view); realtime + onSettled
// invalidation refresh every lens.
export function useSendMessage(channelId, groupId) {
  const qc = useQueryClient()
  const profile = useAuthProfile()
  const key = ['unified-messages', groupId, 'all']

  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({ group_id: groupId, channel_id: channelId, sender_id: profile.id, ...payload })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (payload) => {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fluentia:chat-send'))
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)

      const optimistic = {
        id: `optimistic-${Date.now()}`,
        group_id: groupId,
        channel_id: channelId,
        sender_id: profile.id,
        sender: {
          id: profile.id,
          display_name: profile.display_name,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.role,
        },
        reactions: [],
        created_at: new Date().toISOString(),
        deleted_at: null,
        is_pinned: false,
        is_edited: false,
        _optimistic: true,
        ...payload,
      }

      qc.setQueryData(key, (old) => {
        if (!old?.pages?.length) return old
        // page[0] holds the newest batch; prepend (it is rendered reversed → bottom)
        return {
          ...old,
          pages: [[optimistic, ...old.pages[0]], ...old.pages.slice(1)],
        }
      })

      return { previous }
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSettled: () => {
      // partial-match invalidation refreshes every lens variant
      qc.invalidateQueries({ queryKey: ['unified-messages', groupId] })
    },
  })
}
