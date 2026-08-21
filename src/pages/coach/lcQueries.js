/**
 * Data layer for the Learning Coach console.
 *
 * Everything it reads comes from the SECURITY DEFINER RPCs added in
 * 20260822091000_learning_coach.sql; everything it writes goes through an RPC
 * or an insert with `.select()` on the end, so an RLS refusal surfaces as an
 * error instead of a silent no-op.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export const QK = {
  radar: ['lc', 'radar'],
  today: ['lc', 'today'],
  templates: ['lc', 'templates'],
  student: (id) => ['lc', 'student', id],
  preview: (sid, code) => ['lc', 'preview', sid, code],
  escalations: (status) => ['lc', 'escalations', status],
  activity: (days) => ['lc', 'coach-activity', days],
}

// ─── Reads ────────────────────────────────────────────────────────────────

/** Every active student with a live risk band — not only the flagged ones. */
export function useRadar() {
  return useQuery({
    queryKey: QK.radar,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('lc_get_radar')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCoachStudent(studentId) {
  return useQuery({
    queryKey: QK.student(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('lc_get_student', { p_student_id: studentId })
      if (error) throw error
      return data ?? null
    },
  })
}

export function useCoachToday() {
  return useQuery({
    queryKey: QK.today,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('lc_get_today')
      if (error) throw error
      return data ?? null
    },
  })
}

/**
 * The Arabic library. Long staleTime on purpose: 24 rows that only Ali can
 * edit are not worth refetching while the coach works a queue.
 */
export function useTemplates() {
  return useQuery({
    queryKey: QK.templates,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lc_message_templates')
        .select('code, situation_en, guidance_en, tone, min_silence_days, max_silence_days')
        .eq('is_active', true)
        .order('min_silence_days', { ascending: true })
        .order('code', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

/**
 * The Arabic he is about to send, rendered server-side for THIS student.
 * Read-only: the body is never assembled in the browser, so there is no
 * client-side string for anyone to tamper with.
 */
export function usePreview(studentId, templateCode) {
  return useQuery({
    queryKey: QK.preview(studentId, templateCode),
    enabled: !!studentId && !!templateCode,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('lc_render_message', {
        p_student_id: studentId,
        p_template_code: templateCode,
      })
      if (error) throw error
      return data
    },
  })
}

// ─── Writes ───────────────────────────────────────────────────────────────

/**
 * Send. The RPC renders the body itself, delivers it down the app's one
 * messaging path, writes the touchpoint, and closes any pending engine
 * signals for that student — all server-side, one round trip.
 */
export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, templateCode, blocker, note }) => {
      const { data, error } = await supabase.rpc('lc_send_message', {
        p_student_id: studentId,
        p_template_code: templateCode,
        p_blocker: blocker,
        p_note: note || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.radar })
      qc.invalidateQueries({ queryKey: QK.today })
      qc.invalidateQueries({ queryKey: QK.student(vars.studentId) })
    },
  })
}

/** Record an observation / no-action-needed without messaging the student. */
export function useLogTouchpoint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, action, blocker, note }) => {
      const { data, error } = await supabase.rpc('lc_log_touchpoint', {
        p_student_id: studentId,
        p_action: action,
        p_blocker: blocker,
        p_note: note || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.radar })
      qc.invalidateQueries({ queryKey: QK.today })
      qc.invalidateQueries({ queryKey: QK.student(vars.studentId) })
    },
  })
}

/** File an escalation in English, then record it as a touchpoint. */
export function useEscalate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ coachId, studentId, reason, bodyEn, blocker }) => {
      const { data: esc, error } = await supabase
        .from('lc_escalations')
        .insert({ coach_id: coachId, student_id: studentId, reason, body_en: bodyEn })
        .select()
        .single()
      if (error) throw error

      // Past this line the admin has the case. A failure to log the touchpoint
      // must not read as a failure to escalate.
      const { error: tpErr } = await supabase.rpc('lc_log_touchpoint', {
        p_student_id: studentId,
        p_action: 'escalated',
        p_blocker: blocker,
        p_note: reason,
      })
      return { esc, logFailed: !!tpErr }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.radar })
      qc.invalidateQueries({ queryKey: QK.today })
      qc.invalidateQueries({ queryKey: QK.student(vars.studentId) })
    },
  })
}

/** One row per coach per day — upsert on the unique key. */
export function useSaveDailyLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ coachId, logDate, studentsReviewed, messagesSent, escalations, summary }) => {
      const { data, error } = await supabase
        .from('lc_daily_log')
        .upsert(
          {
            coach_id: coachId,
            log_date: logDate,
            students_reviewed: studentsReviewed,
            messages_sent: messagesSent,
            escalations,
            summary,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'coach_id,log_date' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.today }),
  })
}

// ─── Admin ────────────────────────────────────────────────────────────────

export function useEscalationInbox(status = 'open') {
  return useQuery({
    queryKey: QK.escalations(status),
    staleTime: 20_000,
    queryFn: async () => {
      let q = supabase.from('lc_escalations').select('*').order('created_at', { ascending: false })
      if (status !== 'all') q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      const rows = data ?? []
      if (!rows.length) return []

      // Names are joined client-side: lc_escalations points at students for one
      // column and profiles for the other, which PostgREST cannot traverse in
      // both directions at once.
      const ids = [...new Set(rows.flatMap((r) => [r.student_id, r.coach_id]).filter(Boolean))]
      const { data: people } = await supabase
        .from('profiles').select('id, full_name, display_name, avatar_url').in('id', ids)
      const byId = Object.fromEntries((people ?? []).map((p) => [p.id, p]))

      return rows.map((r) => ({
        ...r,
        student: byId[r.student_id] ?? null,
        coach: byId[r.coach_id] ?? null,
      }))
    },
  })
}

export function useResolveEscalation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, handledBy }) => {
      const { data, error } = await supabase
        .from('lc_escalations')
        .update({ status, handled_by: handledBy, handled_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      // A successful UPDATE can still match zero rows under RLS — assert it.
      if (!data || data.status !== status) throw new Error('The update did not persist')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lc', 'escalations'] }),
  })
}

/** The blocker-type distribution and coach coverage. Admin only, server-side. */
export function useCoachActivity(days = 30) {
  return useQuery({
    queryKey: QK.activity(days),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('lc_get_coach_activity', { p_days: days })
      if (error) throw error
      return data ?? null
    },
  })
}
