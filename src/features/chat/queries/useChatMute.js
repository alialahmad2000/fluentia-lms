import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

/**
 * Per-source notification mutes (master / group / dm), backed by the
 * chat_notification_mutes table + get_chat_mutes / set_chat_mute RPCs.
 * The push triggers (group_message_push / dm_notify_push) already honor these,
 * so muting here silences that conversation's push notifications.
 */
export function useChatMutes() {
  return useQuery({
    queryKey: ['chat-mutes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_chat_mutes')
      if (error) throw error
      return data || [] // [{ scope, target_id }]
    },
    staleTime: 60_000,
  })
}

/** True if the given (scope,target) is muted — also true when the user muted everything ('all'). */
export function muteActive(mutes, scope, target) {
  if (!Array.isArray(mutes)) return false
  return mutes.some((m) => m.scope === 'all' || (m.scope === scope && m.target_id === target))
}

export function useToggleChatMute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ scope, target, muted }) => {
      const { error } = await supabase.rpc('set_chat_mute', {
        p_scope: scope,
        p_target: target ?? null,
        p_muted: muted,
      })
      if (error) throw error
      return muted
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-mutes'] }),
  })
}
