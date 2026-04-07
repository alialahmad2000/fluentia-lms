import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import AnimatedNumber from '../../components/ui/AnimatedNumber'
import { Users, UserCheck, Layers, CreditCard, TrendingUp, AlertCircle, Flame, Calendar, ArrowUpRight, ArrowDownRight, Brain, Sparkles, ListChecks, FileText, Zap, Activity, Smartphone } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getGreeting } from '../../utils/dateHelpers'
import { STUDENT_STATUS, PACKAGES } from '../../lib/constants'
import { DashboardSkeleton } from '../../components/ui/PageSkeleton'
import { Link } from 'react-router-dom'
import UserAvatar from '../../components/common/UserAvatar'
import CurriculumActivityCard from '../../components/dashboard/CurriculumActivityCard'
import EnableNotificationsPrompt from '../../components/notifications/EnableNotificationsPrompt'
import DeviceInstallStatusWidget from '../../components/admin/DeviceInstallStatusWidget'

export default function AdminDashboard() {
  const { profile } = useAuthStore()
  const firstName = profile?.display_name || profile?.full_name || ''

  // Total active students
  const { data: studentStats } = useQuery({
    queryKey: ['admin-student-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('status, package')
        .is('deleted_at', null)
      if (!data) return { total: 0, active: 0, byPackage: {} }

      const active = data.filter(s => s.status === 'active').length
      const byPackage = {}
      data.forEach(s => {
        byPackage[s.package] = (byPackage[s.package] || 0) + 1
      })
      return { total: data.length, active, byPackage }
    },
  })

  // Groups count
  const { data: groupCount } = useQuery({
    queryKey: ['admin-group-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      return count || 0
    },
  })

  // Pending payments
  const { data: paymentStats } = useQuery({
    queryKey: ['admin-payment-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('status, amount')
        .in('status', ['pending', 'overdue'])
        .is('deleted_at', null)
      const total = data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
      return { count: data?.length || 0, total }
    },
  })

  // Recent system errors
  const { data: recentErrors } = useQuery({
    queryKey: ['admin-recent-errors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_errors')
        .select('id, error_type, service, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
  })

  // Recent students list
  const { data: recentStudents } = useQuery({
    queryKey: ['admin-recent-students'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, status, package, xp_total, profiles(full_name, avatar_url)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('enrollment_date', { ascending: false })
        .limit(6)
      return data || []
    },
  })

  // Revenue stats (this month vs last month)
  const { data: revenueStats } = useQuery({
    queryKey: ['admin-revenue-stats'],
    queryFn: async () => {
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

      const [thisMonthRes, lastMonthRes, allPaidRes] = await Promise.all([
        supabase.from('payments').select('amount').eq('status', 'paid').gte('paid_at', thisMonthStart).lt('paid_at', nextMonthStart).is('deleted_at', null),
        supabase.from('payments').select('amount').eq('status', 'paid').gte('paid_at', lastMonthStart).lt('paid_at', thisMonthStart).is('deleted_at', null),
        supabase.from('payments').select('amount, status').is('deleted_at', null),
      ])

      const thisMonth = thisMonthRes.data?.reduce((s, p) => s + (p.amount || 0), 0) || 0
      const lastMonth = lastMonthRes.data?.reduce((s, p) => s + (p.amount || 0), 0) || 0
      const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0
      const totalPaid = allPaidRes.data?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0) || 0
      const totalAll = allPaidRes.data?.reduce((s, p) => s + (p.amount || 0), 0) || 0
      const collectionRate = totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0

      return { thisMonth, lastMonth, growth, collectionRate }
    },
  })

  // Empty seats per group
  const { data: groupSeats } = useQuery({
    queryKey: ['admin-group-seats'],
    queryFn: async () => {
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name, code, max_students, level')
        .eq('is_active', true)

      if (!groups) return []

      const results = await Promise.all(groups.map(async (g) => {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)
          .eq('status', 'active')
          .is('deleted_at', null)
        return { ...g, students: count || 0, empty: (g.max_students || 7) - (count || 0) }
      }))

      return results.filter(g => g.empty > 0).sort((a, b) => b.empty - a.empty)
    },
  })

  // All groups (for activity card)
  const { data: allGroups } = useQuery({
    queryKey: ['admin-all-groups-activity'],
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('id, name, code').eq('is_active', true)
      return data || []
    },
  })

  // All student IDs (for activity card)
  const { data: allStudentIds } = useQuery({
    queryKey: ['admin-all-student-ids'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id').eq('status', 'active').is('deleted_at', null)
      return (data || []).map(s => s.id)
    },
  })

  // Upcoming payment renewals (next 7 days)
  const { data: upcomingRenewals } = useQuery({
    queryKey: ['admin-upcoming-renewals'],
    queryFn: async () => {
      const today = new Date()
      const dayOfMonth = today.getDate()
      // Get students whose payment_day is within the next 7 days
      const days = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() + i)
        days.push(d.getDate())
      }
      const { data } = await supabase
        .from('students')
        .select('id, payment_day, custom_price, package, profiles(full_name)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .in('payment_day', days)
      return data || []
    },
  })

  // PWA install stats
  const { data: pwaStats } = useQuery({
    queryKey: ['admin-pwa-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, pwa_installed')
        .eq('role', 'student')
      if (!data) return { installed: 0, total: 0, notInstalled: [] }
      return {
        installed: data.filter(s => s.pwa_installed).length,
        total: data.length,
        notInstalled: data.filter(s => !s.pwa_installed).map(s => s.full_name),
      }
    },
    staleTime: 60000,
  })

  // Loading state
  const isInitialLoading = !profile
  if (isInitialLoading) return <DashboardSkeleton />

  const cards = [
    { label: 'إجمالي الطلاب', value: studentStats?.total ?? '—', sub: `${studentStats?.active ?? 0} نشط`, icon: Users, color: 'sky' },
    { label: 'المجموعات', value: groupCount ?? '—', sub: 'مجموعة نشطة', icon: Layers, color: 'gold' },
    { label: 'مدفوعات معلقة', value: paymentStats?.count ?? '—', sub: paymentStats?.total ? `${paymentStats.total} ر.س` : '', icon: CreditCard, color: 'sky' },
    { label: 'أخطاء النظام', value: recentErrors?.length ?? 0, sub: 'آخر الأخطاء', icon: AlertCircle, color: recentErrors?.length > 0 ? 'red' : 'gold' },
  ]

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title">
          {getGreeting()}، <span className="text-gradient">{firstName}</span>
        </h1>
        <p className="text-[15px] mt-2.5" style={{ color: 'var(--text-tertiary)' }}>لوحة تحكم الإدارة</p>
      </motion.div>

      {/* Push notifications opt-in */}
      <EnableNotificationsPrompt />

      {/* PWA install + notification status per student */}
      <DeviceInstallStatusWidget />

      {/* Quick summary tip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-start gap-3 px-5 py-4 rounded-xl"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-sky-glow)' }}>
          <Sparkles size={16} strokeWidth={1.5} style={{ color: 'var(--accent-sky)' }} />
        </div>
        <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {paymentStats?.count > 0 && <span className="font-semibold" style={{ color: 'var(--accent-gold)' }}>{paymentStats.count} دفعة معلقة</span>}
          {paymentStats?.count > 0 && recentErrors?.length > 0 && ' · '}
          {recentErrors?.length > 0 && <span className="font-semibold" style={{ color: 'var(--accent-rose, #ef4444)' }}>{recentErrors.length} خطأ نظام</span>}
          {!paymentStats?.count && !recentErrors?.length && <span>كل شيء يعمل بسلاسة! الأمور تحت السيطرة.</span>}
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => {
          const variant = card.color === 'gold' ? 'amber' : card.color === 'red' ? 'sky' : 'sky'
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`fl-stat-card ${variant}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{card.label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  card.color === 'gold' ? 'bg-gold-500/10 text-gold-400'
                  : card.color === 'red' ? 'bg-red-500/10 text-red-400'
                  : 'bg-sky-500/10 text-sky-400'
                }`}>
                  <card.icon size={20} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}><AnimatedNumber value={typeof card.value === 'number' ? card.value : 0} duration={0.7} /></p>
              {card.sub && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{card.sub}</p>}
            </motion.div>
          )
        })}
      </div>

      {/* Curriculum Activity Card */}
      <CurriculumActivityCard studentIds={allStudentIds} groups={allGroups} mode="admin" delay={0.32} />

      {/* PWA Install Stats */}
      {pwaStats && pwaStats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className="fl-card p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Smartphone size={16} className="text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>تثبيت التطبيق</h3>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {pwaStats.installed}/{pwaStats.total} طالب ثبّتوا التطبيق
              </p>
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{ width: `${Math.round((pwaStats.installed / pwaStats.total) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
            {Math.round((pwaStats.installed / pwaStats.total) * 100)}% — {pwaStats.total - pwaStats.installed} طالب لم يثبّتوا بعد
          </p>
        </motion.div>
      )}

      {/* Pending Actions — Quick Access */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-[15px] font-bold mb-3" style={{ color: 'var(--text-primary)' }}>إجراءات معلقة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            paymentStats?.count > 0 && { to: '/admin/packages', label: `${paymentStats.count} دفعة معلقة`, icon: CreditCard, color: 'bg-amber-500/10 text-amber-400' },
            { to: '/admin/weekly-tasks', label: 'توليد المهام', icon: ListChecks, color: 'bg-sky-500/10 text-sky-400' },
            recentErrors?.length > 0 && { to: '/admin/settings', label: `${recentErrors.length} خطأ نظام`, icon: AlertCircle, color: 'bg-red-500/10 text-red-400' },
            upcomingRenewals?.length > 0 && { to: '/admin/packages', label: `${upcomingRenewals.length} تجديد قادم`, icon: Calendar, color: 'bg-emerald-500/10 text-emerald-400' },
          ].filter(Boolean).map((action) => (
            <Link key={action.to + action.label} to={action.to} className="fl-card-static p-4 flex items-center gap-3 hover:translate-y-[-1px] transition-all duration-200">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${action.color}`}>
                <action.icon size={16} strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{action.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Revenue + Collection (high priority — shown first) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="fl-card p-7"
        >
          <div className="flex items-center gap-3 mb-6">
            <CreditCard size={18} className="text-emerald-400" />
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>الإيرادات</h3>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-sm text-muted mb-1">هذا الشهر</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{(revenueStats?.thisMonth || 0).toLocaleString()} <span className="text-sm text-muted font-normal">ر.س</span></p>
            </div>
            <div>
              <p className="text-sm text-muted mb-1">الشهر الماضي</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{(revenueStats?.lastMonth || 0).toLocaleString()} <span className="text-sm text-muted font-normal">ر.س</span></p>
            </div>
          </div>
          {revenueStats && revenueStats.growth !== 0 && (
            <div className={`flex items-center gap-1 mt-3 text-xs ${revenueStats?.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {revenueStats?.growth > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{Math.abs(revenueStats?.growth || 0)}% {revenueStats?.growth > 0 ? 'نمو' : 'انخفاض'}</span>
            </div>
          )}
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted">معدل التحصيل</span>
              <span className="text-[var(--text-primary)] font-semibold">{revenueStats?.collectionRate || 0}%</span>
            </div>
            <div className="fl-progress-track" style={{ height: '8px' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${revenueStats?.collectionRate || 0}%`,
                  background: (revenueStats?.collectionRate || 0) >= 80 ? 'var(--accent-emerald)' : (revenueStats?.collectionRate || 0) >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Empty seats */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="fl-card p-7"
        >
          <div className="flex items-center gap-3 mb-6">
            <Layers size={18} className="text-amber-400" />
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>المقاعد المتاحة</h3>
          </div>
          {groupSeats?.length > 0 ? (
            <div className="space-y-2">
              {groupSeats.map((g) => (
                <div key={g.id} className="flex items-center justify-between bg-[var(--surface-base)] rounded-xl p-3">
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{g.name || g.code}</p>
                    <p className="text-xs text-muted">المستوى {g.level}</p>
                  </div>
                  <div className="text-center">
                    <span className={`text-lg font-bold ${g.empty >= 3 ? 'text-emerald-400' : g.empty >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                      {g.empty}
                    </span>
                    <p className="text-xs text-muted">من {g.max_students || 7}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">جميع المجموعات مكتملة</p>
          )}
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Package distribution */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="fl-card p-7"
        >
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp size={18} className="text-sky-400" />
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>توزيع الباقات</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(PACKAGES).map(([key, pkg]) => {
              const count = studentStats?.byPackage?.[key] || 0
              const total = studentStats?.total || 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[var(--text-primary)]">{pkg.name_ar}</span>
                    <span className="text-muted">{count} طالب ({pct}%)</span>
                  </div>
                  <div className="fl-progress-track" style={{ height: '8px' }}>
                    <div
                      className="fl-progress-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Active students */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fl-card p-7"
        >
          <div className="flex items-center gap-3 mb-6">
            <UserCheck size={18} className="text-gold-400" />
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>الطلاب النشطين</h3>
          </div>
          {recentStudents?.length > 0 ? (
            <div className="space-y-2">
              {recentStudents.map((s) => {
                const pkgInfo = PACKAGES[s.package]
                const statusInfo = STUDENT_STATUS[s.status]
                return (
                  <div key={s.id} className="flex items-center justify-between bg-[var(--surface-base)] rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={s.profiles} size={32} rounded="full" gradient="linear-gradient(135deg, rgba(56,189,248,0.3), rgba(56,189,248,0.1))" />
                      <div>
                        <p className="text-sm text-[var(--text-primary)]">{s.profiles?.full_name}</p>
                        <p className="text-xs text-muted">{pkgInfo?.name_ar} &middot; {s.xp_total} XP</p>
                      </div>
                    </div>
                    <span className={`badge-${statusInfo?.color || 'blue'}`}>
                      {statusInfo?.label_ar || s.status}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-muted text-sm">لا يوجد طلاب حتى الآن</p>
          )}
        </motion.div>
      </div>

      {/* Student Activity Today (All Groups) */}
      <AdminActivityWidget />

      {/* AI Profiles Overview */}
      <AIOverviewCard />

      {/* Upcoming renewals */}
      {upcomingRenewals?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="fl-card p-7"
        >
          <div className="flex items-center gap-3 mb-6">
            <Calendar size={18} className="text-sky-400" />
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>تجديدات قادمة (٧ أيام)</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingRenewals.map((s) => {
              const pkgInfo = PACKAGES[s.package]
              const amount = s.custom_price || pkgInfo?.price || 0
              return (
                <div key={s.id} className="flex items-center justify-between bg-[var(--surface-base)] rounded-xl p-3">
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{s.profiles?.full_name}</p>
                    <p className="text-xs text-muted">يوم {s.payment_day} من الشهر</p>
                  </div>
                  <span className="text-sm font-bold text-sky-400">{amount} ر.س</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* System errors (if any) */}
      {recentErrors?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="fl-card-static p-6" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle size={18} className="text-red-400" />
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>أخطاء النظام الأخيرة</h3>
          </div>
          <div className="space-y-2.5">
            {recentErrors.map((e) => (
              <div key={e.id} className="text-xs bg-red-500/5 rounded-lg p-2 border border-red-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-medium">{e.service}</span>
                  <span className="text-muted">{e.error_type}</span>
                </div>
                <p className="text-muted mt-1 truncate">{e.error_message}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function AdminActivityWidget() {
  const { data: activityData, isLoading } = useQuery({
    queryKey: ['admin-student-activity-today'],
    queryFn: async () => {
      const { data: students } = await supabase
        .from('students')
        .select('id, last_active_at, group_id, groups(name, code), profiles(full_name, display_name, avatar_url)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('last_active_at', { ascending: false, nullsFirst: false })
        .limit(12)

      if (!students?.length) return []

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const studentIds = students.map(s => s.id)

      const { data: todaySessions } = await supabase
        .from('user_sessions')
        .select('user_id, started_at, ended_at, duration_minutes')
        .in('user_id', studentIds)
        .gte('started_at', todayStart.toISOString())

      const { data: todayTasks } = await supabase
        .from('student_weekly_tasks')
        .select('student_id')
        .in('student_id', studentIds)
        .eq('status', 'completed')
        .gte('updated_at', todayStart.toISOString())

      const sessionMap = {}
      const taskMap = {}
      ;(todaySessions || []).forEach(s => {
        if (!sessionMap[s.user_id]) sessionMap[s.user_id] = 0
        const mins = s.duration_minutes || (s.ended_at ? Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 60000) : 0)
        sessionMap[s.user_id] += mins
      })
      ;(todayTasks || []).forEach(t => {
        taskMap[t.student_id] = (taskMap[t.student_id] || 0) + 1
      })

      return students.map(s => {
        const now = Date.now()
        const lastActive = s.last_active_at ? new Date(s.last_active_at).getTime() : 0
        const daysSince = lastActive ? (now - lastActive) / (1000 * 60 * 60 * 24) : 999
        let status = 'inactive'
        if (daysSince < 1) status = 'active'
        else if (daysSince < 3) status = 'idle'

        return {
          id: s.id,
          name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
          avatar_url: s.profiles?.avatar_url,
          groupName: s.groups?.code || s.groups?.name || '',
          status,
          timeToday: sessionMap[s.id] || 0,
          tasksToday: taskMap[s.id] || 0,
        }
      })
    },
  })

  const STATUS_DOT = { active: '🟢', idle: '🟡', inactive: '🔴' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.53 }}
      className="fl-card-static p-7"
    >
      <div className="flex items-center gap-3 mb-6">
        <Activity size={18} className="text-emerald-400" />
        <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>نشاط الطلاب اليوم</h3>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
        </div>
      ) : !activityData?.length ? (
        <p className="text-muted text-sm text-center py-4">لا يوجد طلاب</p>
      ) : (
        <div className="space-y-2">
          {activityData.map(s => (
            <Link
              key={s.id}
              to={`/admin/student/${s.id}/progress`}
              className="flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:translate-y-[-1px]"
              style={{ background: 'var(--surface-raised)' }}
            >
              <UserAvatar user={{ display_name: s.name, avatar_url: s.avatar_url }} size={32} rounded="full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                <p className="text-xs text-muted">
                  {s.groupName && `${s.groupName} · `}{s.timeToday > 0 ? `${s.timeToday} د` : 'لم يدخل'} · {s.tasksToday > 0 ? `${s.tasksToday} مهمة` : 'لا مهام'}
                </p>
              </div>
              <span className="text-sm">{STATUS_DOT[s.status]}</span>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function AIOverviewCard() {
  const { data: aiStats } = useQuery({
    queryKey: ['admin-ai-overview'],
    queryFn: async () => {
      const [profilesRes, studentsRes, usageRes] = await Promise.all([
        supabase.from('ai_student_profiles').select('student_id, generated_at', { count: 'exact' }),
        supabase.from('students').select('id', { count: 'exact' }).eq('status', 'active').is('deleted_at', null),
        supabase.from('ai_usage').select('estimated_cost_sar').order('created_at', { ascending: false }).limit(100),
      ])
      const analyzed = profilesRes.count || 0
      const total = studentsRes.count || 0
      const totalCost = (usageRes.data || []).reduce((s, r) => s + (r.estimated_cost_sar || 0), 0)
      return { analyzed, total, totalCost: Math.round(totalCost * 100) / 100 }
    },
  })

  if (!aiStats) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.57 }}
      className="fl-card-static p-7"
    >
      <div className="flex items-center gap-3 mb-6">
        <Brain size={18} className="text-violet-400" />
        <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>الذكاء الاصطناعي</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface-raised)' }}>
          <p className="text-2xl font-bold text-violet-400">{aiStats.analyzed}</p>
          <p className="text-xs text-muted mt-1">ملفات محللة</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface-raised)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{aiStats.total}</p>
          <p className="text-xs text-muted mt-1">إجمالي الطلاب</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface-raised)' }}>
          <p className="text-2xl font-bold text-amber-400">{aiStats.totalCost} <span className="text-sm font-normal">ر.س</span></p>
          <p className="text-xs text-muted mt-1">تكلفة AI</p>
        </div>
      </div>
      {aiStats.analyzed < aiStats.total && (
        <p className="text-xs text-muted text-center mt-3">
          {aiStats.total - aiStats.analyzed} طالب لم يتم تحليلهم بعد — افتح صفحة الطالب من "الطلاب" لتحليل ملفه
        </p>
      )}
    </motion.div>
  )
}
