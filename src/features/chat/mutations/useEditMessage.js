import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuthProfile } from '../../../stores/authStore'
import { cancelMessageQueries, patchMessage, restoreSnapshot, invalidateMessage } from './messageCache'

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h (was 15m) — pro chats allow long edit windows

export function useEditMessage() {
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
    onMutate: async ({ body, message }) => {
      if (!message) return {}
      await cancelMessageQueries(qc, message)
      const snapshot = patchMessage(qc, message, (m) => ({ ...m, body, is_edited: true, edited_at: new Date().toISOString() }))
      return { snapshot }
    },
    onError: (_err, _vars, context) => restoreSnapshot(qc, context?.snapshot),
    onSettled: (_data, _err, vars) => { if (vars?.message) invalidateMessage(qc, vars.message) },
  })
}
