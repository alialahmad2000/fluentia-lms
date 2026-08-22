import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, ArrowUpRight, Bug, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  LifeBuoy, MessageSquare, Moon, Send, ShieldAlert, Sparkles, X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import GlassPanel from '@/design-system/components/GlassPanel'
import { toast } from '@/components/ui/FluentiaToast'
import {
  useRadar, useCoachStudent, useTemplates, usePreview,
  useSendMessage, useLogTouchpoint, useEscalate,
} from './lcQueries'
import {
  ACTION_LABELS, BLOCKERS, GENDER_LABELS, RISK_ORDER, TONE_LABELS,
  blockerLabel, isArabic, riskBlurb, riskColor, riskLabel, sectionLabel, templateFits,
} from './utils/labels'
import { ACADEMY_TZ, dateIn, dayKeyIn, dualShort, lastNDayKeys, timeIn, viewerTz } from './utils/tz'
import './lc-console.css'

/* Riyadh hours in which a push notification wakes a student up. */
const QUIET_FROM = 23
const QUIET_TO = 7

/* Do not message the same person twice in three days. */
const RECENT_TOUCH_DAYS = 3

/* ═══════════════════════════════════════════════════════════════════════════
   Presentational pieces — declared at module scope on purpose. A component
   defined inside another component is a brand-new type on every render, so
   React unmounts and remounts its whole subtree: half-typed notes vanish and
   buttons stop responding mid-click.
   ═══════════════════════════════════════════════════════════════════════════ */

const TONES = {
  neutral: { bg: 'var(--ds-surface-3)', fg: 'var(--ds-text-secondary)', bd: 'var(--ds-border-subtle)' },
  danger: { bg: 'color-mix(in srgb, var(--ds-accent-danger) 16%, transparent)', fg: 'var(--ds-accent-danger)', bd: 'color-mix(in srgb, var(--ds-accent-danger) 40%, transparent)' },
  warning: { bg: 'color-mix(in srgb, var(--ds-accent-warning) 16%, transparent)', fg: 'var(--ds-accent-warning)', bd: 'color-mix(in srgb, var(--ds-accent-warning) 40%, transparent)' },
  success: { bg: 'color-mix(in srgb, var(--ds-accent-success) 16%, transparent)', fg: 'var(--ds-accent-success)', bd: 'color-mix(in srgb, var(--ds-accent-success) 40%, transparent)' },
  accent: { bg: 'color-mix(in srgb, var(--ds-accent-primary) 14%, transparent)', fg: 'var(--ds-accent-primary)', bd: 'color-mix(in srgb, var(--ds-accent-primary) 38%, transparent)' },
}

function Pill({ children, tone = 'neutral', title }) {
  const t = TONES[tone] || TONES.neutral
  return (
    <span className="cc-pill" title={title} style={{ background: t.bg, color: t.fg, borderColor: t.bd }}>
      {children}
    </span>
  )
}

/**
 * The phone hero. Five stat tiles in a two-column grid leave the fifth an
 * orphan, and it collided with the fixed bottom nav — so on the device this
 * console is actually used on, the header was both broken and uninformative.
 * One segmented bar answers "what does today look like?" in a glance and each
 * segment is still a filter.
 */
function BandStrip({ counts, total, contactedToday, active, onPick }) {
  const segs = RISK_ORDER.map((band) => ({ band, n: counts[band] || 0 })).filter((x) => x.n > 0)
  const sum = segs.reduce((a, x) => a + x.n, 0) || 1
  const toReach = (counts.critical || 0) + (counts.at_risk || 0) + (counts.watch || 0)

  return (
    <GlassPanel elevation={2} padding="md" className="lc-bandstrip">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
          <span className="cc-bignum" style={{ fontSize: '1.75rem' }}>{toReach}</span>{' '}
          to reach
        </p>
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
          <span className="cc-num">{contactedToday}</span> contacted today · {total} active
        </p>
      </div>

      <div className="lc-bandstrip__bar">
        {segs.map(({ band, n }) => (
          <button
            key={band}
            type="button"
            aria-pressed={active === band}
            aria-label={`${riskLabel(band)}: ${n}`}
            title={`${riskLabel(band)} — ${n}`}
            onClick={() => onPick(active === band ? null : band)}
            style={{
              flex: `${n} 0 0`,
              background: riskColor(band),
              opacity: !active || active === band ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {RISK_ORDER.map((band) => (
          <button
            key={band}
            type="button"
            onClick={() => onPick(active === band ? null : band)}
            className="flex items-center gap-1.5 text-sm"
            aria-pressed={active === band}
            style={{ color: active === band ? riskColor(band) : 'var(--ds-text-tertiary)', minHeight: 32 }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: riskColor(band) }} />
            {riskLabel(band)} <span className="cc-num font-bold">{counts[band] || 0}</span>
          </button>
        ))}
      </div>
    </GlassPanel>
  )
}

function BandTile({ band, count, active, onClick }) {
  return (
    <GlassPanel
      elevation={2}
      padding="md"
      className="cc-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      aria-pressed={active}
      /* Spread — never `borderColor: undefined`. GlassPanel sets the `border`
         SHORTHAND first; React writes an undefined longhand as '', which strips
         the colour off the shorthand and leaves it falling back to
         currentColor — painting a near-white cage around every INACTIVE tile,
         which is the loudest chrome on the page attached to nothing. */
      style={{
        minWidth: 0,
        ...(active
          ? { borderColor: riskColor(band), boxShadow: `inset 0 0 0 1px ${riskColor(band)}` }
          : {}),
      }}
      title={riskBlurb(band)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ width: 8, height: 8, borderRadius: 999, background: riskColor(band) }} />
        <p className="cc-eyebrow">{riskLabel(band)}</p>
      </div>
      <p className="cc-bignum text-4xl" style={{ color: riskColor(band) }}>{count}</p>
    </GlassPanel>
  )
}

/**
 * One small square per day. Pure CSS grid — no chart library.
 *
 * Day buckets are built in the ACADEMY's zone, never with toISOString(): UTC
 * bucketing shifts every Riyadh evening into the previous day's square, so the
 * "today" cell would be wrong for three hours out of every twenty-four.
 */
function ActivityStrip({ days, span = 14 }) {
  const cells = useMemo(() => {
    const byDate = new Map((days || []).map((d) => [dayKeyIn(`${d.date}T12:00:00Z`), d]))
    const keys = lastNDayKeys(span)
    const today = keys[keys.length - 1]
    return keys.map((key) => {
      const secs = byDate.get(key)?.seconds ?? byDate.get(key)?.learning_seconds ?? 0
      return { key, level: secs === 0 ? 0 : secs < 600 ? 1 : 2, secs, isToday: key === today }
    })
  }, [days, span])

  return (
    <div className="cc-strip" style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }}>
      {cells.map((c) => (
        <div
          key={c.key}
          className="cc-strip-cell"
          data-on={c.level}
          data-today={c.isToday ? '1' : '0'}
          title={`${c.key}${c.isToday ? ' (today)' : ''} — ${c.secs ? `${Math.round(c.secs / 60)} min` : 'nothing'}`}
        />
      ))}
    </div>
  )
}

function RadarRow({ row, onOpen, index, reduced }) {
  const silence = row.silence_days
  const since = row.days_since_touchpoint
  const recentlyTouched = since != null && since <= RECENT_TOUCH_DAYS

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : Math.min(index, 8) * 0.03, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassPanel
        elevation={1}
        padding="md"
        className="cc-card lc-row"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(row)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(row) } }}
        style={{ borderInlineStart: `3px solid ${riskColor(row.risk_band)}` }}
      >
        {/* the number he scans by */}
        <div className="text-center" style={{ minWidth: 68 }}>
          <p className="cc-bignum text-5xl" style={{ color: riskColor(row.risk_band) }}>
            {silence == null ? '—' : silence}
          </p>
          <p className="cc-eyebrow mt-1">{silence === 1 ? 'day silent' : 'days silent'}</p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="ar-inline font-bold text-base truncate" style={{ color: 'var(--ds-text-primary)' }}>
              {row.display_name || row.full_name}
            </span>
            {row.group_code && <Pill>{row.group_code}</Pill>}
            {row.academic_level != null && <Pill tone="accent">Level {row.academic_level}</Pill>}
          </div>

          <div className="mb-2.5" style={{ maxWidth: 320 }}>
            <ActivityStrip days={row.activity_14} span={14} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* A student who wrote back and got no answer outranks everything
                else on this screen — the radar sorts them to the top too. */}
            {row.unanswered > 0 && (
              <Pill tone="accent" title="They replied and nobody has answered yet">
                <MessageSquare size={11} /> {row.unanswered} replied
              </Pill>
            )}

            {/* What to actually talk about, instead of "how is it going". */}
            {row.weakest_section && (
              <Pill
                tone={row.weakest_score < 60 ? 'danger' : 'neutral'}
                title="Their weakest graded skill, averaged over every attempt"
              >
                {sectionLabel(row.weakest_section)} {row.weakest_score}
              </Pill>
            )}

            {/* The platform-problem signal. Loud on purpose: it is the one thing
                the coach can find that nobody else in the company is looking for. */}
            {row.open_issues > 0 && (
              <Pill tone="danger" title="Open help request or bug report — check whether the platform is the blocker before you chase them">
                <LifeBuoy size={11} /> {row.open_issues} open issue{row.open_issues === 1 ? '' : 's'}
              </Pill>
            )}

            <Pill tone="neutral" title="Study days in the last 14">
              {row.active_days_last_14}/14 active
            </Pill>

            {row.xp_last_14 > 0 && <Pill tone="neutral">{row.xp_last_14} XP · 14d</Pill>}

            {row.pending_signals > 0 && (
              <Pill tone="neutral" title="The signals engine has also flagged this student. Acting here closes those rows too.">
                engine flagged ×{row.pending_signals}
              </Pill>
            )}
          </div>
        </div>

        {/* The fact that decides his next move, on the row instead of a click
            away: when anyone last spoke to this person, and what about. */}
        <div className="lc-row__last">
          <p className="cc-eyebrow mb-1.5">Last contact</p>
          {since == null ? (
            <p className="text-sm font-semibold" style={{ color: 'var(--ds-accent-warning)' }}>
              Never contacted
            </p>
          ) : (
            <>
              <p
                className="text-sm font-semibold"
                style={{ color: recentlyTouched ? 'var(--ds-accent-success)' : 'var(--ds-text-primary)' }}
              >
                {since === 0 ? 'Today' : `${since} day${since === 1 ? '' : 's'} ago`}
                {row.last_blocker && (
                  <span style={{ color: 'var(--ds-text-secondary)', fontWeight: 500 }}>
                    {' · '}{blockerLabel(row.last_blocker)}
                  </span>
                )}
              </p>
              {row.last_situation_en && (
                <p className="text-sm mt-0.5 lc-clamp2" style={{ color: 'var(--ds-text-secondary)' }}>
                  {row.last_situation_en}
                </p>
              )}
            </>
          )}
          <span className="lc-row__cta">Reach out →</span>
        </div>
      </GlassPanel>
    </motion.div>
  )
}


function Section({ title, children, count }) {
  return (
    <section className="mt-6">
      <h3 className="cc-eyebrow mb-2.5">
        {title}
        {count != null && <span className="cc-num"> ({count})</span>}
      </h3>
      {children}
    </section>
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

function Button({ children, onClick, disabled, tone = 'neutral', icon: Icon, full }) {
  const T = {
    primary: { bg: 'var(--ds-accent-primary)', fg: 'var(--cc-on-accent)', bd: 'transparent' },
    neutral: { bg: 'var(--ds-surface-3)', fg: 'var(--ds-text-primary)', bd: 'var(--ds-border-subtle)' },
  }
  const t = T[tone] || T.neutral
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`cc-btn ${full ? 'w-full' : ''}`}
      style={{
        background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
        opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
        filter: disabled ? 'saturate(0.3)' : 'none',
      }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   The detail drawer — ordered around the one action:
   who → how long → the Arabic he is about to send → send.
   ═══════════════════════════════════════════════════════════════════════════ */

function DetailDrawer({ row, onClose, onAdvance, position, total }) {
  const profileId = useAuthStore((s) => s.profile?.id)
  const profile = useAuthStore((s) => s.profile)
  const tz = useMemo(() => viewerTz(profile), [profile])
  const reduced = useReducedMotion()

  const { data: dossier, isLoading } = useCoachStudent(row?.student_id)
  const { data: templates } = useTemplates()
  const send = useSendMessage()
  const logTouchpoint = useLogTouchpoint()
  const escalate = useEscalate()

  const [templateCode, setTemplateCode] = useState('')
  const [blocker, setBlocker] = useState('')
  const [note, setNote] = useState('')
  const [escalating, setEscalating] = useState(false)
  const [escReason, setEscReason] = useState('')
  // "required" is an alarm colour; it should appear when something is actually
  // wrong, not the instant the drawer opens.
  const [attempted, setAttempted] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const bodyRef = useRef(null)
  const panelRef = useRef(null)
  const previewRef = useRef(null)

  const { data: preview, isFetching: previewLoading } = usePreview(row?.student_id, templateCode)

  const busy = send.isPending || logTouchpoint.isPending || escalate.isPending

  // Only the templates that suit this student's silence level. Offering
  // "quiet a week" copy to someone who was here this morning is how a coach
  // sends something that reads as automated.
  const daysEnrolled = useMemo(() => {
    if (!row?.enrollment_date) return null
    return Math.floor((Date.now() - new Date(`${row.enrollment_date}T12:00:00Z`).getTime()) / 86400000)
  }, [row?.enrollment_date])

  const fitting = useMemo(
    () => (templates || []).filter((t) => templateFits(t, {
      silenceDays: row?.silence_days,
      daysEnrolled,
    })),
    [templates, row?.silence_days, daysEnrolled]
  )
  const chosen = useMemo(
    () => fitting.find((t) => t.code === templateCode) || null,
    [fitting, templateCode]
  )

  useEffect(() => {
    setTemplateCode('')
    setBlocker('')
    setNote('')
    setEscalating(false)
    setEscReason('')
    setAttempted(false)
    setNoteOpen(false)
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [row?.student_id])

  // On a phone the fold is small and the header, the silence count and the
  // risk note all sit above the message. Rather than fight for those pixels,
  // bring the thing he came here to read to him the moment it renders.
  useEffect(() => {
    if (!preview || !previewRef.current) return
    previewRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [preview])

  const onSend = useCallback(async () => {
    setAttempted(true)
    if (!templateCode) return toast({ type: 'error', title: 'Pick a message first' })
    if (!blocker) return toast({ type: 'error', title: 'Pick a blocker type first' })
    try {
      await send.mutateAsync({ studentId: row.student_id, templateCode, blocker, note })
      toast({ type: 'success', title: 'Message sent', description: 'Delivered in-platform, with a push notification.' })
      onAdvance()
    } catch (e) {
      toast({ type: 'error', title: 'Could not send', description: String(e.message || e) })
    }
  }, [templateCode, blocker, note, row, send, onAdvance])

  const onNoAction = useCallback(async () => {
    if (!blocker) return toast({ type: 'error', title: 'Pick a blocker type first' })
    if (!note.trim()) setNoteOpen(true)
    if (!note.trim()) return toast({ type: 'error', title: 'Say why no action is needed' })
    try {
      await logTouchpoint.mutateAsync({
        studentId: row.student_id, action: 'no_action_needed', blocker, note,
      })
      toast({ type: 'success', title: 'Logged' })
      onAdvance()
    } catch (e) {
      toast({ type: 'error', title: 'Could not log it', description: String(e.message || e) })
    }
  }, [blocker, note, row, logTouchpoint, onAdvance])

  const onObserve = useCallback(async () => {
    if (!blocker) return toast({ type: 'error', title: 'Pick a blocker type first' })
    if (!note.trim()) setNoteOpen(true)
    if (!note.trim()) return toast({ type: 'error', title: 'An observation needs a note' })
    try {
      await logTouchpoint.mutateAsync({
        studentId: row.student_id, action: 'observation', blocker, note,
      })
      toast({ type: 'success', title: 'Observation saved' })
    } catch (e) {
      toast({ type: 'error', title: 'Could not save it', description: String(e.message || e) })
    }
  }, [blocker, note, row, logTouchpoint])

  const onEscalate = useCallback(async () => {
    if (!blocker) return toast({ type: 'error', title: 'Pick a blocker type first' })
    if (escReason.trim().length < 15) {
      return toast({ type: 'error', title: 'Tell the admin what you need — at least 15 characters' })
    }
    try {
      const res = await escalate.mutateAsync({
        coachId: profileId,
        studentId: row.student_id,
        reason: escReason.trim().slice(0, 120),
        bodyEn: `${escReason.trim()}${note.trim() ? `\n\nNotes: ${note.trim()}` : ''}`,
        blocker,
      })
      if (res.logFailed) {
        toast({
          type: 'warning',
          title: 'Escalated — but it was not logged',
          description: 'The admin has the case. Mention it in today’s log so the record matches.',
        })
      } else {
        toast({ type: 'success', title: 'Escalated to the admin' })
      }
      onAdvance()
    } catch (e) {
      toast({ type: 'error', title: 'Could not escalate', description: String(e.message || e) })
    }
  }, [blocker, escReason, note, profileId, row, escalate, onAdvance])

  // Esc closes, ⌘/Ctrl+Enter sends, 1–5 pick a blocker.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onSend(); return }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')
      if (!typing && !e.metaKey && !e.ctrlKey && /^[1-5]$/.test(e.key)) {
        setBlocker(BLOCKERS[Number(e.key) - 1].value)
      }
    }
    // aria-modal="true" is a promise: Tab must not escape into the page
    // behind, and closing must put focus back where it came from.
    const opener = document.activeElement
    const onTab = (e) => {
      if (e.key !== 'Tab' || !panelRef.current) return
      const f = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('keydown', onTab)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // `modal-open` is the app's own convention for "a full-screen surface is
    // up": index.css hides the fixed mobile bottom nav for it. Without it the
    // nav sat on top of Send / Escalate on a phone and ate the taps.
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('keydown', onTab)
      document.body.style.overflow = prev
      document.body.classList.remove('modal-open')
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [onClose, onSend])

  if (!row) return null

  const s = dossier?.student
  const helpRequests = dossier?.help_requests || []
  const bugReports = dossier?.bug_reports || []
  const touchpoints = dossier?.touchpoints || []

  const riyadhNow = timeIn(new Date(), ACADEMY_TZ)
  const rawHour = Number(riyadhNow.match(/^(\d+)/)?.[1] || 0) % 12
  const hour24 = /pm/i.test(riyadhNow) ? rawHour + 12 : rawHour
  const quietHours = hour24 >= QUIET_FROM || hour24 < QUIET_TO

  const recentlyTouched = row.days_since_touchpoint != null && row.days_since_touchpoint <= RECENT_TOUCH_DAYS

  return createPortal(
    // `lc-console` is repeated here on purpose: the drawer is portalled to
    // <body>, so it sits OUTSIDE the console wrapper and every
    // `.lc-console .cc-*` / `.ar-block` rule would otherwise miss it —
    // including the styling of the Arabic preview.
    <motion.div
      className="lc-console lc-drawer"
      role="dialog" aria-modal="true" aria-label="Student detail"
      initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }}
      exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: 0.18 }}
    >
      <div className="lc-drawer__scrim" onClick={onClose} />
      <motion.div
        ref={panelRef}
        className="lc-drawer__panel"
        initial={reduced ? false : { x: 36, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="lc-drawer__body" ref={bodyRef}>
          {/* ── header ───────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="ar-inline text-lg font-extrabold truncate" style={{ color: 'var(--ds-text-primary)' }}>
                {row.display_name || row.full_name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
                <span className="cc-num">{position} of {total}</span>
                {row.gender && <> · {GENDER_LABELS[row.gender]}</>}
                {row.last_seen_at && <> · last seen {dualShort(row.last_seen_at, tz)}</>}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => onAdvance(-1)} aria-label="Previous student" className="cc-icon-btn">
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => onAdvance(1)} aria-label="Next student" className="cc-icon-btn">
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={onClose} aria-label="Close" className="cc-icon-btn">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── 1. how long, and what band ───────────────────────────── */}
          <div className="flex items-baseline gap-3">
            <span className="cc-bignum text-5xl" style={{ color: riskColor(row.risk_band) }}>
              {row.silence_days ?? '—'}
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>
              days since anything happened
            </span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>
            <span style={{ color: riskColor(row.risk_band) }}>{riskLabel(row.risk_band)}</span> — {riskBlurb(row.risk_band)}
          </p>

          {row.unanswered > 0 && (
            <div className="cc-callout mt-4" style={{
              background: 'color-mix(in srgb, var(--ds-accent-primary) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ds-accent-primary) 35%, transparent)',
            }}>
              <MessageSquare size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--ds-accent-primary)' }} />
              <p className="text-xs" style={{ color: 'var(--ds-text-secondary)' }}>
                They replied {row.unanswered === 1 ? 'once' : `${row.unanswered} times`} and nobody has answered.{' '}
                <Link to={`/coach/student/${row.student_id}`} className="underline" style={{ color: 'var(--ds-accent-primary)' }}>
                  Read the conversation
                </Link>{' '}— and if no approved message fits, escalate so someone who reads Arabic replies.
              </p>
            </div>
          )}

          {row.weakest_section && (
            <p className="text-xs mt-2" style={{ color: 'var(--ds-text-tertiary)' }}>
              Weakest skill:{' '}
              <strong style={{ color: row.weakest_score < 60 ? 'var(--ds-accent-danger)' : 'var(--ds-text-secondary)' }}>
                {sectionLabel(row.weakest_section)} {row.weakest_score}
              </strong>{' '}
              — <Link to={`/coach/student/${row.student_id}`} className="underline" style={{ color: 'var(--ds-text-tertiary)' }}>
                see the full record
              </Link>
            </p>
          )}

          {recentlyTouched && (
            <div className="cc-callout cc-callout--good mt-4">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--ds-accent-success)' }} />
              <p className="text-xs" style={{ color: 'var(--ds-text-secondary)' }}>
                You already reached out{' '}
                {row.days_since_touchpoint === 0 ? 'today' : `${row.days_since_touchpoint} day${row.days_since_touchpoint === 1 ? '' : 's'} ago`}.
                A second message this soon reads as automated — give it a few days unless something changed.
              </p>
            </div>
          )}

          {/* ── 2. the message — the reason this screen exists ───────── */}
          <Section title="Message">
          {fitting.length === 0 ? (
            <div className="cc-callout cc-callout--empty mb-3">
              <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
                No approved message fits {row.silence_days ?? 0} days of silence.
                Escalate instead — that is what it is for.
              </p>
            </div>
          ) : chosen ? (
            /* Once he has chosen, the list collapses. Browsing is a step; the
               Arabic he is about to send is the destination, and it should not
               sit below fifteen rems of options he has already rejected. */
            <div className="lc-chosen mb-2">
              <div className="min-w-0">
                <span className="cc-pill" style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-tertiary)' }}>
                  {TONE_LABELS[chosen.tone] || chosen.tone}
                </span>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--ds-text-primary)' }}>
                  {chosen.situation_en}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplateCode('')}
                className="cc-chip shrink-0"
                style={{
                  background: 'var(--ds-surface-3)', color: 'var(--ds-text-secondary)',
                  border: '1px solid var(--cc-rule)',
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="lc-templates mb-2" role="listbox" aria-label="Approved messages">
              {fitting.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  role="option"
                  aria-selected={templateCode === t.code}
                  aria-pressed={templateCode === t.code}
                  onClick={() => setTemplateCode(t.code)}
                  className="lc-template"
                >
                  <span className="flex items-center gap-2 mb-0.5">
                    <span className="cc-pill" style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-tertiary)' }}>
                      {TONE_LABELS[t.tone] || t.tone}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
                      {t.situation_en}
                    </span>
                  </span>
                  <span className="lc-clamp2 block text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
                    {t.guidance_en}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* The Arabic comes before the guidance once he has chosen: he read
              the guidance in the list to get here, and on a phone whatever is
              second is below the fold. The message is the thing. */}
          {templateCode && (
            previewLoading ? (
              <div className="cc-skel mb-3" style={{ height: 96 }} />
            ) : preview ? (
              <>
                <div className="ar-block mb-2" lang="ar" dir="rtl" ref={previewRef}>{preview}</div>
                <p className="text-xs mb-2" style={{ color: 'var(--ds-text-tertiary)' }}>
                  Pre-approved Arabic for {row.gender === 'female' ? 'a female' : row.gender === 'male' ? 'a male' : 'an unspecified-gender'} student,
                  sent exactly as shown and not editable. If nothing fits, escalate.
                </p>
              </>
            ) : null
          )}

          {chosen && <p className="lc-guidance mb-2">{chosen.guidance_en}</p>}
          </Section>

          {/* ── 2. is it a platform problem? ─────────────────────────── */}
          {(helpRequests.length > 0 || bugReports.length > 0) && (
            <Section title="Open tickets — check these before you chase" count={helpRequests.length + bugReports.length}>
              <div className="space-y-2">
                {helpRequests.map((h) => (
                  <div key={h.id} className="cc-ticket">
                    <div className="flex items-center gap-2 mb-1">
                      <LifeBuoy size={13} style={{ color: 'var(--ds-accent-warning)' }} />
                      <span className="text-xs font-bold" style={{ color: 'var(--ds-text-primary)' }}>Help request</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--ds-text-secondary)' }}>
                      {sectionLabel(h.section_type)}
                      {h.unit_number != null && ` · Unit ${h.unit_number}`}
                      {h.unit_title && <span className="ar-inline"> — {h.unit_title}</span>}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>{dualShort(h.created_at, tz)}</p>
                  </div>
                ))}
                {bugReports.map((b) => (
                  <div key={b.id} className="cc-ticket">
                    <div className="flex items-center gap-2 mb-1">
                      <Bug size={13} style={{ color: 'var(--ds-accent-danger)' }} />
                      <span className="text-xs font-bold" style={{ color: 'var(--ds-text-primary)' }}>Bug report · {b.status}</span>
                    </div>
                    <p className="ar-inline text-xs" style={{ color: 'var(--ds-text-secondary)' }}>{b.description}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>{dualShort(b.created_at, tz)}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── 3. context ───────────────────────────────────────────── */}
          <Section title="Who they are">
            <GlassPanel elevation={2} padding="md">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Level" value={row.academic_level != null ? `Level ${row.academic_level}` : '—'} />
                <Field label="Package" value={row.package} />
                <Field label="Group" value={row.group_name ? `${row.group_name} (${row.group_code || '—'})` : '—'} />
                <Field label="Trainer" value={s?.trainer_name} />
                <Field label="Enrolled" value={daysEnrolled != null ? `${daysEnrolled} days ago` : row.enrollment_date} />
                <Field label="Active days · 14" value={`${row.active_days_last_14}/14`} />
              </div>
              {s?.goals && (
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
                  <p className="cc-eyebrow mb-1">What they came here for</p>
                  <p className="ar-inline text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{s.goals}</p>
                </div>
              )}
            </GlassPanel>
          </Section>

          <Section title="Last 30 days">
            {isLoading ? <div className="cc-skel" style={{ height: 44 }} />
              : <ActivityStrip days={dossier?.activity_30d} span={30} />}
          </Section>

          {/* ── 4. what has already been said to them ────────────────── */}
          <Section title="Touchpoint history" count={touchpoints.length}>
            {isLoading ? (
              <div className="cc-skel" style={{ height: 80 }} />
            ) : touchpoints.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                Nobody has reached out to this student yet.
              </p>
            ) : (
              <ol className="space-y-2">
                {touchpoints.slice(0, 20).map((t) => (
                  <li key={t.id} className="cc-ticket">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold" style={{ color: 'var(--ds-text-primary)' }}>
                        {ACTION_LABELS[t.action] || t.action}
                      </span>
                      <span className="cc-num text-xs shrink-0" style={{ color: 'var(--ds-text-tertiary)' }}>
                        {dateIn(t.created_at, ACADEMY_TZ)}
                      </span>
                    </div>
                    {t.situation_en && (
                      <p className="text-xs" style={{ color: 'var(--ds-text-secondary)' }}>{t.situation_en}</p>
                    )}
                    {t.rendered_body_ar && (
                      <p className="ar-block mt-2" lang="ar" dir="rtl" style={{ fontSize: '0.9375rem', lineHeight: 1.9 }}>
                        {t.rendered_body_ar}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                      Blocker: {blockerLabel(t.blocker_type)}
                      {t.note_en && <> · {t.note_en}</>}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Link
            to={`/coach/student/${row.student_id}`}
            className="block text-center text-xs mt-6 underline"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            Open the full student record
          </Link>
        </div>

        {/* ── action panel ────────────────────────────────────────────── */}
        <div className="lc-drawer__actions">
          <p className="cc-eyebrow mb-2">
            What is blocking this student?{' '}
            <span style={{ color: attempted && !blocker ? 'var(--ds-accent-danger)' : 'var(--ds-text-tertiary)' }}>
              required
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {BLOCKERS.map((b, i) => (
              <button
                key={b.value}
                type="button"
                title={`${b.hint}  (press ${i + 1})`}
                aria-pressed={blocker === b.value}
                onClick={() => setBlocker(b.value)}
                className="cc-chip cc-chip--input"
                style={{
                  background: blocker === b.value ? 'var(--ds-accent-primary)' : 'var(--ds-surface-3)',
                  color: blocker === b.value ? 'var(--cc-on-accent)' : 'var(--ds-text-secondary)',
                  borderColor: blocker === b.value ? 'transparent' : 'var(--ds-border-subtle)',
                }}
              >
                {b.value === 'platform_issue' && <ShieldAlert size={13} />}
                {b.label}
                <kbd aria-hidden="true">{i + 1}</kbd>
              </button>
            ))}
          </div>

          {/* Collapsed by default. It is optional for a send, and on a phone an
              always-open textarea pushed the Arabic he is about to send off
              the screen. It opens itself for the two actions that require it. */}
          {noteOpen || note ? (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (English) — required for an observation or no-action"
              rows={2}
              className="cc-input mb-3"
              autoFocus={noteOpen}
            />
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="cc-chip cc-chip--input mb-3"
              style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-secondary)', borderColor: 'var(--ds-border-subtle)' }}
            >
              + Add a note
            </button>
          )}

          {quietHours && templateCode && (
            <p className="flex items-center gap-1.5 text-sm mb-2" style={{ color: 'var(--ds-accent-warning)' }}>
              <Moon size={12} className="shrink-0" />
              It is {riyadhNow} in Riyadh — sending now rings their phone.
            </p>
          )}

          {!escalating && (!templateCode || !blocker) && (
            <p className="text-sm mb-2" style={{ color: 'var(--ds-text-tertiary)' }}>
              {!templateCode && !blocker
                ? 'Pick a message and a blocker to send.'
                : !templateCode ? 'Pick a message to send.' : 'Pick a blocker to send.'}
            </p>
          )}

          {escalating ? (
            <div className="mb-1">
              <textarea
                value={escReason}
                onChange={(e) => setEscReason(e.target.value)}
                placeholder="What does the admin need to know or decide? (English)"
                rows={3}
                className="cc-input"
                style={{ borderColor: 'color-mix(in srgb, var(--ds-accent-warning) 45%, transparent)' }}
              />
              <div className="flex gap-2 mt-2">
                <Button tone="primary" icon={ArrowUpRight} onClick={onEscalate} disabled={busy}>Send to admin</Button>
                <Button onClick={() => setEscalating(false)} disabled={busy}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Enabled even when incomplete: a greyed rectangle tells him
                  nothing, and the toasts that say exactly what is missing were
                  only reachable by keyboard. */}
              <Button
                tone={quietHours ? 'neutral' : 'primary'}
                icon={quietHours ? Moon : Send}
                onClick={onSend}
                disabled={busy}
                full
              >
                {send.isPending ? 'Sending…' : quietHours ? `Send anyway — ${riyadhNow} there` : 'Send message'}
                {!send.isPending && !quietHours && <kbd aria-hidden="true">⌘↵</kbd>}
              </Button>
              <Button icon={ArrowUpRight} onClick={() => setEscalating(true)} disabled={busy} full>Escalate</Button>
              <Button icon={CheckCircle2} onClick={onNoAction} disabled={busy} full>No action needed</Button>
              <Button icon={MessageSquare} onClick={onObserve} disabled={busy} full>Log observation</Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   The radar
   ═══════════════════════════════════════════════════════════════════════════ */

function RadarSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => <div key={i} className="cc-skel" style={{ height: 148 }} />)}
    </div>
  )
}

export default function CoachRadar() {
  const { data: rows, isLoading, error } = useRadar()
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState(null)
  const [bandFilter, setBandFilter] = useState(null)
  const [groupFilter, setGroupFilter] = useState('')
  const [packageFilter, setPackageFilter] = useState('')
  const [staleOnly, setStaleOnly] = useState(false)

  const all = rows || []

  const counts = useMemo(() => {
    const c = { critical: 0, at_risk: 0, watch: 0, ok: 0 }
    for (const r of all) if (c[r.risk_band] != null) c[r.risk_band] += 1
    return c
  }, [all])

  const contactedToday = useMemo(
    () => all.filter((r) => r.days_since_touchpoint === 0).length,
    [all]
  )

  const groups = useMemo(
    () => [...new Set(all.map((r) => r.group_code).filter(Boolean))].sort(),
    [all]
  )
  const packages = useMemo(
    () => [...new Set(all.map((r) => r.package).filter(Boolean))].sort(),
    [all]
  )

  /**
   * The default view hides `ok`. The screen should open on the problems —
   * a coach who has to filter before he can see anything will stop filtering
   * long before he stops opening the page.
   */
  const visible = useMemo(() => {
    return all.filter((r) => {
      if (bandFilter ? r.risk_band !== bandFilter : r.risk_band === 'ok') return false
      if (groupFilter && r.group_code !== groupFilter) return false
      if (packageFilter && r.package !== packageFilter) return false
      if (staleOnly && !(r.days_since_touchpoint == null || r.days_since_touchpoint >= 7)) return false
      return true
    })
  }, [all, bandFilter, groupFilter, packageFilter, staleOnly])

  const selectedIndex = useMemo(
    () => visible.findIndex((r) => r.student_id === selected),
    [visible, selected]
  )
  const selectedRow = selectedIndex >= 0 ? visible[selectedIndex] : null
  useEffect(() => { if (selected && selectedIndex < 0) setSelected(null) }, [selected, selectedIndex])

  const advance = useCallback((step) => {
    if (typeof step === 'number') {
      const next = visible[selectedIndex + step]
      if (next) setSelected(next.student_id)
      return
    }
    const next = visible[selectedIndex + 1] || visible[selectedIndex - 1] || null
    setSelected(next && next.student_id !== selected ? next.student_id : null)
  }, [visible, selectedIndex, selected])

  if (error) {
    return (
      <GlassPanel elevation={2} padding="lg">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} style={{ color: 'var(--ds-accent-danger)' }} />
          <div>
            <p className="font-bold" style={{ color: 'var(--ds-text-primary)' }}>The radar would not load</p>
            <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>{String(error.message || error)}</p>
          </div>
        </div>
      </GlassPanel>
    )
  }

  return (
    <div>
      {/* Phones get the strip, wider screens get the tiles. */}
      <div className="lc-only-mobile" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
        <BandStrip
          counts={counts}
          total={all.length}
          contactedToday={contactedToday}
          active={bandFilter}
          onPick={setBandFilter}
        />
      </div>

      {/* band counters — also the primary filter */}
      <div className="lc-only-desktop grid grid-cols-2 lg:grid-cols-5 gap-3" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
        {RISK_ORDER.map((band) => (
          <BandTile
            key={band}
            band={band}
            count={isLoading ? '—' : counts[band]}
            active={bandFilter === band}
            onClick={() => setBandFilter((v) => (v === band ? null : band))}
          />
        ))}
        <GlassPanel elevation={2} padding="md" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} style={{ color: 'var(--ds-accent-primary)' }} />
            <p className="cc-eyebrow">Contacted today</p>
          </div>
          <p className="cc-bignum text-4xl" style={{ color: 'var(--ds-text-primary)' }}>
            {isLoading ? '—' : contactedToday}
          </p>
        </GlassPanel>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="cc-chip cc-chip--input">
          <option value="">All groups</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)} className="cc-chip cc-chip--input">
          <option value="">All packages</option>
          {packages.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setStaleOnly((v) => !v)}
          className="cc-chip cc-chip--input"
          aria-pressed={staleOnly}
          title="Students you have not reached out to in the last week"
          style={{
            background: staleOnly ? 'var(--ds-accent-primary)' : 'var(--ds-surface-3)',
            color: staleOnly ? 'var(--cc-on-accent)' : 'var(--ds-text-secondary)',
            borderColor: staleOnly ? 'transparent' : 'var(--ds-border-subtle)',
          }}
        >
          Not contacted in 7 days
        </button>
        {(bandFilter || groupFilter || packageFilter || staleOnly) && (
          <button
            type="button"
            onClick={() => { setBandFilter(null); setGroupFilter(''); setPackageFilter(''); setStaleOnly(false) }}
            className="text-xs underline"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>
          <span className="cc-num">{visible.length}</span> student{visible.length === 1 ? '' : 's'} showing
        </p>
        <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
          {bandFilter ? riskLabel(bandFilter) : 'Healthy students hidden'} · {all.length} active in total
        </p>
      </div>

      {isLoading ? (
        <RadarSkeleton />
      ) : visible.length === 0 ? (
        <GlassPanel elevation={2} padding="xl">
          <div className="text-center py-6">
            <CheckCircle2 size={36} className="mx-auto mb-3" style={{ color: 'var(--ds-accent-success)' }} />
            <p className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>Nobody needs you here</p>
            <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
              {bandFilter || groupFilter || packageFilter || staleOnly
                ? 'No student matches these filters.'
                : 'Every active student has studied in the last two days.'}
            </p>
          </div>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {visible.map((row, i) => (
            <RadarRow
              key={row.student_id}
              row={row}
              index={i}
              reduced={reduced}
              onOpen={(r) => setSelected(r.student_id)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedRow && (
          /* No key on student_id: it remounted the entire panel on prev/next,
             overlapping two full-screen scrims mid-crossfade and making every
             step feel like a page load. The reset effect already clears state. */
          <DetailDrawer
            row={selectedRow}
            position={selectedIndex + 1}
            total={visible.length}
            onAdvance={advance}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
