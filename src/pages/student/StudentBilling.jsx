import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CreditCard, ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { PACKAGES, PAYMENT_STATUS } from '../../lib/constants'
import { formatDateAr } from '../../utils/dateHelpers'

export default function StudentBilling() {
  const { profile, studentData } = useAuthStore()
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas

  // Payment history
  const { data: payments, isLoading } = useQuery({
    queryKey: ['student-payments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', profile?.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Moyasar payment link from settings
  const { data: paymentLink } = useQuery({
    queryKey: ['payment-link-setting'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'moyasar_payment_link')
        .single()
      return data?.value || null
    },
  })

  const nextPayment = payments?.find(p => ['pending', 'overdue'].includes(p.status))
  const paidCount = payments?.filter(p => p.status === 'paid').length || 0

  return (
    <div className="space-y-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <CreditCard size={22} className="text-sky-400" />
          </div>
          المدفوعات
        </h1>
        <p className="text-muted text-sm mt-1">تفاصيل الاشتراك والمدفوعات</p>
      </motion.div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="fl-stat-card fl-stat-card-emerald hover:translate-y-[-2px] transition-all duration-200">
          <div className="stat-icon">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
          </div>
          <p className="stat-label">المدفوعات المكتملة</p>
          <p className="stat-number text-3xl font-bold text-[var(--text-primary)]">{paidCount}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="fl-stat-card fl-stat-card-sky hover:translate-y-[-2px] transition-all duration-200">
          <div className="stat-icon">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <CreditCard size={20} className="text-sky-400" />
            </div>
          </div>
          <p className="stat-label">الاشتراك الشهري</p>
          <p className="stat-number text-3xl font-bold text-[var(--text-primary)]">{studentData?.custom_price || pkg.price} <span className="text-sm text-muted font-normal">ريال</span></p>
        </motion.div>
      </div>

      {/* Current package */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fl-card-static p-7"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40">الباقة الحالية</p>
            <p className="text-lg font-bold text-[var(--text-primary)] mt-1">{pkg.name_ar}</p>
            <p className="text-sm text-sky-400 font-bold mt-0.5">{studentData?.custom_price || pkg.price} ريال / شهر</p>
          </div>
          <div className="text-center">
            <span className="badge-blue">{pkg.classes} حصص</span>
            {pkg.private > 0 && <span className="badge-gold mr-2">{pkg.private} خاصة</span>}
          </div>
        </div>
      </motion.div>

      {/* Next payment */}
      {nextPayment && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className={`fl-card-static p-7 border-s-4 ${nextPayment.status === 'overdue' ? 'border-red-500' : 'border-yellow-500'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40">الدفعة القادمة</p>
              <p className="text-lg font-bold text-[var(--text-primary)] mt-1">{nextPayment.amount} ريال</p>
              <p className="text-xs text-muted mt-1">
                {nextPayment.status === 'overdue' ? 'متأخر — ' : 'الموعد: '}
                {formatDateAr(nextPayment.period_end)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`badge-${PAYMENT_STATUS[nextPayment.status]?.color || 'blue'}`}>
                {PAYMENT_STATUS[nextPayment.status]?.label_ar}
              </span>
              {paymentLink && (
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1"
                >
                  ادفع الآن
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Payment history */}
      <div>
        <h2 className="text-section-title mb-4" style={{ color: 'var(--text-primary)' }}>سجل المدفوعات</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}
          </div>
        ) : payments?.length > 0 ? (
          <div className="space-y-3">
            {payments.map((p, i) => {
              const status = PAYMENT_STATUS[p.status]
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="fl-card p-4 flex items-center justify-between hover:translate-y-[-2px] transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      p.status === 'paid' ? 'bg-emerald-500/10' : p.status === 'overdue' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                    }`}>
                      {p.status === 'paid' ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : p.status === 'overdue' ? (
                        <AlertCircle size={18} className="text-red-400" />
                      ) : (
                        <Clock size={18} className="text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-primary)] font-medium">{p.amount} ريال</p>
                      <p className="text-xs text-white/40">
                        {formatDateAr(p.period_start)} — {formatDateAr(p.period_end)}
                      </p>
                      {p.paid_at && (
                        <p className="text-xs text-white/40">دُفع في {formatDateAr(p.paid_at)}</p>
                      )}
                    </div>
                  </div>
                  <span className={`badge-${status?.color || 'blue'}`}>{status?.label_ar}</span>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="fl-card-static p-8 text-center">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--surface-raised)' }}>
              <CreditCard size={28} className="text-muted" />
            </div>
            <p className="text-muted">لا توجد مدفوعات</p>
          </div>
        )}
      </div>
    </div>
  )
}
