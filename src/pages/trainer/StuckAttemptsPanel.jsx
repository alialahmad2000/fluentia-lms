import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, LifeBuoy, Loader2, Sparkles, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * StuckAttemptsPanel — surfaces stuck and in-flight mock-exam attempts so the
 * admin/trainer can recover them with a single click.
 *
 * Categorization (mirrors PHASE-A.5 bucket logic from the incident prompt):
 *   - HEALTHY_IN_PROGRESS:   is_submitted=false, < 90 min since start, time remaining > 0
 *   - STUCK_NEEDS_SUBMIT:    is_submitted=false, ≥ 30 answers OR writing reached the minimum,
 *                            and started > 30 min ago
 *   - STUCK_EXPIRED:         is_submitted=false, now() > expires_at
 *   - SUBMITTED_NOT_SCORED:  is_submitted=true AND (score_total IS NULL OR (score_total=0 AND answers > 0))
 *   - SUBMITTED_AI_PENDING:  is_submitted=true, ai_writing_status='pending', > 5 min since submit
 *   - SUBMITTED_OK:          everything else
 *
 * One-click "استرداد التسليم" calls `mock_exam_admin_force_submit` (idempotent)
 * then re-invokes `mock-exam-grade-writing` to refresh the AI score.
 *
 * Polls every 60s so an admin can leave the page open during the exam window.
 */
export default function StuckAttemptsPanel({ examCode }) {
  const qc = useQueryClient()
  const [recoveringId, setRecoveringId] = useState(null)
  const [errorById, setErrorById] = useState({})

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['mock-exam-stuck', examCode],
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    staleTime: 15_000,
    queryFn: async () => {
      const { data: exam } = await supabase
        .from('mock_exams')
        .select('id, code, min_writing_words')
        .eq('code', examCode)
        .maybeSingle()
      if (!exam) return []

      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .select(`
          id, started_at, submitted_at, expires_at,
          is_submitted, is_auto_submitted, score_total,
          writing_word_count, ai_writing_status,
          student:profiles!student_id(id, full_name, is_test_account)
        `)
        .eq('exam_id', exam.id)
        .order('started_at', { ascending: false })
      if (error) throw error

      // Skip test accounts so admin sees real students only.
      const nonTest = (data || []).filter((r) => !r.student?.is_test_account)

      // Decorate each row with its answer count + the latest few audit events
      // (so we can spot stuck-mid-submit clients: submit_kickoff with no submit reply).
      const ids = nonTest.map((r) => r.id)
      let answerCounts = {}
      let auditByAttempt = {}
      if (ids.length > 0) {
        const [ansResp, audResp] = await Promise.all([
          supabase.from('mock_exam_answers').select('attempt_id, selected_index, text_answer').in('attempt_id', ids),
          supabase.from('mock_exam_audit_log').select('attempt_id, event, details, created_at').in('attempt_id', ids).order('created_at', { ascending: false }),
        ])
        if (ansResp.error) throw ansResp.error
        if (audResp.error) throw audResp.error
        for (const r of ansResp.data || []) {
          answerCounts[r.attempt_id] = (answerCounts[r.attempt_id] || 0) + 1
        }
        for (const r of audResp.data || []) {
          if (!auditByAttempt[r.attempt_id]) auditByAttempt[r.attempt_id] = []
          if (auditByAttempt[r.attempt_id].length < 10) auditByAttempt[r.attempt_id].push(r)
        }
      }

      return nonTest.map((r) => {
        const audit = auditByAttempt[r.id] || []
        // Stuck-mid-submit detection: kickoff present, no complete or submit reply after it
        const kickoff = audit.find((e) => e.event === 'submit_kickoff')
        const complete = audit.find((e) =>
          (e.event === 'submit_complete' || e.event === 'submit' || e.event === 'auto_submit')
          && (!kickoff || new Date(e.created_at) >= new Date(kickoff.created_at))
        )
        const saveFailures = audit.filter((e) => e.event === 'save_failed').length
        return {
          ...r,
          answers_saved: answerCounts[r.id] || 0,
          min_writing_words: exam.min_writing_words ?? 50,
          audit_recent: audit,
          stuck_mid_submit: Boolean(kickoff && !complete),
          save_failures_count: saveFailures,
        }
      })
    },
  })

  const categorized = useMemo(() => classify(attempts), [attempts])

  async function recoverAttempt(attemptId) {
    if (!window.confirm(
      'استرداد التسليم لهذه الطالبة؟\n\nسيتم تسليم اختبارها بالإجابات المحفوظة وإعادة تقييم الكتابة بالذكاء الاصطناعي.'
    )) return
    setRecoveringId(attemptId)
    setErrorById((e) => ({ ...e, [attemptId]: null }))
    try {
      const { data, error } = await supabase.rpc('mock_exam_admin_force_submit', {
        p_attempt_id: attemptId,
        p_auto: false,
      })
      if (error) throw error
      // Re-trigger AI grading (fire-and-forget — but await success/failure so the alert is accurate)
      try {
        await supabase.functions.invoke('mock-exam-grade-writing', {
          body: { attempt_id: attemptId },
        })
      } catch (e2) {
        console.error('[stuck-panel] grade-writing re-trigger failed (non-fatal):', e2)
      }
      const score = data?.score_total ?? data?.score ?? '—'
      window.alert(`تم الاسترداد بنجاح. الدرجة المؤقتة: ${score} / 100`)
      qc.invalidateQueries({ queryKey: ['mock-exam-stuck', examCode] })
      qc.invalidateQueries({ queryKey: ['mock-exam-attempts'] })
    } catch (e) {
      const msg = e?.message || String(e)
      setErrorById((prev) => ({ ...prev, [attemptId]: msg }))
    } finally {
      setRecoveringId(null)
    }
  }

  if (isLoading) return null

  const stuckRows = [
    ...categorized.STUCK_NEEDS_SUBMIT,
    ...categorized.STUCK_EXPIRED,
    ...categorized.SUBMITTED_NOT_SCORED,
    ...categorized.SUBMITTED_AI_PENDING,
  ]
  const inProgress = categorized.HEALTHY_IN_PROGRESS

  if (stuckRows.length === 0 && inProgress.length === 0) {
    return null // Nothing to show — keep the page calm.
  }

  return (
    <div className="space-y-3" dir="rtl">
      {stuckRows.length > 0 && (
        <div
          className="p-4 rounded-xl space-y-3"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.40)',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} style={{ color: '#fbbf24' }} />
            <h3 className="text-base font-semibold" style={{ color: '#fbbf24' }}>
              محاولات تحتاج تدخّل ({stuckRows.length})
            </h3>
          </div>
          <div className="space-y-2">
            {stuckRows.map((r) => (
              <StuckRow
                key={r.id}
                row={r}
                busy={recoveringId === r.id}
                error={errorById[r.id]}
                onRecover={() => recoverAttempt(r.id)}
              />
            ))}
          </div>
        </div>
      )}

      {inProgress.length > 0 && (
        <div
          className="p-3 rounded-xl text-xs flex items-center justify-between"
          style={{
            background: 'rgba(56,189,248,0.06)',
            border: '1px solid rgba(56,189,248,0.30)',
            color: 'var(--ds-text-secondary)',
          }}
        >
          <span className="flex items-center gap-1.5">
            <Clock size={14} style={{ color: 'var(--ds-accent-info, #38bdf8)' }} />
            {inProgress.length} {inProgress.length === 1 ? 'طالبة تؤدي الاختبار الآن' : 'طالبات يؤدّون الاختبار الآن'}
            {' — يتم التحديث كل دقيقة'}
          </span>
        </div>
      )}
    </div>
  )
}

function StuckRow({ row, busy, error, onRecover }) {
  const name = row.student?.full_name || 'طالبة'
  const minutesIn = Math.round((Date.now() - new Date(row.started_at).getTime()) / 60_000)
  const wordCount = row.writing_word_count ?? 0
  const isPostSubmit = row.is_submitted
  const label = labelFor(row)

  return (
    <div
      className="p-3 rounded-lg flex flex-wrap items-center justify-between gap-2"
      style={{
        background: 'rgba(0,0,0,0.18)',
        border: '1px solid rgba(245,158,11,0.20)',
      }}
    >
      <div className="flex-1 min-w-[220px] space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--ds-text-primary)' }}>
            {name}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(245,158,11,0.16)',
              color: '#fcd34d',
              border: '1px solid rgba(245,158,11,0.35)',
            }}
          >
            {label}
          </span>
        </div>
        <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
          {!isPostSubmit && <>بدأت قبل {minutesIn} دقيقة · </>}
          {isPostSubmit && row.submitted_at && (
            <>سُلّم {new Date(row.submitted_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} · </>
          )}
          الإجابات: <span className="tabular-nums">{row.answers_saved}</span>
          {' · '}الكتابة: <span className="tabular-nums">{wordCount}</span>/{row.min_writing_words}
          {row.score_total !== null && row.score_total !== undefined && (
            <> · الدرجة الحالية: <span className="tabular-nums">{row.score_total}</span>/100</>
          )}
          {row.ai_writing_status && row.ai_writing_status !== 'graded' && (
            <> · AI: {row.ai_writing_status}</>
          )}
        </div>
        {error && (
          <div className="text-xs mt-1" style={{ color: '#fca5a5' }}>
            فشل الاسترداد: {error}
          </div>
        )}
        {(row.stuck_mid_submit || row.save_failures_count > 0 || row.audit_recent?.length > 0) && (
          <DiagnosticStrip row={row} />
        )}
      </div>
      <button
        type="button"
        onClick={onRecover}
        disabled={busy}
        className="text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5"
        style={{
          background: 'rgba(56,189,248,0.18)',
          color: 'var(--ds-accent-info, #38bdf8)',
          border: '1px solid rgba(56,189,248,0.45)',
          opacity: busy ? 0.5 : 1,
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy
          ? <Loader2 size={12} className="animate-spin" />
          : (row.ai_writing_status === 'pending' && row.is_submitted
              ? <Sparkles size={12} />
              : <LifeBuoy size={12} />)
        }
        {busy ? 'جاري الاسترداد…' : (row.is_submitted ? 'إعادة التقييم' : 'استرداد التسليم')}
      </button>
    </div>
  )
}

function DiagnosticStrip({ row }) {
  // Show the 5 most recent telemetry events for this attempt so admin can spot
  // the "submit_kickoff at HH:MM, no submit reply" pattern instantly.
  const events = (row.audit_recent || []).slice(0, 5)
  return (
    <div
      className="mt-2 text-[10px] flex flex-wrap items-center gap-1.5"
      style={{ color: 'var(--ds-text-tertiary)' }}
    >
      {row.stuck_mid_submit && (
        <span
          className="px-1.5 py-0.5 rounded font-semibold"
          style={{ background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}
          title="submit_kickoff في سجل التدقيق بدون رد submit — العميل علق بعد الضغط على «تسليم»."
        >
          عميل علق على «تسليم»
        </span>
      )}
      {row.save_failures_count > 0 && (
        <span
          className="px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(245,158,11,0.16)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.35)' }}
          title="حالات فشل الحفظ التلقائي خلال هذه الجلسة — مؤشّر على اتصال متقطّع."
        >
          فشل الحفظ: {row.save_failures_count}
        </span>
      )}
      {events.map((e, i) => (
        <span
          key={i}
          className="px-1.5 py-0.5 rounded"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          title={JSON.stringify(e.details || {})}
        >
          {e.event}
          {' @ '}
          {new Date(e.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Classification (pure)
// ---------------------------------------------------------------------------
function classify(attempts) {
  const out = {
    HEALTHY_IN_PROGRESS: [],
    STUCK_NEEDS_SUBMIT: [],
    STUCK_EXPIRED: [],
    SUBMITTED_NOT_SCORED: [],
    SUBMITTED_AI_PENDING: [],
    SUBMITTED_OK: [],
  }
  const now = Date.now()
  for (const r of attempts) {
    const startedMs = r.started_at ? new Date(r.started_at).getTime() : 0
    const expiresMs = r.expires_at ? new Date(r.expires_at).getTime() : 0
    const submittedMs = r.submitted_at ? new Date(r.submitted_at).getTime() : 0
    const minutesIn = (now - startedMs) / 60_000
    const minutesSinceSubmit = submittedMs ? (now - submittedMs) / 60_000 : 0
    const expired = expiresMs > 0 && now > expiresMs
    const writingOK = (r.writing_word_count ?? 0) >= (r.min_writing_words ?? 50)

    if (!r.is_submitted) {
      if (expired) { out.STUCK_EXPIRED.push(r); continue }
      // submit_kickoff with no matching complete = client hung mid-submit.
      // This is the killer signal — promote to STUCK regardless of minutes-in.
      if (r.stuck_mid_submit) { out.STUCK_NEEDS_SUBMIT.push(r); continue }
      if (minutesIn > 30 && (r.answers_saved >= 30 || writingOK)) {
        out.STUCK_NEEDS_SUBMIT.push(r); continue
      }
      out.HEALTHY_IN_PROGRESS.push(r); continue
    }

    // is_submitted=true
    const score = r.score_total
    const numericScore = Number(score)
    if (score === null || score === undefined) { out.SUBMITTED_NOT_SCORED.push(r); continue }
    if (Number.isFinite(numericScore) && numericScore === 0 && (r.answers_saved || 0) > 0) {
      out.SUBMITTED_NOT_SCORED.push(r); continue
    }
    if (r.ai_writing_status === 'pending' && minutesSinceSubmit > 5) {
      out.SUBMITTED_AI_PENDING.push(r); continue
    }
    out.SUBMITTED_OK.push(r)
  }
  return out
}

function labelFor(row) {
  if (!row.is_submitted) {
    const expiresMs = row.expires_at ? new Date(row.expires_at).getTime() : 0
    if (expiresMs > 0 && Date.now() > expiresMs) return 'انتهى الوقت — لم يُسلّم'
    return 'عالق — يحتاج تسليم'
  }
  if (row.score_total === null || row.score_total === undefined) return 'سُلّم — لم يُسجّل بعد'
  if (Number(row.score_total) === 0 && (row.answers_saved || 0) > 0) return 'سُلّم بصفر رغم وجود إجابات'
  if (row.ai_writing_status === 'pending') return 'تقييم AI معلّق'
  return 'يحتاج مراجعة'
}
