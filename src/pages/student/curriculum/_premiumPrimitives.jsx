import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useEffect, useState } from 'react'
import {
  BookOpen, PenLine, FileText, Headphones, Mic, Languages,
  ClipboardCheck, Volume2,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   CINEMATIC_TOKENS — CSS variable references
   ═══════════════════════════════════════════════ */
export const CINEMATIC_TOKENS = {
  bg: 'var(--cinematic-bg)',
  bgLayer: 'var(--cinematic-bg-layer)',
  bgElevated: 'var(--cinematic-bg-elevated)',
  accentCyan: 'var(--cinematic-accent-cyan)',
  accentCyanSoft: 'var(--cinematic-accent-cyan-soft)',
  accentCyanStrong: 'var(--cinematic-accent-cyan-strong)',
  accentGold: 'var(--cinematic-accent-gold)',
  accentGoldSoft: 'var(--cinematic-accent-gold-soft)',
  accentGoldStrong: 'var(--cinematic-accent-gold-strong)',
  textPrimary: 'var(--cinematic-text-primary)',
  textSecondary: 'var(--cinematic-text-secondary)',
  textDim: 'var(--cinematic-text-dim)',
  textFaint: 'var(--cinematic-text-faint)',
  border: 'var(--cinematic-border)',
  borderHover: 'var(--cinematic-border-hover)',
  overlay: 'var(--cinematic-overlay)',
  overlaySoft: 'var(--cinematic-overlay-soft)',

  goldGradient: 'var(--cinematic-gold-gradient)',
  shine: 'var(--cinematic-shine)',
  glowGold: 'var(--cinematic-glow-gold)',
  glowCyan: 'var(--cinematic-glow-cyan)',
  shadowCard: 'var(--cinematic-shadow-card)',
  shadowHover: 'var(--cinematic-shadow-hover)',

  type: {
    massive: 'var(--cinematic-heading-massive)',
    xl: 'var(--cinematic-heading-xl)',
    lg: 'var(--cinematic-heading-lg)',
    md: 'var(--cinematic-heading-md)',
    sm: 'var(--cinematic-heading-sm)',
    bodyLg: 'var(--cinematic-body-lg)',
    body: 'var(--cinematic-body)',
    bodySm: 'var(--cinematic-body-sm)',
    bodyXs: 'var(--cinematic-body-xs)',
    bgType: 'var(--cinematic-bg-typography)',
  },
  leading: {
    tight: 'var(--cinematic-leading-tight)',
    normal: 'var(--cinematic-leading-normal)',
    relaxed: 'var(--cinematic-leading-relaxed)',
  },
  duration: {
    fast: 'var(--cinematic-duration-fast)',
    medium: 'var(--cinematic-duration-medium)',
    slow: 'var(--cinematic-duration-slow)',
    ambient: 'var(--cinematic-duration-ambient)',
  },

  filmGrainOpacity: 'var(--cinematic-film-grain-opacity)',
}

/* ═══════════════════════════════════════════════
   useCinematicMotion — respects OS + a11y reduce-motion
   ═══════════════════════════════════════════════ */
export function useCinematicMotion() {
  const prefersReduced = useReducedMotion()
  const [a11yReduce, setA11yReduce] = useState(false)

  useEffect(() => {
    const check = () => setA11yReduce(document.documentElement.classList.contains('a11y-reduce-motion'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const reduced = prefersReduced || a11yReduce

  return useMemo(() => ({
    reduced,
    fadeUp: reduced
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
    heroEntry: reduced
      ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
    staggerParent: reduced
      ? { animate: { transition: { staggerChildren: 0 } } }
      : { animate: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } },
    hoverScale: reduced ? 1 : 1.02,
    hoverLift: reduced ? 0 : -4,
    ringSpin: reduced
      ? { initial: { pathLength: 1 }, animate: { pathLength: 1 }, transition: { duration: 0 } }
      : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 1.2, ease: 'easeOut' } },
    counter: reduced ? { duration: 0 } : { duration: 1200 },
    ambientDrift: reduced ? { duration: 0 } : { duration: 60 },
  }), [reduced])
}

/* ═══════════════════════════════════════════════
   ProgressRing — SVG circular progress
   ═══════════════════════════════════════════════ */
export function ProgressRing({ percent = 0, size = 80, strokeWidth = 6, color = 'var(--cinematic-accent-cyan)', bgColor = 'var(--cinematic-border)', className = '' }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ

  return (
    <svg width={size} height={size} className={className} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  )
}

/* ═══════════════════════════════════════════════
   DEFAULT_ACTIVITY_TYPES — data-driven catalog
   ═══════════════════════════════════════════════ */
export const DEFAULT_ACTIVITY_TYPES = [
  { key: 'reading',       icon: BookOpen,       label: 'قراءة' },
  { key: 'grammar',       icon: PenLine,        label: 'قواعد' },
  { key: 'writing',       icon: FileText,       label: 'كتابة' },
  { key: 'listening',     icon: Headphones,     label: 'استماع' },
  { key: 'speaking',      icon: Mic,            label: 'محادثة' },
  { key: 'vocabulary',    icon: Languages,      label: 'مفردات' },
  { key: 'assessment',    icon: ClipboardCheck, label: 'تقييم' },
  { key: 'pronunciation', icon: Volume2,        label: 'نطق' },
  // Reserved for future:
  // { key: 'anki_srs',      icon: Brain,          label: 'مراجعة ذكية' },
  // { key: 'hard_words',    icon: Target,         label: 'كلمات صعبة' },
  // { key: 'chunks_quiz',   icon: Shuffle,        label: 'عبارات' },
]

/* ═══════════════════════════════════════════════
   ContentTypeIcons — data-driven activity indicators
   ═══════════════════════════════════════════════ */
export function ContentTypeIcons({
  activitiesComplete = {},
  types = DEFAULT_ACTIVITY_TYPES,
  iconSize = 14,
}) {
  return (
    <div
      role="list"
      aria-label="أنشطة الوحدة"
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}
    >
      {types.map(({ key, icon: Icon, label }) => {
        const complete = activitiesComplete?.[key] === true
        return (
          <div
            key={key}
            role="listitem"
            aria-label={`${label}${complete ? ' — مكتمل' : ''}`}
            title={label}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: complete
                ? 'var(--cinematic-accent-gold-soft)'
                : 'var(--cinematic-bg-elevated)',
              border: `1px solid ${complete ? 'var(--cinematic-accent-gold-strong)' : 'var(--cinematic-border)'}`,
              color: complete ? 'var(--cinematic-accent-gold)' : 'var(--cinematic-text-faint)',
              transition: 'all var(--cinematic-duration-fast) ease',
            }}
          >
            <Icon size={iconSize} strokeWidth={complete ? 2.5 : 2} />
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   StatusChip — unit status badge (tokenized)
   ═══════════════════════════════════════════════ */
const STATUS_MAP = {
  not_started: {
    label: 'لم يبدأ',
    bg: 'var(--cinematic-bg-elevated)',
    color: 'var(--cinematic-text-faint)',
    dot: 'var(--cinematic-text-faint)',
    border: 'var(--cinematic-border)',
  },
  in_progress: {
    label: 'قيد التعلّم',
    bg: 'var(--cinematic-accent-cyan-soft)',
    color: 'var(--cinematic-accent-cyan)',
    dot: 'var(--cinematic-accent-cyan)',
    border: 'var(--cinematic-accent-cyan-strong)',
    pulse: true,
  },
  completed: {
    label: 'مكتملة',
    bg: 'var(--cinematic-accent-gold-soft)',
    color: 'var(--cinematic-accent-gold)',
    dot: 'var(--cinematic-accent-gold)',
    border: 'var(--cinematic-accent-gold-strong)',
  },
}

export function StatusChip({ status = 'not_started', size = 'sm' }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.not_started
  const isSmall = size === 'sm'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{
        background: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.border}`,
        padding: isSmall ? '2px 10px' : '4px 14px',
        fontSize: isSmall ? CINEMATIC_TOKENS.type.bodyXs : CINEMATIC_TOKENS.type.bodySm,
      }}
    >
      <span className="rounded-full" style={{ width: 6, height: 6, background: cfg.dot, ...(cfg.pulse ? { animation: 'pulse 2s infinite' } : {}) }} />
      {cfg.label}
    </span>
  )
}

/* ═══════════════════════════════════════════════
   AnimatedCounter
   ═══════════════════════════════════════════════ */
export function AnimatedCounter({ value, duration = 1, className = '', suffix = '' }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        initial={{ '--num': 0 }}
        animate={{ '--num': value }}
        transition={{ duration, ease: 'easeOut', delay: 0.2 }}
        style={{ counterReset: `num var(--num)` }}
      >
        {value}{suffix}
      </motion.span>
    </motion.span>
  )
}

/* ═══════════════════════════════════════════════
   getUnitStatus helper
   ═══════════════════════════════════════════════ */
export function getUnitStatus(progressMap, unitId) {
  const p = progressMap?.[unitId]
  const overall = p?.overall || 0
  return {
    status: overall === 100 ? 'completed' : overall > 0 ? 'in_progress' : 'not_started',
    percent: overall,
    completedCount: p?.completedCount || 0,
    activeCount: p?.activeCount || 0,
  }
}

/* ═══════════════════════════════════════════════
   LoadingSkeleton
   ═══════════════════════════════════════════════ */
export function LoadingSkeleton() {
  return (
    <div className="space-y-8 p-6">
      <div className="h-10 w-48 skeleton rounded-xl" />
      <div className="h-6 w-80 skeleton rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-64 skeleton rounded-2xl" style={{ background: 'var(--surface-base)' }} />
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   EmptyState
   ═══════════════════════════════════════════════ */
export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-14 flex flex-col items-center justify-center text-center"
      style={{ background: CINEMATIC_TOKENS.bgLayer, border: `1px solid ${CINEMATIC_TOKENS.border}` }}
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: CINEMATIC_TOKENS.bgElevated }}>
        <BookOpen size={28} style={{ color: CINEMATIC_TOKENS.textDim }} />
      </div>
      <p className="text-lg font-semibold mb-1.5" style={{ color: CINEMATIC_TOKENS.textDim }}>المحتوى قيد التحضير</p>
      <p className="text-sm" style={{ color: CINEMATIC_TOKENS.textFaint }}>سيكون جاهزاً قريباً إن شاء الله</p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   CinematicBg — V1 ambient background layer
   ═══════════════════════════════════════════════ */
export function CinematicBg({ coverUrl }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
      <div style={{ position: 'absolute', inset: 0, background: CINEMATIC_TOKENS.bg }} />
      {coverUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.35) saturate(1.3)', transform: 'scale(1.1)',
          willChange: 'transform',
        }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, transparent 0%, ${CINEMATIC_TOKENS.overlaySoft} 50%, ${CINEMATIC_TOKENS.overlay} 100%)` }} />
      {/* Film grain */}
      <div style={{ position: 'absolute', inset: 0, opacity: CINEMATIC_TOKENS.filmGrainOpacity, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      {/* Cinematic lines */}
      <div style={{ position: 'absolute', top: '20%', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${CINEMATIC_TOKENS.accentGoldSoft}, transparent)` }} />
      <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${CINEMATIC_TOKENS.accentCyanSoft}, transparent)` }} />
    </div>
  )
}

/* Keyframes injection */
if (typeof document !== 'undefined' && !document.getElementById('shared-kf')) {
  const style = document.createElement('style')
  style.id = 'shared-kf'
  style.textContent = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`
  document.head.appendChild(style)
}
