import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, UserCheck, Layers, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
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
              const total = studentStats?.total || 1
              const pct = Math.round((count / total) * 100)
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

      {/* System errors (if any) */}
      {recentErrors?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
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
