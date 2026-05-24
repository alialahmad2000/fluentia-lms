// useRetentionModuleEnabled — gates every retention surface (route, dashboard card, banner)
// on the per-student per-module enable flag stored in retention_modules.
//
// Default behaviour: returns { enabled: false, isLoading: true } until query resolves.
// If the user isn't a student (admin/trainer), returns { enabled: true } so they can
// preview the surface during testing — this matches how /admin/* impersonation flows work.
//
// Why 60s stale: admin flips happen rarely; over-fetching wastes RTT on every page.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuthUserId, useIsStudent } from '../../stores/authStore'

export function useRetentionModuleEnabled(moduleKey) {
  const userId = useAuthUserId()
  const isStudent = useIsStudent()

  const query = useQuery({
    queryKey: ['retention-module-enabled', userId, moduleKey],
    queryFn: async () => {
      if (!userId) return false
      // Non-students see everything for preview purposes
      if (!isStudent) return true
      const { data, error } = await supabase
        .from('retention_modules')
        .select('enabled')
        .eq('student_id', userId)
        .eq('module_key', moduleKey)
        .maybeSingle()
      if (error) throw error
      return Boolean(data?.enabled)
    },
    enabled: Boolean(userId && moduleKey),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  return {
    enabled: query.data === true,
    isLoading: query.isLoading,
    error: query.error,
  }
}

// Admin-only — loads the wide retention_module_status view for the master switch UI.
export function useRetentionModuleStatus() {
  return useQuery({
    queryKey: ['retention-module-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retention_module_status')
        .select('*')
        .order('full_name', { ascending: true })
      if (error) throw error
      return data
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
