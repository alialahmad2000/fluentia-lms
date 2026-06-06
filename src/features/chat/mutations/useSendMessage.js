import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthProfile } from '../../../stores/authStore'
import { toast } from '../../../components/ui/FluentiaToast'

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
        _status: 'sending',
        _payload: payload,
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

      return { previous, optimisticId: optimistic.id }
    },
    onError: (_err, _payload, context) => {
      // keep the bubble visible + mark it failed (no silent vanish) — tap to retry
      qc.setQueryData(key, (old) => {
        if (!old?.pages?.length) return old
        return { ...old, pages: old.pages.map((pg) => pg.map((m) => (m.id === context?.optimisticId ? { ...m, _status: 'failed' } : m))) }
      })
      toast({ type: 'error', title: 'تعذّر إرسال الرسالة', description: 'تحقّقي من الاتصال ثم اضغطي على الرسالة لإعادة المحاولة' })
    },
    onSettled: () => {
      // partial-match invalidation refreshes every lens variant
      qc.invalidateQueries({ queryKey: ['unified-messages', groupId] })
    },
  })
}

// Re-send a failed group message (used by the per-bubble "إعادة المحاولة" affordance).
export async function resendMessage(qc, message) {
  const key = ['unified-messages', message.group_id, 'all']
  const mark = (status) => qc.setQueryData(key, (old) => (old?.pages?.length
    ? { ...old, pages: old.pages.map((pg) => pg.map((m) => (m.id === message.id ? { ...m, _status: status } : m))) }
    : old))
  mark('sending')
  const insert = { group_id: message.group_id, channel_id: message.channel_id, sender_id: message.sender_id, ...(message._payload || {}) }
  const { error } = await supabase.from('group_messages').insert(insert)
  if (error) { mark('failed'); toast({ type: 'error', title: 'فشل إعادة الإرسال' }); return }
  qc.invalidateQueries({ queryKey: ['unified-messages', message.group_id] })
}
