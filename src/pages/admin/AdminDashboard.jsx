import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, UserCheck, Layers, CreditCard, TrendingUp, AlertCircle, Flame, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { getGreeting } from '../../utils/dateHelpers'
import { STUDENT_STATUS, PACKAGES } from '../../lib/constants'

export default function AdminDashboard() {
  const { profile } = useAuthStore()
  const firstName = profile?.display_name || (profile?.full_name || '').split(' ')[0]

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
        .select('id, status, package, xp_total, profiles(full_name)')
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

  const cards = [
    { label: 'إجمالي الطلاب', value: studentStats?.total ?? '—', sub: `${studentStats?.active ?? 0} نشط`, icon: Users, color: 'sky' },
    { label: 'المجموعات', value: groupCount ?? '—', sub: 'مجموعة نشطة', icon: Layers, color: 'gold' },
    { label: 'مدفوعات معلقة', value: paymentStats?.count ?? '—', sub: paymentStats?.total ? `${paymentStats.total} ر.س` : '', icon: CreditCard, color: 'sky' },
    { label: 'أخطاء النظام', value: recentErrors?.length ?? 0, sub: 'آخر الأخطاء', icon: AlertCircle, color: recentErrors?.length > 0 ? 'red' : 'gold' },
  ]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">
          {getGreeting()}، <span className="text-gradient">{firstName}</span>
        </h1>
        <p className="text-muted text-sm mt-1">لوحة تحكم الإدارة</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                card.color === 'gold' ? 'bg-gold-500/10 text-gold-400'
                : card.color === 'red' ? 'bg-red-500/10 text-red-400'
                : 'bg-sky-500/10 text-sky-400'
              }`}>
                <card.icon size={16} />
              </div>
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
            {card.sub && <p className="text-muted text-xs mt-1">{card.sub}</p>}
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Package distribution */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-sky-400" />
            <h3 className="font-medium text-white">توزيع الباقات</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(PACKAGES).map(([key, pkg]) => {
              const count = studentStats?.byPackage?.[key] || 0
              const total = studentStats?.total || 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-white">{pkg.name_ar}</span>
                    <span className="text-muted">{count} طالب ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
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
          transition={{ delay: 0.45 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <UserCheck size={18} className="text-gold-400" />
            <h3 className="font-medium text-white">الطلاب النشطين</h3>
          </div>
          {recentStudents?.length > 0 ? (
            <div className="space-y-2">
              {recentStudents.map((s) => {
                const pkgInfo = PACKAGES[s.package]
                const statusInfo = STUDENT_STATUS[s.status]
                return (
                  <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-xs font-bold">
                        {s.profiles?.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm text-white">{s.profiles?.full_name}</p>
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

      {/* Revenue + Collection */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={18} className="text-emerald-400" />
            <h3 className="font-medium text-white">الإيرادات</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted text-xs">هذا الشهر</p>
              <p className="text-xl font-bold text-white">{(revenueStats?.thisMonth || 0).toLocaleString()} <span className="text-xs text-muted">ر.س</span></p>
            </div>
            <div>
              <p className="text-muted text-xs">الشهر الماضي</p>
              <p className="text-xl font-bold text-white">{(revenueStats?.lastMonth || 0).toLocaleString()} <span className="text-xs text-muted">ر.س</span></p>
            </div>
          </div>
          {revenueStats && revenueStats.growth !== 0 && (
            <div className={`flex items-center gap-1 mt-3 text-xs ${revenueStats?.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {revenueStats?.growth > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{Math.abs(revenueStats?.growth || 0)}% {revenueStats?.growth > 0 ? 'نمو' : 'انخفاض'}</span>
            </div>
          )}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted">معدل التحصيل</span>
              <span className="text-white font-medium">{revenueStats?.collectionRate || 0}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${(revenueStats?.collectionRate || 0) >= 80 ? 'bg-emerald-500' : (revenueStats?.collectionRate || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${revenueStats?.collectionRate || 0}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Empty seats */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers size={18} className="text-amber-400" />
            <h3 className="font-medium text-white">المقاعد المتاحة</h3>
          </div>
          {groupSeats?.length > 0 ? (
            <div className="space-y-2">
              {groupSeats.map((g) => (
                <div key={g.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div>
                    <p className="text-sm text-white">{g.name || g.code}</p>
                    <p className="text-xs text-muted">المستوى {g.level}</p>
                  </div>
                  <div className="text-center">
                    <span className={`text-lg font-bold ${g.empty >= 3 ? 'text-emerald-400' : g.empty >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                      {g.empty}
                    </span>
                    <p className="text-[10px] text-muted">من {g.max_students || 7}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">جميع المجموعات مكتملة</p>
          )}
        </motion.div>
      </div>

      {/* Upcoming renewals */}
      {upcomingRenewals?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-sky-400" />
            <h3 className="font-medium text-white">تجديدات قادمة (٧ أيام)</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcomingRenewals.map((s) => {
              const pkgInfo = PACKAGES[s.package]
              const amount = s.custom_price || pkgInfo?.price || 0
              return (
                <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div>
                    <p className="text-sm text-white">{s.profiles?.full_name}</p>
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
          className="glass-card p-5 border-red-500/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-red-400" />
            <h3 className="font-medium text-white">أخطاء النظام الأخيرة</h3>
          </div>
          <div className="space-y-2">
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
