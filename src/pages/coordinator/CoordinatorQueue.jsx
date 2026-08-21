import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, ArrowUpRight, Bug, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Clock, LifeBuoy, MessageSquare, Moon, Send, ShieldAlert, Sparkles, X, Undo2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import GlassPanel from '@/design-system/components/GlassPanel'
import { toast } from '@/components/ui/FluentiaToast'
import {
  useCoordinatorQueue, useCoordinatorStudent, useDraftMessage, useSendAndAction,
  useActionStudent, useSnooze, useEscalate,
} from './consoleQueries'
import {
  BLOCKERS, CHANNEL_LABELS, describeSignal, reasonBlurb, reasonLabel,
  sectionLabel, severityColor, severityLabel,
} from './utils/reasonLabels'
import { ACADEMY_TZ, dayKeyIn, dualShort, dualTime, lastNDayKeys, timeIn, viewerTz } from './utils/tz'
import './coordinator-console.css'

/* The window enforced by expire_stale_interventions(7), called by the
   detect-student-signals edge function every 4 hours (cron jobid 22). */
const EXPIRY_DAYS = 7

/* Riyadh hours in which a push notification wakes a student up. */
const QUIET_FROM = 23
const QUIET_TO = 7

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

function StatTile({ label, value, caption, tone = 'neutral', icon: Icon }) {
  const color =
    tone === 'danger' ? 'var(--ds-accent-danger)'
    : tone === 'warning' ? 'var(--ds-accent-warning)'
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
 * One square per day. Pure CSS grid — no chart library.
 *
 * Day buckets are built in the ACADEMY's zone, never with toISOString(): UTC
 * bucketing shifts every Riyadh evening into the previous day's square, so the
 * "today" cell would be wrong for three hours out of every twenty-four.
 * Narrow screens get 14 days rather than 30 eight-pixel cells.
 */
function ActivityStrip({ days }) {
  const [span, setSpan] = useState(() =>
    (typeof window !== 'undefined' && window.innerWidth < 640 ? 14 : 30))
  const [picked, setPicked] = useState(null)

  useEffect(() => {
    const onResize = () => setSpan(window.innerWidth < 640 ? 14 : 30)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const cells = useMemo(() => {
    const byDate = new Map((days || []).map((d) => [dayKeyIn(`${d.date}T12:00:00Z`), d]))
    return lastNDayKeys(span).map((key) => {
      const secs = byDate.get(key)?.learning_seconds || 0
      return { key, level: secs === 0 ? 0 : secs < 600 ? 1 : 2, secs }
    })
  }, [days, span])

  return (
    <div>
      <div className="cc-strip" style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }}>
        {cells.map((c) => (
          <button
            key={c.key}
            type="button"
            className="cc-strip-cell"
            data-on={c.level}
            aria-label={`${c.key}: ${c.secs ? `${Math.round(c.secs / 60)} minutes` : 'nothing'}`}
            /* A title attribute does not exist on touch — tapping writes the
               value into the caption line below instead. */
            onPointerDown={() => setPicked(c)}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2 text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
        <span>{span} days ago</span>
        <span className="truncate">
          {picked ? `${picked.key} — ${picked.secs ? `${Math.round(picked.secs / 60)} min` : 'nothing'}` : ''}
        </span>
        <span>today</span>
      </div>
    </div>
  )
}

function QueueCard({ row, onOpen, index, reduced }) {
  const expiringSoon = row.days_to_expiry <= 2
  const hasIssue = (row.open_help_requests || 0) + (row.open_bug_reports || 0) > 0
  const silence = row.silence_days

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : Math.min(index, 8) * 0.035, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassPanel
        elevation={1}
        padding="md"
        className="cc-card"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(row)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(row) }
        }}
        style={{ borderInlineStart: `3px solid ${severityColor(row.severity)}` }}
      >
        <div className="flex items-start gap-4">
          {/* the number he scans by */}
          <div className="shrink-0 text-center" style={{ minWidth: 68 }}>
            <p
              className="cc-bignum text-5xl"
              style={{ color: silence >= 7 ? 'var(--ds-accent-danger)' : 'var(--ds-text-primary)' }}
            >
              {silence == null ? '—' : silence}
            </p>
            <p className="cc-eyebrow mt-1">{silence === 1 ? 'day silent' : 'days silent'}</p>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="ar-inline font-bold text-base truncate" style={{ color: 'var(--ds-text-primary)' }}>
                {row.display_name || row.full_name}
              </span>
              {row.group_code && <Pill>{row.group_code}</Pill>}
              {row.academic_level != null && <Pill tone="accent">Level {row.academic_level}</Pill>}
            </div>

            <p className="text-sm font-semibold mb-1" style={{ color: severityColor(row.severity) }}>
              {(row.reasons || [row.reason_code]).map(reasonLabel).join(' · ')}
            </p>

            {/* Concrete, per-student, and different on every card. The generic
                description of each code lives in the drawer — printed on nine
                cards in a row it was wallpaper, not information. */}
            <p className="text-xs mb-2.5" style={{ color: 'var(--ds-text-tertiary)' }}>
              {row.stacked_pending + 1} alert{row.stacked_pending ? 's' : ''} since{' '}
              {String(row.created_at).slice(0, 10)}, none answered
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone={expiringSoon ? 'danger' : 'neutral'} title={`Expires ${EXPIRY_DAYS} days after it was raised`}>
                <Clock size={11} />
                {row.days_to_expiry <= 0 ? 'expires today' : `${row.days_to_expiry}d left`}
              </Pill>

              {hasIssue && (
                <Pill tone="warning" title="This student has an open ticket — check whether the platform is the blocker before you chase them">
                  <LifeBuoy size={11} />
                  {[
                    row.open_help_requests ? `${row.open_help_requests} help` : null,
                    row.open_bug_reports ? `${row.open_bug_reports} bug` : null,
                  ].filter(Boolean).join(' · ')}
                </Pill>
              )}

              {row.suggested_message_ar && (
                <Pill tone="accent"><MessageSquare size={11} /> message ready</Pill>
              )}
            </div>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  )
}

/**
 * A student who studied AFTER their alert was raised.
 *
 * Seven of nine rows are these on a normal day. Rendering them as full cards
 * made a two-student day look like a nine-student day, so they collapse into
 * one band of single-line rows that clear in a tap.
 */
function StaleRow({ row, onClear, onOpen, busy }) {
  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
      style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)' }}
    >
      <Undo2 size={14} className="shrink-0" style={{ color: 'var(--ds-accent-success)' }} />
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="ar-inline text-sm font-semibold truncate flex-1 text-start"
        style={{ color: 'var(--ds-text-primary)' }}
      >
        {row.display_name || row.full_name}
      </button>
      <span className="text-xs shrink-0" style={{ color: 'var(--ds-text-tertiary)' }}>
        seen {row.silence_days === 0 ? 'today' : `${row.silence_days}d ago`}
      </span>
      <button
        type="button"
        onClick={() => onClear(row)}
        disabled={busy}
        className="cc-chip shrink-0"
        style={{
          background: 'var(--ds-surface-3)', color: 'var(--ds-text-secondary)',
          border: '1px solid var(--ds-border-subtle)', opacity: busy ? 0.45 : 1,
        }}
      >
        <CheckCircle2 size={13} /> Clear
      </button>
    </div>
  )
}

function DetailSection({ title, children, count }) {
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
      <p className="text-sm font-semibold ar-inline" style={{ color: 'var(--ds-text-primary)' }}>{value ?? '—'}</p>
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
      type="button"
      onClick={onClick}
      disabled={disabled}
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
   The detail drawer

   Ordered around the one action: name → how long they have been gone → THE
   MESSAGE → send. Everything else (who they are, the 30-day strip, the whole
   signal history) sits below as evidence, consulted only when the message does
   not fit the situation.
   ═══════════════════════════════════════════════════════════════════════════ */

function DetailDrawer({ row, onClose, onAdvance, position, total }) {
  const profileId = useAuthStore((s) => s.profile?.id)
  const profile = useAuthStore((s) => s.profile)
  const tz = useMemo(() => viewerTz(profile), [profile])
  const reduced = useReducedMotion()

  const { data: dossier, isLoading } = useCoordinatorStudent(row?.student_id)
  const draft = useDraftMessage()
  const sendAndAction = useSendAndAction()
  const actionStudent = useActionStudent()
  const snooze = useSnooze()
  const escalate = useEscalate()

  const [blocker, setBlocker] = useState('')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState(row?.suggested_message_ar || null)
  const [escalating, setEscalating] = useState(false)
  const [escReason, setEscReason] = useState('')
  const bodyRef = useRef(null)
  const drafted = useRef(null)

  const busy = draft.isPending || sendAndAction.isPending || actionStudent.isPending ||
    snooze.isPending || escalate.isPending

  const onDraft = useCallback(async (interventionId) => {
    try {
      const m = await draft.mutateAsync(interventionId)
      setMessage(m)
    } catch (e) {
      toast({ type: 'error', title: 'Could not draft the message', description: String(e.message || e) })
    }
  }, [draft])

  // Reset per student, and draft immediately. A2 found suggested_message_ar
  // populated on only 3 of 100 pending rows — the drafter writes it on first
  // request — so waiting for a click put a round-trip between him and the one
  // thing he opened the drawer to send.
  useEffect(() => {
    setBlocker('')
    setNotes('')
    setEscalating(false)
    setEscReason('')
    setMessage(row?.suggested_message_ar || null)
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    if (!row?.suggested_message_ar && row?.intervention_id && drafted.current !== row.intervention_id) {
      drafted.current = row.intervention_id
      onDraft(row.intervention_id)
    }
    // onDraft is deliberately not a dependency: its identity changes on every
    // mutation state transition, which would re-fire the drafter mid-request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.intervention_id, row?.suggested_message_ar])

  const onSend = useCallback(async () => {
    if (!blocker) return toast({ type: 'error', title: 'Pick a blocker type first' })
    if (!message) return toast({ type: 'error', title: 'The message is still being written' })
    try {
      const res = await sendAndAction.mutateAsync({
        interventionId: row.intervention_id,
        studentId: row.student_id,
        blocker,
        notes,
      })
      // The send and the queue-close are two separate statements. If the close
      // failed the message DID go out, and reporting a plain failure would
      // invite a second send to the same student.
      if (res.closeFailed) {
        toast({
          type: 'warning',
          title: 'Message sent — the queue did not update',
          description: 'Do not send again. Refresh; if it is still listed, tell the admin.',
        })
      } else {
        toast({
          type: 'success',
          title: 'Message sent',
          description: `Closed ${res.closed} signal${res.closed === 1 ? '' : 's'} for this student.`,
        })
      }
      onAdvance()
    } catch (e) {
      toast({ type: 'error', title: 'Could not send', description: String(e.message || e) })
    }
  }, [blocker, message, notes, row, sendAndAction, onAdvance])

  const onNoAction = useCallback(async () => {
    if (!blocker) return toast({ type: 'error', title: 'Pick a blocker type first' })
    if (!notes.trim()) return toast({ type: 'error', title: 'Say why no action is needed' })
    try {
      const closed = await actionStudent.mutateAsync({
        studentId: row.student_id, channel: 'no_action_needed', blocker, notes,
      })
      toast({ type: 'success', title: `Closed ${closed} signal${closed === 1 ? '' : 's'}` })
      onAdvance()
    } catch (e) {
      toast({ type: 'error', title: 'Could not close', description: String(e.message || e) })
    }
  }, [blocker, notes, row, actionStudent, onAdvance])

  const onSnooze = useCallback(async (days) => {
    try {
      await snooze.mutateAsync({ interventionId: row.intervention_id, days })
      toast({ type: 'success', title: `Snoozed ${days} day${days === 1 ? '' : 's'}` })
      onAdvance()
    } catch (e) {
      toast({ type: 'error', title: 'Could not snooze', description: String(e.message || e) })
    }
  }, [row, snooze, onAdvance])

  const onEscalate = useCallback(async () => {
    if (!blocker) return toast({ type: 'error', title: 'Pick a blocker type first' })
    if (escReason.trim().length < 15) {
      return toast({ type: 'error', title: 'Tell the admin what you need — at least 15 characters' })
    }
    try {
      await escalate.mutateAsync({
        coordinatorId: profileId,
        studentId: row.student_id,
        interventionId: row.intervention_id,
        reason: escReason.trim().slice(0, 120),
        bodyEn: `${escReason.trim()}${notes.trim() ? `\n\nNotes: ${notes.trim()}` : ''}`,
        blocker,
      })
      toast({ type: 'success', title: 'Escalated to the admin' })
      onAdvance()
    } catch (e) {
      toast({ type: 'error', title: 'Could not escalate', description: String(e.message || e) })
    }
  }, [blocker, escReason, notes, profileId, row, escalate, onAdvance])

  // Esc closes, ⌘/Ctrl+Enter sends, 1–5 pick a blocker. Nine students a day is
  // a keyboard job. Bare digits are ignored while a field has focus.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onSend(); return }
      const typing = /^(INPUT|TEXTAREA)$/.test(e.target?.tagName || '')
      if (!typing && !e.metaKey && !e.ctrlKey && /^[1-5]$/.test(e.key)) {
        setBlocker(BLOCKERS[Number(e.key) - 1].value)
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, onSend])

  if (!row) return null

  const s = dossier?.student
  const helpRequests = dossier?.help_requests || []
  const bugReports = dossier?.bug_reports || []
  const history = dossier?.interventions || []
  const signalLines = describeSignal(row.signal_data)

  // A push at 3am wakes a student up. The console knows both clocks — it should
  // say so rather than let him find out from a complaint.
  const riyadhNow = timeIn(new Date(), ACADEMY_TZ)
  const rawHour = Number(riyadhNow.match(/^(\d+)/)?.[1] || 0) % 12
  const hour24 = /pm/i.test(riyadhNow) ? rawHour + 12 : rawHour
  const quietHours = hour24 >= QUIET_FROM || hour24 < QUIET_TO

  return createPortal(
    // `coordinator-console` is repeated here on purpose: the drawer is portalled
    // to <body>, so it sits OUTSIDE the console wrapper and every
    // `.coordinator-console .cc-*` / `.ar-block` rule would otherwise miss it —
    // including the styling of the Arabic message block.
    <motion.div
      className="coordinator-console coordinator-console-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Student detail"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? undefined : { opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="coordinator-console-drawer__scrim" onClick={onClose} />
      <motion.div
        className="coordinator-console-drawer__panel"
        initial={reduced ? false : { x: 36, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="coordinator-console-drawer__body" ref={bodyRef}>
          {/* ── header ───────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="ar-inline text-lg font-extrabold truncate" style={{ color: 'var(--ds-text-primary)' }}>
                {row.display_name || row.full_name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
                <span className="cc-num">{position} of {total}</span> · raised {dualTime(row.created_at, tz)}
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

          {/* ── 1. how long, and is the alert still true ─────────────── */}
          <div className="flex items-baseline gap-3">
            <span
              className="cc-bignum text-5xl"
              style={{
                color: row.signal_stale ? 'var(--ds-accent-success)'
                  : row.silence_days >= 7 ? 'var(--ds-accent-danger)'
                  : 'var(--ds-text-primary)',
              }}
            >
              {row.silence_days ?? '—'}
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>
              days since anything happened
            </span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>
            Last seen {row.last_seen_at ? dualShort(row.last_seen_at, tz) : 'never'} ·{' '}
            <span style={{ color: severityColor(row.severity) }}>{severityLabel(row.severity)}</span> ·{' '}
            {reasonLabel(row.reason_code)} — {reasonBlurb(row.reason_code)}
          </p>

          {row.signal_stale && (
            <div className="cc-callout cc-callout--good mt-4">
              <Sparkles size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--ds-accent-success)' }} />
              <p className="text-xs" style={{ color: 'var(--ds-text-secondary)' }}>
                They came back <strong>after</strong> this alert was raised. Sending
                &ldquo;we miss you&rdquo; to someone who studied since would read as nobody
                watching. Consider <em>No action needed</em>.
              </p>
            </div>
          )}

          {/* ── 2. THE MESSAGE — the reason this screen exists ───────── */}
          <DetailSection title="Pre-written message — sent as-is">
            {message ? (
              <>
                <div className="ar-block" lang="ar" dir="rtl">{message}</div>
                <p className="text-xs mt-2" style={{ color: 'var(--ds-text-tertiary)' }}>
                  Written by the academy&apos;s Arabic drafter in Dr. Ali&apos;s voice, gendered for this
                  student, from her own record. It cannot be edited here — if it does not fit the
                  situation, escalate instead.
                </p>
              </>
            ) : draft.isPending ? (
              <>
                <div className="cc-skel" style={{ height: 132 }} />
                <p className="text-xs mt-2" style={{ color: 'var(--ds-text-tertiary)' }}>
                  Writing a message from this student&apos;s own record…
                </p>
              </>
            ) : (
              <div className="cc-callout cc-callout--empty">
                <p className="text-xs mb-3" style={{ color: 'var(--ds-text-tertiary)' }}>
                  The drafter could not write one for this student.
                </p>
                <Button tone="neutral" icon={Sparkles} onClick={() => onDraft(row.intervention_id)} disabled={busy}>
                  Try again
                </Button>
              </div>
            )}
          </DetailSection>

          {/* ── 3. is it a platform problem? ─────────────────────────── */}
          {(helpRequests.length > 0 || bugReports.length > 0) && (
            <DetailSection title="Open tickets — check these before you chase" count={helpRequests.length + bugReports.length}>
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
            </DetailSection>
          )}

          {/* ── 4. evidence ──────────────────────────────────────────── */}
          <DetailSection title="Who they are">
            <GlassPanel elevation={2} padding="md">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Level" value={s?.academic_level != null ? `Level ${s.academic_level}` : row.academic_level != null ? `Level ${row.academic_level}` : '—'} />
                <Field label="Package" value={s?.package || row.package} />
                <Field label="Group" value={s?.group_name ? `${s.group_name} (${s.group_code || '—'})` : row.group_code} />
                <Field label="Trainer" value={s?.trainer_name} />
                <Field label="Enrolled" value={s?.enrollment_date} />
                <Field label="Total XP" value={s?.xp_total} />
              </div>
              {signalLines.length > 0 && (
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
                  <p className="cc-eyebrow mb-1">What the detector saw</p>
                  <ul className="text-xs space-y-0.5" style={{ color: 'var(--ds-text-secondary)' }}>
                    {signalLines.map((line) => <li key={line}>· {line}</li>)}
                  </ul>
                </div>
              )}
            </GlassPanel>
          </DetailSection>

          <DetailSection title="Last 30 days">
            {isLoading ? <div className="cc-skel" style={{ height: 44 }} /> : <ActivityStrip days={dossier?.activity_30d} />}
          </DetailSection>

          <DetailSection title="Signal history" count={history.length}>
            {isLoading ? (
              <div className="cc-skel" style={{ height: 90 }} />
            ) : history.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>Nothing yet.</p>
            ) : (
              <ol className="space-y-1.5">
                {history.slice(0, 30).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate" style={{ color: 'var(--ds-text-secondary)' }}>
                      {reasonLabel(h.reason_code)}
                      {h.action_channel && <> — {CHANNEL_LABELS[h.action_channel] || h.action_channel}</>}
                      {h.blocker_type && <> · {h.blocker_type.replace('_', ' ')}</>}
                    </span>
                    <span className="cc-num shrink-0" style={{ color: 'var(--ds-text-tertiary)' }}>
                      {String(h.created_at).slice(0, 10)} · {h.status}
                    </span>
                  </li>
                ))}
                {history.length > 30 && (
                  <li className="text-xs pt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                    <Link to={`/coordinator/student/${row.student_id}`} className="underline">
                      {history.length - 30} older signals
                    </Link>
                  </li>
                )}
              </ol>
            )}
          </DetailSection>

          <Link
            to={`/coordinator/student/${row.student_id}`}
            className="block text-center text-xs mt-6 underline"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            Open the full student record
          </Link>
        </div>

        {/* ── action bar ──────────────────────────────────────────────── */}
        <div className="coordinator-console-drawer__actions">
          <p className="cc-eyebrow mb-2">
            What is blocking this student? <span style={{ color: 'var(--ds-accent-danger)' }}>required</span>
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
              </button>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (English, optional — required to mark no action needed)"
            rows={2}
            className="cc-input mb-3"
          />

          {quietHours && (
            <p className="flex items-center gap-1.5 text-xs mb-2" style={{ color: 'var(--ds-accent-warning)' }}>
              <Moon size={12} />
              It is {riyadhNow} in Riyadh — this pushes to her phone now.
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
                <Button tone="primary" icon={ArrowUpRight} onClick={onEscalate} disabled={busy}>
                  Send to admin
                </Button>
                <Button onClick={() => setEscalating(false)} disabled={busy}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button tone="primary" icon={Send} onClick={onSend} disabled={busy || !message || !blocker} full>
                {sendAndAction.isPending ? 'Sending…' : 'Send message'}
              </Button>
              <Button icon={ArrowUpRight} onClick={() => setEscalating(true)} disabled={busy} full>
                Escalate
              </Button>
              <Button icon={CheckCircle2} onClick={onNoAction} disabled={busy} full>
                No action needed
              </Button>
              <div className="flex items-center gap-1">
                <span className="cc-eyebrow shrink-0 pe-1">Snooze</span>
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSnooze(d)}
                    disabled={busy}
                    className="cc-btn flex-1"
                    title={`Snooze ${d} day${d === 1 ? '' : 's'} — it returns to the queue after that`}
                    style={{
                      background: 'var(--ds-surface-3)', color: 'var(--ds-text-secondary)',
                      border: '1px solid var(--ds-border-subtle)', opacity: busy ? 0.4 : 1,
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   The queue
   ═══════════════════════════════════════════════════════════════════════════ */

function QueueSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => <div key={i} className="cc-skel" style={{ height: 132 }} />)}
    </div>
  )
}

export default function CoordinatorQueue() {
  const { data: rows, isLoading, error } = useCoordinatorQueue()
  const actionStudent = useActionStudent()
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState(null)
  const [staleOpen, setStaleOpen] = useState(false)

  /**
   * One card per STUDENT, not per row.
   *
   * A2 measured the queue: 100 pending rows across 9 students, because the
   * signals engine re-raises the same signal every night — الهنوف alone carries
   * 14 identical pending rows. A row-per-card queue would show the same person
   * fourteen times and could never be emptied, which is the one thing this
   * screen exists to do. The headline row is the most severe, then the oldest
   * (that is also the one closest to expiring).
   */
  const grouped = useMemo(() => {
    const byStudent = new Map()
    for (const r of rows || []) {
      const cur = byStudent.get(r.student_id)
      if (!cur) { byStudent.set(r.student_id, r); continue }
      const better =
        (r.severity === 'urgent' && cur.severity !== 'urgent') ||
        (r.severity === cur.severity && new Date(r.created_at) < new Date(cur.created_at))
      if (better) byStudent.set(r.student_id, r)
    }
    // Every distinct signal and severity the student is carrying, not just the
    // headline one — otherwise a card reading "Silent 7 days" hides the fact
    // that they are also stuck on three units.
    const facets = new Map()
    for (const r of rows || []) {
      const f = facets.get(r.student_id) || { reasons: new Set(), severities: new Set() }
      f.reasons.add(r.reason_code)
      f.severities.add(r.severity)
      facets.set(r.student_id, f)
    }
    for (const [id, head] of byStudent) {
      const f = facets.get(id)
      // Plain arrays, never Sets: a Set survives neither the query cache's
      // structural sharing nor its persistence layer.
      byStudent.set(id, { ...head, reasons: [...f.reasons], severities: [...f.severities] })
    }
    return [...byStudent.values()].sort((a, b) => {
      if ((a.severity === 'urgent') !== (b.severity === 'urgent')) return a.severity === 'urgent' ? -1 : 1
      return new Date(a.created_at) - new Date(b.created_at)
    })
  }, [rows])

  // Students who have studied since their alert was raised are not chases.
  // Mixing them into the list made a two-student day look like a nine-student
  // day, with seven cards carrying the identical "no chase needed" line.
  const live = useMemo(() => grouped.filter((r) => !r.signal_stale), [grouped])
  const stale = useMemo(() => grouped.filter((r) => r.signal_stale), [grouped])

  const stats = useMemo(() => ({
    // A student can carry both severities: the tiles answer "how many people
    // have an urgent signal", not a partition of the queue.
    urgent: live.filter((r) => (r.severities || []).includes('urgent')).length,
    attention: live.filter((r) => (r.severities || []).includes('attention')).length,
    rows: (rows || []).length,
    soon: live.filter((r) => r.days_to_expiry <= 2).length,
    withTickets: live.filter((r) => (r.open_help_requests || 0) + (r.open_bug_reports || 0) > 0).length,
  }), [rows, live])

  // The selected row must follow the refetched data, or the drawer keeps
  // showing a row the server has already closed.
  const order = useMemo(() => [...live, ...stale], [live, stale])
  const selectedIndex = useMemo(
    () => order.findIndex((r) => r.intervention_id === selected),
    [order, selected]
  )
  const selectedRow = selectedIndex >= 0 ? order[selectedIndex] : null
  useEffect(() => { if (selected && selectedIndex < 0) setSelected(null) }, [selected, selectedIndex])

  /**
   * After an action the queue refetches and this row disappears, so "the next
   * one" is whatever now sits at the same index. Returning to the top of the
   * list nine times a day is the difference between a tool and a chore.
   */
  const advance = useCallback((step) => {
    if (typeof step === 'number') {
      const next = order[selectedIndex + step]
      if (next) setSelected(next.intervention_id)
      return
    }
    const next = order[selectedIndex + 1] || order[selectedIndex - 1] || null
    setSelected(next && next.intervention_id !== selected ? next.intervention_id : null)
  }, [order, selectedIndex, selected])

  const clearStale = useCallback(async (row) => {
    try {
      const closed = await actionStudent.mutateAsync({
        studentId: row.student_id,
        channel: 'no_action_needed',
        blocker: 'motivation',
        notes: 'Came back on their own before this alert was worked — cleared from the queue.',
      })
      toast({ type: 'success', title: `Cleared ${closed} signal${closed === 1 ? '' : 's'}` })
    } catch (e) {
      toast({ type: 'error', title: 'Could not clear', description: String(e.message || e) })
    }
  }, [actionStudent])

  if (error) {
    return (
      <GlassPanel elevation={2} padding="lg">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} style={{ color: 'var(--ds-accent-danger)' }} />
          <div>
            <p className="font-bold" style={{ color: 'var(--ds-text-primary)' }}>The queue would not load</p>
            <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>{String(error.message || error)}</p>
          </div>
        </div>
      </GlassPanel>
    )
  }

  return (
    <div>
      {/* header strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: 'var(--space-7, 3rem)' }}>
        <StatTile label="Urgent" value={isLoading ? '—' : stats.urgent} tone="danger" icon={AlertTriangle} caption="Silent or never started" />
        <StatTile label="Attention" value={isLoading ? '—' : stats.attention} tone="warning" icon={Clock} caption="Stuck, not gone" />
        <StatTile label="Open tickets" value={isLoading ? '—' : stats.withTickets} tone="warning" icon={LifeBuoy} caption="Possibly a platform problem" />
        <StatTile
          label="Expiring"
          value={isLoading ? '—' : stats.soon}
          tone={stats.soon > 0 ? 'danger' : 'neutral'}
          icon={Clock}
          caption={`Within 2 days — alerts die at ${EXPIRY_DAYS}`}
        />
      </div>

      {isLoading ? (
        <QueueSkeleton />
      ) : order.length === 0 ? (
        <GlassPanel elevation={2} padding="xl">
          <div className="text-center py-6">
            <CheckCircle2 size={36} className="mx-auto mb-3" style={{ color: 'var(--ds-accent-success)' }} />
            <p className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>Queue empty</p>
            <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
              Nobody is flagged right now. The detector runs every four hours.
            </p>
          </div>
        </GlassPanel>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>
              <span className="cc-num">{live.length}</span> student{live.length === 1 ? '' : 's'} to reach
              {stale.length > 0 && (
                <span style={{ color: 'var(--ds-text-tertiary)' }}> · {stale.length} to clear</span>
              )}
            </p>
            <p className="text-xs cc-num" style={{ color: 'var(--ds-text-tertiary)' }}>
              {stats.rows} nightly re-raises behind them
            </p>
          </div>

          {live.length === 0 ? (
            <GlassPanel elevation={2} padding="lg">
              <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
                Nobody needs chasing — everyone still flagged has studied since their alert was raised.
              </p>
            </GlassPanel>
          ) : (
            <div className="space-y-3">
              {live.map((row, i) => (
                <QueueCard
                  key={row.intervention_id}
                  row={row}
                  index={i}
                  reduced={reduced}
                  onOpen={(r) => setSelected(r.intervention_id)}
                />
              ))}
            </div>
          )}

          {stale.length > 0 && (
            <div style={{ marginTop: 'var(--space-7, 3rem)' }}>
              <button
                type="button"
                onClick={() => setStaleOpen((v) => !v)}
                className="flex items-center gap-2 w-full text-start"
              >
                <ChevronDown
                  size={15}
                  style={{
                    color: 'var(--ds-text-tertiary)',
                    transform: staleOpen ? 'none' : 'rotate(-90deg)',
                    transition: 'transform 160ms ease',
                  }}
                />
                <span className="text-sm font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>
                  {stale.length} came back on their own
                </span>
                <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>— clear, do not chase</span>
              </button>
              {staleOpen && (
                <div className="space-y-2 mt-3">
                  {stale.map((row) => (
                    <StaleRow
                      key={row.intervention_id}
                      row={row}
                      busy={actionStudent.isPending}
                      onClear={clearStale}
                      onOpen={(r) => setSelected(r.intervention_id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {selectedRow && (
          <DetailDrawer
            key={selectedRow.intervention_id}
            row={selectedRow}
            position={selectedIndex + 1}
            total={order.length}
            onAdvance={advance}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
