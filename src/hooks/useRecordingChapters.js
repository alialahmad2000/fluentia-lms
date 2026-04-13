import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useRecordingChapters(recordingId) {
  const queryClient = useQueryClient()
  const qk = ['recording-chapters', recordingId]

  const { data: chapters = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recording_chapters')
        .select('*')
        .eq('recording_id', recordingId)
        .order('start_seconds', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!recordingId,
    staleTime: 60_000,
  })

  const addChapter = useMutation({
    mutationFn: async ({ start_seconds, title_ar, title_en }) => {
      const { data, error } = await supabase
        .from('recording_chapters')
        .insert({ recording_id: recordingId, start_seconds, title_ar, title_en, sort_order: start_seconds })
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  })

  const deleteChapter = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('recording_chapters').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  })

  const updateChapter = useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('recording_chapters')
        .update(updates)
        .eq('id', id)
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
  })

  return { chapters, isLoading, addChapter, deleteChapter, updateChapter }
}
