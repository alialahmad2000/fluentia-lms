// Module 3 hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuthUserId } from '../../stores/authStore'

// Student: my reports (only sent ones, RLS-enforced)
export function useMyReports() {
  const userId = useAuthUserId()
  return useQuery({
    queryKey: ['retention-my-reports', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('retention_reports')
        .select('id, week_start, week_end, rendered_title_ar, sent_at, metrics')
        .eq('student_id', userId)
        .order('week_start', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}

export function useReport(reportId) {
  return useQuery({
    queryKey: ['retention-report', reportId],
    queryFn: async () => {
      if (!reportId) return null
      const { data, error } = await supabase
        .from('retention_reports')
        .select('*')
        .eq('id', reportId)
        .single()
      if (error) throw error
      return data
    },
    enabled: Boolean(reportId),
  })
}

// Admin/Trainer: queue of pending reviews
export function usePendingReports() {
  return useQuery({
    queryKey: ['retention-pending-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retention_reports')
        .select(`id, week_start, rendered_title_ar, rendered_body_ar, status, metrics,
                 student:profiles!retention_reports_student_id_fkey(id, full_name, display_name)`)
        .eq('status', 'pending_trainer_review')
        .order('week_start', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })
}

export function useApproveReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ reportId, editedBody }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id
      const update = {
        status: 'sent',
        sent_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        trainer_id: userId,
      }
      if (editedBody) update.rendered_body_ar = editedBody
      const { data, error } = await supabase
        .from('retention_reports')
        .update(update)
        .eq('id', reportId)
        .select('id, student_id')
        .single()
      if (error) throw error

      // Insert in-app notification
      await supabase.from('notifications').insert({
        user_id: data.student_id,
        type: 'system',
        title: 'تقريركِ الأسبوعي وصل',
        body: 'افتحي تقريركِ الجديد لتشوفي خلاصة الأسبوع.',
        data: { kind: 'retention_weekly_report', report_id: data.id },
        priority: 'normal',
      })

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retention-pending-reports'] })
    },
  })
}
