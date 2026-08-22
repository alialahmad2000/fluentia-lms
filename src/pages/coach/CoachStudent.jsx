import { useMemo, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, Bot, Bug, LifeBuoy, MessageSquare, Sparkles, TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import GlassPanel from '@/design-system/components/GlassPanel'
import { toast } from '@/components/ui/FluentiaToast'
import { useCoachStudent, useEscalate } from './lcQueries'
import {
  ACTION_LABELS, BLOCKERS, blockerLabel, isArabic, sectionLabel,
} from './utils/labels'
import { ACADEMY_TZ, dateIn, dayKeyIn, daysAgoLabel, dualShort, lastNDayKeys, viewerTz } from './utils/tz'
import './lc-console.css'

/* Module scope — a component declared inside another component is a new type
   on every render and remounts its whole subtree. */

/** Anything under this is worth opening a conversation about. */
const WEAK = 60
const OK = 80

function scoreColor(v) {
  if (v == null) return 'var(--ds-text-tertiary)'
  if (v < WEAK) return 'var(--ds-accent-danger)'
  if (v < OK) return 'var(--ds-accent-warning)'
  return 'var(--ds-accent-success)'
}

function Stat({ label, value, sub, tone }) {
  const color =
    tone === 'danger' ? 'var(--ds-accent-danger)'
    : tone === 'success' ? 'var(--ds-accent-success)'
    : 'var(--ds-text-primary)'
  return (
    <GlassPanel elevation={2} padding="md" style={{ minWidth: 0 }}>
      <p className="cc-eyebrow mb-2">{label}</p>
      <p className="cc-bignum text-4xl" style={{ color }}>{value}</p>
      {sub && <p className="text-sm mt-2" style={{ color: 'var(--ds-text-tertiary)' }}>{sub}</p>}
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
 * The skill profile. This is the single most useful thing on the page: it turns
 * "she has been quiet" into "her writing is 29 and her reading is 99", which is
 * a conversation rather than a nudge.
 */
function SkillProfile({ sections }) {
  const rows = useMemo(
    () => [...(sections || [])].sort((a, b) => (a.avg_score ?? 999) - (b.avg_score ?? 999)),
    [sections]
  )
  if (!rows.length) {
    return (
      <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
        Nothing scored yet — they have not completed a graded section.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.section_type}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
              {sectionLabel(r.section_type)}
            </span>
            <span className="text-sm cc-num" style={{ color: 'var(--ds-text-tertiary)' }}>
              <span className="font-bold" style={{ color: scoreColor(r.avg_score) }}>{r.avg_score}</span>
              {' '}avg · best {r.best_score} · last {r.last_score} · {r.attempts} attempt{r.attempts === 1 ? '' : 's'}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--ds-surface-3)', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.max(2, Math.min(100, r.avg_score ?? 0))}%`,
              height: '100%', borderRadius: 999, background: scoreColor(r.avg_score),
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 30 days of one metric as CSS bars. Buckets in the ACADEMY's zone —
 * toISOString() buckets in UTC and shifts every Riyadh evening into the
 * previous day.
 */
function BarChart({ days, metricKey, label, format }) {
  const series = useMemo(() => {
    const byDate = new Map((days || []).map((d) => [dayKeyIn(`${d.date}T12:00:00Z`), d]))
    return lastNDayKeys(30).map((key) => ({ key, value: byDate.get(key)?.[metricKey] || 0 }))
  }, [days, metricKey])

  const max = Math.max(1, ...series.map((s) => s.value))
  const total = series.reduce((a, s) => a + s.value, 0)

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
        <p className="cc-num text-sm font-bold" style={{ color: 'var(--ds-text-primary)' }}>{format(total)}</p>
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

/**
 * What the platform's AI already told this student.
 *
 * The evaluation is delivered to the student in Arabic, but the stored jsonb
 * carries English fields too — the overall comment, every correction's rule,
 * and the per-skill scores. So the coach can open a conversation already
 * knowing what she was told to work on, without a word of Arabic.
 */
function AiFeedbackCard({ f, tz }) {
  const [open, setOpen] = useState(false)
  const scores = [
    ['Overall', f.overall_score], ['Grammar', f.grammar_score],
    ['Vocabulary', f.vocabulary_score], ['Fluency', f.fluency_score],
    ['Structure', f.structure_score],
  ].filter(([, v]) => v != null)

  return (
    <GlassPanel elevation={2} padding="md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-sm font-bold" style={{ color: 'var(--ds-text-primary)' }}>
          {sectionLabel(f.section_type)}
          {f.unit_number != null && (
            <span style={{ color: 'var(--ds-text-tertiary)', fontWeight: 500 }}> · Unit {f.unit_number}</span>
          )}
        </span>
        <span className="text-xs cc-num" style={{ color: 'var(--ds-text-tertiary)' }}>
          {f.at ? dualShort(f.at, tz) : ''}
        </span>
      </div>

      {scores.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {scores.map(([k, v]) => (
            <span
              key={k}
              className="cc-pill"
              style={{
                background: 'var(--ds-surface-3)',
                color: scoreColor(Number(v) * 10),
                borderColor: 'var(--ds-border-subtle)',
              }}
            >
              {k} {v}/10
            </span>
          ))}
        </div>
      )}

      {f.comment_en && (
        <p className="text-sm" style={{ color: 'var(--ds-text-secondary)', lineHeight: 1.6 }}>
          {f.comment_en}
        </p>
      )}

      {(f.corrections?.length > 0 || f.model_sentences?.length > 0) && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm underline mt-2"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            {open ? 'Hide' : `Show ${f.corrections?.length || 0} correction${f.corrections?.length === 1 ? '' : 's'}`}
          </button>

          {open && (
            <div className="mt-3 space-y-2">
              {(f.corrections || []).map((c, i) => (
                <div key={i} className="cc-ticket">
                  <p className="text-sm" style={{ color: 'var(--ds-accent-danger)' }}>
                    <s>{c.error}</s>
                  </p>
                  <p className="text-sm" style={{ color: 'var(--ds-accent-success)' }}>{c.correction}</p>
                  {c.rule && (
                    <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>{c.rule}</p>
                  )}
                </div>
              ))}
              {(f.model_sentences || []).length > 0 && (
                <div className="cc-ticket">
                  <p className="cc-eyebrow mb-1">Model sentences she was given</p>
                  {f.model_sentences.map((m, i) => (
                    <p key={i} className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>· {m}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </GlassPanel>
  )
}

/**
 * The conversation. He starts these from the radar with an approved template;
 * this is where he sees whether anyone replied.
 *
 * Student messages are shown in Arabic exactly as sent — deliberately not
 * paraphrased. He cannot read them yet; see the note rendered under the thread.
 */
function Conversation({ conversation, tz, studentName }) {
  const msgs = conversation?.messages || []
  if (!conversation?.thread_id || msgs.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
        No conversation yet. Sending a message from the radar starts one, in-platform —
        it reaches them as a notification and a push on their phone.
      </p>
    )
  }
  return (
    <>
      <div className="lc-thread">
        {msgs.map((m) => (
          <div key={m.id} className={`lc-msg ${m.from_student ? 'lc-msg--them' : 'lc-msg--us'}`}>
            <p className="ar-block" lang="ar" dir="rtl" style={{ fontSize: '0.9375rem', lineHeight: 1.9, border: 'none', background: 'transparent', padding: 0 }}>
              {m.body}
            </p>
            <p className="text-xs mt-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>
              {m.from_student ? studentName : 'You'} · {dualShort(m.created_at, tz)}
            </p>
          </div>
        ))}
      </div>
      {conversation.unanswered_from_student > 0 && (
        <div className="cc-callout mt-3" style={{
          background: 'color-mix(in srgb, var(--ds-accent-warning) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ds-accent-warning) 35%, transparent)',
        }}>
          <MessageSquare size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--ds-accent-warning)' }} />
          <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
            {conversation.unanswered_from_student} message{conversation.unanswered_from_student === 1 ? '' : 's'} from
            them with no reply yet. You cannot read Arabic — send another approved message if one fits, or escalate
            so somebody who can read it answers.
          </p>
        </div>
      )}
    </>
  )
}

function StudentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="cc-skel" style={{ height: 140 }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="cc-skel" style={{ height: 118 }} />)}
      </div>
      <div className="cc-skel" style={{ height: 220 }} />
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
  const bySection = data?.by_section || []
  const aiFeedback = data?.ai_feedback || []
  const awaiting = data?.awaiting_feedback || []
  const recent = data?.recent_work || []
  const units = data?.units || []
  const touchpoints = data?.touchpoints || []
  const helpRequests = data?.help_requests || []
  const bugReports = data?.bug_reports || []
  const escalations = data?.escalations || []
  const activity = data?.activity_30d || []

  const activeDays = activity.filter((d) => (d.learning_seconds || 0) > 0).length
  const weakest = useMemo(
    () => [...bySection].sort((a, b) => (a.avg_score ?? 999) - (b.avg_score ?? 999))[0],
    [bySection]
  )
  const studentName = s?.display_name || s?.full_name || 'them'
  const SECTION = { marginBottom: 'var(--space-7, 3rem)' }

  return (
    <div>
      <Link
        to="/coach"
        className="inline-flex items-center gap-1.5 text-sm font-semibold mb-4"
        style={{ color: 'var(--ds-text-tertiary)' }}
      >
        <ArrowLeft size={14} /> Back to the radar
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
          {/* ── who they are ─────────────────────────────────────────── */}
          <GlassPanel elevation={2} padding="lg" style={SECTION}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="ar-inline text-2xl font-extrabold mb-1" style={{ color: 'var(--ds-text-primary)' }}>
                  {studentName}
                </h2>
                <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
                  Last seen {s.last_seen_at ? dualShort(s.last_seen_at, tz) : 'never'} · {daysAgoLabel(s.silence_days)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="cc-btn"
                style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-primary)', border: '1px solid var(--cc-rule)' }}
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
              <Field label="Enrolled" value={s.days_enrolled != null ? `${s.days_enrolled} days ago` : s.enrollment_date} />
              <Field label="Streak" value={s.current_streak} />
            </div>

            {s.goals && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--cc-rule)' }}>
                <p className="cc-eyebrow mb-1">What they came here for</p>
                <p className="ar-inline text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{s.goals}</p>
              </div>
            )}

            {open && (
              <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--cc-rule)' }}>
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
                  className="cc-input"
                />
                <button
                  type="button"
                  onClick={onEscalate}
                  disabled={escalate.isPending}
                  className="cc-btn mt-2"
                  style={{ background: 'var(--ds-accent-primary)', color: 'var(--cc-on-accent)', opacity: escalate.isPending ? 0.45 : 1 }}
                >
                  <ArrowUpRight size={15} /> {escalate.isPending ? 'Sending…' : 'Send to admin'}
                </button>
              </div>
            )}
          </GlassPanel>

          {/* ── the numbers ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={SECTION}>
            <Stat
              label="Days silent"
              value={s.silence_days ?? '—'}
              tone={s.silence_days >= 7 ? 'danger' : undefined}
              sub="Newest of five live signals"
            />
            <Stat label="Active days" value={`${activeDays}/30`} sub="Days with any study time" />
            <Stat
              label="Weakest skill"
              value={weakest ? weakest.avg_score : '—'}
              tone={weakest && weakest.avg_score < WEAK ? 'danger' : undefined}
              sub={weakest ? sectionLabel(weakest.section_type) : 'Nothing scored yet'}
            />
            <Stat
              label="Open tickets"
              value={helpRequests.length + bugReports.length}
              tone={helpRequests.length + bugReports.length > 0 ? 'danger' : 'success'}
              sub={helpRequests.length + bugReports.length > 0 ? 'Check the platform first' : 'Nothing reported'}
            />
          </div>

          {/* ── how they are doing ───────────────────────────────────── */}
          <GlassPanel elevation={2} padding="lg" style={SECTION}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} style={{ color: 'var(--ds-accent-primary)' }} />
              <h3 className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>Skill profile</h3>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--ds-text-tertiary)' }}>
              Weakest first — every graded section they have ever completed. This is what to open a conversation about.
            </p>
            <SkillProfile sections={bySection} />
          </GlassPanel>

          {/* ── what the AI told them ────────────────────────────────── */}
          {(aiFeedback.length > 0 || awaiting.length > 0) && (
            <div style={SECTION}>
              <div className="flex items-center gap-2 mb-1">
                <Bot size={16} style={{ color: 'var(--ds-accent-primary)' }} />
                <h3 className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>
                  What the platform already told them
                </h3>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--ds-text-tertiary)' }}>
                The academy's AI marks their writing and speaking. They receive it in Arabic; you get the same
                assessment in English, so you can follow up on something specific instead of asking how it is going.
              </p>

              {awaiting.length > 0 && (
                <GlassPanel
                  elevation={1}
                  padding="md"
                  className="mb-3"
                  style={{ borderColor: 'color-mix(in srgb, var(--ds-accent-danger) 45%, transparent)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
                    <strong style={{ color: 'var(--ds-accent-danger)' }}>{awaiting.length}</strong>{' '}
                    submission{awaiting.length === 1 ? '' : 's'} still waiting for feedback that never arrived.
                    That is our fault, not theirs — worth escalating as a platform issue.
                  </p>
                </GlassPanel>
              )}

              <div className="space-y-3">
                {aiFeedback.map((f, i) => <AiFeedbackCard key={i} f={f} tz={tz} />)}
              </div>
            </div>
          )}

          {/* ── the conversation ─────────────────────────────────────── */}
          <GlassPanel elevation={2} padding="lg" style={SECTION}>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={16} style={{ color: 'var(--ds-accent-primary)' }} />
              <h3 className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>Conversation</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--ds-text-tertiary)' }}>
              Everything sent between you and this student, in the platform. They get it as a notification and a
              push on their phone — no WhatsApp, no phone number.
            </p>
            <Conversation conversation={data?.conversation} tz={tz} studentName={studentName} />
          </GlassPanel>

          {/* ── trend ────────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-3" style={SECTION}>
            <BarChart days={activity} metricKey="learning_seconds" label="Study time — 30 days" format={(v) => `${Math.round(v / 60)} min`} />
            <BarChart days={activity} metricKey="xp_earned" label="XP earned — 30 days" format={(v) => `${v} XP`} />
          </div>

          {/* ── recent work ──────────────────────────────────────────── */}
          {recent.length > 0 && (
            <GlassPanel elevation={2} padding="md" style={SECTION}>
              <p className="cc-eyebrow mb-3">Last 12 sections completed</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 480 }}>
                  <thead>
                    <tr style={{ color: 'var(--ds-text-tertiary)' }}>
                      <th className="text-left font-semibold pb-2 pr-3">Date</th>
                      <th className="text-left font-semibold pb-2 pr-3">Section</th>
                      <th className="text-left font-semibold pb-2 pr-3">Unit</th>
                      <th className="text-left font-semibold pb-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--cc-rule)' }}>
                        <td className="cc-num py-2 pr-3" style={{ color: 'var(--ds-text-tertiary)' }}>
                          {dateIn(r.completed_at, ACADEMY_TZ)}
                        </td>
                        <td className="py-2 pr-3 font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
                          {sectionLabel(r.section_type)}
                        </td>
                        <td className="py-2 pr-3" style={{ color: 'var(--ds-text-secondary)' }}>
                          {r.unit_number != null ? `Unit ${r.unit_number}` : '—'}
                          {r.unit_title && <span className={isArabic(r.unit_title) ? 'ar-inline' : ''}> · {r.unit_title}</span>}
                        </td>
                        <td className="py-2 cc-num font-bold" style={{ color: scoreColor(r.score) }}>
                          {r.score ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          )}

          {/* ── units ────────────────────────────────────────────────── */}
          {units.length > 0 && (
            <GlassPanel elevation={2} padding="md" style={SECTION}>
              <p className="cc-eyebrow mb-3">Unit progress</p>
              <div className="space-y-2">
                {units.map((u) => (
                  <div key={u.unit_number} className="flex items-center gap-3">
                    <span className="text-sm shrink-0" style={{ color: 'var(--ds-text-tertiary)', minWidth: 56 }}>
                      Unit {u.unit_number}
                    </span>
                    <div className="flex-1" style={{ height: 8, borderRadius: 999, background: 'var(--ds-surface-3)', overflow: 'hidden' }}>
                      <div style={{ width: `${u.percentage}%`, height: '100%', borderRadius: 999, background: 'var(--ds-accent-primary)' }} />
                    </div>
                    <span className="text-sm cc-num shrink-0" style={{ color: 'var(--ds-text-secondary)', minWidth: 40, textAlign: 'right' }}>
                      {u.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* ── tickets ──────────────────────────────────────────────── */}
          {(helpRequests.length > 0 || bugReports.length > 0) && (
            <GlassPanel elevation={2} padding="md" style={SECTION}>
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

          {/* ── escalations ──────────────────────────────────────────── */}
          {escalations.length > 0 && (
            <GlassPanel elevation={2} padding="md" style={SECTION}>
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

          {/* ── touchpoints ──────────────────────────────────────────── */}
          <GlassPanel elevation={2} padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: 'var(--ds-text-tertiary)' }} />
              <p className="cc-eyebrow">
                Every touchpoint <span className="cc-num">({touchpoints.length})</span>
              </p>
            </div>
            {touchpoints.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
                Nobody has reached out to this student yet.
              </p>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 420 }}>
                <table className="w-full text-sm" style={{ minWidth: 520 }}>
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
                      <tr key={h.id} style={{ borderTop: '1px solid var(--cc-rule)' }}>
                        <td className="cc-num py-2 pr-3" style={{ color: 'var(--ds-text-tertiary)' }}>
                          {dateIn(h.created_at, ACADEMY_TZ)}
                        </td>
                        <td className="py-2 pr-3 font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
                          {ACTION_LABELS[h.action] || h.action}
                        </td>
                        <td className="py-2 pr-3" style={{ color: 'var(--ds-text-secondary)' }}>{h.situation_en || '—'}</td>
                        <td className="py-2 pr-3" style={{ color: 'var(--ds-text-secondary)' }}>{blockerLabel(h.blocker_type)}</td>
                        <td className="py-2" style={{ color: 'var(--ds-text-secondary)' }}>{h.note_en || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassPanel>
        </>
      )}
    </div>
  )
}
