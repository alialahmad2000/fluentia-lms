import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { cancelMessageQueries, patchMessage, restoreSnapshot, invalidateMessage } from './messageCache'

export function useTogglePin() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId }) => {
      // Atomic RPC: updates is_pinned + inserts system message in one transaction
      const { error } = await supabase.rpc('pin_message_with_system_note', {
        p_message_id: messageId,
      })
      if (error) throw error
    },
    onMutate: async ({ message }) => {
      if (!message) return {}
      await cancelMessageQueries(qc, message)
      const snapshot = patchMessage(qc, message, (m) => ({ ...m, is_pinned: !m.is_pinned }))
      return { snapshot }
    },
    onError: (_err, _vars, context) => restoreSnapshot(qc, context?.snapshot),
    onSettled: (_data, _err, vars) => {
      if (!vars?.message) return
      invalidateMessage(qc, vars.message)
      if (vars.message.group_id) qc.invalidateQueries({ queryKey: ['group-pinned', vars.message.group_id] })
    },
  })
}
