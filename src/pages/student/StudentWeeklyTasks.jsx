import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Mic,
  BookOpen,
  PenLine,
  Headphones,
  RefreshCw,
  CheckCircle2,
  Zap,
  Flame,
  Star,
  Clock,
  ClipboardList,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

// ── Task type configuration ────────────────────────────────────────
const TASK_TYPE_CONFIG = {
  speaking: { icon: Mic, label: 'تحدث', color: 'sky' },
  reading: { icon: BookOpen, label: 'قراءة', color: 'emerald' },
  writing: { icon: PenLine, label: 'كتابة', color: 'violet' },
  listening: { icon: Headphones, label: 'استماع', color: 'amber' },
  irregular_verbs: { icon: RefreshCw, label: 'أفعال شاذة', color: 'rose' },
}

// ── Status badge mapping ───────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { badge: 'badge-muted', label: 'قيد الانتظار' },
  submitted: { badge: 'badge-blue', label: 'تم التسليم' },
  graded: { badge: 'badge-green', label: 'تم التقييم' },
  resubmit_requested: { badge: 'badge-yellow', label: 'أعد التسليم' },
  skipped: { badge: 'badge-red', label: 'تم التخطي' },
}

// ── Color utility maps ─────────────────────────────────────────────
const COLOR_BG = {
  sky: 'bg-sky-500/10',
  emerald: 'bg-emerald-500/10',
  violet: 'bg-violet-500/10',
  amber: 'bg-amber-500/10',
  rose: 'bg-rose-500/10',
}

const COLOR_TEXT = {
  sky: 'text-sky-400',
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
}

// ── Helpers ────────────────────────────────────────────────────────
function getSunday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
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
  const year = toArabicNum(saturday.getFullYear())
  return `${startDay} - ${endDay} ${month} ${year}`
}

function getDeadlineText(deadline) {
  if (!deadline) return null
  const now = new Date()
  const dl = new Date(deadline)
  const diff = dl - now
  if (diff <= 0) return 'انتهى الموعد'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${toArabicNum(days)} يوم متبقي`
  return `${toArabicNum(hours)} ساعة متبقية`
}

// ── Component ──────────────────────────────────────────────────────
export default function StudentWeeklyTasks() {
  const { profile, studentData } = useAuthStore()
  const [weekOffset, setWeekOffset] = useState(0)

  const currentSunday = useMemo(() => getSunday(new Date()), [])
  const weekSunday = useMemo(() => addWeeks(currentSunday, weekOffset), [currentSunday, weekOffset])
  const weekStart = formatISODate(weekSunday)

  // Fetch the task set for this week
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

  // Fetch individual tasks
  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['weekly-tasks', taskSet?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_tasks')
        .select('*')
        .eq('task_set_id', taskSet.id)
        .order('type', { ascending: true })
        .order('sequence_number', { ascending: true })
      return data || []
    },
    enabled: !!taskSet?.id,
  })

  const isLoading = loadingSet || loadingTasks

  // ── Computed stats ───────────────────────────────────────────────
  const completedCount = (tasks || []).filter(t => t.status === 'graded' || t.status === 'submitted').length
  const totalCount = (tasks || []).length
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const xpEarned = (tasks || []).reduce((sum, t) => sum + (t.xp_awarded || 0), 0)
  const bestScore = (tasks || []).reduce((best, t) => Math.max(best, t.auto_score || 0), 0)
  const streak = studentData?.current_streak || 0

  const statCards = [
    { label: 'مهام مكتملة', value: `${toArabicNum(completedCount)}/${toArabicNum(totalCount)}`, icon: CheckCircle2, color: 'sky' },
    { label: 'XP هذا الأسبوع', value: `${toArabicNum(xpEarned)} XP`, icon: Zap, color: 'gold' },
    { label: 'السلسلة', value: `${toArabicNum(streak)} يوم`, icon: Flame, color: 'gold' },
    { label: 'أفضل نتيجة', value: bestScore > 0 ? `${toArabicNum(bestScore)}%` : '—', icon: Star, color: 'sky' },
  ]

  return (
    <div className="space-y-8">
      {/* ── Header + Week Navigation ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-sky-500/10 p-2.5">
            <CalendarDays size={22} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">مهامي الأسبوعية</h1>
            <p className="text-muted text-sm mt-0.5">{formatWeekRange(weekSunday)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="btn-icon"
            title="الأسبوع السابق"
          >
            <ChevronRight size={18} />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="btn-ghost text-xs px-3"
            >
              هذا الأسبوع
            </button>
          )}
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            disabled={weekOffset <= 0}
            className="btn-icon disabled:opacity-30"
            title="الأسبوع التالي"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </motion.div>

      {/* ── Overall Progress Bar ──────────────────────────────────── */}
      {tasks && tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-lg font-semibold text-white">تقدم الأسبوع</p>
            <p className="text-sm text-muted">
              {toArabicNum(completedCount)}/{toArabicNum(totalCount)} مهام مكتملة
            </p>
          </div>
          <div className="w-full h-3.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPct, 100)}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-l from-sky-400 to-sky-600 rounded-full"
            />
          </div>
          <p className="text-xs text-muted mt-2 text-left">
            {progressPct >= 100 ? 'أحسنت! أكملت جميع المهام' : `${toArabicNum(totalCount - completedCount)} مهام متبقية`}
          </p>
        </motion.div>
      )}

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="stat-card hover:translate-y-[-2px] transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-xs">{card.label}</span>
              <div className={`stat-icon ${
                card.color === 'gold' ? 'bg-gold-500/10 text-gold-400' : 'bg-sky-500/10 text-sky-400'
              }`}>
                <card.icon size={18} />
              </div>
            </div>
            <p className="stat-number">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Loading State ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────── */}
      {!isLoading && (!tasks || tasks.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-12 flex flex-col items-center justify-center text-center"
        >
          <div className="rounded-xl bg-white/5 p-4 mb-4">
            <ClipboardList size={40} className="text-muted" />
          </div>
          <p className="text-lg font-semibold text-white mb-1">لا توجد مهام</p>
          <p className="text-muted text-sm">لم يتم إنشاء مهام هذا الأسبوع بعد</p>
        </motion.div>
      )}

      {/* ── Task Cards Grid ───────────────────────────────────────── */}
      {!isLoading && tasks && tasks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {tasks.map((task, i) => {
            const config = TASK_TYPE_CONFIG[task.type] || TASK_TYPE_CONFIG.speaking
            const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
            const Icon = config.icon
            const isDone = task.status === 'submitted' || task.status === 'graded'

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <Link
                  to={`/student/weekly-tasks/${task.id}`}
                  className="block glass-card-raised p-5 hover:translate-y-[-2px] transition-all duration-200 group"
                >
                  {/* Type icon + title */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`rounded-xl ${COLOR_BG[config.color]} p-2.5 shrink-0`}>
                      <Icon size={20} className={COLOR_TEXT[config.color]} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">
                        {task.title || config.label}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{config.label}</p>
                    </div>
                  </div>

                  {/* Status badge + points */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={statusCfg.badge}>{statusCfg.label}</span>
                    {task.points != null && (
                      <span className="text-xs text-muted">
                        {toArabicNum(task.points)} نقطة
                      </span>
                    )}
                  </div>

                  {/* Score if graded */}
                  {task.status === 'graded' && task.auto_score != null && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <Star size={14} className="text-gold-400" />
                      <span className="text-sm font-medium text-gold-400">
                        {toArabicNum(Math.round(task.auto_score))}%
                      </span>
                    </div>
                  )}

                  {/* Deadline or submitted text */}
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Clock size={13} />
                    {isDone ? (
                      <span>تم التسليم</span>
                    ) : (
                      <span>{getDeadlineText(task.deadline) || 'بدون موعد'}</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
