import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

// Pipeline statuses, right→left (RTL) order.
export const LEAD_STATUSES = [
  { key: 'new',          label: 'جديد',        accent: 'var(--ds-text-tertiary)' },
  { key: 'contacted',    label: 'تم التواصل',  accent: 'var(--ds-sky)' },
  { key: 'qualified',    label: 'مؤهّل',       accent: 'var(--ds-accent-secondary)' },
  { key: 'trial_booked', label: 'حجز تجربة',   accent: 'var(--ds-accent-gold)' },
  { key: 'won',          label: 'مغلق ناجح',   accent: 'var(--ds-accent-success)' },
  { key: 'lost',         label: 'مغلق خاسر',   accent: 'var(--ds-accent-danger)' },
]

export const LOST_REASONS = ['لا يرد', 'السعر', 'غير مهتم', 'رقم خاطئ', 'أخرى']

export const SOURCES = [
  { key: 'tiktok_dm', label: 'TikTok' },
  { key: 'manual',    label: 'يدوي' },
  { key: 'referral',  label: 'إحالة' },
  { key: 'other',     label: 'أخرى' },
]

export const INTERESTS = [
  { key: 'hot',  label: 'حار',  color: 'var(--ds-accent-danger)' },
  { key: 'warm', label: 'دافئ', color: 'var(--ds-accent-warning)' },
  { key: 'cold', label: 'بارد', color: 'var(--ds-sky)' },
]

export const PACKAGES = ['L0', 'L1', 'L2', 'L3', 'IELTS']

export const ACTIVITY_LABELS = {
  created: 'أُضيف العميل',
  note: 'ملاحظة',
  status_change: 'تغيير الحالة',
  contacted: 'تم التواصل',
  sent_link: 'أُرسل الرابط',
  whatsapp_opened: 'فتح واتساب',
  followup_set: 'ضبط متابعة',
  booked: 'حجز موعد',
  won: 'مغلق ناجح',
  lost: 'مغلق خاسر',
}

export function useLeads() {
  return useQuery({
    queryKey: ['cs-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .order('last_activity_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 15_000,
  })
}

export function useLeadActivities(leadId) {
  return useQuery({
    queryKey: ['cs-lead-activities', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}

// Mutation helpers — every write .select()-verifies (RLS failure → throw) and
// invalidates the relevant queries (TanStack refetch).
export function useLeadMutations() {
  const qc = useQueryClient()
  const invalidate = (leadId) => {
    qc.invalidateQueries({ queryKey: ['cs-leads'] })
    if (leadId) qc.invalidateQueries({ queryKey: ['cs-lead-activities', leadId] })
  }
  return {
    invalidate,
    createLead: async (payload) => {
      const { data, error } = await supabase.from('crm_leads').insert(payload).select().single()
      if (error) throw error
      const { error: e2 } = await supabase.rpc('crm_log_activity', { p_lead: data.id, p_type: 'created', p_detail: null })
      if (e2) throw e2
      invalidate(data.id)
      return data
    },
    logActivity: async (leadId, type, detail = null, meta = null) => {
      const { error } = await supabase.rpc('crm_log_activity', { p_lead: leadId, p_type: type, p_detail: detail, p_meta: meta })
      if (error) throw error
      invalidate(leadId)
    },
    setStatus: async (leadId, status, lostReason = null) => {
      const { error } = await supabase.rpc('crm_set_status', { p_lead: leadId, p_status: status, p_lost_reason: lostReason })
      if (error) throw error
      invalidate(leadId)
    },
    updateLead: async (leadId, patch) => {
      const { data, error } = await supabase.from('crm_leads').update(patch).eq('id', leadId).select().single()
      if (error) throw error
      invalidate(leadId)
      return data
    },
    setFollowup: async (leadId, iso) => {
      const { error } = await supabase.from('crm_leads').update({ next_followup_at: iso }).eq('id', leadId).select().single()
      if (error) throw error
      const { error: e2 } = await supabase.rpc('crm_log_activity', { p_lead: leadId, p_type: 'followup_set', p_detail: iso })
      if (e2) throw e2
      invalidate(leadId)
    },
  }
}

// True when a lead has an overdue follow-up (not closed).
export function isOverdue(lead) {
  if (!lead?.next_followup_at) return false
  if (lead.status === 'won' || lead.status === 'lost') return false
  return new Date(lead.next_followup_at).getTime() < Date.now()
}
