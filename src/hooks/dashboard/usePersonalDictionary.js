import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function usePersonalDictionary(studentId, { limit = 6, offset = 0, source = null, mastery = null, search = null } = {}) {
  return useQuery({
    queryKey: ['personalDictionary', studentId, limit, offset, source, mastery, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_personal_dictionary', {
        p_student_id: studentId,
        p_limit: limit,
        p_offset: offset,
        p_source: source,
        p_mastery: mastery,
        p_search: search,
      })
      if (error) throw error
      return data ?? []
    },
    enabled: !!studentId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  })
}
