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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard size={24} className="text-sky-400" />
          المدفوعات
        </h1>
        <p className="text-muted text-sm mt-1">تفاصيل الاشتراك والمدفوعات</p>
      </div>

      {/* Current package */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">الباقة الحالية</p>
            <p className="text-lg font-bold text-white mt-1">{pkg.name_ar}</p>
            <p className="text-sm text-sky-400 font-bold mt-0.5">{studentData?.custom_price || pkg.price} ريال / شهر</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted">{pkg.classes} حصص</p>
            {pkg.private > 0 && <p className="text-xs text-gold-400">{pkg.private} خاصة</p>}
          </div>
        </div>
      </motion.div>

      {/* Next payment */}
      {nextPayment && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`glass-card p-5 border-s-4 ${nextPayment.status === 'overdue' ? 'border-red-500' : 'border-yellow-500'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">الدفعة القادمة</p>
              <p className="text-lg font-bold text-white mt-1">{nextPayment.amount} ريال</p>
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
        <h2 className="text-sm font-medium text-white mb-3">سجل المدفوعات</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}
          </div>
        ) : payments?.length > 0 ? (
          <div className="space-y-2">
            {payments.map((p, i) => {
              const status = PAYMENT_STATUS[p.status]
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {p.status === 'paid' ? (
                      <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    ) : p.status === 'overdue' ? (
                      <AlertCircle size={18} className="text-red-400 shrink-0" />
                    ) : (
                      <Clock size={18} className="text-yellow-400 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm text-white font-medium">{p.amount} ريال</p>
                      <p className="text-xs text-muted">
                        {formatDateAr(p.period_start)} — {formatDateAr(p.period_end)}
                      </p>
                      {p.paid_at && (
                        <p className="text-[10px] text-muted">دُفع في {formatDateAr(p.paid_at)}</p>
                      )}
                    </div>
                  </div>
                  <span className={`badge-${status?.color || 'blue'}`}>{status?.label_ar}</span>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <CreditCard size={32} className="text-muted mx-auto mb-2" />
            <p className="text-muted">لا توجد مدفوعات</p>
          </div>
        )}
      </div>
    </div>
  )
}
