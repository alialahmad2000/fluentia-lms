import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { parseDeviceType, isPhone, isTablet } from '../utils/parseDevice'

export function useDeviceInstallStatus() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-device-install-status'],
    queryFn: async () => {
      // Fetch students with group info
      const { data: students, error: studentsErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'student')

      if (studentsErr) throw studentsErr

      // Fetch student group info
      const { data: studentRows, error: studentRowsErr } = await supabase
        .from('students')
        .select('id, group_id, status')
        .is('deleted_at', null)

      if (studentRowsErr) throw studentRowsErr

      // Fetch groups
      const { data: groups, error: groupsErr } = await supabase
        .from('groups')
        .select('id, name, level')
        .eq('is_active', true)

      if (groupsErr) throw groupsErr

      // Fetch active subscriptions
      const { data: subs, error: subsErr } = await supabase
        .from('push_subscriptions')
        .select('user_id, user_agent, is_active')
        .eq('is_active', true)

      if (subsErr) throw subsErr

      // Build group map
      const groupMap = {}
      for (const g of groups || []) {
        groupMap[g.id] = g
      }

      // Build student info map
      const studentInfoMap = {}
      for (const s of studentRows || []) {
        studentInfoMap[s.id] = s
      }

      // Group subscriptions by user
      const subsByUser = {}
      for (const sub of subs || []) {
        if (!subsByUser[sub.user_id]) subsByUser[sub.user_id] = []
        subsByUser[sub.user_id].push(sub)
      }

      // Classify each student
      const result = (students || []).map(student => {
        const info = studentInfoMap[student.id]
        const group = info?.group_id ? groupMap[info.group_id] : null
        const userSubs = subsByUser[student.id] || []

        const devices = {
          iphone: false,
          ipad: false,
          android_phone: false,
          android_tablet: false,
          desktop: false,
        }

        for (const sub of userSubs) {
          const type = parseDeviceType(sub.user_agent)
          if (type in devices) devices[type] = true
        }

        const hasPhoneDevice = devices.iphone || devices.android_phone
        const hasTabletDevice = devices.ipad || devices.android_tablet

        return {
          id: student.id,
          full_name: student.full_name,
          group_name: group?.name || null,
          group_level: group?.level || null,
          group_id: info?.group_id || null,
          status: info?.status || 'active',
          devices,
          deviceCount: userSubs.length,
          hasPhone: hasPhoneDevice,
          hasTablet: hasTabletDevice,
          hasDesktop: devices.desktop,
          complete: hasPhoneDevice && hasTabletDevice,
        }
      }).filter(s => s.status === 'active')

      // Sort: missing first, then partial, then complete
      result.sort((a, b) => {
        const score = (s) => s.complete ? 2 : (s.hasPhone || s.hasTablet) ? 1 : 0
        return score(a) - score(b)
      })

      const summary = {
        total: result.length,
        withAnySubscription: result.filter(s => s.deviceCount > 0).length,
        withPhone: result.filter(s => s.hasPhone).length,
        withTablet: result.filter(s => s.hasTablet).length,
        complete: result.filter(s => s.complete).length,
        missing: result.filter(s => s.deviceCount === 0).length,
      }

      return { students: result, summary }
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })

  return {
    students: data?.students || [],
    summary: data?.summary || { total: 0, withAnySubscription: 0, withPhone: 0, withTablet: 0, complete: 0, missing: 0 },
    loading: isLoading,
    error,
    refetch,
  }
}
