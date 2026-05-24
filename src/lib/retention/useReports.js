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
        .select('id, student_id, rendered_title_ar, rendered_body_ar')
        .single()
      if (error) throw error

      // In-app notification
      await supabase.from('notifications').insert({
        user_id: data.student_id,
        type: 'system',
        title: 'تقريركِ الأسبوعي وصل',
        body: 'افتحي تقريركِ الجديد لتشوفي خلاصة الأسبوع.',
        data: { kind: 'retention_weekly_report', report_id: data.id },
        priority: 'normal',
      })

      // Email send (best-effort — never blocks approval)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', data.student_id)
          .maybeSingle()
        if (profile?.email) {
          const reportUrl = `https://fluentia-lms.vercel.app/student/retention/reports/${data.id}`
          const safeTitle = escapeHtml(data.rendered_title_ar || 'تقريركِ الأسبوعي')
          const safeBody = escapeHtml(data.rendered_body_ar || '')
          const htmlBody = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8" /><style>body{font-family:'Tajawal',sans-serif;background:#f8f9fb;color:#1c150c;margin:0;padding:24px}.card{background:#fff;max-width:600px;margin:0 auto;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(120,72,20,0.08)}h1{color:#0e7490;font-size:24px;margin:0 0 16px}.body{font-size:16px;line-height:1.8;white-space:pre-line;color:#3d342a}.cta{display:inline-block;margin-top:24px;background:#0e7490;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600}.foot{margin-top:24px;font-size:12px;color:#7d6f5e;text-align:center}</style></head><body><div class="card"><h1>${safeTitle}</h1><div class="body">${safeBody}</div><a class="cta" href="${reportUrl}">افتحي تقريركِ الكامل ←</a><div class="foot">أكاديمية طلاقة Fluentia · لا تردّي على هذه الرسالة</div></div></body></html>`
          const { error: emailErr } = await supabase.functions.invoke('send-email', {
            body: {
              to: profile.email,
              subject: data.rendered_title_ar || 'تقريركِ الأسبوعي',
              html: htmlBody,
              from: 'Fluentia Academy <noreply@fluentia.academy>',
            },
          })
          if (!emailErr) {
            await supabase
              .from('retention_reports')
              .update({ email_sent: true, email_sent_at: new Date().toISOString() })
              .eq('id', data.id)
          }
        }
      } catch (e) {
        console.error('Retention weekly report email failed:', e)
      }

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['retention-pending-reports'] })
    },
  })
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
