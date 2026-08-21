import { useMemo, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, Bug, LifeBuoy, TrendingUp, Zap,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import GlassPanel from '@/design-system/components/GlassPanel'
import { toast } from '@/components/ui/FluentiaToast'
import { useCoachStudent, useEscalate } from './lcQueries'
import {
  ACTION_LABELS, BLOCKERS, blockerLabel, isArabic, riskColor, sectionLabel,
} from './utils/labels'
import { dateIn, dayKeyIn, daysAgoLabel, dualShort, lastNDayKeys, viewerTz, ACADEMY_TZ } from './utils/tz'
import './lc-console.css'

/* Module scope — see the note in CoordinatorQueue.jsx about components
   declared inside components. */

function Stat({ label, value, sub, tone }) {
  const color =
    tone === 'danger' ? 'var(--ds-accent-danger)'
    : tone === 'success' ? 'var(--ds-accent-success)'
    : 'var(--ds-text-primary)'
  return (
    <GlassPanel elevation={2} padding="md" style={{ minWidth: 0 }}>
      <p className="cc-eyebrow mb-2">{label}</p>
      <p className="cc-bignum text-4xl" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-2" style={{ color: 'var(--ds-text-tertiary)' }}>{sub}</p>}
    </GlassPanel>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--ds-text-tertiary)' }}>{label}</p>
      <p
        className={`text-sm font-semibold ${isArabic(value) ? 'ar-inline' : ''}`}
        style={{ color: 'var(--ds-text-primary)' }}
      >
        {value ?? '—'}
      </p>
    </div>
  )
}

/**
 * 30 days of one metric as CSS bars. No chart library — the shape is the whole
 * message here (did they study in bursts, or stop dead?), and a dependency for
 * thirty divs is not a trade worth making.
 */
function BarChart({ days, metricKey, label, format }) {
  const series = useMemo(() => {
    // Buckets in the ACADEMY's zone. toISOString() buckets in UTC, which puts
    // every Riyadh evening in the previous day's bar — so this chart and the
    // drawer's strip for the same student could disagree by a day.
    const byDate = new Map((days || []).map((d) => [dayKeyIn(`${d.date}T12:00:00Z`), d]))
    return lastNDayKeys(30).map((key) => ({ key, value: byDate.get(key)?.[metricKey] || 0 }))
  }, [days, metricKey])

  const max = Math.max(1, ...series.map((s) => s.value))
  const total = series.reduce((a, s) => a + s.value, 0)

  // Thirty empty bars and a "0" say the same thing twice and look like a
  // rendering failure. One line says it once, honestly.
  if (total === 0) {
    return (
      <GlassPanel elevation={2} padding="md">
        <p className="cc-eyebrow mb-2">{label}</p>
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
          Nothing at all in the last 30 days.
        </p>
      </GlassPanel>
    )
  }

  return (
    <GlassPanel elevation={2} padding="md">
      <div className="flex items-baseline justify-between mb-3">
        <p className="cc-eyebrow">{label}</p>
        <p className="cc-num text-sm font-bold" style={{ color: 'var(--ds-text-primary)' }}>
          {format(total)}
        </p>
      </div>
      <div className="cc-bars">
        {series.map((s) => (
          <div
            key={s.key}
            className="cc-bar"
            data-empty={s.value === 0 ? '1' : '0'}
            style={{ height: `${Math.max(2, (s.value / max) * 100)}%` }}
            title={`${s.key} — ${format(s.value)}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>30 days ago</span>
        <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>today</span>
      </div>
    </GlassPanel>
  )
}

function StudentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="cc-skel" style={{ height: 120 }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="cc-skel" style={{ height: 118 }} />)}
      </div>
      <div className="cc-skel" style={{ height: 180 }} />
    </div>
  )
}

export default function CoachStudent() {
  const { id } = useParams()
  const profile = useAuthStore((s) => s.profile)
  const profileId = useAuthStore((s) => s.profile?.id)
  const tz = useMemo(() => viewerTz(profile), [profile])
  const { data, isLoading, error } = useCoachStudent(id)
  const escalate = useEscalate()

  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [blocker, setBlocker] = useState('')

  const onEscalate = useCallback(async () => {
    if (!blocker) return toast({ type: 'error', title: 'Pick a blocker type first' })
    if (reason.trim().length < 15) {
      return toast({ type: 'error', title: 'Tell the admin what you need — at least 15 characters' })
    }
    try {
      await escalate.mutateAsync({
        coachId: profileId,
        studentId: id,
        reason: reason.trim().slice(0, 120),
        bodyEn: reason.trim(),
        blocker,
      })
      toast({ type: 'success', title: 'Escalated to the admin' })
      setOpen(false)
      setReason('')
    } catch (e) {
      toast({ type: 'error', title: 'Could not escalate', description: String(e.message || e) })
    }
  }, [blocker, reason, profileId, id, escalate])

  const s = data?.student
  const touchpoints = data?.touchpoints || []
  const helpRequests = data?.help_requests || []
  const bugReports = data?.bug_reports || []
  const escalations = data?.escalations || []
  const activity = data?.activity_30d || []

  const activeDays = activity.filter((d) => (d.learning_seconds || 0) > 0).length

  return (
    <div>
      <Link
        to="/coach"
        className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4"
        style={{ color: 'var(--ds-text-tertiary)' }}
      >
        <ArrowLeft size={14} /> Back to the queue
      </Link>

      {error ? (
        <GlassPanel elevation={2} padding="lg">
          <p className="font-bold" style={{ color: 'var(--ds-text-primary)' }}>Could not load this student</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>{String(error.message || error)}</p>
        </GlassPanel>
      ) : isLoading ? (
        <StudentSkeleton />
      ) : !s ? (
        <GlassPanel elevation={2} padding="lg">
          <p style={{ color: 'var(--ds-text-tertiary)' }}>No such student.</p>
        </GlassPanel>
      ) : (
        <>
          {/* identity */}
          <GlassPanel elevation={2} padding="lg" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="ar-inline text-2xl font-extrabold mb-1" style={{ color: 'var(--ds-text-primary)' }}>
                  {s.display_name || s.full_name}
                </h2>
                <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                  Last seen {s.last_seen_at ? dualShort(s.last_seen_at, tz) : 'never'} · {daysAgoLabel(s.silence_days)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: 'var(--ds-surface-3)', color: 'var(--ds-text-primary)',
                  border: '1px solid var(--ds-border-subtle)',
                }}
              >
                <ArrowUpRight size={15} /> Escalate to admin
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-5">
              <Field label="Level" value={s.academic_level != null ? `Level ${s.academic_level}` : '—'} />
              <Field label="Package" value={s.package} />
              <Field label="Track" value={s.track} />
              <Field label="Status" value={s.status} />
              <Field label="Group" value={s.group_name ? `${s.group_name} (${s.group_code || '—'})` : '—'} />
              <Field label="Trainer" value={s.trainer_name} />
              <Field label="Enrolled" value={s.enrollment_date} />
              <Field label="Streak" value={s.current_streak} />
            </div>

            {s.goals && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
                <p className="cc-eyebrow mb-1">What they came here for</p>
                <p className="ar-inline text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{s.goals}</p>
              </div>
            )}

            {open && (
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
                <p className="cc-eyebrow mb-2">What is blocking this student?</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {BLOCKERS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      title={b.hint}
                      onClick={() => setBlocker(b.value)}
                      className="cc-chip cc-chip--input"
                      style={{
                        background: blocker === b.value ? 'var(--ds-accent-primary)' : 'var(--ds-surface-3)',
                        color: blocker === b.value ? 'var(--cc-on-accent)' : 'var(--ds-text-secondary)',
                        borderColor: blocker === b.value ? 'transparent' : 'var(--ds-border-subtle)',
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="What does the admin need to know or decide? (English)"
                  className="w-full rounded-xl px-3 py-2 text-sm"
                  style={{
                    background: 'var(--ds-surface-2)', color: 'var(--ds-text-primary)',
                    border: '1px solid var(--ds-border-subtle)', resize: 'vertical',
                  }}
                />
                <button
                  type="button"
                  onClick={onEscalate}
                  disabled={escalate.isPending}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'var(--ds-accent-primary)', color: 'var(--cc-on-accent)',
                    opacity: escalate.isPending ? 0.45 : 1,
                  }}
                >
                  <ArrowUpRight size={15} /> {escalate.isPending ? 'Sending…' : 'Send to admin'}
                </button>
              </div>
            )}
          </GlassPanel>

          {/* numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
            <Stat
              label="Days silent"
              value={s.silence_days ?? '—'}
              tone={s.silence_days >= 7 ? 'danger' : undefined}
              sub="Newest of five live signals"
            />
            <Stat label="Active days" value={`${activeDays}/30`} sub="Days with any study time" />
            <Stat label="Total XP" value={s.xp_total ?? 0} />
            <Stat
              label="Open tickets"
              value={helpRequests.length + bugReports.length}
              tone={helpRequests.length + bugReports.length > 0 ? 'danger' : 'success'}
              sub={helpRequests.length + bugReports.length > 0 ? 'Check the platform first' : 'Nothing reported'}
            />
          </div>

          {/* trend */}
          <div className="grid lg:grid-cols-2 gap-3" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
            <BarChart
              days={activity}
              metricKey="learning_seconds"
              label="Study time — 30 days"
              format={(v) => `${Math.round(v / 60)} min`}
            />
            <BarChart
              days={activity}
              metricKey="xp_earned"
              label="XP earned — 30 days"
              format={(v) => `${v} XP`}
            />
          </div>

          {/* tickets */}
          {(helpRequests.length > 0 || bugReports.length > 0) && (
            <GlassPanel elevation={2} padding="md" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
              <p className="cc-eyebrow mb-3">Open tickets</p>
              <div className="space-y-2">
                {helpRequests.map((h) => (
                  <div key={h.id} className="flex items-start gap-2.5">
                    <LifeBuoy size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--ds-accent-warning)' }} />
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
                        {sectionLabel(h.section_type)}
                        {h.unit_number != null && ` · Unit ${h.unit_number}`}
                        {h.unit_title && <span className="ar-inline"> — {h.unit_title}</span>}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>{dualShort(h.created_at, tz)}</p>
                    </div>
                  </div>
                ))}
                {bugReports.map((b) => (
                  <div key={b.id} className="flex items-start gap-2.5">
                    <Bug size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--ds-accent-danger)' }} />
                    <div className="min-w-0">
                      <p className="ar-inline text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{b.description}</p>
                      <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                        {b.status} · {dualShort(b.created_at, tz)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* escalations already raised */}
          {escalations.length > 0 && (
            <GlassPanel elevation={2} padding="md" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
              <p className="cc-eyebrow mb-3">Escalations raised</p>
              <div className="space-y-2">
                {escalations.map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-3">
                    <p className="text-sm min-w-0" style={{ color: 'var(--ds-text-secondary)' }}>{e.reason}</p>
                    <span className="cc-pill shrink-0" style={{
                      background: e.status === 'open' ? 'color-mix(in srgb, var(--ds-accent-warning) 16%, transparent)' : 'var(--ds-surface-3)',
                      color: e.status === 'open' ? 'var(--ds-accent-warning)' : 'var(--ds-text-tertiary)',
                    }}>{e.status}</span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* full signal history */}
          <GlassPanel elevation={2} padding="md">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: 'var(--ds-text-tertiary)' }} />
              <p className="cc-eyebrow">
                Every touchpoint <span className="cc-num">({touchpoints.length})</span>
              </p>
            </div>
            {touchpoints.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>Nobody has reached out to this student yet.</p>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 420 }}>
                {/* Capped: سارة alone carries 66 rows, and an uncapped table
                    pushed this page past 7,000px. Newest first, rest a scroll away. */}
                <table className="w-full text-xs" style={{ minWidth: 520 }}>
                  <thead>
                    <tr style={{ color: 'var(--ds-text-tertiary)' }}>
                      <th className="text-left font-semibold pb-2 pr-3">Date</th>
                      <th className="text-left font-semibold pb-2 pr-3">Action</th>
                      <th className="text-left font-semibold pb-2 pr-3">Situation</th>
                      <th className="text-left font-semibold pb-2 pr-3">Blocker</th>
                      <th className="text-left font-semibold pb-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {touchpoints.map((h) => (
                      <tr key={h.id} style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
                        <td className="cc-num py-2 pr-3" style={{ color: 'var(--ds-text-tertiary)' }}>
                          {dateIn(h.created_at, ACADEMY_TZ)}
                        </td>
                        <td className="py-2 pr-3 font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
                          {ACTION_LABELS[h.action] || h.action}
                        </td>
                        <td className="py-2 pr-3" style={{ color: 'var(--ds-text-secondary)' }}>
                          {h.situation_en || '—'}
                        </td>
                        <td className="py-2 pr-3" style={{ color: 'var(--ds-text-secondary)' }}>
                          {blockerLabel(h.blocker_type)}
                        </td>
                        <td className="py-2" style={{ color: 'var(--ds-text-secondary)' }}>
                          {h.note_en || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="flex items-center gap-1.5 text-xs mt-3" style={{ color: 'var(--ds-text-tertiary)' }}>
              <Zap size={11} /> Every row here is a person somebody actually spoke to.
            </p>
          </GlassPanel>
        </>
      )}
    </div>
  )
}
