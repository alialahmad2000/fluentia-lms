/**
 * Data layer for the coordinator console.
 *
 * Everything the console reads comes from the four SECURITY DEFINER RPCs added
 * in 20260821190000_coordinator_console.sql; everything it writes goes through
 * an RPC or an insert with `.select()` on the end, so an RLS refusal surfaces
 * as an error instead of a silent no-op.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export const QK = {
  queue: ['coordinator', 'queue'],
  today: ['coordinator', 'today'],
  student: (id) => ['coordinator', 'student', id],
  escalations: (status) => ['coordinator', 'escalations', status],
}

// ─── Reads ────────────────────────────────────────────────────────────────

export function useCoordinatorQueue() {
  return useQuery({
    queryKey: QK.queue,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_coordinator_queue')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCoordinatorStudent(studentId) {
  return useQuery({
    queryKey: QK.student(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_coordinator_student', { p_student_id: studentId })
      if (error) throw error
      return data ?? null
    },
  })
}

export function useCoordinatorToday() {
  return useQuery({
    queryKey: QK.today,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_coordinator_today')
      if (error) throw error
      return data ?? null
    },
  })
}

// ─── The Arabic message ───────────────────────────────────────────────────
/**
 * A2 corrected the brief: `suggested_message_ar` is populated on only 3 of the
 * 100 pending rows, and `short_message` is NULL on all 2,842 rows ever
 * written. The message is not pre-written at generation time — the
 * draft-intervention-message edge function writes it on first request and
 * caches it on the row.
 *
 * So the console drafts on demand, then shows the result read-only. There is
 * deliberately no `force` / regenerate: if the drafted message does not fit
 * the situation, the coordinator's route is to escalate, not to rewrite
 * Arabic he cannot read.
 */
export function useDraftMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (interventionId) => {
      const { data, error } = await supabase.functions.invoke('draft-intervention-message', {
        body: { intervention_id: interventionId },
      })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || 'The drafter could not write a message')
      return data.message
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.queue }),
  })
}

// ─── Writes ───────────────────────────────────────────────────────────────

/**
 * Send the pre-written message, then close every pending row for that student.
 *
 * Two steps, one intent. The send RPC reads the Arabic body server-side (the
 * client never supplies it), and the action RPC closes the whole stack: A2
 * found the 100 pending rows belong to just 9 students, because the engine
 * re-raises the same signal nightly. Closing one row at a time would leave the
 * queue permanently full.
 */
export function useSendAndAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ interventionId, studentId, blocker, notes }) => {
      const { data: sent, error: sendErr } = await supabase.rpc(
        'coordinator_send_intervention_message',
        { p_intervention_id: interventionId }
      )
      if (sendErr) throw sendErr

      // Past this line the message HAS gone out. If the close fails, throwing
      // would surface "could not send" and invite a second send to the same
      // student — so the failure is reported as data, not as an exception.
      const { data: closed, error: actErr } = await supabase.rpc('coordinator_action_student', {
        p_student_id: studentId,
        p_channel: 'in_app_message',
        p_blocker: blocker,
        p_notes: notes || null,
      })
      if (actErr) {
        return { thread: sent, closed: 0, closeFailed: true, closeError: actErr.message }
      }
      return { thread: sent, closed, closeFailed: false }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.queue })
      qc.invalidateQueries({ queryKey: QK.today })
    },
  })
}

/** Close a student's stack without messaging — "no action needed" (note required). */
export function useActionStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, channel, blocker, notes }) => {
      const { data, error } = await supabase.rpc('coordinator_action_student', {
        p_student_id: studentId,
        p_channel: channel,
        p_blocker: blocker,
        p_notes: notes || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.queue })
      qc.invalidateQueries({ queryKey: QK.today })
    },
  })
}

/** Max 3 days — the server rejects anything larger. */
export function useSnooze() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ interventionId, days }) => {
      const { data, error } = await supabase.rpc('coordinator_snooze_intervention', {
        p_intervention_id: interventionId,
        p_days: days,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.queue })
      qc.invalidateQueries({ queryKey: QK.today })
    },
  })
}

/** File an escalation, then close the student's stack as 'escalated'. */
export function useEscalate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ coordinatorId, studentId, interventionId, reason, bodyEn, blocker }) => {
      const { data: esc, error } = await supabase
        .from('coordinator_escalations')
        .insert({
          coordinator_id: coordinatorId,
          student_id: studentId,
          intervention_id: interventionId,
          reason,
          body_en: bodyEn,
        })
        .select()
        .single()
      if (error) throw error

      const { error: actErr } = await supabase.rpc('coordinator_action_student', {
        p_student_id: studentId,
        p_channel: 'escalated',
        p_blocker: blocker,
        p_notes: `Escalated: ${reason}`,
      })
      if (actErr) throw actErr
      return esc
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QK.queue })
      qc.invalidateQueries({ queryKey: QK.today })
      qc.invalidateQueries({ queryKey: QK.student(vars.studentId) })
    },
  })
}

/** One row per coordinator per day — upsert on the unique key. */
export function useSaveDailyLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ coordinatorId, logDate, queueSize, actioned, escalations, summary }) => {
      const { data, error } = await supabase
        .from('coordinator_daily_log')
        .upsert(
          {
            coordinator_id: coordinatorId,
            log_date: logDate,
            queue_size_at_start: queueSize,
            interventions_actioned: actioned,
            escalations,
            summary,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: 'coordinator_id,log_date' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.today }),
  })
}

// ─── Admin side ───────────────────────────────────────────────────────────

export function useEscalationInbox(status = 'open') {
  return useQuery({
    queryKey: QK.escalations(status),
    staleTime: 20_000,
    queryFn: async () => {
      let q = supabase
        .from('coordinator_escalations')
        .select('*')
        .order('created_at', { ascending: false })
      if (status !== 'all') q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      const rows = data ?? []
      if (!rows.length) return []

      // Names are joined client-side: coordinator_escalations has no FK to
      // profiles that PostgREST can traverse in both directions at once
      // (student_id → students, coordinator_id → profiles).
      const ids = [...new Set(rows.flatMap((r) => [r.student_id, r.coordinator_id]).filter(Boolean))]
      const { data: people } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, avatar_url')
        .in('id', ids)
      const byId = Object.fromEntries((people ?? []).map((p) => [p.id, p]))

      const interventionIds = [...new Set(rows.map((r) => r.intervention_id).filter(Boolean))]
      let interventions = []
      if (interventionIds.length) {
        const { data: iv } = await supabase
          .from('student_interventions')
          .select('id, reason_code, reason_ar, severity, created_at, suggested_message_ar')
          .in('id', interventionIds)
        interventions = iv ?? []
      }
      const byIv = Object.fromEntries(interventions.map((i) => [i.id, i]))

      return rows.map((r) => ({
        ...r,
        student: byId[r.student_id] ?? null,
        coordinator: byId[r.coordinator_id] ?? null,
        intervention: r.intervention_id ? byIv[r.intervention_id] ?? null : null,
      }))
    },
  })
}

export function useResolveEscalation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, handledBy }) => {
      const { data, error } = await supabase
        .from('coordinator_escalations')
        .update({ status, handled_by: handledBy, handled_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      // A successful UPDATE can still match zero rows under RLS — assert it.
      if (!data || data.status !== status) throw new Error('The update did not persist')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coordinator', 'escalations'] }),
  })
}
