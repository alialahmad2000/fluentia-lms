import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useUnitRecordings(unitId) {
  return useQuery({
    queryKey: ['unit-recordings', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_recordings')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_archive', false)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('recorded_date', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
    staleTime: 60_000,
  })
}
