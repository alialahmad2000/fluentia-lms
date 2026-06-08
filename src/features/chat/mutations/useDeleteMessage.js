import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { cancelMessageQueries, patchMessage, restoreSnapshot, invalidateMessage } from './messageCache'

export function useDeleteMessage() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId }) => {
      const { error } = await supabase
        .from('group_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
      if (error) throw error
    },
    onMutate: async ({ message }) => {
      if (!message) return {}
      await cancelMessageQueries(qc, message)
      const snapshot = patchMessage(qc, message, (m) => ({ ...m, deleted_at: new Date().toISOString() }))
      return { snapshot }
    },
    onError: (_err, _vars, context) => restoreSnapshot(qc, context?.snapshot),
    onSettled: (_data, _err, vars) => { if (vars?.message) invalidateMessage(qc, vars.message) },
  })
}
