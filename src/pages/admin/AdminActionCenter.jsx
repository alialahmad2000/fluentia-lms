import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Zap, FileText, CreditCard, Users, AlertTriangle, Clock,
  CheckCircle2, Bell, TrendingDown, Calendar, ArrowLeft,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import UserAvatar from '../../components/common/UserAvatar'

const getGreetingTime = () => {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 17) return 'مساء الخير'
  return 'مساء الخير'
}

export default function AdminActionCenter() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const firstName = (profile?.display_name || profile?.full_name || '').split(' ')[0]

  // Pending submissions
  const { data: pendingSubmissions } = useQuery({
    queryKey: ['action-center-pending'],
    queryFn: async () => {
      const { count } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted')
        .is('deleted_at', null)
      return count || 0
    },
  })

  // Overdue payments
  const { data: overduePayments } = useQuery({
    queryKey: ['action-center-overdue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, amount, student_id, profiles:student_id(display_name, full_name)')
        .eq('status', 'overdue')
        .is('deleted_at', null)
        .limit(10)
      return data || []
    },
  })

  // Students with no activity (7 days)
  const { data: inactiveStudents } = useQuery({
    queryKey: ['action-center-inactive'],
    queryFn: async () => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const { data } = await supabase
        .from('students')
        .select('id, last_active_at, profiles(display_name, full_name, avatar_url), groups(code)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .or(`last_active_at.is.null,last_active_at.lt.${sevenDaysAgo.toISOString()}`)
        .limit(10)
      return data || []
    },
  })

  // Today's classes
  const { data: todayClasses } = useQuery({
    queryKey: ['action-center-classes'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('classes')
        .select('id, title, start_time, end_time, groups(code, name)')
        .eq('date', today)
        .order('start_time')
      return data || []
    },
  })

  // Unread notifications (admin)
  const { data: unreadNotifs } = useQuery({
    queryKey: ['action-center-notifs'],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile?.id)
        .eq('is_read', false)
      return count || 0
    },
    enabled: !!profile?.id,
  })

  // Assignments due today
  const { data: dueTodayCount } = useQuery({
    queryKey: ['action-center-due-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const { count } = await supabase
        .from('assignments')
        .select('id', { count: 'exact', head: true })
        .gte('deadline', today)
        .lt('deadline', tomorrow.toISOString().split('T')[0])
        .is('deleted_at', null)
      return count || 0
    },
  })

  const today = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Action items
  const actions = [
    pendingSubmissions > 0 && {
      icon: FileText,
      color: 'amber',
      title: `${pendingSubmissions} واجب معلق للتقييم`,
      desc: 'واجبات الطلاب تنتظر تقييمك',
      action: () => navigate('/trainer/writing'),
      btnLabel: 'ابدأ التقييم',
    },
    overduePayments?.length > 0 && {
      icon: CreditCard,
      color: 'red',
      title: `${overduePayments.length} مدفوعات متأخرة`,
      desc: overduePayments.slice(0, 3).map(p =>
        `${p.profiles?.display_name || p.profiles?.full_name || '—'}: ${p.amount} ر.س`
      ).join(' · '),
      action: () => navigate('/admin/packages'),
      btnLabel: 'عرض المدفوعات',
    },
    inactiveStudents?.length > 0 && {
      icon: AlertTriangle,
      color: 'orange',
      title: `${inactiveStudents.length} طالب غير نشط`,
      desc: 'لم يسجل دخول منذ 7 أيام أو أكثر',
      action: () => navigate('/admin/users'),
      btnLabel: 'عرض الطلاب',
    },
    dueTodayCount > 0 && {
      icon: Clock,
      color: 'sky',
      title: `${dueTodayCount} واجب ينتهي اليوم`,
      desc: 'واجبات موعدها النهائي اليوم',
      action: () => navigate('/trainer/assignments'),
      btnLabel: 'عرض الواجبات',
    },
    unreadNotifs > 0 && {
      icon: Bell,
      color: 'violet',
      title: `${unreadNotifs} إشعار جديد`,
      desc: 'لديك إشعارات غير مقروءة',
      action: null,
      btnLabel: null,
    },
  ].filter(Boolean)

  const COLOR_MAP = {
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', btn: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', btn: 'bg-red-500/20 hover:bg-red-500/30 text-red-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', btn: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400' },
    sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', btn: 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', btn: 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-400' },
  }

  return (
    <div className="space-y-12 max-w-4xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title text-[var(--text-primary)] flex items-center gap-2">
          <Zap size={24} className="text-gold-400" />
          {getGreetingTime()}، {firstName}
        </h1>
        <p className="text-muted text-sm mt-1">{today}</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {[
          { label: 'واجبات معلقة', value: pendingSubmissions ?? '—', icon: FileText, color: 'text-amber-400' },
          { label: 'متأخرات', value: overduePayments?.length ?? '—', icon: CreditCard, color: 'text-red-400' },
          { label: 'غير نشطين', value: inactiveStudents?.length ?? '—', icon: TrendingDown, color: 'text-orange-400' },
          { label: 'حصص اليوم', value: todayClasses?.length ?? '—', icon: Calendar, color: 'text-sky-400' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="fl-card p-4"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.color === 'text-amber-400' ? 'bg-amber-500/10' : stat.color === 'text-red-400' ? 'bg-red-500/10' : stat.color === 'text-orange-400' ? 'bg-orange-500/10' : 'bg-sky-500/10'} flex items-center justify-center mb-2`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            <p className="text-xs text-muted mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Action Items */}
      <div>
        <h2 className="text-section-title mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle size={14} className="text-amber-400" />
          </div>
          مهام تحتاج انتباهك
        </h2>

        {actions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fl-card-static p-8 text-center"
          >
            <CheckCircle2 size={40} className="text-emerald-400/30 mx-auto mb-3" />
            <p className="text-emerald-400 font-medium">كل شيء تمام!</p>
            <p className="text-xs text-muted mt-1">لا توجد مهام معلقة حالياً</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {actions.map((item, i) => {
              const colors = COLOR_MAP[item.color] || COLOR_MAP.sky
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`fl-card p-4 border-s-4 ${colors.border} flex items-center justify-between gap-4`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                      <item.icon size={18} className={colors.text} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">{item.desc}</p>
                    </div>
                  </div>
                  {item.action && (
                    <button
                      onClick={item.action}
                      className={`btn-secondary shrink-0 text-xs px-4 py-2 rounded-xl font-medium transition-all ${colors.btn}`}
                    >
                      {item.btnLabel}
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      {todayClasses?.length > 0 && (
        <div>
          <h2 className="text-section-title mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Calendar size={14} className="text-sky-400" />
            </div>
            حصص اليوم
          </h2>
          <div className="space-y-2">
            {todayClasses.map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="fl-card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                    <Clock size={18} className="text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{cls.title || cls.groups?.name || 'حصة'}</p>
                    <p className="text-xs text-muted">{cls.groups?.code}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-mono text-[var(--text-primary)]">
                    {cls.start_time?.slice(0, 5)} — {cls.end_time?.slice(0, 5)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Students List */}
      {inactiveStudents?.length > 0 && (
        <div>
          <h2 className="text-section-title mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Users size={14} className="text-orange-400" />
            </div>
            طلاب غير نشطين (7+ أيام)
          </h2>
          <div className="fl-card-static divide-y divide-border-subtle overflow-hidden">
            {inactiveStudents.slice(0, 5).map((s) => {
              const name = s.profiles?.display_name || s.profiles?.full_name || '—'
              const lastActive = s.last_active_at
                ? new Date(s.last_active_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
                : 'لم يسجل دخول'
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={s.profiles} size={32} rounded="full" gradient="linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.1))" />
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{name}</p>
                      <p className="text-xs text-muted">{s.groups?.code || '—'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted">{lastActive}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
