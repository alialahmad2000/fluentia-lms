import React, { useMemo, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Lock, Sparkles, Trophy, Hourglass, Ban, RefreshCw } from 'lucide-react'
import { V3_MOTION, V3_TYPOGRAPHY, V3_EXAM_GATE, getV3ExamGateText, getMovementSubtitle, resolvePalette } from '../_v3Tokens'
import { useG } from '@/i18n/gender'
import MovementHeroNumeral from './MovementHeroNumeral'

// V3.1 — The Test (Movement IV) panel. Three visual states:
//   locked   — dimmed velvet, lock icon, progress bar, locked message
//   ready    — gold-bordered, breathing glow, oversized start button
//   passed   — trophy seal, "وحدة مُتقَنة", optional score badge
//
// Sources state from useExamGate (an adapter over useUnitMasteryState).
// Launching the exam navigates to /student/unit-mastery/:assessmentId.

const ARABIC_DATE_FORMAT = new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'long', day: 'numeric' })

function formatHMS(isoOrSeconds) {
  if (!isoOrSeconds) return ''
  const end = new Date(isoOrSeconds).getTime()
  const diff = Math.max(0, end - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h} ساعة ${m} دقيقة` : `${m} دقيقة`
}

export default function ExamGatePanel({
  movement,
  examGate,                    // result of useExamGate
  onLaunch,                    // optional override; defaults to internal navigate
  theme = 'dark',
  index = 0,
}) {
  // ─── ALL HOOKS AT TOP ───
  const g = useG()
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const palette = useMemo(() => resolvePalette(movement, theme), [movement, theme])
  const gateText = useMemo(() => getV3ExamGateText(g), [g])

  const handleLaunch = useCallback(() => {
    if (!examGate?.assessment?.id) return
    if (onLaunch) onLaunch(examGate.assessment.id)
    else navigate(`/student/unit-mastery/${examGate.assessment.id}`)
  }, [examGate, onLaunch, navigate])

  const entry = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { ...V3_MOTION.panelFadeIn, delay: index * V3_MOTION.staggerDelay },
      }

  // ─── Conditional rendering AFTER hooks ───
  if (!examGate || examGate.gateState === 'loading') {
    // Render a calm placeholder
    return (
      <motion.section
        {...entry}
        className="v3-exam-panel"
        aria-busy="true"
        style={examPanelStyle(palette, 'locked')}
      >
        <MovementHeroNumeral roman={movement.roman} accent={palette.accent} theme={theme} />
        <div style={centerColumnStyle}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </motion.section>
    )
  }

  if (examGate.gateState === 'absent') {
    // Quiet panel — unit has no exam configured yet
    return (
      <motion.section
        {...entry}
        className="v3-exam-panel"
        aria-label="بوّابة اختبار الوحدة — لا يوجد اختبار بعد"
        style={examPanelStyle(palette, 'locked')}
      >
        <MovementHeroNumeral roman={movement.roman} accent={palette.accent} theme={theme} />
        <div style={centerColumnStyle}>
          <PanelHeader movement={movement} palette={palette} g={g} />
          <Hourglass size={42} color={palette.accentLocked} strokeWidth={1.6} />
          <p style={subtitleTextStyle}>{gateText.noAssessmentMessageAr}</p>
        </div>
      </motion.section>
    )
  }

  if (examGate.gateState === 'passed') {
    return <PassedView movement={movement} palette={palette} examGate={examGate} entry={entry} theme={theme} onLaunch={handleLaunch} g={g} gateText={gateText} />
  }

  if (examGate.gateState === 'ready') {
    return <ReadyView movement={movement} palette={palette} examGate={examGate} entry={entry} theme={theme} reduce={reduce} onLaunch={handleLaunch} g={g} gateText={gateText} />
  }

  // gateState === 'locked' (umbrella for locked / cooldown / locked_out)
  return <LockedView movement={movement} palette={palette} examGate={examGate} entry={entry} theme={theme} reduce={reduce} g={g} gateText={gateText} />
}

// ─── Sub-views ────────────────────────────────────────────────────────────

function PanelHeader({ movement, palette, g }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
      <span
        style={{
          fontFamily: V3_TYPOGRAPHY.romanFont,
          fontSize: '11.5px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: palette.accent,
          fontWeight: 600,
        }}
      >
        {movement.titleEn}
      </span>
      <h2
        style={{
          margin: 0,
          fontFamily: V3_TYPOGRAPHY.arabicHeadingFont,
          fontSize: '26px',
          fontWeight: 700,
          color: 'var(--ds-text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
        }}
      >
        {movement.titleAr}
      </h2>
      <p
        style={{
          margin: 0,
          fontFamily: V3_TYPOGRAPHY.arabicBodyFont,
          fontSize: '13px',
          color: 'var(--ds-text-secondary)',
          lineHeight: 1.45,
        }}
      >
        {getMovementSubtitle(movement, g)}
      </p>
    </header>
  )
}

function LockedView({ movement, palette, examGate, entry, theme, reduce, g, gateText }) {
  const subState = examGate.subState
  const currentPct = examGate.progress?.current_pct ?? 0
  const requiredPct = examGate.progress?.required_pct ?? 70
  const ratio = Math.max(0, Math.min(1, currentPct / Math.max(1, requiredPct)))

  let line1 = gateText.lockedMessageAr
  let line2 = `${g('أنجزت', 'أنجزتِ')} ${Math.round(currentPct)}٪ — يلزم ${requiredPct}٪`
  let Icon = Lock

  if (subState === 'cooldown' && examGate.cooldownEndsAt) {
    line1 = gateText.cooldownMessageAr
    line2 = `الباقي تقريبًا ${formatHMS(examGate.cooldownEndsAt)}`
    Icon = Hourglass
  } else if (subState === 'locked_out' && examGate.lockoutEndsAt) {
    line1 = gateText.lockedOutMessageAr
    line2 = `${g('حاول بعد', 'حاولي بعد')} ${formatHMS(examGate.lockoutEndsAt)}`
    Icon = Ban
  }

  const breathing = reduce
    ? {}
    : {
        animate: { boxShadow: [
          `0 12px 36px -16px ${palette.glow}`,
          `0 16px 44px -16px ${palette.glow}`,
          `0 12px 36px -16px ${palette.glow}`,
        ] },
        transition: { duration: 4, ease: 'easeInOut', repeat: Infinity },
      }

  return (
    <motion.section
      {...entry}
      {...breathing}
      className="v3-exam-panel v3-exam-locked"
      aria-label={`بوّابة اختبار الوحدة — مقفلة، ${line2}`}
      style={examPanelStyle(palette, 'locked')}
    >
      <MovementHeroNumeral roman={movement.roman} accent={palette.accent} theme={theme} />
      <div style={centerColumnStyle}>
        <PanelHeader movement={movement} palette={palette} g={g} />
        <Icon size={48} color={palette.accentLocked} strokeWidth={1.6} aria-hidden="true" />
        <p style={lockedHeadlineStyle}>{line1}</p>

        {/* Activity gate progress bar (only when subState === 'locked') */}
        {subState === 'locked' && (
          <div style={progressBarWrapStyle}>
            <div style={progressBarTrackStyle}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${ratio * 100}%` }}
                transition={reduce ? V3_MOTION.reducedMotionFallback : { duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                style={{ height: '100%', borderRadius: '999px', background: palette.accent, opacity: 0.7 }}
              />
            </div>
          </div>
        )}

        <p style={subtitleTextStyle}>{line2}</p>
      </div>
    </motion.section>
  )
}

function ReadyView({ movement, palette, examGate, entry, theme, reduce, onLaunch, g, gateText }) {
  const ringPulse = reduce
    ? {}
    : {
        animate: { boxShadow: [
          `0 12px 40px -14px ${palette.glow}, 0 0 0 0px ${palette.borderGold}`,
          `0 14px 48px -14px ${palette.glow}, 0 0 0 4px ${palette.borderGold}`,
          `0 12px 40px -14px ${palette.glow}, 0 0 0 0px ${palette.borderGold}`,
        ] },
        transition: { duration: 2.4, ease: 'easeInOut', repeat: Infinity },
      }

  const attemptHint = examGate.attemptNumber && examGate.maxAttempts
    ? `المحاولة ${examGate.attemptNumber} من ${examGate.maxAttempts}`
    : null

  const timeHint = examGate.timeLimitSeconds
    ? `${Math.round(examGate.timeLimitSeconds / 60)} دقيقة`
    : null

  const qHint = examGate.totalQuestions ? `${examGate.totalQuestions} سؤال` : null
  const subline = [qHint, timeHint, attemptHint].filter(Boolean).join(' · ')

  return (
    <motion.section
      {...entry}
      {...ringPulse}
      className="v3-exam-panel v3-exam-ready"
      aria-label="بوّابة اختبار الوحدة — جاهزة"
      style={examPanelStyle(palette, 'ready')}
    >
      <MovementHeroNumeral roman={movement.roman} accent={palette.accent} theme={theme} />
      <div style={centerColumnStyle}>
        <PanelHeader movement={movement} palette={palette} g={g} />
        <Sparkles size={52} color={palette.accent} strokeWidth={1.8} aria-hidden="true" />
        <p style={readyHeadlineStyle}>{gateText.readyMessageAr}</p>
        {subline && <p style={subtitleTextStyle}>{subline}</p>}
        <button
          type="button"
          onClick={onLaunch}
          data-v3-station-id="assessment"
          aria-label={g('ابدأ اختبار الوحدة', 'ابدئي اختبار الوحدة')}
          style={readyButtonStyle(palette)}
          onMouseEnter={(e) => { if (!reduce) { e.currentTarget.style.transform = 'translateY(-2px)' } }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {gateText.readyButtonAr}
        </button>
      </div>
    </motion.section>
  )
}

function PassedView({ movement, palette, examGate, entry, theme, onLaunch, g, gateText }) {
  const sub = examGate.subState
  const bestScore = examGate.bestScore != null ? Math.round(examGate.bestScore) : null

  let secondaryLine = ''
  if (sub === 'passed_cooling') secondaryLine = gateText.passedCoolingMessageAr
  else if (sub === 'retake_available') secondaryLine = gateText.retakeAvailableMessageAr
  // 'complete' → no secondary line (final state)

  return (
    <motion.section
      {...entry}
      className="v3-exam-panel v3-exam-passed"
      aria-label={`بوّابة اختبار الوحدة — مُجتازة بنتيجة ${bestScore ?? ''}`}
      style={examPanelStyle(palette, 'passed')}
    >
      <MovementHeroNumeral roman={movement.roman} accent={palette.accent} theme={theme} />

      {/* Stamped trophy seal — top-left in RTL (insetInlineStart='auto' + insetInlineEnd: 24 puts it correctly on either dir) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '20px',
          insetInlineEnd: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          transform: 'rotate(-8deg)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: palette.accent,
            border: `2px solid ${palette.borderGold}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 22px ${palette.glow}`,
          }}
        >
          <Trophy size={30} color="rgba(16, 10, 20, 0.95)" strokeWidth={2.2} />
        </div>
        <span style={{
          fontFamily: V3_TYPOGRAPHY.arabicHeadingFont,
          fontSize: '12px',
          fontWeight: 700,
          color: palette.accent,
          letterSpacing: '0.04em',
        }}>{V3_EXAM_GATE.passedMessageAr}</span>
      </div>

      <div style={{ ...centerColumnStyle, alignItems: 'flex-start', textAlign: 'start' }}>
        <PanelHeader movement={movement} palette={palette} g={g} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          {bestScore != null && (
            <span style={scoreBadgeStyle(palette)}>{bestScore}٪</span>
          )}
          {secondaryLine && (
            <span style={secondaryStyle}>{secondaryLine}</span>
          )}
        </div>

        {/* Review affordance: clicking the whole panel routes to the exam (review mode) */}
        <button
          type="button"
          onClick={onLaunch}
          data-v3-station-id="assessment"
          aria-label="مراجعة الاختبار"
          style={reviewLinkStyle(palette)}
        >
          <RefreshCw size={15} strokeWidth={2.2} />
          مراجعة الاختبار
        </button>
      </div>
    </motion.section>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

function examPanelStyle(palette, state) {
  return {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '24px',
    padding: '36px 28px 32px',
    minHeight: '240px',
    background: `linear-gradient(135deg, ${palette.gradientFrom}, ${palette.gradientTo})`,
    border: state === 'ready'
      ? `2px solid ${palette.borderGold}`
      : state === 'passed'
        ? `2px solid ${palette.accent}`
        : `1px solid ${palette.accentLocked}40`,
    boxShadow: `0 12px 36px -16px ${palette.glow}`,
  }
}

const centerColumnStyle = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: '12px',
  fontFamily: "'Tajawal', sans-serif",
  color: 'var(--ds-text-primary)',
}

const lockedHeadlineStyle = {
  margin: 0,
  fontFamily: "'Readex Pro', 'Tajawal', sans-serif",
  fontSize: '17px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.78)',
  lineHeight: 1.4,
  maxWidth: '480px',
}

const readyHeadlineStyle = {
  margin: 0,
  fontFamily: "'Readex Pro', 'Tajawal', sans-serif",
  fontSize: '22px',
  fontWeight: 700,
  color: '#ffffff',
  lineHeight: 1.3,
  maxWidth: '520px',
}

const subtitleTextStyle = {
  margin: 0,
  fontSize: '13.5px',
  color: 'rgba(255,255,255,0.62)',
  lineHeight: 1.5,
}

const progressBarWrapStyle = {
  width: '260px',
  marginTop: '4px',
  marginBottom: '2px',
}

const progressBarTrackStyle = {
  width: '100%',
  height: '6px',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.06)',
  overflow: 'hidden',
}

function readyButtonStyle(palette) {
  return {
    marginTop: '14px',
    width: 'min(320px, calc(100% - 32px))',
    minHeight: '56px',
    padding: '0 28px',
    borderRadius: '16px',
    border: 'none',
    background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accent}cc 100%)`,
    color: 'rgba(16, 10, 20, 0.95)',
    fontFamily: "'Readex Pro', 'Tajawal', sans-serif",
    fontSize: '17px',
    fontWeight: 700,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    boxShadow: `0 8px 32px ${palette.glow}`,
    transition: 'transform 180ms var(--ease-out, ease-out), box-shadow 180ms var(--ease-out, ease-out)',
  }
}

function scoreBadgeStyle(palette) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontVariantNumeric: 'tabular-nums',
    fontSize: '18px',
    fontWeight: 700,
    color: palette.accent,
    background: `${palette.accent}22`,
    border: `1px solid ${palette.borderGold}`,
    borderRadius: '999px',
    padding: '6px 14px',
    letterSpacing: '0.02em',
  }
}

const secondaryStyle = {
  fontFamily: "'Tajawal', sans-serif",
  fontSize: '13px',
  color: 'rgba(255,255,255,0.72)',
}

function reviewLinkStyle(palette) {
  return {
    marginTop: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${palette.borderGold}55`,
    color: palette.accent,
    borderRadius: '12px',
    padding: '8px 14px',
    fontFamily: "'Tajawal', sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 150ms var(--ease-out, ease-out)',
  }
}
