import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useGenerateHubContent() {
  return useMutation({
    mutationFn: async (videoUrl) => {
      const { data, error } = await supabase.functions.invoke(
        'generate-speaking-hub-content',
        { body: { video_url: videoUrl } }
      )
      if (error) throw error
      if (data?.error) throw new Error(data.message || data.error)
      return data
    },
  })
}
