import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Lock, Play, CheckCircle2, SkipForward,
  ChevronDown, ChevronUp, BookOpen, Languages, Target,
  Sparkles, Trophy, Star, Layers,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'

// ── Helpers ────────────────────────────────────────────────────────
function toArabicNum(n) {
  return String(n).replace(/\d/g, d => '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'[d])
}

const STATUS_CONFIG = {
  locked:      { icon: Lock,         label: 'مقفل',      color: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-base)]',  border: 'border-[var(--border-subtle)]' },
  in_progress: { icon: Play,         label: 'قيد التعلم', color: 'text-sky-400',             bg: 'bg-sky-500/10',             border: 'border-sky-500/25' },
  completed:   { icon: CheckCircle2, label: 'مكتمل',     color: 'text-emerald-400',          bg: 'bg-emerald-500/10',         border: 'border-emerald-500/25' },
  skipped:     { icon: SkipForward,  label: 'تم التخطي', color: 'text-amber-400',            bg: 'bg-amber-500/10',           border: 'border-amber-500/25' },
}

const LEVEL_COLORS = {
  1: { gradient: 'from-sky-500 to-cyan-400',      light: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/20' },
  2: { gradient: 'from-emerald-500 to-teal-400',  light: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  3: { gradient: 'from-violet-500 to-purple-400', light: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20' },
  4: { gradient: 'from-amber-500 to-orange-400',  light: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
  5: { gradient: 'from-rose-500 to-pink-400',     light: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20' },
}

// ── Progress Ring ──────────────────────────────────────────────────
function ProgressRing({ progress, size = 100, strokeWidth = 7 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#curriculumGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="curriculumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="text-xl font-bold text-[var(--text-primary)]"
        >
          {toArabicNum(Math.round(progress))}%
        </motion.span>
        <span className="text-[10px] text-[var(--text-muted)] mt-0.5">مكتمل</span>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────
export default function StudentCurriculum() {
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const currentLevel = studentData?.academic_level || 1
  const [selectedLevel, setSelectedLevel] = useState(currentLevel)
  const [expandedId, setExpandedId] = useState(null)

  const levelInfo = ACADEMIC_LEVELS[selectedLevel] || ACADEMIC_LEVELS[1]
  const levelColor = LEVEL_COLORS[selectedLevel] || LEVEL_COLORS[1]
  const isCurrentLevel = selectedLevel === currentLevel

  // Fetch curriculum units for selected level
  const { data: units, isLoading: loadingUnits } = useQuery({
    queryKey: ['curriculum-units', selectedLevel],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_units')
        .select('*')
        .eq('level', selectedLevel)
        .eq('is_active', true)
        .order('unit_number', { ascending: true })
      return data || []
    },
  })

  // Fetch student progress for all units
  const { data: progress, isLoading: loadingProgress } = useQuery({
    queryKey: ['curriculum-progress', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', profile?.id)
      return data || []
    },
    enabled: !!profile?.id,
  })

  const isLoading = loadingUnits || loadingProgress

  // Build progress map
  const progressMap = useMemo(() => {
    const map = {}
    if (progress) {
      for (const p of progress) {
        map[p.unit_id] = p
      }
    }
    return map
  }, [progress])

  // Compute stats for selected level
  const stats = useMemo(() => {
    if (!units || units.length === 0) return { completed: 0, total: 0, inProgress: 0, pct: 0 }
    const total = units.length
    let completed = 0
    let inProgress = 0
    for (const unit of units) {
      const p = progressMap[unit.id]
      if (p?.status === 'completed') completed++
      else if (p?.status === 'in_progress') inProgress++
    }
    return { completed, total, inProgress, pct: total > 0 ? (completed / total) * 100 : 0 }
  }, [units, progressMap])

  const allComplete = stats.completed === stats.total && stats.total > 0

  return (
    <div className="space-y-10 pb-8">
      {/* ── Hero Header ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)]"
        style={{ background: 'var(--hero-card-bg)' }}
      >
        {/* Decorative glows */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-sky-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-violet-500/[0.03] rounded-full blur-3xl" />

        <div className="relative p-6 sm:p-8">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
                <GraduationCap size={20} className="text-sky-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">مسار التعلم</h1>
                <p className="text-[var(--text-muted)] text-sm mt-0.5">تقدمك في المنهج الدراسي</p>
              </div>
            </div>

            {/* Current level badge */}
            {ACADEMIC_LEVELS[currentLevel] && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${LEVEL_COLORS[currentLevel]?.light} border ${LEVEL_COLORS[currentLevel]?.border}`}>
                <Star size={14} className={LEVEL_COLORS[currentLevel]?.text} />
                <span className={`text-sm font-semibold ${LEVEL_COLORS[currentLevel]?.text}`}>
                  {ACADEMIC_LEVELS[currentLevel].cefr}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {ACADEMIC_LEVELS[currentLevel].name_ar}
                </span>
              </div>
            )}
          </div>

          {/* Progress + Stats */}
          {!isLoading && units && units.length > 0 && isCurrentLevel && (
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <div className="shrink-0">
                <ProgressRing progress={stats.pct} />
              </div>

              <div className="flex-1 grid grid-cols-3 gap-3 w-full">
                {[
                  { label: 'مكتملة', value: `${toArabicNum(stats.completed)}/${toArabicNum(stats.total)}`, icon: CheckCircle2, gradient: 'from-emerald-500/15 to-teal-500/5', iconColor: 'text-emerald-400' },
                  { label: 'قيد التعلم', value: toArabicNum(stats.inProgress), icon: Play, gradient: 'from-sky-500/15 to-cyan-500/5', iconColor: 'text-sky-400' },
                  { label: 'الكتاب', value: levelInfo.book || '\u2014', icon: BookOpen, gradient: 'from-violet-500/15 to-purple-500/5', iconColor: 'text-violet-400', isSmall: true },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className={`rounded-xl bg-gradient-to-br ${stat.gradient} border border-[var(--border-subtle)] p-3.5`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <stat.icon size={14} className={stat.iconColor} />
                      <span className="text-xs text-[var(--text-muted)] font-medium">{stat.label}</span>
                    </div>
                    <p className={`${stat.isSmall ? 'text-sm' : 'text-lg'} font-bold text-[var(--text-primary)]`}>{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* All complete celebration */}
          {allComplete && isCurrentLevel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 p-3.5"
            >
              <Trophy size={20} className="text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300 font-medium">أحسنت! أكملت جميع وحدات هذا المستوى</p>
              <Sparkles size={16} className="text-amber-400 mr-auto shrink-0" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Level Tabs ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
      >
        {[1, 2, 3, 4, 5].map((lvl) => {
          const info = ACADEMIC_LEVELS[lvl]
          const lc = LEVEL_COLORS[lvl]
          const isActive = selectedLevel === lvl
          const isCurrent = currentLevel === lvl

          return (
            <button
              key={lvl}
              onClick={() => { setSelectedLevel(lvl); setExpandedId(null) }}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border ${
                isActive
                  ? `${lc.light} ${lc.border} ${lc.text}`
                  : 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              <Layers size={14} />
              <span className="font-bold">{info?.cefr}</span>
              <span className="hidden sm:inline">{info?.name_ar}</span>
              {isCurrent && (
                <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${lc.gradient} shrink-0`} />
              )}
            </button>
          )
        })}
      </motion.div>

      {/* ── Level Info Bar ────────────────────────────────────────── */}
      <motion.div
        key={selectedLevel}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl ${levelColor.light} border ${levelColor.border}`}
      >
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${levelColor.gradient} flex items-center justify-center`}>
          <GraduationCap size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${levelColor.text}`}>{levelInfo.cefr} — {levelInfo.name_ar}</p>
          <p className="text-xs text-[var(--text-muted)]">{levelInfo.name_en} — {levelInfo.book}</p>
        </div>
        {!isCurrentLevel && selectedLevel > currentLevel && (
          <span className="text-xs text-[var(--text-muted)] px-2.5 py-1 rounded-lg bg-[var(--surface-base)] border border-[var(--border-subtle)] flex items-center gap-1">
            <Lock size={12} /> لم يفتح بعد
          </span>
        )}
        {!isCurrentLevel && selectedLevel < currentLevel && (
          <span className="text-xs text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 size={12} /> مكتمل
          </span>
        )}
      </motion.div>

      {/* ── Overall Progress Bar (non-current levels) ─────────── */}
      {!isLoading && units && units.length > 0 && !isCurrentLevel && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-[var(--border-subtle)] p-5"
          style={{ background: 'var(--surface-base)' }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm text-[var(--text-primary)] font-medium">تقدم المستوى</span>
            <span className={`text-sm font-bold ${levelColor.text}`}>
              {toArabicNum(stats.completed)}/{toArabicNum(stats.total)}
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${levelColor.gradient}`}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {toArabicNum(Math.round(stats.pct))}% من المستوى مكتمل
          </p>
        </motion.div>
      )}

      {/* ── Loading State ────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 skeleton rounded-xl" style={{ background: 'var(--surface-base)' }} />
          ))}
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────── */}
      {!isLoading && (!units || units.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-[var(--border-subtle)] p-14 flex flex-col items-center justify-center text-center"
          style={{ background: 'var(--surface-base)' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center mb-5">
            <BookOpen size={28} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-lg font-semibold text-[var(--text-muted)] mb-1.5">لا توجد وحدات</p>
          <p className="text-[var(--text-muted)] text-sm max-w-xs">
            لم يتم إضافة وحدات لهذا المستوى بعد
          </p>
        </motion.div>
      )}

      {/* ── Learning Path Timeline ───────────────────────────────── */}
      {!isLoading && units && units.length > 0 && (
        <div className="relative">
          {/* Vertical connecting line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 rounded-full"
            style={{
              right: '23px',
              background: 'linear-gradient(to bottom, var(--border-subtle), transparent)',
            }}
          />

          <div className="space-y-5">
            {units.map((unit, idx) => {
              const unitProgress = progressMap[unit.id]
              const status = unitProgress?.status || 'locked'
              const statusCfg = STATUS_CONFIG[status]
              const StatusIcon = statusCfg.icon
              const isExpanded = expandedId === unit.id
              const isActive = status === 'in_progress'
              const masteryScore = unitProgress?.mastery_score
              const objectives = unit.learning_objectives || []
              const grammar = unit.grammar_topics || []
              const vocabulary = unit.vocabulary_themes || []

              return (
                <motion.div
                  key={unit.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + idx * 0.06 }}
                  className="relative pr-14"
                >
                  {/* Timeline node */}
                  <div className="absolute right-0 top-5 z-10">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isActive
                        ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]'
                        : status === 'completed'
                          ? 'bg-emerald-500/20 border-emerald-400'
                          : status === 'skipped'
                            ? 'bg-amber-500/20 border-amber-400'
                            : 'bg-[var(--surface-base)] border-[var(--border-subtle)]'
                    }`}>
                      <StatusIcon size={18} className={statusCfg.color} />
                    </div>
                    {/* Active pulse animation */}
                    {isActive && (
                      <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-sky-400/40 animate-ping" />
                    )}
                  </div>

                  {/* Unit Card */}
                  <motion.div
                    layout
                    className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                      isActive
                        ? 'border-sky-500/30 shadow-[0_0_30px_rgba(56,189,248,0.08)]'
                        : status === 'completed'
                          ? 'border-emerald-500/20'
                          : 'border-[var(--border-subtle)]'
                    } ${status === 'locked' ? 'opacity-50' : ''}`}
                    style={{ background: 'var(--surface-base)' }}
                  >
                    {/* Top accent bar */}
                    {isActive && (
                      <div className={`h-0.5 bg-gradient-to-r ${levelColor.gradient}`} />
                    )}
                    {status === 'completed' && (
                      <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
                    )}

                    {/* Card Header (clickable) */}
                    <button
                      onClick={() => status !== 'locked' && setExpandedId(isExpanded ? null : unit.id)}
                      disabled={status === 'locked'}
                      className="w-full text-right p-5 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        {/* Unit number + CEFR + duration */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2.5 py-0.5 rounded-md font-medium ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border}`}>
                            الوحدة {toArabicNum(unit.unit_number)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                          {unit.cefr && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                              {unit.cefr}
                            </span>
                          )}
                          {unit.estimated_weeks && (
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {toArabicNum(unit.estimated_weeks)} أسابيع
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className={`font-semibold text-base mb-0.5 ${status === 'locked' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                          {unit.title_ar || unit.title_en}
                        </h3>
                        {unit.title_en && unit.title_ar && (
                          <p className="text-xs text-[var(--text-muted)]" dir="ltr">{unit.title_en}</p>
                        )}

                        {/* Short description preview */}
                        {unit.description_ar && !isExpanded && (
                          <p className="text-sm text-[var(--text-muted)] mt-1.5 line-clamp-2 leading-relaxed">{unit.description_ar}</p>
                        )}

                        {/* Mastery score bar (inline) */}
                        {masteryScore != null && (
                          <div className="flex items-center gap-2 mt-2.5">
                            <div className="flex-1 max-w-[180px] h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${masteryScore}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 + idx * 0.06 }}
                                className={`h-full rounded-full ${
                                  masteryScore >= 80 ? 'bg-emerald-500' : masteryScore >= 50 ? 'bg-sky-500' : 'bg-amber-500'
                                }`}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${
                              masteryScore >= 80 ? 'text-emerald-400' : masteryScore >= 50 ? 'text-sky-400' : 'text-amber-400'
                            }`}>
                              {toArabicNum(Math.round(masteryScore))}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Expand chevron */}
                      {status !== 'locked' && (
                        <div className="shrink-0 mt-1">
                          {isExpanded
                            ? <ChevronUp size={18} className="text-[var(--text-muted)]" />
                            : <ChevronDown size={18} className="text-[var(--text-muted)]" />
                          }
                        </div>
                      )}
                    </button>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 space-y-4 border-t border-[var(--border-subtle)] pt-4">
                            {/* Full description */}
                            {unit.description_ar && (
                              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{unit.description_ar}</p>
                            )}

                            {/* Learning Objectives */}
                            {objectives.length > 0 && (
                              <div className="rounded-xl bg-sky-500/5 border border-sky-500/10 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Target size={14} className="text-sky-400" />
                                  <p className="text-xs text-sky-400 font-semibold">أهداف التعلم</p>
                                </div>
                                <ul className="space-y-2">
                                  {objectives.map((obj, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                                      <span>{obj}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Grammar + Vocabulary side by side */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {grammar.length > 0 && (
                                <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Languages size={14} className="text-violet-400" />
                                    <p className="text-xs text-violet-400 font-semibold">القواعد</p>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {grammar.map((topic, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/15"
                                      >
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {vocabulary.length > 0 && (
                                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <BookOpen size={14} className="text-emerald-400" />
                                    <p className="text-xs text-emerald-400 font-semibold">المفردات</p>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {vocabulary.map((theme, i) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/15"
                                      >
                                        {theme}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Mastery Score Detail */}
                            {masteryScore != null && (
                              <div className={`rounded-xl p-4 border ${
                                masteryScore >= 80
                                  ? 'bg-emerald-500/5 border-emerald-500/10'
                                  : masteryScore >= 50
                                    ? 'bg-sky-500/5 border-sky-500/10'
                                    : 'bg-amber-500/5 border-amber-500/10'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Trophy size={14} className={
                                      masteryScore >= 80 ? 'text-emerald-400' : masteryScore >= 50 ? 'text-sky-400' : 'text-amber-400'
                                    } />
                                    <span className="text-xs font-semibold text-[var(--text-muted)]">درجة الإتقان</span>
                                  </div>
                                  <span className={`text-lg font-bold ${
                                    masteryScore >= 80 ? 'text-emerald-400' : masteryScore >= 50 ? 'text-sky-400' : 'text-amber-400'
                                  }`}>
                                    {toArabicNum(Math.round(masteryScore))}%
                                  </span>
                                </div>
                                <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${masteryScore}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className={`h-full rounded-full ${
                                      masteryScore >= 80 ? 'bg-emerald-500' : masteryScore >= 50 ? 'bg-sky-500' : 'bg-amber-500'
                                    }`}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Dates */}
                            {unitProgress?.started_at && (
                              <p className="text-xs text-[var(--text-muted)] text-center">
                                بدأت في {new Date(unitProgress.started_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                                {unitProgress.completed_at && (
                                  <> — اكتمل في {new Date(unitProgress.completed_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}</>
                                )}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
