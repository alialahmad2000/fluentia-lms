import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Flame, Zap, Trophy, BookOpen, Calendar, ArrowLeft, CreditCard, Crosshair } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getGreeting, getArabicDay, formatTime, formatDateAr } from '../../utils/dateHelpers'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES, PAYMENT_STATUS } from '../../lib/constants'
import DailyChallenge from '../../components/gamification/DailyChallenge'
import MysteryBox from '../../components/gamification/MysteryBox'
import AIContentRecommendations from '../../components/ai/AIContentRecommendations'
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

export default function StudentDashboard() {
  const { profile, studentData } = useAuthStore()
  const firstName = profile?.display_name || (profile?.full_name || '').split(' ')[0]

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
        .single()
      return data
    },
    enabled: !!profile?.id,
  })

  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const currentLevel = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const xpProgress = nextLevel ? ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100 : 100
  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas
  const group = studentData?.groups

  const schedule = group?.schedule
  const nextClassDay = schedule?.days?.[0]
  const nextClassTime = schedule?.time

  const cards = [
    { label: 'مستوى XP', value: currentLevel.title_ar, sub: `${xp} XP`, icon: Zap, color: 'sky' },
    { label: 'السلسلة', value: `${streak} يوم`, sub: streak >= 7 ? 'استمر!' : 'واصل يومياً', icon: Flame, color: 'gold' },
    { label: 'الواجبات', value: pendingAssignments ?? '—', sub: 'قيد الانتظار', icon: BookOpen, color: 'sky' },
    { label: 'المستوى', value: academicLevel.cefr, sub: academicLevel.name_ar, icon: Trophy, color: 'gold' },
  ]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">
          {getGreeting()}، <span className="text-gradient">{firstName}</span>
        </h1>
        <p className="text-muted text-sm mt-1">
          {pkg.name_ar} &middot; {academicLevel.name_ar} ({academicLevel.cefr})
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted text-xs">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                card.color === 'gold' ? 'bg-gold-500/10 text-gold-400' : 'bg-sky-500/10 text-sky-400'
              }`}>
                <card.icon size={16} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
            <p className="text-muted text-xs mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* XP Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-white">تقدم المستوى</p>
            <p className="text-xs text-muted">
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
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(xpProgress, 100)}%` }}
            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-l from-sky-400 to-sky-600 rounded-full"
          />
        </div>
        <p className="text-xs text-muted mt-2 text-left">
          {nextLevel ? `${nextLevel.xp - xp} XP للمستوى التالي` : 'أعلى مستوى!'}
        </p>
      </motion.div>

      {/* Daily Challenge + Mystery Box */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DailyChallenge />
        <MysteryBox />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Next class */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-sky-400" />
            <h3 className="font-medium text-white">الحصة القادمة</h3>
          </div>
          {group ? (
            <div className="space-y-2">
              <p className="text-sm text-white">{group.name}</p>
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

        {/* Recent notifications */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-card p-5"
        >
          <h3 className="font-medium text-white mb-4">آخر الإشعارات</h3>
          {notifications?.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`text-sm border-r-2 pr-3 ${
                    n.read ? 'border-border-subtle text-muted' : 'border-sky-500 text-white'
                  }`}
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

      {/* Payment status */}
      {nextPayment && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-gold-400" />
              <h3 className="font-medium text-white">الدفعة القادمة</h3>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              nextPayment.status === 'overdue'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
            }`}>
              {nextPayment.status === 'overdue' ? 'متأخرة' : 'قيد الانتظار'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{nextPayment.amount} ر.س</p>
            {nextPayment.period_end && (
              <p className="text-xs text-muted">حتى {formatDateAr(nextPayment.period_end)}</p>
            )}
          </div>
          <a href="/student/billing" className="text-xs text-sky-400 hover:text-sky-300 mt-2 inline-block">
            عرض تفاصيل الفواتير ←
          </a>
        </motion.div>
      )}

      {/* Targeted Exercises CTA */}
      <ExercisesCTA studentId={profile?.id} />

      {/* AI Content Recommendations */}
      <AIContentRecommendations />
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
      className="glass-card p-5 border-violet-500/20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Crosshair size={20} className="text-violet-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">تمارين مخصصة لك</h3>
            <p className="text-xs text-muted">{pendingCount} تمرين جاهز لتحسين نقاط ضعفك</p>
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
