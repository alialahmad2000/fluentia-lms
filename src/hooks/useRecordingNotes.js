import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useRecordingNotes(recordingId) {
  const { user } = useAuthStore()
  const studentId = user?.id
  const queryClient = useQueryClient()
  const qk = ['recording-notes', studentId, recordingId]

  const { data: notes = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recording_notes')
        .select('*')
        .eq('student_id', studentId)
        .eq('recording_id', recordingId)
        .order('position_seconds', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!studentId && !!recordingId,
    staleTime: 30_000,
  })

  const addNote = useMutation({
    mutationFn: async ({ position_seconds, content }) => {
      const { data, error } = await supabase
        .from('recording_notes')
        .insert({ student_id: studentId, recording_id: recordingId, position_seconds, content })
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  })

  const updateNote = useMutation({
    mutationFn: async ({ id, content }) => {
      const { data, error } = await supabase
        .from('recording_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  })

  const deleteNote = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('recording_notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  })

  return { notes, isLoading, addNote, updateNote, deleteNote }
}
