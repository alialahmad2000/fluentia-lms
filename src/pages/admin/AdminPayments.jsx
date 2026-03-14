import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Plus, Edit3, Loader2, X, AlertTriangle, Download, DollarSign, Clock, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { formatDateAr } from '../../utils/dateHelpers'
import { PACKAGES } from '../../lib/constants'
import { exportToCSV } from '../../utils/exportData'

const PAYMENT_STATUS = {
  paid: { label: 'مدفوع', badge: 'badge-green' },
  partial: { label: 'جزئي', badge: 'badge-yellow' },
  pending: { label: 'معلق', badge: 'badge-blue' },
  overdue: { label: 'متأخر', badge: 'badge-red' },
  failed: { label: 'فشل', badge: 'badge-red' },
}

const PAYMENT_METHOD = {
  moyasar: 'بطاقة (مُيسّر)',
  bank_transfer: 'تحويل بنكي',
  cash: 'نقدي',
  free: 'مجاني',
}

export default function AdminPayments() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editPayment, setEditPayment] = useState(null)

  // Payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('id, amount, status, method, period_start, period_end, paid_at, notes, created_at, students:student_id(id, package, custom_price, profiles(full_name, display_name))')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filterStatus) query = query.eq('status', filterStatus)
      const { data } = await query
      return data || []
    },
  })

  // Students for dropdown
  const { data: students } = useQuery({
    queryKey: ['all-active-students'],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, package, custom_price, profiles(full_name, display_name)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('enrollment_date')
      return data || []
    },
  })

  // Save payment
  const saveMutation = useMutation({
    mutationFn: async (paymentData) => {
      if (paymentData.id) {
        const { id, ...updates } = paymentData
        const { error } = await supabase.from('payments').update(updates).eq('id', id).select()
        if (error) throw error
      } else {
        const { error } = await supabase.from('payments').insert({ ...paymentData, recorded_by: profile?.id }).select()
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      setShowForm(false)
      setEditPayment(null)
    },
    onError: (err) => {
      console.error('Save payment error:', err)
    },
  })

  function getStudentName(s) {
    return s?.profiles?.display_name || s?.profiles?.full_name || 'طالب'
  }

  function handleExportCSV() {
    if (!payments?.length) return
    const columns = [
      { key: (p) => getStudentName(p.students), label: 'الطالب' },
      { key: (p) => p.amount || '', label: 'المبلغ' },
      { key: (p) => PAYMENT_STATUS[p.status]?.label || p.status, label: 'الحالة' },
      { key: (p) => PAYMENT_METHOD[p.method] || p.method || '', label: 'طريقة الدفع' },
      { key: (p) => p.period_start || '', label: 'من' },
      { key: (p) => p.period_end || '', label: 'إلى' },
      { key: (p) => p.paid_at ? formatDateAr(p.paid_at) : '', label: 'تاريخ الدفع' },
    ]
    exportToCSV(payments, 'payments', columns)
  }

  // Summary stats
  const totalPaid = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  const overdueCount = payments?.filter(p => p.status === 'overdue').length || 0
  const pendingCount = payments?.filter(p => p.status === 'pending').length || 0

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CreditCard size={22} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-page-title text-white">المدفوعات</h1>
            <p className="text-muted text-sm mt-1">{payments?.length || 0} سجل</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={!payments?.length}
            className="btn-secondary text-sm py-2 flex items-center gap-2"
          >
            <Download size={16} /> تصدير CSV
          </button>
          <button
            onClick={() => { setEditPayment(null); setShowForm(true) }}
            className="btn-primary text-sm py-2 flex items-center gap-2"
          >
            <Plus size={16} /> تسجيل دفعة
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="stat-icon bg-emerald-500/10">
            <DollarSign size={20} className="text-emerald-400" />
          </div>
          <p className="stat-number text-emerald-400">{totalPaid.toLocaleString()}</p>
          <p className="stat-label">ريال مدفوع</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-amber-500/10">
            <Clock size={20} className="text-amber-400" />
          </div>
          <p className="stat-number text-amber-400">{pendingCount}</p>
          <p className="stat-label">معلق</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-red-500/10">
            <AlertCircle size={20} className="text-red-400" />
          </div>
          <p className="stat-number text-red-400">{overdueCount}</p>
          <p className="stat-label">متأخر</p>
        </div>
      </div>

      {/* Filter */}
      <div className="glass-card p-7">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field py-2 px-3 text-sm w-auto">
          <option value="">كل الحالات</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Payments table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" size={24} /></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-right">الطالب</th>
                  <th className="text-right">المبلغ</th>
                  <th className="text-right">الطريقة</th>
                  <th className="text-right">الفترة</th>
                  <th className="text-right">الحالة</th>
                  <th className="text-right">التاريخ</th>
                  <th className="text-right">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {payments?.map(p => {
                  const statusConfig = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.pending
                  return (
                    <tr key={p.id}>
                      <td className="text-white">{getStudentName(p.students)}</td>
                      <td className="text-white font-medium">{p.amount?.toLocaleString()} ريال</td>
                      <td className="text-muted">{PAYMENT_METHOD[p.method] || p.method || '—'}</td>
                      <td className="text-muted text-xs">
                        {p.period_start && p.period_end
                          ? `${formatDateAr(p.period_start)} - ${formatDateAr(p.period_end)}`
                          : '—'}
                      </td>
                      <td>
                        <span className={statusConfig.badge}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="text-muted text-xs">{formatDateAr(p.paid_at || p.created_at)}</td>
                      <td>
                        <button onClick={() => { setEditPayment(p); setShowForm(true) }} className="btn-icon w-8 h-8 text-muted hover:text-sky-400 transition-all duration-200">
                          <Edit3 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {payments?.length === 0 && (
              <div className="text-center py-12 text-muted">لا توجد مدفوعات</div>
            )}
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      <AnimatePresence>
        {showForm && (
          <PaymentFormModal
            payment={editPayment}
            students={students}
            onClose={() => { setShowForm(false); setEditPayment(null) }}
            onSave={(data) => saveMutation.mutate(data)}
            saving={saveMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PaymentFormModal({ payment, students, onClose, onSave, saving }) {
  const [studentId, setStudentId] = useState(payment?.students?.id || '')
  const [amount, setAmount] = useState(payment?.amount || '')
  const [status, setStatus] = useState(payment?.status || 'paid')
  const [method, setMethod] = useState(payment?.method || 'bank_transfer')
  const [periodStart, setPeriodStart] = useState(payment?.period_start || '')
  const [periodEnd, setPeriodEnd] = useState(payment?.period_end || '')
  const [notes, setNotes] = useState(payment?.notes || '')

  function handleSubmit(e) {
    e.preventDefault()
    const data = {
      student_id: studentId,
      amount: parseInt(amount),
      status,
      method,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      notes: notes || null,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    }
    if (payment?.id) data.id = payment.id
    onSave(data)
  }

  // Auto-fill amount from student package
  function handleStudentChange(sid) {
    setStudentId(sid)
    const student = students?.find(s => s.id === sid)
    if (student) {
      const price = student.custom_price || PACKAGES[student.package]?.price || 0
      setAmount(price)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-card-raised p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>{payment ? 'تعديل الدفعة' : 'تسجيل دفعة جديدة'}</h2>
          <button onClick={onClose} className="btn-icon w-8 h-8 text-muted hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">الطالب</label>
            <select value={studentId} onChange={(e) => handleStudentChange(e.target.value)} className="input-field" required disabled={!!payment}>
              <option value="">اختر طالب...</option>
              {students?.map(s => (
                <option key={s.id} value={s.id}>
                  {s.profiles?.display_name || s.profiles?.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="input-label">المبلغ (ريال)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field" dir="ltr" required />
            </div>
            <div>
              <label className="input-label">الحالة</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
                {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">طريقة الدفع</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="input-field">
              {Object.entries(PAYMENT_METHOD).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="input-label">بداية الفترة</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input-field" dir="ltr" />
            </div>
            <div>
              <label className="input-label">نهاية الفترة</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input-field" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="input-label">ملاحظات</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field resize-none" rows={2} />
          </div>
          <div className="flex items-center gap-3 pt-3">
            <button type="submit" disabled={saving} className="btn-primary text-sm py-2 flex items-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              {payment ? 'تحديث' : 'تسجيل الدفعة'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost text-sm py-2">إلغاء</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
