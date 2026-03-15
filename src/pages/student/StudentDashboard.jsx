import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Flame, Zap, Trophy, BookOpen, Calendar, ArrowLeft, CreditCard, Crosshair,
  CalendarDays, FileText, ClipboardCheck, Award, Users, Activity, Target, Swords,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getGreeting, getArabicDay, formatTime, formatDateAr } from '../../utils/dateHelpers'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../lib/constants'
import DailyChallenge from '../../components/gamification/DailyChallenge'
import MysteryBox from '../../components/gamification/MysteryBox'
import { Link } from 'react-router-dom'

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

// ─── Quick Access Cards (pages removed from sidebar) ─────────
const QUICK_ACCESS = [
  { to: '/student/assignments', label: 'الواجبات', icon: FileText, color: 'sky' },
  { to: '/student/quiz', label: 'الاختبارات', icon: ClipboardCheck, color: 'emerald' },
  { to: '/student/schedule', label: 'الجدول', icon: Calendar, color: 'violet' },
  { to: '/student/library', label: 'المكتبة', icon: BookOpen, color: 'amber' },
  { to: '/student/certificates', label: 'شهاداتي', icon: Award, color: 'gold' },
  { to: '/student/leaderboard', label: 'المتصدرين', icon: Trophy, color: 'rose' },
]

const COLOR_MAP = {
  sky: 'bg-sky-500/10 text-sky-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  violet: 'bg-violet-500/10 text-violet-400',
  amber: 'bg-amber-500/10 text-amber-400',
  gold: 'bg-gold-500/10 text-gold-400',
  rose: 'bg-rose-500/10 text-rose-400',
}

// ─── Community cards (pages moved from sidebar) ──────────────
const COMMUNITY_ITEMS = [
  { to: '/student/activity', label: 'نشاط المجموعة', icon: Activity, color: 'sky' },
  { to: '/student/challenges', label: 'التحديات', icon: Target, color: 'emerald' },
  { to: '/student/battles', label: 'المعارك', icon: Swords, color: 'rose' },
  { to: '/student/events', label: 'الفعاليات', icon: Calendar, color: 'violet' },
  { to: '/student/recognition', label: 'تقدير الزملاء', icon: Users, color: 'amber' },
]

export default function StudentDashboard() {
  const { profile, studentData } = useAuthStore()
  const firstName = profile?.display_name || (profile?.full_name || '').split(' ')[0]

  // Weekly tasks progress
  const { data: weeklyProgress } = useQuery({
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

  // Pending assignments count
  const { data: pendingAssignments } = useQuery({
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

  // Recent notifications
  const { data: notifications } = useQuery({
    queryKey: ['student-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, type, read, created_at')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
    enabled: !!profile?.id,
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

  const cards = [
    { label: 'مستوى XP', value: currentLevel.title_ar, sub: `${xp} XP`, icon: Zap, color: 'sky' },
    { label: 'السلسلة', value: `${streak} يوم`, sub: streak >= 7 ? 'استمر!' : 'واصل يومياً', icon: Flame, color: 'gold' },
    { label: 'الواجبات', value: pendingAssignments ?? '—', sub: 'قيد الانتظار', icon: BookOpen, color: 'sky' },
    { label: 'المستوى', value: academicLevel.cefr, sub: academicLevel.name_ar, icon: Trophy, color: 'gold' },
  ]

  return (
    <div className="space-y-12">
      {/* 1. Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title tracking-tight">
          {getGreeting()}، <span className="text-gradient">{firstName}</span>
        </h1>
        <p className="text-muted text-[15px] mt-2.5">
          {pkg.name_ar} &middot; {academicLevel.name_ar} ({academicLevel.cefr})
        </p>
      </motion.div>

      {/* 2. Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="stat-card hover:translate-y-[-2px] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{card.label}</span>
              <div className={`stat-icon ${
                card.color === 'gold' ? 'bg-gold-500/10 text-gold-400' : 'bg-sky-500/10 text-sky-400'
              }`}>
                <card.icon size={18} />
              </div>
            </div>
            <p className="stat-number">{card.value}</p>
            <p className="stat-label">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* 3. Weekly Tasks Progress */}
      {weeklyProgress && (
        <Link to="/student/weekly-tasks">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-7 hover:translate-y-[-2px] transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                <CalendarDays className="text-sky-400" size={18} />
              </div>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>المهام الأسبوعية</h3>
              <span className="mr-auto text-xs text-muted">
                {weeklyProgress.completed_tasks}/{weeklyProgress.total_tasks}
              </span>
              {weeklyProgress.status === 'completed' && (
                <span className="badge-green text-xs">مكتمل</span>
              )}
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-sky-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${weeklyProgress.completion_percentage || 0}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        </Link>
      )}

      {/* 4. Quick Access Grid — pages removed from sidebar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-section-title mb-5" style={{ color: 'var(--color-text-primary)' }}>الوصول السريع</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {QUICK_ACCESS.map((item, i) => (
            <Link key={item.to} to={item.to}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="glass-card p-5 hover:translate-y-[-2px] transition-all duration-200 group"
              >
                <div className={`w-11 h-11 rounded-xl ${COLOR_MAP[item.color]} flex items-center justify-center mb-3`}>
                  <item.icon size={20} />
                </div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.label}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* 5. XP Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-7"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>تقدم المستوى</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              المستوى {currentLevel.level} — {currentLevel.title_ar}
            </p>
          </div>
          {nextLevel && (
            <div className="text-left">
              <p className="text-xs text-muted">التالي</p>
              <p className="text-sm font-medium text-sky-400">
                {nextLevel.title_ar} ({nextLevel.xp} XP)
              </p>
            </div>
          )}
        </div>
        <div className="w-full h-3.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(xpProgress, 100)}%` }}
            transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-l from-sky-400 to-sky-600 rounded-full"
          />
        </div>
        <p className="text-xs text-muted mt-2 text-left">
          {nextLevel ? `${nextLevel.xp - xp} XP للمستوى التالي` : 'أعلى مستوى!'}
        </p>
      </motion.div>

      {/* 6. Community Section — horizontal scroll */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <h2 className="text-section-title mb-5" style={{ color: 'var(--color-text-primary)' }}>المجتمع</h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
          {COMMUNITY_ITEMS.map((item, i) => (
            <Link key={item.to} to={item.to} className="shrink-0">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className="glass-card p-5 w-36 hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-xl ${COLOR_MAP[item.color]} flex items-center justify-center mb-3`}>
                  <item.icon size={18} />
                </div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.label}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* 7. Daily Challenge + Mystery Box */}
      <div className="grid lg:grid-cols-2 gap-6">
        <DailyChallenge />
        <MysteryBox />
      </div>

      {/* 8. Next class + Notifications */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-7 hover:translate-y-[-2px] transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-6">
            <Calendar size={20} className="text-sky-400" />
            <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>الحصة القادمة</h3>
          </div>
          {group ? (
            <div className="space-y-2.5">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{group.name}</p>
              {schedule && (
                <>
                  <p className="text-xs text-muted">
                    {schedule.days?.map(d => getArabicDay(d)).join(' — ')}
                  </p>
                  {nextClassTime && (
                    <p className="text-lg font-bold text-sky-400">
                      {formatTime(nextClassTime)}
                    </p>
                  )}
                </>
              )}
              {group.google_meet_link && (
                <a
                  href={group.google_meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2 text-sm mt-2 py-2 px-4"
                >
                  <span>دخول الحصة</span>
                  <ArrowLeft size={14} />
                </a>
              )}
            </div>
          ) : (
            <p className="text-muted text-sm">لا توجد مجموعة مسجلة</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-card p-7 hover:translate-y-[-2px] transition-all duration-300"
        >
          <h3 className="text-section-title mb-6" style={{ color: 'var(--color-text-primary)' }}>آخر الإشعارات</h3>
          {notifications?.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`text-sm border-s-2 ps-3 ${
                    n.read ? 'border-border-subtle text-muted' : 'border-sky-500'
                  }`}
                  style={{ color: n.read ? undefined : 'var(--color-text-primary)' }}
                >
                  <p className="font-medium text-xs">{n.title}</p>
                  <p className="text-xs text-muted truncate">{n.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">لا توجد إشعارات جديدة</p>
          )}
        </motion.div>
      </div>

      {/* 9. Payment status */}
      {nextPayment && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-7"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CreditCard size={18} className="text-gold-400" />
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>الدفعة القادمة</h3>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              nextPayment.status === 'overdue'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
            }`}>
              {nextPayment.status === 'overdue' ? 'متأخرة' : 'قيد الانتظار'}
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{nextPayment.amount} ر.س</p>
            {nextPayment.period_end && (
              <p className="text-xs text-muted">حتى {formatDateAr(nextPayment.period_end)}</p>
            )}
          </div>
          <Link to="/student/billing" className="text-xs text-sky-400 hover:text-sky-300 mt-2 inline-block">
            عرض تفاصيل الفواتير
          </Link>
        </motion.div>
      )}

      {/* 10. Targeted Exercises CTA */}
      <ExercisesCTA studentId={profile?.id} />
    </div>
  )
}

function ExercisesCTA({ studentId }) {
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-exercises-count'],
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-7 border-violet-500/20 hover:translate-y-[-2px] transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Crosshair size={20} className="text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>تمارين مخصصة لك</h3>
            <p className="text-xs text-muted mt-0.5">{pendingCount} تمرين جاهز لتحسين نقاط ضعفك</p>
          </div>
        </div>
        <Link to="/student/exercises" className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
          <span>ابدأ التدريب</span>
          <ArrowLeft size={14} />
        </Link>
      </div>
    </motion.div>
  )
}
