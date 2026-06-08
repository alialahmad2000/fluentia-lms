import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/** All curriculum units (for the focus-unit picker + resolving current_unit_id). */
export function useCurriculumUnits() {
  return useQuery({
    queryKey: ['curriculum-units-all'],
    staleTime: 3_600_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, theme_ar, theme_en, level_id, sort_order, curriculum_levels(level_number, name_ar)')
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })
}

function riyadhStartOfDayISO() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return `${parts}T00:00:00+03:00`
}

/** Today's attendance rows for one group+class, keyed by student_id. */
export function useTodayAttendance(groupId, classNumber) {
  return useQuery({
    queryKey: ['teacher-attendance', groupId, classNumber],
    enabled: !!groupId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('id, student_id, status')
        .eq('group_id', groupId)
        .eq('class_number', classNumber)
        .gte('created_at', riyadhStartOfDayISO())
      if (error) throw error
      const map = {}
      for (const r of data || []) map[r.student_id] = { id: r.id, status: r.status }
      return map
    },
  })
}

/** Mark/Update one student's attendance for today's class. */
export function useMarkAttendance() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async ({ existingId, studentId, groupId, classNumber, status, unitId }) => {
      if (existingId) {
        const { error } = await supabase.from('attendance').update({ status }).eq('id', existingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('attendance').insert({
          student_id: studentId, group_id: groupId, class_number: classNumber, status,
          unit_id: unitId || null, recorded_by: profile?.id, checked_in_via: 'trainer',
        })
        if (error) throw error
      }
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['teacher-attendance', vars.groupId, vars.classNumber] }),
  })
}

/** Create an assignment/task for a group. */
export function useCreateAssignment() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async ({ groupId, title, instructions, deadline, type = 'custom' }) => {
      const { error } = await supabase.from('assignments').insert({
        trainer_id: profile?.id, group_id: groupId, title, instructions: instructions || null,
        type, deadline: deadline || null, is_visible: true,
      })
      if (error) throw error
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['teacher-assignments', vars.groupId] }),
  })
}

/** Active assignments for a group. */
export function useGroupAssignments(groupId) {
  return useQuery({
    queryKey: ['teacher-assignments', groupId],
    enabled: !!groupId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, type, deadline, created_at, is_visible')
        .eq('group_id', groupId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data || []
    },
  })
}
