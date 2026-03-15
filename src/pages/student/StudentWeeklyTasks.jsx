import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, ChevronRight, ChevronLeft, Mic, BookOpen, PenLine,
  Headphones, RefreshCw, CheckCircle2, Zap, Flame, Star, Clock,
  ClipboardList, Trophy, BookType, Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

// ── Task type configuration ────────────────────────────────────────
const TASK_TYPE_CONFIG = {
  speaking:        { icon: Mic,        label: 'تحدث',        labelEn: 'Speaking',    gradient: 'from-sky-500 to-cyan-400',     bg: 'bg-sky-500/[0.08]',     border: 'border-sky-500/15',    text: 'text-sky-400',    ring: 'ring-sky-500/20',    dot: 'bg-sky-400' },
  reading:         { icon: BookOpen,   label: 'قراءة',       labelEn: 'Reading',     gradient: 'from-emerald-500 to-teal-400', bg: 'bg-emerald-500/[0.08]', border: 'border-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/20', dot: 'bg-emerald-400' },
  writing:         { icon: PenLine,    label: 'كتابة',       labelEn: 'Writing',     gradient: 'from-violet-500 to-purple-400', bg: 'bg-violet-500/[0.08]', border: 'border-violet-500/15', text: 'text-violet-400', ring: 'ring-violet-500/20', dot: 'bg-violet-400' },
  listening:       { icon: Headphones, label: 'استماع',      labelEn: 'Listening',   gradient: 'from-amber-500 to-orange-400', bg: 'bg-amber-500/[0.08]',  border: 'border-amber-500/15',  text: 'text-amber-400',  ring: 'ring-amber-500/20',  dot: 'bg-amber-400' },
  irregular_verbs: { icon: RefreshCw,  label: 'أفعال شاذة',  labelEn: 'Verbs',       gradient: 'from-rose-500 to-pink-400',    bg: 'bg-rose-500/[0.08]',   border: 'border-rose-500/15',   text: 'text-rose-400',   ring: 'ring-rose-500/20',   dot: 'bg-rose-400' },
  vocabulary:      { icon: BookType,   label: 'مفردات',      labelEn: 'Vocabulary',  gradient: 'from-indigo-500 to-blue-400',  bg: 'bg-indigo-500/[0.08]', border: 'border-indigo-500/15', text: 'text-indigo-400', ring: 'ring-indigo-500/20', dot: 'bg-indigo-400' },
}

const STATUS_CONFIG = {
  pending:             { label: 'قيد الانتظار', class: 'bg-white/5 text-white/50 border border-white/10' },
  submitted:           { label: 'تم التسليم',   class: 'bg-sky-500/10 text-sky-400 border border-sky-500/20' },
  graded:              { label: 'تم التقييم',   class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  resubmit_requested:  { label: 'أعد التسليم',  class: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  skipped:             { label: 'تم التخطي',    class: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

// ── Helpers ────────────────────────────────────────────────────────
function getSunday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function addWeeks(date, weeks) {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function formatISODate(date) {
  return date.toISOString().split('T')[0]
}

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

function toArabicNum(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])
}

function formatWeekRange(sunday) {
  const saturday = new Date(sunday)
  saturday.setDate(saturday.getDate() + 6)
  const startDay = toArabicNum(sunday.getDate())
  const endDay = toArabicNum(saturday.getDate())
  const month = AR_MONTHS[saturday.getMonth()]
  return `${startDay} – ${endDay} ${month}`
}

function getDeadlineInfo(deadline) {
  if (!deadline) return { text: 'بدون موعد', urgent: false }
  const diff = new Date(deadline) - new Date()
  if (diff <= 0) return { text: 'انتهى الموعد', urgent: true }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 1) return { text: `${toArabicNum(days)} يوم`, urgent: false }
  if (days === 1) return { text: 'يوم واحد', urgent: true }
  return { text: `${toArabicNum(hours)} ساعة`, urgent: true }
}

// ── Progress Ring SVG ──────────────────────────────────────────────
function ProgressRing({ progress, size = 120, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="text-2xl font-bold text-white"
        >
          {toArabicNum(Math.round(progress))}%
        </motion.span>
        <span className="text-xs text-white/40 mt-0.5">مكتمل</span>
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────
export default function StudentWeeklyTasks() {
  const { profile, studentData } = useAuthStore()
  const [weekOffset, setWeekOffset] = useState(0)

  const currentSunday = useMemo(() => getSunday(new Date()), [])
  const weekSunday = useMemo(() => addWeeks(currentSunday, weekOffset), [currentSunday, weekOffset])
  const weekStart = formatISODate(weekSunday)

  const { data: taskSet, isLoading: loadingSet } = useQuery({
    queryKey: ['weekly-task-set', weekStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_task_sets')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('week_start', weekStart)
        .single()
      return data
    },
    enabled: !!profile?.id,
  })

  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['weekly-tasks', taskSet?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_tasks')
        .select('*')
        .eq('task_set_id', taskSet.id)
        .is('deleted_at', null)
        .order('type', { ascending: true })
        .order('sequence_number', { ascending: true })
      return data || []
    },
    enabled: !!taskSet?.id,
  })

  const isLoading = loadingSet || loadingTasks
  const isCurrentWeek = weekOffset === 0

  // ── Computed stats ───────────────────────────────────────────────
  const completedCount = (tasks || []).filter(t => t.status === 'graded' || t.status === 'submitted').length
  const totalCount = (tasks || []).length
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const xpEarned = (tasks || []).reduce((sum, t) => sum + (t.xp_awarded || 0), 0)
  const bestScore = (tasks || []).reduce((best, t) => Math.max(best, t.auto_score || 0), 0)
  const streak = studentData?.current_streak || 0
  const allComplete = completedCount === totalCount && totalCount > 0

  // Group tasks by type
  const tasksByType = useMemo(() => {
    if (!tasks) return {}
    const groups = {}
    for (const task of tasks) {
      if (!groups[task.type]) groups[task.type] = []
      groups[task.type].push(task)
    }
    return groups
  }, [tasks])

  const typeOrder = ['speaking', 'reading', 'writing', 'listening', 'irregular_verbs', 'vocabulary']

  return (
    <div className="space-y-10 pb-8">
      {/* ── Hero: Week Navigation + Progress ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.06]"
        style={{ background: 'linear-gradient(135deg, rgba(14,25,50,0.9) 0%, rgba(6,14,28,0.95) 100%)' }}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-sky-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-violet-500/[0.03] rounded-full blur-3xl" />

        <div className="relative p-6 sm:p-8">
          {/* Top row: title + week nav */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
                <CalendarDays size={20} className="text-sky-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">مهامي الأسبوعية</h1>
                <p className="text-white/40 text-sm mt-0.5">{formatWeekRange(weekSunday)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset(o => o + 1)}
                className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-all"
              >
                <ChevronRight size={16} className="text-white/60" />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 text-xs font-medium border border-sky-500/15 hover:bg-sky-500/15 transition-all"
                >
                  هذا الأسبوع
                </button>
              )}
              <button
                onClick={() => setWeekOffset(o => o - 1)}
                disabled={weekOffset <= 0}
                className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-all disabled:opacity-30"
              >
                <ChevronLeft size={16} className="text-white/60" />
              </button>
            </div>
          </div>

          {/* Progress + Stats row */}
          {tasks && tasks.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              {/* Progress Ring */}
              <div className="shrink-0">
                <ProgressRing progress={progressPct} />
              </div>

              {/* Stat Pills */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                {[
                  { label: 'مكتملة', value: `${toArabicNum(completedCount)}/${toArabicNum(totalCount)}`, icon: CheckCircle2, gradient: 'from-sky-500/15 to-cyan-500/5', iconColor: 'text-sky-400' },
                  { label: 'XP', value: toArabicNum(xpEarned), icon: Zap, gradient: 'from-amber-500/15 to-yellow-500/5', iconColor: 'text-amber-400' },
                  { label: 'السلسلة', value: `${toArabicNum(streak)} يوم`, icon: Flame, gradient: 'from-orange-500/15 to-red-500/5', iconColor: 'text-orange-400' },
                  { label: 'أعلى درجة', value: bestScore > 0 ? `${toArabicNum(bestScore)}%` : '—', icon: Star, gradient: 'from-violet-500/15 to-purple-500/5', iconColor: 'text-violet-400' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className={`rounded-xl bg-gradient-to-br ${stat.gradient} border border-white/[0.04] p-3.5`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <stat.icon size={14} className={stat.iconColor} />
                      <span className="text-xs text-white/35 font-medium">{stat.label}</span>
                    </div>
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Celebration banner */}
          {allComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 p-3.5"
            >
              <Trophy size={20} className="text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300 font-medium">أحسنت! أكملت جميع مهام الأسبوع</p>
              <Sparkles size={16} className="text-amber-400 mr-auto shrink-0" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Loading State ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────── */}
      {!isLoading && (!tasks || tasks.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/[0.06] p-14 flex flex-col items-center justify-center text-center"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-5">
            <ClipboardList size={28} className="text-white/20" />
          </div>
          <p className="text-lg font-semibold text-white/70 mb-1.5">لا توجد مهام</p>
          <p className="text-white/30 text-sm max-w-xs">
            {isCurrentWeek
              ? 'لم يتم إنشاء مهام هذا الأسبوع بعد. ستتوفر قريبًا!'
              : 'لا توجد مهام لهذا الأسبوع'}
          </p>
        </motion.div>
      )}

      {/* ── Tasks Grouped by Type ─────────────────────────────────── */}
      {!isLoading && tasks && tasks.length > 0 && (
        <div className="space-y-8">
          {typeOrder.map((type, groupIdx) => {
            const groupTasks = tasksByType[type]
            if (!groupTasks || groupTasks.length === 0) return null
            const config = TASK_TYPE_CONFIG[type] || TASK_TYPE_CONFIG.speaking
            const Icon = config.icon
            const groupDone = groupTasks.filter(t => t.status === 'graded' || t.status === 'submitted').length
            const groupTotal = groupTasks.length

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + groupIdx * 0.08 }}
              >
                {/* Group header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                    <Icon size={15} className="text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-white/80">{config.label}</h2>
                  <span className="text-xs text-white/30 font-medium">
                    {toArabicNum(groupDone)}/{toArabicNum(groupTotal)}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.04] mr-2" />
                </div>

                {/* Task cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupTasks.map((task, i) => {
                    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
                    const isDone = task.status === 'submitted' || task.status === 'graded'
                    const deadlineInfo = getDeadlineInfo(task.deadline)

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + groupIdx * 0.08 + i * 0.04 }}
                      >
                        <Link
                          to={`/student/weekly-tasks/${task.id}`}
                          className={`group block rounded-xl border ${config.border} hover:border-white/[0.12] transition-all duration-200 hover:translate-y-[-2px] overflow-hidden`}
                          style={{ background: 'rgba(255,255,255,0.02)' }}
                        >
                          {/* Top accent bar */}
                          <div className={`h-0.5 bg-gradient-to-r ${config.gradient} ${isDone ? 'opacity-60' : 'opacity-30 group-hover:opacity-60'} transition-opacity`} />

                          <div className="p-5">
                            {/* Title + status */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <h3 className={`font-semibold text-sm leading-snug ${isDone ? 'text-white/50' : 'text-white/90'} line-clamp-2`}>
                                {task.title || config.label}
                              </h3>
                              {isDone && (
                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                              )}
                            </div>

                            {/* Status + Points */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${statusCfg.class}`}>
                                {statusCfg.label}
                              </span>
                              {task.points != null && (
                                <span className="text-xs text-white/25 font-medium">
                                  {toArabicNum(task.points)} نقطة
                                </span>
                              )}
                            </div>

                            {/* Score (if graded) */}
                            {task.status === 'graded' && task.auto_score != null && (
                              <div className="flex items-center gap-1.5 mb-3">
                                <Star size={13} className="text-amber-400" />
                                <span className="text-sm font-semibold text-amber-400">
                                  {toArabicNum(Math.round(task.auto_score))}%
                                </span>
                              </div>
                            )}

                            {/* Deadline */}
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className={deadlineInfo.urgent && !isDone ? 'text-red-400' : 'text-white/20'} />
                              <span className={`text-xs ${
                                isDone ? 'text-white/25' :
                                deadlineInfo.urgent ? 'text-red-400' : 'text-white/30'
                              }`}>
                                {isDone ? 'تم التسليم' : deadlineInfo.text}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
