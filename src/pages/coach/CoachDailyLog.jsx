import { useMemo, useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Flame, Inbox, ArrowUpRight, Send } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import GlassPanel from '@/design-system/components/GlassPanel'
import { toast } from '@/components/ui/FluentiaToast'
import { useCoachToday, useSaveDailyLog } from './lcQueries'
import './lc-console.css'

const MIN_SUMMARY = 40

/* Module scope — see the note in CoachRadar.jsx. */

function Metric({ label, value, icon: Icon, tone, caption }) {
  const color =
    tone === 'danger' ? 'var(--ds-accent-danger)'
    : tone === 'success' ? 'var(--ds-accent-success)'
    : 'var(--ds-text-primary)'
  return (
    <GlassPanel elevation={2} padding="md" style={{ minWidth: 0 }}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={14} style={{ color }} />}
        <p className="cc-eyebrow">{label}</p>
      </div>
      <p className="cc-bignum text-4xl" style={{ color }}>{value}</p>
      {caption && <p className="text-xs mt-2" style={{ color: 'var(--ds-text-tertiary)' }}>{caption}</p>}
    </GlassPanel>
  )
}

/**
 * Consecutive days with a submitted log, counting back from today. Today not
 * being written yet does not break the streak — it just hasn't extended it.
 */
function computeStreak(logs, todayIso) {
  if (!logs?.length) return 0
  const dates = new Set(logs.map((l) => String(l.log_date)))
  const start = new Date(`${todayIso}T00:00:00Z`)
  let streak = 0
  let cursor = new Date(start)
  if (!dates.has(todayIso)) cursor = new Date(start.getTime() - 86400000)
  for (;;) {
    const key = cursor.toISOString().slice(0, 10)
    if (!dates.has(key)) break
    streak += 1
    cursor = new Date(cursor.getTime() - 86400000)
  }
  return streak
}

export default function CoachDailyLog() {
  const profileId = useAuthStore((s) => s.profile?.id)
  const { data, isLoading } = useCoachToday()
  const save = useSaveDailyLog()
  const [summary, setSummary] = useState('')

  const todayLog = data?.today_log || null
  const logs = data?.recent_logs || []
  const todayIso = data?.log_date ? String(data.log_date) : new Date().toISOString().slice(0, 10)

  // Load whatever is already written for today, once it arrives.
  useEffect(() => {
    if (todayLog?.summary != null) setSummary(todayLog.summary)
  }, [todayLog?.summary])

  const streak = useMemo(() => computeStreak(logs, todayIso), [logs, todayIso])
  const tooShort = summary.trim().length < MIN_SUMMARY

  const onSave = useCallback(async () => {
    if (tooShort) {
      return toast({
        type: 'error',
        title: 'Tell the story, not the number',
        description: `At least ${MIN_SUMMARY} characters — the counts above are already recorded for you.`,
      })
    }
    try {
      await save.mutateAsync({
        coachId: profileId,
        logDate: todayIso,
        // Students, not raw rows: the number he can actually work to zero.
        studentsReviewed: data?.students_touched_today ?? 0,
        messagesSent: data?.messages_sent_today ?? 0,
        escalations: data?.escalations_today ?? 0,
        summary: summary.trim(),
      })
      toast({ type: 'success', title: todayLog ? 'Log updated' : 'Log submitted' })
    } catch (e) {
      toast({ type: 'error', title: 'Could not save the log', description: String(e.message || e) })
    }
  }, [tooShort, save, profileId, todayIso, todayLog, data, summary])

  return (
    <div>
      {/* the streak — the instrument this role is held to */}
      <GlassPanel elevation={2} padding={streak === 0 ? 'md' : 'xl'} style={{ marginBottom: 'var(--space-7, 3rem)' }}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} style={{ color: 'var(--ds-accent-gold)' }} />
              <p className="cc-eyebrow" style={{ letterSpacing: '0.14em' }}>Consecutive days logged</p>
            </div>
            <p className="cc-streak" style={streak === 0 ? { fontSize: '2.75rem' } : undefined}>{isLoading ? '—' : streak}</p>
          </div>
          <p className="text-sm max-w-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
            {streak === 0
              ? 'No streak yet. Write today’s log and it starts.'
              : streak < 5
                ? 'Early. The streak is the record that this roster is being worked every day.'
                : 'Every one of these days is a day nobody went quiet without anyone noticing.'}
          </p>
        </div>
      </GlassPanel>

      {/* auto-computed — he does not type these */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
        <Metric
          label="Active students"
          value={isLoading ? '—' : data?.active_students ?? 0}
          icon={Inbox}
          caption="The whole roster the radar covers"
        />
        <Metric
          label="Students reviewed"
          value={isLoading ? '—' : data?.students_touched_today ?? 0}
          icon={CheckCircle2}
          tone={(data?.students_touched_today ?? 0) > 0 ? 'success' : undefined}
          caption="Touched today — message, observation or no-action"
        />
        <Metric
          label="Messages sent"
          value={isLoading ? '—' : data?.messages_sent_today ?? 0}
          icon={Send}
        />
        <Metric
          label="Escalations"
          value={isLoading ? '—' : data?.escalations_today ?? 0}
          icon={ArrowUpRight}
        />
      </div>

      {/* the log */}
      <GlassPanel elevation={2} padding="lg" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--ds-text-primary)' }}>
          What happened today?
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--ds-text-tertiary)' }}>
          Who you reached, who answered, and anything that looked like a platform problem rather
          than a motivation problem. This is the part nobody else can reconstruct later.
        </p>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={6}
          placeholder="Reached 6 of the 9 students on the radar. Two replied within the hour…"
          className="w-full rounded-xl px-3.5 py-3 text-sm"
          style={{
            background: 'var(--ds-surface-2)', color: 'var(--ds-text-primary)',
            border: '1px solid var(--ds-border-subtle)', resize: 'vertical', lineHeight: 1.65,
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <p className="text-xs cc-num" style={{ color: tooShort ? 'var(--ds-accent-warning)' : 'var(--ds-text-tertiary)' }}>
            {summary.trim().length} / {MIN_SUMMARY} characters minimum
          </p>
          <button
            type="button"
            onClick={onSave}
            disabled={save.isPending || tooShort}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: 'var(--ds-accent-primary)', color: '#04121f',
              opacity: save.isPending || tooShort ? 0.45 : 1,
              cursor: save.isPending || tooShort ? 'not-allowed' : 'pointer',
            }}
          >
            <Send size={15} />
            {save.isPending ? 'Saving…' : todayLog ? 'Update today’s log' : 'Submit today’s log'}
          </button>
        </div>
      </GlassPanel>

      {/* last 14 days */}
      <GlassPanel elevation={2} padding="md">
        <p className="cc-eyebrow mb-3">Last 14 days</p>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="cc-skel" style={{ height: 56 }} />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>Nothing logged yet.</p>
        ) : (
          <ol className="space-y-3">
            {logs.map((l) => (
              <li key={l.id} className="pb-3" style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="cc-num text-sm font-bold" style={{ color: 'var(--ds-text-primary)' }}>
                    {String(l.log_date)}
                  </span>
                  <span className="cc-pill" style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-tertiary)' }}>
                    {l.messages_sent ?? 0} messages
                  </span>
                  {(l.escalations ?? 0) > 0 && (
                    <span
                      className="cc-pill"
                      style={{
                        background: 'color-mix(in srgb, var(--ds-accent-warning) 16%, transparent)',
                        color: 'var(--ds-accent-warning)',
                      }}
                    >
                      {l.escalations} escalated
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ds-text-secondary)' }}>
                  {l.summary}
                </p>
              </li>
            ))}
          </ol>
        )}
      </GlassPanel>
    </div>
  )
}
