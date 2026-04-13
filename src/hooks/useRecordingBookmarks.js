import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useRecordingBookmarks(recordingId) {
  const { user } = useAuthStore()
  const studentId = user?.id
  const queryClient = useQueryClient()
  const qk = ['recording-bookmarks', studentId, recordingId]

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recording_bookmarks')
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

  const addBookmark = useMutation({
    mutationFn: async ({ position_seconds, label }) => {
      const { data, error } = await supabase
        .from('recording_bookmarks')
        .insert({ student_id: studentId, recording_id: recordingId, position_seconds, label: label || null })
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  })

  const deleteBookmark = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('recording_bookmarks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  })

  return { bookmarks, isLoading, addBookmark, deleteBookmark }
}
