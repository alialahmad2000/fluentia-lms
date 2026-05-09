import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ─── ADMIN ───────────────────────────────────────────────────

export function useAdminSpeakingHubs() {
  return useQuery({
    queryKey: ['admin', 'speaking-hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speaking_hubs')
        .select(`
          *,
          assignments:speaking_hub_assignments(id, student_id, group_id),
          progress:speaking_hub_student_progress(id, notes_word_count, video_completed_at)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAdminSpeakingHub(hubId) {
  return useQuery({
    queryKey: ['admin', 'speaking-hub', hubId],
    queryFn: async () => {
      if (!hubId) return null
      const { data, error } = await supabase
        .from('speaking_hubs')
        .select(`
          *,
          assignments:speaking_hub_assignments(
            id,
            student_id,
            group_id,
            created_at,
            student:students!speaking_hub_assignments_student_id_fkey(id, profile:profiles(full_name)),
            group:groups(id, name, code)
          ),
          progress:speaking_hub_student_progress(
            *,
            student:students!speaking_hub_student_progress_student_id_fkey(id, profile:profiles(full_name))
          )
        `)
        .eq('id', hubId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!hubId,
  })
}

export function useCreateSpeakingHub() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('speaking_hubs')
        .insert({ ...input, created_by: profile?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'speaking-hubs'] }),
  })
}

export function useUpdateSpeakingHub(hubId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch) => {
      const { data, error } = await supabase
        .from('speaking_hubs')
        .update(patch)
        .eq('id', hubId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'speaking-hub', hubId] })
      qc.invalidateQueries({ queryKey: ['admin', 'speaking-hubs'] })
    },
  })
}

export function useDeleteSpeakingHub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (hubId) => {
      const { error } = await supabase.from('speaking_hubs').delete().eq('id', hubId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'speaking-hubs'] }),
  })
}

export function useAssignHub(hubId) {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async ({ studentIds = [], groupIds = [] }) => {
      const rows = [
        ...studentIds.map((sid) => ({ hub_id: hubId, student_id: sid, created_by: profile?.id })),
        ...groupIds.map((gid) => ({ hub_id: hubId, group_id: gid, created_by: profile?.id })),
      ]
      if (!rows.length) return []
      const { data, error } = await supabase
        .from('speaking_hub_assignments')
        .insert(rows)
        .select()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'speaking-hub', hubId] }),
  })
}

export function useUnassign(hubId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (assignmentId) => {
      const { error } = await supabase
        .from('speaking_hub_assignments')
        .delete()
        .eq('id', assignmentId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'speaking-hub', hubId] }),
  })
}

export function useAllGroups() {
  return useQuery({
    queryKey: ['groups', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, code, level')
        .order('level', { ascending: true })
        .order('code', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useAllActiveStudents() {
  return useQuery({
    queryKey: ['students', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, group_id, package, track, profile:profiles(full_name, email)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('id')
      if (error) throw error
      return data
    },
  })
}

// ─── STUDENT ─────────────────────────────────────────────────

export function useStudentSpeakingHubs() {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['student', profile?.id, 'speaking-hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speaking_hubs')
        .select(`
          *,
          progress:speaking_hub_student_progress!left(
            id, notes_word_count, video_completed_at, watch_progress_seconds, notes_updated_at
          )
        `)
        .in('status', ['published', 'live', 'completed'])
        .order('hub_session_at', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data.map((hub) => ({
        ...hub,
        progress: (hub.progress || [])[0] || null,
      }))
    },
    enabled: !!profile?.id,
  })
}

export function useStudentSpeakingHub(hubId) {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['student', profile?.id, 'speaking-hub', hubId],
    queryFn: async () => {
      if (!hubId) return null
      const { data, error } = await supabase
        .from('speaking_hubs')
        .select('*')
        .eq('id', hubId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!hubId && !!profile?.id,
  })
}

export function useStudentHubProgress(hubId) {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['student', profile?.id, 'hub-progress', hubId],
    queryFn: async () => {
      if (!hubId || !profile?.id) return null
      const { data: existing, error: fetchErr } = await supabase
        .from('speaking_hub_student_progress')
        .select('*')
        .eq('hub_id', hubId)
        .eq('student_id', profile.id)
        .maybeSingle()
      if (fetchErr) throw fetchErr
      if (existing) return existing
      const { data: created, error: insertErr } = await supabase
        .from('speaking_hub_student_progress')
        .insert({ hub_id: hubId, student_id: profile.id, notes: '' })
        .select()
        .single()
      if (insertErr) throw insertErr
      return created
    },
    enabled: !!hubId && !!profile?.id,
  })
}

export function useUpdateStudentNotes(hubId) {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async (notes) => {
      const wordCount = (notes || '').trim().split(/\s+/).filter(Boolean).length
      const { data, error } = await supabase
        .from('speaking_hub_student_progress')
        .update({
          notes,
          notes_word_count: wordCount,
          notes_updated_at: new Date().toISOString(),
        })
        .eq('hub_id', hubId)
        .eq('student_id', profile.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(['student', profile?.id, 'hub-progress', hubId], data)
    },
  })
}

export function useMarkVideoStarted(hubId) {
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('speaking_hub_student_progress')
        .update({ video_started_at: new Date().toISOString() })
        .eq('hub_id', hubId)
        .eq('student_id', profile.id)
        .is('video_started_at', null)
      if (error) throw error
    },
  })
}

export function useMarkVideoCompleted(hubId) {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('speaking_hub_student_progress')
        .update({ video_completed_at: new Date().toISOString() })
        .eq('hub_id', hubId)
        .eq('student_id', profile.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(['student', profile?.id, 'hub-progress', hubId], data)
    },
  })
}
