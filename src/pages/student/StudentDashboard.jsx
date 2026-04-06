import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Flame, Zap, Trophy, BookOpen, Calendar, ArrowLeft, CreditCard, Crosshair,
  CalendarDays, FileText, Clock, Activity, Sparkles, CheckCircle2, Circle,
  MessageCircle, TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getArabicDay, formatTime, formatDateAr, timeAgo, deadlineText } from '../../utils/dateHelpers'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'
import { getEncouragement } from '../../utils/encouragement'
import DailyChallenge from '../../components/gamification/DailyChallenge'
import MysteryBox from '../../components/gamification/MysteryBox'
import StudentWowMoments from '../../components/ai/StudentWowMoments'
import FloatingParticles from '../../components/illustrations/FloatingParticles'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import { StaggerContainer, StaggerItem } from '../../components/ui/StaggerContainer'
import { DashboardSkeleton } from '../../components/ui/PageSkeleton'
import { Link, useNavigate } from 'react-router-dom'
import { tracker } from '../../services/activityTracker'

// ─── Motivational Quotes (32 bilingual) ─────────────────
const QUOTES = [
  { ar: 'كل خبير كان مبتدئاً يوماً ما', en: 'Every expert was once a beginner' },
  { ar: 'الطلاقة تأتي مع الممارسة', en: 'Fluency comes with practice' },
  { ar: 'خطوة بخطوة، تصل', en: 'Step by step, you\'ll get there' },
  { ar: 'النجاح يبدأ بخطوة واحدة', en: 'Success starts with a single step' },
  { ar: 'لا تستسلم، أنت أقرب مما تظن', en: 'Don\'t give up, you\'re closer than you think' },
  { ar: 'التعلم رحلة وليس وجهة', en: 'Learning is a journey, not a destination' },
  { ar: 'كل يوم فرصة جديدة للتعلم', en: 'Every day is a new opportunity to learn' },
  { ar: 'الممارسة تصنع الإتقان', en: 'Practice makes perfect' },
  { ar: 'أنت أقوى مما تتصور', en: 'You are stronger than you imagine' },
  { ar: 'العلم نور والجهل ظلام', en: 'Knowledge is light, ignorance is darkness' },
  { ar: 'من جد وجد ومن زرع حصد', en: 'Hard work always pays off' },
  { ar: 'الإصرار مفتاح النجاح', en: 'Persistence is the key to success' },
  { ar: 'تحدث بثقة، الأخطاء جزء من التعلم', en: 'Speak with confidence, mistakes are part of learning' },
  { ar: 'اللغة جسر يربطك بالعالم', en: 'Language is a bridge connecting you to the world' },
  { ar: 'اقرأ أكثر، تتحسن أكثر', en: 'Read more, improve more' },
  { ar: 'الاستمرارية أهم من الكمال', en: 'Consistency matters more than perfection' },
  { ar: 'كل كلمة جديدة هي باب جديد', en: 'Every new word is a new door' },
  { ar: 'لا تقارن نفسك بغيرك، قارن نفسك بالأمس', en: 'Don\'t compare yourself to others, compare to yesterday' },
  { ar: 'الثقة تأتي مع التكرار', en: 'Confidence comes with repetition' },
  { ar: 'أنت في الطريق الصحيح', en: 'You\'re on the right track' },
  { ar: 'كل محاولة تقربك من الهدف', en: 'Every attempt brings you closer to the goal' },
  { ar: 'الإنجليزية ليست صعبة، فقط تحتاج صبر', en: 'English isn\'t hard, it just needs patience' },
  { ar: 'استمتع بالرحلة', en: 'Enjoy the journey' },
  { ar: 'التقدم البطيء أفضل من عدم التقدم', en: 'Slow progress is better than no progress' },
  { ar: 'اسمع، تحدث، اقرأ، اكتب — كرر', en: 'Listen, speak, read, write — repeat' },
  { ar: 'أنت تستثمر في نفسك', en: 'You\'re investing in yourself' },
  { ar: 'الطموح لا يعرف المستحيل', en: 'Ambition knows no impossible' },
  { ar: 'كل حصة تقربك من حلمك', en: 'Every class brings you closer to your dream' },
  { ar: 'الأخطاء أفضل معلم', en: 'Mistakes are the best teacher' },
  { ar: 'لا تتوقف عن المحاولة', en: 'Never stop trying' },
  { ar: 'اللغة مفتاح الفرص', en: 'Language is the key to opportunities' },
  { ar: 'ابدأ من حيث أنت', en: 'Start from where you are' },
]

// ─── Constants ──────────────────────────────────────────
const TASK_TYPE_ICONS = {
  vocabulary: '📝', grammar: '📖', reading: '📚', listening: '🎧',
  writing: '✍️', speaking: '🎤', pronunciation: '🗣️',
}

const ACTIVITY_TYPES = [
  { type: 'reading', label: 'قراءة' },
  { type: 'grammar', label: 'قواعد' },
  { type: 'writing', label: 'كتابة' },
  { type: 'speaking', label: 'تحدث' },
  { type: 'listening', label: 'استماع' },
  { type: 'vocabulary', label: 'مفردات' },
]

const ASSIGNMENT_ICONS = {
  reading: { icon: '📖', color: 'bg-sky-500/10 text-sky-400' },
  writing: { icon: '✍️', color: 'bg-violet-500/10 text-violet-400' },
  speaking: { icon: '🎤', color: 'bg-amber-500/10 text-amber-400' },
  listening: { icon: '🎧', color: 'bg-emerald-500/10 text-emerald-400' },
  grammar: { icon: '📖', color: 'bg-indigo-500/10 text-indigo-400' },
  vocabulary: { icon: '📝', color: 'bg-rose-500/10 text-rose-400' },
  default: { icon: '📋', color: 'bg-sky-500/10 text-sky-400' },
}

const TRAINER_NOTE_STYLES = {
  trainer_encouragement: { icon: '💪', color: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  trainer_observation: { icon: '👀', color: 'bg-sky-500/10', border: 'border-sky-500/20' },
  trainer_warning: { icon: '⚠️', color: 'bg-amber-500/10', border: 'border-amber-500/20' },
}

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

const QUICK_ACCESS = [
  { to: '/student/weekly-tasks', label: 'المهام الأسبوعية', icon: CalendarDays, color: 'sky' },
  { to: '/student/assignments', label: 'الواجبات', icon: FileText, color: 'violet' },
  { to: '/student/adaptive-test', label: 'اختبار المستوى', icon: Crosshair, color: 'emerald' },
  { to: '/student/ai-insights', label: 'رؤى ذكية', icon: Sparkles, color: 'amber' },
]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

// ─── Helpers ────────────────────────────────────────────
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

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'صباح الخير', emoji: '☀️', gradient: 'from-amber-500/10 via-orange-500/5 to-transparent' }
  if (hour < 17) return { text: 'مساء الخير', emoji: '🌤', gradient: 'from-sky-500/10 via-blue-500/5 to-transparent' }
  if (hour < 21) return { text: 'مساء النور', emoji: '🌙', gradient: 'from-indigo-500/10 via-purple-500/5 to-transparent' }
  return { text: 'أهلاً', emoji: '✨', gradient: 'from-indigo-500/10 via-violet-500/5 to-transparent' }
}

function getDailyQuote() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

function getUrgencyStyle(deadline) {
  const hoursLeft = (new Date(deadline) - new Date()) / 3600000
  if (hoursLeft < 0) return { bg: 'bg-rose-500/20', text: 'text-rose-400', pulse: true }
  if (hoursLeft < 24) return { bg: 'bg-rose-500/15', text: 'text-rose-400', pulse: true }
  if (hoursLeft < 72) return { bg: 'bg-amber-500/15', text: 'text-amber-400', pulse: false }
  return { bg: 'bg-white/5', text: 'text-white/40', pulse: false }
}

// ════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════
export default function StudentDashboard() {
  const { profile, studentData } = useAuthStore()
  const navigate = useNavigate()
  const firstName = profile?.display_name || (profile?.full_name || '').split(' ')[0]
  const greeting = useMemo(() => getTimeGreeting(), [])
  const quote = useMemo(() => getDailyQuote(), [])

  // ── Weekly tasks progress ─────────────────────────────
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

  // ── Upcoming assignments (top 3 with details) ─────────
  const { data: upcomingAssignments } = useQuery({
    queryKey: ['student-upcoming-assignments', studentData?.group_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('assignments')
        .select('id, title, type, deadline')
        .eq('group_id', studentData?.group_id)
        .eq('is_visible', true)
        .is('deleted_at', null)
        .gte('deadline', new Date(Date.now() - 86400000).toISOString())
        .order('deadline', { ascending: true })
        .limit(3)
      return data || []
    },
    enabled: !!studentData?.group_id,
  })

  // ── Payment status ────────────────────────────────────
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

  // ── Trainer note (latest) ─────────────────────────────
  const { data: trainerNote } = useQuery({
    queryKey: ['student-trainer-note', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, created_at, data')
        .eq('user_id', profile?.id)
        .in('type', ['trainer_encouragement', 'trainer_observation', 'trainer_warning'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!profile?.id,
  })

  // ── Teams ─────────────────────────────────────────────
  const { data: teams } = useQuery({
    queryKey: ['student-teams', studentData?.group_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, emoji, color, total_xp')
        .eq('group_id', studentData?.group_id)
        .order('total_xp', { ascending: false })
      return data || []
    },
    enabled: !!studentData?.group_id,
  })

  // ── Next class ────────────────────────────────────────
  const { data: nextClass } = useQuery({
    queryKey: ['student-next-class', studentData?.group_id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('classes')
        .select('id, date, start_time, end_time, google_meet_link, status')
        .eq('group_id', studentData?.group_id)
        .gte('date', today)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!studentData?.group_id,
  })

  // ── Activity feed (5 latest) ──────────────────────────
  const { data: activityPreview } = useQuery({
    queryKey: ['dashboard-activity-preview', studentData?.group_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_feed')
        .select('id, type, title, created_at, student:student_id(profiles(display_name, full_name))')
        .eq('group_id', studentData?.group_id)
        .order('created_at', { ascending: false })
        .limit(5)
      return (data || []).map(a => ({
        ...a,
        studentName: a.student?.profiles?.display_name || a.student?.profiles?.full_name || null,
      }))
    },
    enabled: !!studentData?.group_id,
  })

  // ── Leaderboard (full group for rank) ─────────────────
  const { data: leaderboardData } = useQuery({
    queryKey: ['dashboard-leaderboard-full', studentData?.group_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, xp_total, profiles(display_name, full_name)')
        .eq('group_id', studentData?.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('xp_total', { ascending: false })
      return (data || []).map((s, i) => ({
        rank: i + 1,
        name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
        xp: s.xp_total,
        isMe: s.id === profile?.id,
      }))
    },
    enabled: !!studentData?.group_id,
  })

  // ── Derived values ────────────────────────────────────
  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const currentLevel = getLevel(xp)
  const nextLvl = getNextLevel(xp)
  const xpRange = nextLvl ? (nextLvl.xp - currentLevel.xp) : 0
  const xpProgress = nextLvl && xpRange > 0 ? ((xp - currentLevel.xp) / xpRange) * 100 : 100
  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas
  const group = studentData?.groups
  const schedule = group?.schedule

  const leaderboardPreview = leaderboardData?.slice(0, 3)
  const myRank = leaderboardData?.find(s => s.isMe)
  const totalInGroup = leaderboardData?.length || 0

  const completedTypes = useMemo(() => {
    if (!weeklyTasks) return new Set()
    return new Set(weeklyTasks.filter(t => t.status === 'completed' || t.status === 'graded').map(t => t.type))
  }, [weeklyTasks])

  // Next class info (prefer classes table, fall back to schedule)
  const classInfo = useMemo(() => {
    if (nextClass) {
      return {
        date: nextClass.date,
        time: nextClass.start_time,
        meetLink: nextClass.google_meet_link || group?.google_meet_link,
        dateObj: new Date(`${nextClass.date}T${nextClass.start_time}`),
      }
    }
    if (!schedule?.days?.length || !schedule?.time) return null
    const now = new Date()
    const [h, m] = (schedule.time || '').split(':').map(Number)
    if (isNaN(h)) return null
    for (let offset = 0; offset < 7; offset++) {
      const candidate = new Date(now)
      candidate.setDate(now.getDate() + offset)
      candidate.setHours(h, m || 0, 0, 0)
      const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][candidate.getDay()]
      if (schedule.days.includes(dayName) && candidate > now) {
        return { date: candidate.toISOString().split('T')[0], time: schedule.time, meetLink: group?.google_meet_link, dateObj: candidate }
      }
    }
    return null
  }, [nextClass, schedule, group])

  const encouragement = getEncouragement({
    streak, xp,
    tasksCompleted: weeklyProgress?.completed_tasks || 0,
    tasksTotal: weeklyProgress?.total_tasks || 0,
    pendingAssignments: upcomingAssignments?.length || 0,
  })

  if (!profile || loadingWeekly) return <DashboardSkeleton />

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

      {/* ═══ 1. HERO — The WOW Moment ═══ */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-default)' }}>
        <div className={`absolute inset-0 bg-gradient-to-br ${greeting.gradient} pointer-events-none`} />
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-sky-500/5 blur-3xl animate-pulse-soft pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl animate-pulse-soft pointer-events-none" style={{ animationDelay: '1s' }} />
        <FloatingParticles count={8} />
        <div className="card-top-line shimmer" style={{ opacity: 0.5 }} />

        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3 }}
          >
            {greeting.emoji} {greeting.text} يا {firstName}
          </motion.h1>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2">
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>{quote.ar}</p>
            <p className="text-[12px] italic mt-0.5" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>{quote.en}</p>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-shimmer mt-1" style={{ fontSize: 13, fontWeight: 600 }}>
            {pkg.name_ar} &middot; {academicLevel.name_ar} ({academicLevel.cefr})
          </motion.p>

          {/* 3 Stat Orbs */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap gap-3 sm:gap-4 mt-6"
          >
            <StatOrb icon="🔥" value={streak} label="يوم" glowColor="rgba(245,158,11,0.12)" textColor="var(--accent-gold)" onClick={() => navigate('/student/group-activity?tab=leaderboard')} pulse />
            <StatOrb icon="⭐" value={xp} label="XP" glowColor="rgba(56,189,248,0.12)" textColor="var(--accent-sky)" onClick={() => navigate('/student/group-activity?tab=leaderboard')} />
            <StatOrb icon="📈" value={currentLevel.level} label={currentLevel.title_ar} glowColor="rgba(167,139,250,0.12)" textColor="var(--accent-violet)" onClick={() => navigate('/student/curriculum')} />
          </motion.div>

          {/* XP Progress mini bar */}
          <div className="mt-4 max-w-md">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] font-data" style={{ color: 'var(--text-tertiary)' }}>المستوى {currentLevel.level}</span>
              <span className="text-[11px] font-data" style={{ color: 'var(--text-tertiary)' }}>{nextLvl ? nextLvl.title_ar : 'MAX'}</span>
            </div>
            <div className="fl-progress-track" style={{ height: '6px' }}>
              <motion.div className="fl-progress-fill" initial={{ width: 0 }} animate={{ width: `${Math.min(xpProgress, 100)}%` }} transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ 2. Daily Challenge + Mystery Box ═══ */}
      <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-5">
        <DailyChallenge />
        <MysteryBox />
      </motion.div>

      {/* ═══ 3. Weekly Progress with Activity Chips ═══ */}
      {weeklyProgress && (
        <motion.div variants={fadeUp} className="fl-card-static p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-sky-glow)' }}>
                <TrendingUp size={16} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
              </div>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>تقدمك هذا الأسبوع</h3>
              {weeklyProgress.status === 'completed' && <span className="fl-badge emerald text-[11px]">مكتمل</span>}
            </div>
            <Link to="/student/weekly-tasks" className="text-[12px] font-medium" style={{ color: 'var(--accent-sky)' }}>عرض الكل ←</Link>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 fl-progress-track" style={{ height: '10px' }}>
              <motion.div className="fl-progress-fill" initial={{ width: 0 }} animate={{ width: `${weeklyProgress.completion_percentage || 0}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }} />
            </div>
            <span className="text-[15px] font-bold font-data" style={{ color: 'var(--accent-sky)' }}>
              <AnimatedNumber value={weeklyProgress.completion_percentage || 0} />%
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {ACTIVITY_TYPES.map(a => {
              const done = completedTypes.has(a.type)
              return (
                <span key={a.type} className={`text-[12px] px-3 py-1.5 rounded-full transition-all ${done ? 'bg-emerald-500/15 text-emerald-400' : 'text-white/40'}`} style={!done ? { background: 'var(--surface-raised)' } : undefined}>
                  {done ? '✅' : '⏳'} {a.label}
                </span>
              )
            })}
          </div>

          {weeklyTasks?.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 mt-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
              {weeklyTasks.map((task) => (
                <Link key={task.id} to={`/student/weekly-tasks/${task.id}`} className="flex-shrink-0 w-[140px] fl-card-static p-3 hover:translate-y-[-1px] transition-all duration-200" style={{ scrollSnapAlign: 'start' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{TASK_TYPE_ICONS[task.type] || '📋'}</span>
                    {task.status === 'completed' || task.status === 'graded' ? (
                      <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-400" />
                    ) : (
                      <Circle size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                  </div>
                  <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title || task.type}</p>
                  <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--text-tertiary)' }}>{task.type}</p>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ═══ 4. Next Class — Live Countdown ═══ */}
      <motion.div variants={fadeUp} className="fl-card-static p-6 relative overflow-hidden">
        <div className="card-top-line" style={{ opacity: 0.4 }} />
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-sky-glow)' }}>
              <Calendar size={18} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
            </div>
            <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>الحصة القادمة</h3>
          </div>
          {classInfo ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{group?.name}</p>
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDateAr(classInfo.date)}
                    {classInfo.time && <span className="font-bold mr-2" style={{ color: 'var(--accent-sky)' }}>{formatTime(classInfo.time)}</span>}
                  </p>
                  {schedule?.days && (
                    <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{schedule.days.map(d => getArabicDay(d)).join(' · ')}</p>
                  )}
                </div>
                <LiveCountdown targetDate={classInfo.dateObj} />
              </div>
              {classInfo.meetLink && (
                <motion.a
                  href={classInfo.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-5 block w-full text-center py-3 rounded-xl font-semibold transition-colors"
                  style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--accent-sky)', border: '1px solid rgba(56,189,248,0.2)' }}
                >
                  انضم للحصة 🎥
                </motion.a>
              )}
            </>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>لا توجد حصة قادمة حالياً</p>
          )}
        </div>
      </motion.div>

      {/* ═══ 5. Upcoming Assignments ═══ */}
      {upcomingAssignments?.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-violet-glow)' }}>
                <FileText size={16} strokeWidth={1.5} style={{ color: 'var(--accent-violet)' }} />
              </div>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>واجبات قادمة</h3>
              <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-violet-glow)', color: 'var(--accent-violet)' }}>{upcomingAssignments.length}</span>
            </div>
            <Link to="/student/assignments" className="text-[12px] font-medium" style={{ color: 'var(--accent-violet)' }}>عرض الكل ←</Link>
          </div>
          <StaggerContainer className="space-y-3">
            {upcomingAssignments.map((a) => {
              const typeInfo = ASSIGNMENT_ICONS[a.type] || ASSIGNMENT_ICONS.default
              const urgency = getUrgencyStyle(a.deadline)
              return (
                <StaggerItem key={a.id}>
                  <Link to={`/student/assignments/${a.id}`}>
                    <motion.div className="fl-card-static p-4 flex items-center gap-4" whileHover={{ y: -1 }}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${typeInfo.color}`}>{typeInfo.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{deadlineText(a.deadline)}</p>
                      </div>
                      <div className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${urgency.bg} ${urgency.text} ${urgency.pulse ? 'animate-pulse-soft' : ''}`}>
                        {deadlineText(a.deadline)}
                      </div>
                    </motion.div>
                  </Link>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </motion.div>
      )}

      {/* ═══ 6. Trainer Note ═══ */}
      {trainerNote && (() => {
        const ns = TRAINER_NOTE_STYLES[trainerNote.type] || TRAINER_NOTE_STYLES.trainer_observation
        const trainerName = trainerNote.data?.trainer_name || 'المدرب'
        return (
          <motion.div variants={fadeUp} className={`fl-card-static p-5 border-r-4 ${ns.border}`} style={{ borderRightStyle: 'solid' }}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${ns.color}`}>{ns.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageCircle size={14} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>ملاحظة المدرب</span>
                </div>
                {trainerNote.title && <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{trainerNote.title}</p>}
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{trainerNote.body}</p>
                <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>— {trainerName} · {timeAgo(trainerNote.created_at)}</p>
              </div>
            </div>
          </motion.div>
        )
      })()}

      {/* ═══ 7. Encouraging Message ═══ */}
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

      {/* ═══ 8. Quick Access Grid ═══ */}
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
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--border-glow)'; e.currentTarget.style.boxShadow = GLOW_SHADOW[item.color] }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
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

      {/* ═══ 9. Wow Moments ═══ */}
      <StudentWowMoments />

      {/* ═══ 10. Community — Activity + Leaderboard ═══ */}
      <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-5">
        {/* Activity feed */}
        <div className="fl-card-static p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Activity size={16} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
              </div>
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>نشاط الزملاء</h3>
            </div>
            <button onClick={() => navigate('/student/group-activity')} className="text-[12px] font-medium transition-colors cursor-pointer" style={{ color: 'var(--accent-sky)' }}>عرض الكل ←</button>
          </div>
          {activityPreview?.length > 0 ? (
            <div className="space-y-2.5">
              {activityPreview.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent-sky)' }} />
                  <p className="text-[12px] truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {a.studentName && <span className="font-medium" style={{ color: 'var(--accent-sky)' }}>{a.studentName} </span>}
                    {a.title}
                  </p>
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(a.created_at)}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] py-3 text-center" style={{ color: 'var(--text-tertiary)' }}>زملائك لم يبدأوا بعد — كن الأول! 🚀</p>
          )}
        </div>

        {/* Leaderboard */}
        <div className="fl-card-static p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center">
                <Trophy size={16} strokeWidth={1.5} style={{ color: 'var(--accent-gold)' }} />
              </div>
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>المتصدرين</h3>
            </div>
            <button onClick={() => navigate('/student/group-activity?tab=leaderboard')} className="text-[12px] font-medium transition-colors cursor-pointer" style={{ color: 'var(--accent-gold)' }}>عرض الكل ←</button>
          </div>
          {leaderboardPreview?.length > 0 ? (
            <div className="space-y-2">
              {leaderboardPreview.map((p) => (
                <div key={p.rank} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${p.isMe ? 'bg-sky-500/5 ring-1 ring-sky-500/10' : ''}`} style={!p.isMe ? { background: 'var(--surface-raised)' } : undefined}>
                  <span className={`text-[13px] font-bold w-5 text-center ${p.rank === 1 ? 'text-gold-400' : ''}`} style={p.rank !== 1 ? { color: 'var(--text-tertiary)' } : undefined}>{p.rank}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: p.isMe ? 'var(--accent-sky-glow)' : 'var(--surface-overlay)', color: p.isMe ? 'var(--accent-sky)' : 'var(--text-tertiary)' }}>{p.name?.[0] || '?'}</div>
                  <span className="text-[13px] font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                    {p.name}
                    {p.isMe && <span className="text-[11px] mr-1" style={{ color: 'var(--accent-sky)' }}>(أنت)</span>}
                  </span>
                  <span className="text-[12px] font-bold font-data" style={{ color: p.rank === 1 ? 'var(--accent-gold)' : 'var(--text-tertiary)' }}>{p.xp} XP</span>
                </div>
              ))}
              {myRank && myRank.rank > 3 && (
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sky-500/5 ring-1 ring-sky-500/10 mt-1">
                  <span className="text-[13px] font-bold w-5 text-center" style={{ color: 'var(--accent-sky)' }}>{myRank.rank}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)' }}>{firstName?.[0] || '?'}</div>
                  <span className="text-[13px] font-medium flex-1" style={{ color: 'var(--text-primary)' }}>أنت <span className="text-[11px]" style={{ color: 'var(--accent-sky)' }}>#{myRank.rank} من {totalInGroup}</span></span>
                  <span className="text-[12px] font-bold font-data" style={{ color: 'var(--accent-sky)' }}>{xp} XP</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px] py-3 text-center" style={{ color: 'var(--text-tertiary)' }}>لا توجد بيانات</p>
          )}
        </div>
      </motion.div>

      {/* ═══ 11. Team Comparison ═══ */}
      {teams?.length >= 2 && (
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
          {teams.slice(0, 2).map((team, i) => {
            const isFirst = i === 0
            const myTeam = studentData?.team_id === team.id
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`fl-card-static p-5 text-center relative overflow-hidden ${myTeam ? 'ring-1 ring-sky-500/20' : ''}`}
              >
                {isFirst && <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-sky-500/5 blur-2xl pointer-events-none" />}
                <div className="relative">
                  <span className="text-2xl">{team.emoji || (i === 0 ? '🔵' : '🟡')}</span>
                  <p className="text-[14px] font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{team.name}</p>
                  <p className="text-[20px] font-bold font-data mt-1" style={{ color: isFirst ? 'var(--accent-sky)' : 'var(--accent-gold)' }}>
                    <AnimatedNumber value={team.total_xp || 0} /> XP
                  </p>
                  {myTeam && <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-2 bg-sky-500/10 text-sky-400">فريقك</span>}
                  {isFirst && teams[1] && team.total_xp > teams[1].total_xp && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 bg-emerald-500/10 text-emerald-400">متصدر 🏆</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* ═══ 12. Payment Status ═══ */}
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
            {nextPayment.period_end && <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>حتى {formatDateAr(nextPayment.period_end)}</p>}
          </div>
          <Link to="/student/billing" className="text-[13px] font-medium mt-3 inline-block transition-colors" style={{ color: 'var(--accent-sky)' }}>عرض تفاصيل الفواتير</Link>
        </motion.div>
      )}

      {/* ═══ 13. Targeted Exercises CTA ═══ */}
      <ExercisesCTA studentId={profile?.id} />

      {/* ═══ Motivational Footer ═══ */}
      <p className="text-center text-[13px] italic pb-4" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>"{quote.en}"</p>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════

function StatOrb({ icon, value, label, glowColor, textColor, onClick, pulse }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl cursor-pointer transition-all ${pulse ? 'animate-pulse-soft' : ''}`}
      style={{ background: glowColor, border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span className="text-lg">{icon}</span>
      <div className="text-start">
        <span className="text-[16px] font-bold font-data block leading-none" style={{ color: textColor }}>
          <AnimatedNumber value={value} />
        </span>
        <span className="text-[10px] block mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
    </motion.button>
  )
}

function LiveCountdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!targetDate) return
    function update() {
      const diff = targetDate - new Date()
      if (diff < 0 && diff > -1800000) {
        setIsLive(true)
        setTimeLeft('الحصة الآن!')
        return
      }
      if (diff < 0) { setTimeLeft(''); return }
      setIsLive(false)
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      if (hours >= 24) {
        setTimeLeft(`بعد ${Math.floor(hours / 24)} يوم و ${hours % 24} ساعة`)
      } else if (hours > 0) {
        setTimeLeft(`بعد ${hours} ساعة و ${mins} دقيقة`)
      } else {
        setTimeLeft(`بعد ${mins} دقيقة`)
      }
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [targetDate])

  if (!timeLeft) return null

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium ${isLive ? 'animate-pulse-soft' : ''}`}
      style={{ background: isLive ? 'rgba(239,68,68,0.12)' : 'var(--accent-sky-glow)', color: isLive ? '#f87171' : 'var(--accent-sky)' }}
    >
      {isLive && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
      <Clock size={14} strokeWidth={1.5} />
      {timeLeft}
    </div>
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
    streak_at_risk: Flame, weekly_tasks_reminder: CalendarDays, improvement_praise: Trophy,
    skill_gap: Crosshair, inactive_warning: Clock, milestone_celebration: Zap,
    level_up_ready: ArrowLeft, study_tip: BookOpen, challenge_invite: Crosshair,
  }
  const NUDGE_COLORS = {
    streak_at_risk: 'amber', weekly_tasks_reminder: 'sky', improvement_praise: 'emerald',
    skill_gap: 'violet', inactive_warning: 'rose', milestone_celebration: 'gold',
    level_up_ready: 'emerald', study_tip: 'sky', challenge_invite: 'violet',
  }

  return (
    <motion.div variants={fadeUp} className="space-y-2">
      {nudges.map((nudge) => {
        const Icon = NUDGE_ICONS[nudge.nudge_type] || Sparkles
        const color = NUDGE_COLORS[nudge.nudge_type] || 'sky'
        const isUrgent = nudge.priority === 'high' || nudge.priority === 'urgent'
        return (
          <motion.div key={nudge.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={`fl-card-static p-4 flex items-start gap-3 ${isUrgent ? 'ring-1 ring-amber-500/20' : ''}`}>
            <div className={`w-8 h-8 rounded-lg ${COLOR_MAP[color] || COLOR_MAP.sky} flex items-center justify-center shrink-0`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{nudge.title_ar}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{nudge.body_ar}</p>
            </div>
            {nudge.action_url && <Link to={nudge.action_url} className="text-[11px] font-medium shrink-0" style={{ color: 'var(--accent-sky)' }}>عرض ←</Link>}
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
