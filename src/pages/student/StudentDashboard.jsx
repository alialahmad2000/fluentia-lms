import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Flame, Zap, Trophy, BookOpen, Calendar, ArrowLeft, CreditCard, Crosshair,
  CalendarDays, FileText, ClipboardCheck, Video, UsersRound,
  Clock, Activity, Sparkles, CheckCircle2, Circle,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getGreeting, getArabicDay, formatTime, formatDateAr } from '../../utils/dateHelpers'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'
import { getEncouragement } from '../../utils/encouragement'
import DailyChallenge from '../../components/gamification/DailyChallenge'
import SrsReviewCard from '../../components/gamification/SrsReviewCard'
import LevelExitTestCard from '../../components/gamification/LevelExitTestCard'
import EnableNotificationsPrompt from '../../components/notifications/EnableNotificationsPrompt'
import MysteryBox from '../../components/gamification/MysteryBox'
import StudentWowMoments from '../../components/ai/StudentWowMoments'
import FloatingParticles from '../../components/illustrations/FloatingParticles'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import { DashboardSkeleton } from '../../components/ui/PageSkeleton'
import { Link, useNavigate } from 'react-router-dom'
import { tracker } from '../../services/activityTracker'

function getLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

function getNextLevel(xp) {
  for (const lvl of GAMIFICATION_LEVELS) {
    if (xp < lvl.xp) return lvl
  }
  return null
}

// ─── Stagger animation variants ─────────────────────────
const TASK_TYPE_ICONS = {
  vocabulary: '📝', grammar: '📖', reading: '📚', listening: '🎧',
  writing: '✍️', speaking: '🎤', pronunciation: '🗣️',
}

const variantColors = {
  sky: { text: 'var(--accent-sky)', icon: 'bg-sky-500/10 text-sky-400' },
  amber: { text: 'var(--accent-gold)', icon: 'bg-gold-500/10 text-gold-400' },
  violet: { text: 'var(--accent-violet)', icon: 'bg-violet-500/10 text-violet-400' },
  emerald: { text: 'var(--accent-emerald)', icon: 'bg-emerald-500/10 text-emerald-400' },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

// ─── Quick Access Cards ──────────
const QUICK_ACCESS = [
  { to: '/student/weekly-tasks', label: 'المهام الأسبوعية', icon: CalendarDays, color: 'sky', glow: 'var(--accent-sky-glow)' },
  { to: '/student/assignments', label: 'الواجبات', icon: FileText, color: 'violet', glow: 'var(--accent-violet-glow)' },
  { to: '/student/adaptive-test', label: 'اختبار المستوى', icon: Crosshair, color: 'emerald', glow: 'var(--accent-emerald-glow)' },
  { to: '/student/ai-insights', label: 'رؤى ذكية', icon: Sparkles, color: 'amber', glow: 'var(--accent-amber-glow)' },
]

const COLOR_MAP = {
  sky: 'bg-sky-500/10 text-sky-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  violet: 'bg-violet-500/10 text-violet-400',
  amber: 'bg-amber-500/10 text-amber-400',
  gold: 'bg-gold-500/10 text-gold-400',
  rose: 'bg-rose-500/10 text-rose-400',
}

const GLOW_SHADOW = {
  sky: 'var(--shadow-glow-sky)',
  emerald: 'var(--shadow-glow-emerald)',
  violet: 'var(--shadow-glow-violet)',
  amber: 'var(--shadow-glow-gold)',
  gold: 'var(--shadow-glow-gold)',
  rose: '0 0 20px rgba(251,113,133,0.15)',
}

// ─── Countdown helper ───────────────────────────────────
function useCountdown(schedule) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (!schedule?.days?.length || !schedule?.time) return
    function calc() {
      const now = new Date()
      const [h, m] = (schedule.time || '').split(':').map(Number)
      if (isNaN(h)) return ''
      for (let offset = 0; offset < 7; offset++) {
        const candidate = new Date(now)
        candidate.setDate(now.getDate() + offset)
        candidate.setHours(h, m || 0, 0, 0)
        const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][candidate.getDay()]
        if (schedule.days.includes(dayName) && candidate > now) {
          const diff = candidate - now
          const hours = Math.floor(diff / 3600000)
          const mins = Math.floor((diff % 3600000) / 60000)
          if (hours > 24) {
            const days = Math.floor(hours / 24)
            return `بعد ${days} يوم`
          }
          return `بعد ${hours} ساعة و ${mins} دقيقة`
        }
      }
      return ''
    }
    setText(calc())
    const id = setInterval(() => setText(calc()), 60000)
    return () => clearInterval(id)
  }, [schedule])
  return text
}

export default function StudentDashboard() {
  const { profile, studentData } = useAuthStore()
  const navigate = useNavigate()
  const firstName = profile?.display_name || (profile?.full_name || '').split(' ')[0]

  // Weekly tasks progress + individual tasks
  const { data: weeklyProgress, isLoading: loadingWeekly } = useQuery({
    queryKey: ['dashboard-weekly-progress', profile?.id],
    queryFn: async () => {
      const now = new Date()
      const sunday = new Date(now)
      sunday.setDate(now.getDate() - now.getDay())
      sunday.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('weekly_task_sets')
        .select('id, total_tasks, completed_tasks, completion_percentage, status')
        .eq('student_id', profile?.id)
        .gte('week_start', sunday.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!profile?.id,
  })

  // Individual weekly tasks for horizontal cards
  const { data: weeklyTasks } = useQuery({
    queryKey: ['dashboard-weekly-tasks-detail', weeklyProgress?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_tasks')
        .select('id, type, title, status')
        .eq('task_set_id', weeklyProgress.id)
        .order('sequence_number')
      return data || []
    },
    enabled: !!weeklyProgress?.id,
  })

  // Pending assignments count
  const { data: pendingAssignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['student-pending-assignments'],
    queryFn: async () => {
      const { count } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', studentData?.group_id)
        .eq('is_visible', true)
        .is('deleted_at', null)
        .gte('deadline', new Date().toISOString())
      return count || 0
    },
    enabled: !!studentData?.group_id,
  })

  // Payment status
  const { data: nextPayment } = useQuery({
    queryKey: ['student-next-payment'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, amount, status, period_end')
        .eq('student_id', profile?.id)
        .in('status', ['pending', 'overdue'])
        .is('deleted_at', null)
        .order('period_end', { ascending: true })
        .limit(1)
      return data?.[0] ?? null
    },
    enabled: !!profile?.id,
  })

  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const currentLevel = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const xpRange = nextLevel ? (nextLevel.xp - currentLevel.xp) : 0
  const xpProgress = nextLevel && xpRange > 0 ? ((xp - currentLevel.xp) / xpRange) * 100 : 100
  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas
  const group = studentData?.groups
  const schedule = group?.schedule
  const nextClassTime = schedule?.time
  const countdown = useCountdown(schedule)

  // Activity feed preview (3 latest)
  const { data: activityPreview } = useQuery({
    queryKey: ['dashboard-activity-preview', studentData?.group_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_feed')
        .select('id, type, title, created_at, student:student_id(profiles(display_name, full_name))')
        .eq('group_id', studentData?.group_id)
        .order('created_at', { ascending: false })
        .limit(3)
      return (data || []).map(a => ({
        ...a,
        studentName: a.student?.profiles?.display_name || a.student?.profiles?.full_name || null,
      }))
    },
    enabled: !!studentData?.group_id,
  })

  // Leaderboard preview (top 3)
  const { data: leaderboardPreview } = useQuery({
    queryKey: ['dashboard-leaderboard-preview', studentData?.group_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, xp_total, profiles(display_name, full_name)')
        .eq('group_id', studentData?.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('xp_total', { ascending: false })
        .limit(3)
      return (data || []).map((s, i) => ({
        rank: i + 1,
        name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
        xp: s.xp_total,
        isMe: s.id === profile?.id,
      }))
    },
    enabled: !!studentData?.group_id,
  })

  // Encouragement message
  const encouragement = getEncouragement({
    streak,
    xp,
    tasksCompleted: weeklyProgress?.completed_tasks || 0,
    tasksTotal: weeklyProgress?.total_tasks || 0,
    pendingAssignments: pendingAssignments || 0,
  })

  // Show skeleton while core data loads
  const isInitialLoading = !profile || (loadingWeekly && loadingAssignments)
  if (isInitialLoading) return <DashboardSkeleton />

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">

      {/* ═══ 1. Hero: Greeting + Level + XP + Streak ═══ */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-default)' }}>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] pointer-events-none glow-breathe"
          style={{
            background: 'radial-gradient(ellipse, rgba(56,189,248,0.08), rgba(167,139,250,0.04), transparent)',
            filter: 'blur(60px)',
          }}
        />
        <FloatingParticles count={8} />
        <div className="card-top-line shimmer" style={{ opacity: 0.5 }} />
        <div className="relative">
          {/* Name + greeting */}
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 4 }}>
            {getGreeting()}، {firstName}
          </h1>
          <p className="text-shimmer" style={{ fontSize: 14, fontWeight: 600 }}>
            {pkg.name_ar} &middot; {academicLevel.name_ar} ({academicLevel.cefr})
          </p>

          {/* Integrated XP + Streak + Level row */}
          <div className="flex flex-wrap items-center gap-4 mt-5">
            {/* XP Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--accent-sky-glow)' }}>
              <Zap size={16} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
              <span className="text-sm font-bold font-data" style={{ color: 'var(--accent-sky)' }}><AnimatedNumber value={xp} /> XP</span>
            </div>
            {/* Streak Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <Flame size={16} strokeWidth={1.5} className="fire-pulse" style={{ color: 'var(--accent-gold)' }} />
              <span className="text-sm font-bold font-data" style={{ color: 'var(--accent-gold)' }}><AnimatedNumber value={streak} duration={0.6} /> يوم</span>
            </div>
            {/* Level Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--accent-violet-glow)' }}>
              <Trophy size={16} strokeWidth={1.5} style={{ color: 'var(--accent-violet)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--accent-violet)' }}>{currentLevel.title_ar}</span>
            </div>
          </div>

          {/* XP Progress mini bar */}
          <div className="mt-4 max-w-md">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] font-data" style={{ color: 'var(--text-tertiary)' }}>المستوى {currentLevel.level}</span>
              <span className="text-[11px] font-data" style={{ color: 'var(--text-tertiary)' }}>
                {nextLevel ? nextLevel.title_ar : 'MAX'}
              </span>
            </div>
            <div className="fl-progress-track" style={{ height: '6px' }}>
              <motion.div
                className="fl-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ 2. Weekly Tasks — Horizontal Scrollable Mini Cards ═══ */}
      {weeklyProgress && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-sky-glow)' }}>
                <CalendarDays size={16} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
              </div>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>المهام الأسبوعية</h3>
              <span className="text-xs font-data" style={{ color: 'var(--text-tertiary)' }}>
                {weeklyProgress.completed_tasks}/{weeklyProgress.total_tasks}
              </span>
              {weeklyProgress.status === 'completed' && (
                <span className="fl-badge emerald text-[11px]">مكتمل</span>
              )}
            </div>
            <Link to="/student/weekly-tasks" className="text-[12px] font-medium" style={{ color: 'var(--accent-sky)' }}>
              عرض الكل ←
            </Link>
          </div>
          {/* Progress bar */}
          <div className="fl-progress-track mb-3" style={{ height: '6px' }}>
            <motion.div
              className="fl-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${weeklyProgress.completion_percentage || 0}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {/* Horizontal scrollable task cards */}
          {weeklyTasks?.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
              {weeklyTasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/student/weekly-tasks/${task.id}`}
                  className="flex-shrink-0 w-[140px] fl-card-static p-3 hover:translate-y-[-1px] transition-all duration-200"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{TASK_TYPE_ICONS[task.type] || '📋'}</span>
                    {task.status === 'completed' || task.status === 'graded' ? (
                      <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-400" />
                    ) : (
                      <Circle size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                  </div>
                  <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {task.title || task.type}
                  </p>
                  <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--text-tertiary)' }}>
                    {task.type}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ═══ 2.5 Push Notifications Prompt ═══ */}
      <EnableNotificationsPrompt />

      {/* ═══ 3. Level Exit Test Card ═══ */}
      <LevelExitTestCard studentId={profile?.id} academicLevel={studentData?.academic_level} />

      {/* ═══ 4. SRS Daily Review ═══ */}
      <SrsReviewCard studentId={profile?.id} />

      {/* ═══ 4. Next Class (prominent) ═══ */}
      <motion.div variants={fadeUp} className="fl-card-static p-6 relative">
        <div className="card-top-line" style={{ opacity: 0.4 }} />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-sky-glow)' }}>
            <Calendar size={18} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
          </div>
          <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>الحصة القادمة</h3>
          {countdown && (
            <span className="me-auto text-[12px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)' }}>
              <Clock size={12} strokeWidth={1.5} />
              {countdown}
            </span>
          )}
        </div>
        {group ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{group.name}</p>
              {schedule && (
                <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  {schedule.days?.map(d => getArabicDay(d)).join(' · ')}
                  {nextClassTime && <span className="font-bold mr-2" style={{ color: 'var(--accent-sky)' }}>{formatTime(nextClassTime)}</span>}
                </p>
              )}
            </div>
            {group.google_meet_link && (
              <a
                href={group.google_meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="fl-btn-primary text-sm py-2.5 px-5 inline-flex items-center gap-2"
              >
                <span>دخول الحصة</span>
                <ArrowLeft size={14} />
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>لا توجد مجموعة مسجلة</p>
        )}
      </motion.div>

      {/* ═══ 5. Smart Stats Row ═══ */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'مستوى XP', value: currentLevel.title_ar, sub: `${xp} XP`, icon: Zap, variant: 'sky' },
          { label: 'السلسلة', value: `${streak} يوم`, sub: streak >= 7 ? 'استمر!' : 'واصل يومياً', icon: Flame, variant: 'amber', fireIcon: true },
          { label: 'الواجبات', value: pendingAssignments ?? '—', sub: 'قيد الانتظار', icon: BookOpen, variant: 'violet' },
          { label: 'المستوى', value: academicLevel.cefr, sub: academicLevel.name_ar, icon: Trophy, variant: 'emerald' },
        ].map((card, i) => {
          const vc = variantColors[card.variant] || variantColors.sky
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`fl-stat-card ${card.variant}`}
              style={{ textAlign: 'start' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{card.label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center opacity-70 ${vc.icon}`}>
                  <card.icon size={18} strokeWidth={1.5} className={card.fireIcon ? 'fire-pulse' : ''} />
                </div>
              </div>
              <p className="text-[1.75rem] sm:text-[2rem] font-bold leading-none" style={{ color: vc.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {card.value}
              </p>
              <p className="text-[12px] mt-2 tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{card.sub}</p>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ═══ 6. Encouraging Message ═══ */}
      <motion.div variants={fadeUp} className="flex items-start gap-3 px-5 py-4 rounded-xl" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-sky-glow)' }}>
          <Sparkles size={16} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{encouragement.motivation}</p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{encouragement.tip}</p>
        </div>
      </motion.div>

      {/* ═══ Smart Nudges ═══ */}
      <SmartNudgesWidget studentId={profile?.id} />

      {/* ═══ 7. Quick Access Grid ═══ */}
      <motion.div variants={fadeUp}>
        <h2 className="text-[18px] font-bold mb-5" style={{ color: 'var(--text-primary)' }}>الوصول السريع</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {QUICK_ACCESS.map((item, i) => (
            <Link key={item.to} to={item.to}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="fl-card-static p-5 group cursor-pointer transition-all duration-250 aurora-border"
                style={{ '--hover-glow': GLOW_SHADOW[item.color] }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.borderColor = 'var(--border-glow)'
                  e.currentTarget.style.boxShadow = GLOW_SHADOW[item.color]
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = ''
                  e.currentTarget.style.borderColor = ''
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                <div className={`w-11 h-11 rounded-xl ${COLOR_MAP[item.color]} flex items-center justify-center mb-3`}>
                  <item.icon size={20} strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ═══ 7. Wow Moments ═══ */}
      <StudentWowMoments />

      {/* ═══ 8. Community: Activity + Leaderboard ═══ */}
      <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-5">
        {/* Activity preview */}
        <div className="fl-card-static p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Activity size={16} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
              </div>
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>نشاط المجموعة</h3>
            </div>
            <button
              onClick={() => navigate('/student/group-activity')}
              className="text-[12px] font-medium transition-colors cursor-pointer"
              style={{ color: 'var(--accent-sky)' }}
            >
              عرض الكل ←
            </button>
          </div>
          {activityPreview?.length > 0 ? (
            <div className="space-y-2.5">
              {activityPreview.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent-sky)' }} />
                  <p className="text-[12px] truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {a.studentName && <span className="font-medium" style={{ color: 'var(--accent-sky)' }}>{a.studentName} </span>}
                    {a.title}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] py-3 text-center" style={{ color: 'var(--text-tertiary)' }}>لا يوجد نشاط بعد</p>
          )}
        </div>

        {/* Leaderboard preview */}
        <div className="fl-card-static p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center">
                <Trophy size={16} strokeWidth={1.5} style={{ color: 'var(--accent-gold)' }} />
              </div>
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>المتصدرين</h3>
            </div>
            <button
              onClick={() => navigate('/student/group-activity?tab=leaderboard')}
              className="text-[12px] font-medium transition-colors cursor-pointer"
              style={{ color: 'var(--accent-gold)' }}
            >
              عرض الكل ←
            </button>
          </div>
          {leaderboardPreview?.length > 0 ? (
            <div className="space-y-2">
              {leaderboardPreview.map((p) => (
                <div
                  key={p.rank}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl ${p.isMe ? 'bg-sky-500/5 ring-1 ring-sky-500/10' : ''}`}
                  style={!p.isMe ? { background: 'var(--surface-raised)' } : undefined}
                >
                  <span className={`text-[13px] font-bold w-5 text-center ${p.rank === 1 ? 'text-gold-400' : ''}`} style={p.rank !== 1 ? { color: 'var(--text-tertiary)' } : undefined}>
                    {p.rank}
                  </span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: p.isMe ? 'var(--accent-sky-glow)' : 'var(--surface-overlay)', color: p.isMe ? 'var(--accent-sky)' : 'var(--text-tertiary)' }}>
                    {p.name?.[0] || '?'}
                  </div>
                  <span className="text-[13px] font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                    {p.name}
                    {p.isMe && <span className="text-[11px] mr-1" style={{ color: 'var(--accent-sky)' }}>(أنت)</span>}
                  </span>
                  <span className="text-[12px] font-bold font-data" style={{ color: p.rank === 1 ? 'var(--accent-gold)' : 'var(--text-tertiary)' }}>
                    {p.xp} XP
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] py-3 text-center" style={{ color: 'var(--text-tertiary)' }}>لا توجد بيانات</p>
          )}
        </div>
      </motion.div>

      {/* ═══ 9. Daily Challenge + Mystery Box ═══ */}
      <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-5">
        <DailyChallenge />
        <MysteryBox />
      </motion.div>

      {/* ═══ 11. Payment Status ═══ */}
      {nextPayment && (
        <motion.div variants={fadeUp} className="fl-card-static p-7 relative">
          <div className="card-top-line gold" style={{ opacity: 0.3 }} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-gold-glow)' }}>
                <CreditCard size={18} strokeWidth={1.5} style={{ color: 'var(--accent-gold)' }} />
              </div>
              <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>الدفعة القادمة</h3>
            </div>
            <span className={`fl-badge text-[11px] ${nextPayment.status === 'overdue' ? 'rose' : 'amber'}`}>
              {nextPayment.status === 'overdue' ? 'متأخرة' : 'قيد الانتظار'}
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="text-3xl font-bold font-data" style={{ color: 'var(--text-primary)' }}>{nextPayment.amount} ر.س</p>
            {nextPayment.period_end && (
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>حتى {formatDateAr(nextPayment.period_end)}</p>
            )}
          </div>
          <Link to="/student/billing" className="text-[13px] font-medium mt-3 inline-block transition-colors" style={{ color: 'var(--accent-sky)' }}>
            عرض تفاصيل الفواتير
          </Link>
        </motion.div>
      )}

      {/* ═══ 12. Targeted Exercises CTA ═══ */}
      <ExercisesCTA studentId={profile?.id} />

      {/* ═══ Motivational Footer ═══ */}
      <p className="text-center text-[13px] italic pb-4" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
        "The expert in anything was once a beginner."
      </p>
    </motion.div>
  )
}

function SmartNudgesWidget({ studentId }) {
  const { data: nudges } = useQuery({
    queryKey: ['dashboard-nudges', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('smart_nudges')
        .select('id, title_ar, body_ar, nudge_type, priority, action_url')
        .eq('student_id', studentId)
        .eq('dismissed', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(3)
      return data || []
    },
    enabled: !!studentId,
  })

  if (!nudges?.length) return null

  const NUDGE_ICONS = {
    streak_at_risk: Flame,
    weekly_tasks_reminder: CalendarDays,
    improvement_praise: Trophy,
    skill_gap: Crosshair,
    inactive_warning: Clock,
    milestone_celebration: Zap,
    level_up_ready: ArrowLeft,
    study_tip: BookOpen,
    challenge_invite: Crosshair,
  }
  const NUDGE_COLORS = {
    streak_at_risk: 'amber',
    weekly_tasks_reminder: 'sky',
    improvement_praise: 'emerald',
    skill_gap: 'violet',
    inactive_warning: 'rose',
    milestone_celebration: 'gold',
    level_up_ready: 'emerald',
    study_tip: 'sky',
    challenge_invite: 'violet',
  }

  return (
    <motion.div variants={fadeUp} className="space-y-2">
      {nudges.map((nudge) => {
        const Icon = NUDGE_ICONS[nudge.nudge_type] || Sparkles
        const color = NUDGE_COLORS[nudge.nudge_type] || 'sky'
        const isUrgent = nudge.priority === 'high' || nudge.priority === 'urgent'

        return (
          <motion.div
            key={nudge.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`fl-card-static p-4 flex items-start gap-3 ${isUrgent ? 'ring-1 ring-amber-500/20' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg ${COLOR_MAP[color] || COLOR_MAP.sky} flex items-center justify-center shrink-0`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{nudge.title_ar}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{nudge.body_ar}</p>
            </div>
            {nudge.action_url && (
              <Link to={nudge.action_url} className="text-[11px] font-medium shrink-0" style={{ color: 'var(--accent-sky)' }}>
                عرض ←
              </Link>
            )}
          </motion.div>
        )
      })}
    </motion.div>
  )
}

function ExercisesCTA({ studentId }) {
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-exercises-count', studentId],
    queryFn: async () => {
      const { count } = await supabase
        .from('targeted_exercises')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'pending')
      return count || 0
    },
    enabled: !!studentId,
  })

  if (!pendingCount) return null

  return (
    <motion.div variants={fadeUp} className="fl-card-static p-7 relative" style={{ borderColor: 'rgba(167,139,250,0.15)' }}>
      <div className="card-top-line violet" style={{ opacity: 0.4 }} />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-violet-glow)' }}>
            <Crosshair size={20} strokeWidth={1.5} style={{ color: 'var(--accent-violet)' }} />
          </div>
          <div>
            <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>تمارين مخصصة لك</h3>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{pendingCount} تمرين جاهز لتحسين نقاط ضعفك</p>
          </div>
        </div>
        <Link to="/student/exercises" className="fl-btn-primary text-sm py-2.5 px-5 flex items-center gap-2">
          <span>ابدأ التدريب</span>
          <ArrowLeft size={14} />
        </Link>
      </div>
    </motion.div>
  )
}
