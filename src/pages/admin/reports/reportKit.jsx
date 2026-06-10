// Shared kit for the admin reports hub: card frame, stat cards, chart frame,
// range picker, inline-SVG sparkline, hour×weekday heatmap, risk model + badge,
// trend arrow, CSV export, formatters.
// Typography rule: 12px floor everywhere; KPI numbers are the loudest thing.
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Eye, CheckCircle2, Hourglass,
  Users, Inbox,
} from 'lucide-react'

export const card = 'rounded-2xl bg-white/[0.03] border border-white/[0.06]'

export const TOOLTIP_BG = '#0c1526'

export const ACCENTS = {
  sky:     '#38bdf8',
  gold:    '#fbbf24',
  emerald: '#34d399',
  violet:  '#a78bfa',
  rose:    '#fb7185',
  slate:   '#94a3b8',
}

export const SECTION_AR = {
  reading: 'قراءة',
  listening: 'استماع',
  speaking: 'محادثة',
  writing: 'كتابة',
  grammar: 'قواعد',
  vocabulary: 'مفردات',
  vocabulary_exercise: 'تمارين مفردات',
  pronunciation: 'نطق',
  assessment: 'تقييم',
}

export const FEATURE_AR = {
  srs_reviews: 'المراجعة المتباعدة (SRS)',
  spelling_lab: 'مختبر الإملاء',
  library: 'المكتبة (قراءة بصوت)',
  speaking_conversation: 'محادثة مع المدرب الذكي',
  speaking_recording: 'تسجيلات التحدث',
  chat_messages: 'رسائل المحادثة',
  saved_words: 'كلمات محفوظة',
}

export const AI_TYPE_AR = {
  elevenlabs_audio: 'توليد الصوت (ElevenLabs)',
  speaking_analysis: 'تقييم التحدث',
  writing_feedback: 'تقييم الكتابة',
  whisper_transcription: 'تحويل الصوت لنص',
  chatbot: 'المساعد الذكي',
  weekly_tasks: 'المهام الأسبوعية',
  grammar_check: 'تدقيق القواعد',
  trainer_assistant: 'مساعد المدرب',
  bug_report_reply: 'ردود البلاغات',
  writing_assistant: 'مساعد الكتابة',
}

export function featureLabel(key) {
  if (FEATURE_AR[key]) return FEATURE_AR[key]
  if (key.startsWith('curriculum_')) return `المنهج — ${SECTION_AR[key.slice(11)] || key.slice(11)}`
  if (key.startsWith('game_')) return `لعبة — ${key.slice(5).replace(/_/g, ' ')}`
  return key
}

// ── formatters ──────────────────────────────────────────────────────────────
export const num = (n) => Number(n ?? 0).toLocaleString('en-US')

export function fmtMinutes(mins) {
  const m = Math.round(Number(mins) || 0)
  if (m < 60) return `${m} د`
  const h = Math.floor(m / 60)
  return `${h} س ${m % 60} د`
}

export function fmtSAR(v) {
  return `${Number(v ?? 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} ر.س`
}

export function relTimeAr(ts) {
  if (!ts) return 'لم يظهر بعد'
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'الآن'
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `قبل ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'أمس'
  if (days < 31) return `قبل ${days} يوم`
  const months = Math.floor(days / 30)
  return `قبل ${months} شهر`
}

export function shortDate(d) {
  const dt = new Date(d)
  return `${dt.getDate()}/${dt.getMonth() + 1}`
}

// ── risk model (client-side on purpose — thresholds get tuned weekly) ───────
export function computeRisk(s) {
  const reasons = []
  const inactive = s.days_inactive
  const declining =
    s.first_half_minutes >= 30 && s.second_half_minutes < s.first_half_minutes * 0.4

  if (s.status === 'paused') return { level: 'paused', reasons: ['الاشتراك موقوف'] }

  if (inactive == null) reasons.push('لم يدخل المنصة إطلاقًا')
  else if (inactive >= 5) reasons.push(`غائب منذ ${inactive} أيام`)

  if (declining) reasons.push(`نشاطه يتراجع (${Math.round(s.first_half_minutes)} د ← ${Math.round(s.second_half_minutes)} د)`)

  if (inactive == null || inactive >= 5) return { level: 'high', reasons }

  if (inactive >= 3) reasons.push(`آخر نشاط قبل ${inactive} أيام`)
  if ((s.current_streak ?? 0) === 0 && s.minutes > 0) reasons.push('فقد سلسلة الأيام')
  if (inactive >= 3 || declining) return { level: 'watch', reasons }
  if (reasons.length) return { level: 'watch', reasons }

  return { level: 'ok', reasons: ['نشِط ومنتظم'] }
}

export function expiringSoon(s) {
  if (!s.access_expires_at) return null
  const days = Math.ceil((new Date(s.access_expires_at).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return { label: 'انتهى اشتراكه', tone: 'rose' }
  if (days <= 7) return { label: `ينتهي خلال ${days} يوم`, tone: 'amber' }
  return null
}

const RISK_META = {
  high:   { label: 'يحتاج تدخّل', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30', Icon: AlertTriangle },
  watch:  { label: 'تحت المراقبة', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30', Icon: Eye },
  ok:     { label: 'بخير', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', Icon: CheckCircle2 },
  paused: { label: 'موقوف', cls: 'text-slate-300 bg-slate-500/10 border-slate-500/30', Icon: Hourglass },
}

// Tap-to-toggle (NOT hover-only): students are managed from an iPhone.
export function RiskBadge({ risk }) {
  const [open, setOpen] = useState(false)
  const meta = RISK_META[risk.level] || RISK_META.ok
  const { Icon } = meta
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[36px] rounded-full border text-xs font-semibold whitespace-nowrap ${meta.cls}`}
      >
        <Icon size={12} />
        {meta.label}
      </button>
      {open && (
        <span
          className="absolute bottom-full end-0 mb-2 z-30 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 p-3 text-xs leading-relaxed text-slate-200 shadow-2xl"
          style={{ background: TOOLTIP_BG }}
        >
          {risk.reasons.map((r, i) => (
            <span key={i} className="block">• {r}</span>
          ))}
        </span>
      )}
    </span>
  )
}

export function TrendArrow({ first, second }) {
  const f = Number(first) || 0
  const s = Number(second) || 0
  if (f < 5 && s < 5) return <Minus size={14} className="text-slate-500" />
  if (s >= f * 1.15) return <TrendingUp size={15} className="text-emerald-400" />
  if (s <= f * 0.6) return <TrendingDown size={15} className="text-rose-400" />
  return <Minus size={14} className="text-slate-400" />
}

// ── stat card: number speaks, label whispers ────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, color = ACCENTS.sky, delta, live, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: 'easeOut' }}
      className={`${card} p-4 relative overflow-hidden`}
    >
      <div
        className="absolute -top-12 -start-12 w-32 h-32 rounded-full opacity-[0.08] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
      />
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 relative"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={13} style={{ color }} />
          {live && (
            <span className="absolute -top-1 -end-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
          )}
        </span>
        <span className="text-xs text-slate-400 leading-tight">{label}</span>
      </div>
      <div className="text-[26px] leading-none font-extrabold text-slate-50 tracking-tight tabular-nums whitespace-nowrap" dir="auto">
        {value}
      </div>
      <div className="mt-1.5 min-h-[16px] flex items-center gap-2">
        {delta !== undefined && delta !== null && <DeltaChip delta={delta} />}
        {sub && <span className="text-xs text-slate-500 truncate">{sub}</span>}
      </div>
    </motion.div>
  )
}

export function DeltaChip({ delta }) {
  const d = Number(delta)
  if (!isFinite(d) || d === 0) return null
  const up = d > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}
      dir="ltr"
    >
      {up ? '▲' : '▼'} {Math.abs(Math.round(d))}%
    </span>
  )
}

export function pctDelta(cur, prev) {
  const c = Number(cur) || 0
  const p = Number(prev) || 0
  if (p === 0) return null
  return ((c - p) / p) * 100
}

// ── chart frame ─────────────────────────────────────────────────────────────
export function ChartCard({ title, subtitle, footnote, action, children, className = '' }) {
  return (
    <div className={`${card} p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[17px] leading-snug font-bold text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
      {footnote && <p className="text-xs text-slate-600 mt-3">{footnote}</p>}
    </div>
  )
}

// ── range picker (14/30/90 days) ────────────────────────────────────────────
export function RangePicker({ days, onChange }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
      {[14, 30, 90].map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`px-3.5 py-2.5 rounded-[10px] text-xs font-semibold transition-colors tabular-nums ${
            days === d ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25' : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          {d} يوم
        </button>
      ))}
    </div>
  )
}

// ── inline SVG sparkline ────────────────────────────────────────────────────
export function Sparkline({ data = [], width = 96, height = 26, color = ACCENTS.sky }) {
  const vals = data.map((v) => Number(v) || 0)
  const max = Math.max(...vals, 1)
  const stepX = width / Math.max(vals.length - 1, 1)
  const pts = vals.map((v, i) => `${(i * stepX).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`)
  const line = pts.join(' ')
  const area = `0,${height} ${line} ${width},${height}`
  const gid = `sp-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} dir="ltr" className="block" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ── hour × weekday heatmap (CSS grid; dow 0 = الأحد per postgres) ───────────
const DOW_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function HourHeatmap({ cells = [] }) {
  const map = new Map()
  let max = 1
  for (const c of cells) {
    map.set(`${c.dow}-${c.hour}`, c.count)
    if (c.count > max) max = c.count
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: '64px repeat(24, 1fr)' }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center text-xs text-slate-500 tabular-nums" dir="ltr">
              {h % 6 === 0 ? h : ''}
            </div>
          ))}
          {DOW_AR.map((day, dow) => (
            <DowRow key={dow} day={day} dow={dow} map={map} max={max} />
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-2.5 text-xs text-slate-500">
          أقل
          {[0.15, 0.4, 0.7, 1].map((o) => (
            <span key={o} className="w-3.5 h-3.5 rounded-[4px]" style={{ background: `rgba(251,191,36,${o * 0.75})` }} />
          ))}
          أكثر
        </div>
      </div>
    </div>
  )
}

function DowRow({ day, dow, map, max }) {
  return (
    <>
      <div className="text-xs text-slate-400 pe-2 flex items-center justify-end">{day}</div>
      {Array.from({ length: 24 }, (_, h) => {
        const v = map.get(`${dow}-${h}`) || 0
        const opacity = v === 0 ? 0 : 0.12 + (v / max) * 0.68
        return (
          <div
            key={h}
            title={`${day} ${h}:00 — ${v} نشاط`}
            className="aspect-square rounded-[3px] min-w-[10px]"
            style={{ background: v === 0 ? 'rgba(255,255,255,0.03)' : `rgba(251,191,36,${opacity})` }}
          />
        )
      })}
    </>
  )
}

// ── ranked horizontal bar list ──────────────────────────────────────────────
export function RankedBars({ items, color = ACCENTS.sky, valueLabel = (v) => num(v) }) {
  const max = Math.max(...items.map((i) => Number(i.value) || 0), 1)
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i}>
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-xs text-slate-300 truncate">{it.label}</span>
            <span className="text-xs text-slate-400 tabular-nums shrink-0 inline-flex items-center gap-1" dir="ltr">
              {valueLabel(it.value)}
              {it.users != null && (
                <span className="text-slate-600 inline-flex items-center gap-0.5">
                  · {num(it.users)} <Users size={10} />
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((it.value / max) * 100, 2)}%` }}
              transition={{ duration: 0.5, delay: i * 0.03, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${color}aa, ${color})` }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && <EmptyNote />}
    </div>
  )
}

export function EmptyNote({ text = 'لا توجد بيانات في هذه الفترة', icon: Icon = Inbox, tone = ACCENTS.slate }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2.5">
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: `${tone}14`, border: `1px solid ${tone}25` }}
      >
        <Icon size={16} style={{ color: tone }} />
      </span>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  )
}

// ── CSV export (BOM so Excel opens Arabic correctly) ────────────────────────
export function downloadStudentsCSV(students, days) {
  const headers = ['الاسم', 'المجموعة', 'المستوى', 'الباقة', 'الحالة', 'آخر نشاط', 'سلسلة الأيام', 'دقائق التعلم', 'أيام نشطة', 'أقسام مكتملة', 'متوسط الدرجات', 'كلمات أتقنها', 'XP', 'انتهاء الاشتراك']
  const rows = students.map((s) => [
    s.name, s.group_name || '', s.level ?? '', s.package || '', s.status || '',
    s.last_active_at ? new Date(s.last_active_at).toLocaleString('en-GB') : '',
    s.current_streak ?? 0, s.minutes ?? 0, s.active_days ?? 0, s.sections_completed ?? 0,
    s.avg_score ?? '', s.words_mastered ?? 0, s.xp_earned ?? 0,
    s.access_expires_at ? new Date(s.access_expires_at).toLocaleDateString('en-GB') : 'غير محدد',
  ])
  const csv = '﻿' + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `fluentia-students-${days}d-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── recharts shared bits ────────────────────────────────────────────────────
export const tooltipStyle = {
  background: TOOLTIP_BG,
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  fontFamily: 'Tajawal, sans-serif',
  direction: 'rtl',
}

export const axisTick = { fontSize: 11, fill: '#64748b' }

export function LoadingBlock({ rows = 3 }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${card} h-32`} />
      ))}
    </div>
  )
}
