import { motion } from 'framer-motion'
import {
  BookOpen, Pencil, FileText, Headphones, Mic, Languages,
  ClipboardCheck, Speech, CheckCircle2,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   ProgressRing — SVG circular progress
   ═══════════════════════════════════════════════ */
export function ProgressRing({ percent = 0, size = 80, strokeWidth = 6, color = '#38bdf8', bgColor = 'rgba(255,255,255,0.08)', className = '' }) {
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
   ContentTypeIcons — 8 activity type indicators
   ═══════════════════════════════════════════════ */
const ACTIVITY_TYPES = [
  { key: 'reading', Icon: BookOpen, label: 'قراءة' },
  { key: 'grammar', Icon: Pencil, label: 'قواعد' },
  { key: 'writing', Icon: FileText, label: 'كتابة' },
  { key: 'listening', Icon: Headphones, label: 'استماع' },
  { key: 'speaking', Icon: Mic, label: 'محادثة' },
  { key: 'vocabulary', Icon: Languages, label: 'مفردات' },
  { key: 'assessment', Icon: ClipboardCheck, label: 'تقييم' },
  { key: 'pronunciation', Icon: Speech, label: 'نطق' },
]

export function ContentTypeIcons({ completedActivities, iconSize = 16, gap = 4, activeColor = '#4ade80', dimColor = 'rgba(255,255,255,0.2)' }) {
  if (!completedActivities) return null
  return (
    <div className="flex items-center flex-wrap" style={{ gap }}>
      {ACTIVITY_TYPES.map(({ key, Icon }) => {
        const done = completedActivities[key]
        return (
          <div
            key={key}
            className="relative rounded-full flex items-center justify-center"
            style={{ width: iconSize + 8, height: iconSize + 8, background: done ? `${activeColor}20` : `${dimColor}` }}
            title={key}
          >
            <Icon size={iconSize} style={{ color: done ? activeColor : 'rgba(255,255,255,0.35)' }} strokeWidth={2} />
            {done && (
              <CheckCircle2
                size={8}
                className="absolute -top-0.5 -right-0.5"
                style={{ color: activeColor }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   StatusChip — unit status badge
   ═══════════════════════════════════════════════ */
const STATUS_MAP = {
  not_started: { label: 'لم يبدأ', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', dot: '#6b7280' },
  in_progress: { label: 'قيد التعلّم', bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', dot: '#fbbf24' },
  completed:   { label: 'مكتملة', bg: 'rgba(74,222,128,0.12)', color: '#4ade80', dot: '#4ade80' },
}

export function StatusChip({ status = 'not_started', size = 'sm' }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.not_started
  const isSmall = size === 'sm'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{
        background: cfg.bg, color: cfg.color,
        padding: isSmall ? '2px 10px' : '4px 14px',
        fontSize: isSmall ? '11px' : '13px',
      }}
    >
      <span className="rounded-full" style={{ width: 6, height: 6, background: cfg.dot, ...(status === 'in_progress' ? { animation: 'pulse 2s infinite' } : {}) }} />
      {cfg.label}
    </span>
  )
}

/* ═══════════════════════════════════════════════
   AnimatedCounter — counts up from 0 to target
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
   LoadingSkeleton — shared loading state
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
      className="rounded-2xl border border-[var(--border-subtle)] p-14 flex flex-col items-center justify-center text-center"
      style={{ background: 'var(--surface-base)' }}
    >
      <div className="w-16 h-16 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center mb-5">
        <BookOpen size={28} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-lg font-semibold text-[var(--text-muted)] mb-1.5">المحتوى قيد التحضير</p>
      <p className="text-[var(--text-muted)] text-sm">سيكون جاهزاً قريباً إن شاء الله</p>
    </motion.div>
  )
}

/* Keyframes injection */
if (typeof document !== 'undefined' && !document.getElementById('shared-kf')) {
  const style = document.createElement('style')
  style.id = 'shared-kf'
  style.textContent = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`
  document.head.appendChild(style)
}
