import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Wallet, DollarSign, TrendingUp, Award, Loader2, CheckCircle2, XCircle, Eye } from 'lucide-react'

const STATUS_TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'قيد الإعداد' },
  { key: 'processing', label: 'قيد المعالجة' },
  { key: 'paid', label: 'مدفوعة' },
  { key: 'failed', label: 'فشلت' },
]

const STATUS_CLS = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  processing: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
}
const STATUS_LABEL = { pending: 'قيد الإعداد', processing: 'قيد المعالجة', paid: 'مدفوعة', failed: 'فشلت' }

export default function AffiliatePayouts() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('all')
  const [showGenerate, setShowGenerate] = useState(false)
  const [markPaying, setMarkPaying] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [payForm, setPayForm] = useState({ method: 'bank', reference: '', paid_at: new Date().toISOString().slice(0, 10), notes: '' })

  // All payouts
  const { data: payouts = [], isPending } = useQuery({
    queryKey: ['admin-affiliate-payouts'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from('affiliate_payouts').select('*, affiliates(full_name, iban, stcpay_number)').order('created_at', { ascending: false })
      return data || []
    },
  })

  // Preview for generation
  const { data: preview = [] } = useQuery({
    queryKey: ['payout-preview'],
    enabled: showGenerate,
    queryFn: async () => {
      const { data: convs } = await supabase.from('affiliate_conversions').select('affiliate_id, commission_amount, affiliates(full_name, iban, stcpay_number)').eq('status', 'approved').is('payout_id', null)
      const grouped = {}
      for (const c of (convs || [])) {
        if (!grouped[c.affiliate_id]) grouped[c.affiliate_id] = { name: c.affiliates?.full_name || '—', hasIban: !!(c.affiliates?.iban || c.affiliates?.stcpay_number), count: 0, total: 0 }
        grouped[c.affiliate_id].count++
        grouped[c.affiliate_id].total += Number(c.commission_amount)
      }
      return Object.entries(grouped).filter(([, v]) => v.total >= 200).map(([id, v]) => ({ affiliate_id: id, ...v }))
    },
  })

  // Generate payouts
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-monthly-payouts')
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setShowGenerate(false)
      qc.invalidateQueries({ queryKey: ['admin-affiliate-payouts'] })
      qc.invalidateQueries({ queryKey: ['payout-preview'] })
    },
  })

  // Mark as paid
  const markPaidMutation = useMutation({
    mutationFn: async () => {
      const p = markPaying
      // Update payout
      const { error } = await supabase.from('affiliate_payouts').update({
        status: 'paid',
        payment_method: payForm.method,
        transaction_reference: payForm.reference,
        paid_at: payForm.paid_at,
        paid_by: profile?.id,
        notes: payForm.notes || null,
      }).eq('id', p.id)
      if (error) throw error

      // Flip linked conversions to paid
      await supabase.from('affiliate_conversions').update({ status: 'paid' }).eq('payout_id', p.id)

      // Send email notification
      try {
        await supabase.functions.invoke('send-affiliate-email', {
          body: { affiliate_id: p.affiliate_id, template: 'payout_sent', data: { amount: p.amount, count: p.conversion_count, period: `${p.period_start} — ${p.period_end}`, method: payForm.method, tx_ref: payForm.reference, paid_at: payForm.paid_at } },
        })
      } catch (e) { console.warn('Email failed:', e) }
    },
    onSuccess: () => {
      setMarkPaying(null)
      setPayForm({ method: 'bank', reference: '', paid_at: new Date().toISOString().slice(0, 10), notes: '' })
      qc.invalidateQueries({ queryKey: ['admin-affiliate-payouts'] })
    },
  })

  // Expanded conversions
  const { data: expandedConvs } = useQuery({
    queryKey: ['payout-conversions', expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data } = await supabase.from('affiliate_conversions').select('id, commission_amount, status, created_at, students:student_id(id, profiles:id(full_name))').eq('payout_id', expandedId)
      return data || []
    },
  })

  const filtered = tab === 'all' ? payouts : payouts.filter(p => p.status === tab)

  // Stats
  const thisMonth = payouts.filter(p => p.status === 'paid' && p.paid_at && new Date(p.paid_at).getMonth() === new Date().getMonth())
  const pendingTotal = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)
  const paidThisMonth = thisMonth.reduce((s, p) => s + Number(p.amount), 0)
  const avgPayout = payouts.filter(p => p.status === 'paid').length ? (payouts.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0) / payouts.filter(p => p.status === 'paid').length).toFixed(0) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">إدارة المدفوعات</h1>
        <button onClick={() => setShowGenerate(true)} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm font-['Tajawal'] transition">
          توليد دفعات الشهر الماضي
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="المستحق" value={`${pendingTotal} ر.س`} />
        <StatCard icon={DollarSign} label="صُرف هذا الشهر" value={`${paidThisMonth} ر.س`} />
        <StatCard icon={TrendingUp} label="متوسط الدفعة" value={`${avgPayout} ر.س`} />
        <StatCard icon={Award} label="عدد الدفعات" value={payouts.length} />
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <Modal onClose={() => setShowGenerate(false)} title="توليد دفعات الشهر الماضي">
          {preview.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] py-4">لا يوجد عمولات جاهزة فوق 200 ريال</p>
          ) : (
            <div className="space-y-3">
              {preview.map(p => (
                <div key={p.affiliate_id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                  <span className="font-['Tajawal'] text-sm text-[var(--text-primary)]">{p.name}</span>
                  <span className="text-sm font-['Tajawal']">{p.count} مبيعات</span>
                  <span className="font-bold text-amber-400 font-['Tajawal']">{p.total} ر.س</span>
                  {!p.hasIban && <span className="text-xs text-red-400">⚠ لا يوجد IBAN</span>}
                </div>
              ))}
              <div className="border-t border-[var(--border-subtle)] pt-3 flex justify-between items-center">
                <span className="font-bold text-[var(--text-primary)] font-['Tajawal']">الإجمالي: {preview.reduce((s, p) => s + p.total, 0)} ر.س ({preview.length} دفعات)</span>
                <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm font-['Tajawal']">
                  {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'تأكيد التوليد'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Mark as Paid Modal */}
      {markPaying && (
        <Modal onClose={() => setMarkPaying(null)} title={`تسجيل دفعة — ${markPaying.affiliates?.full_name}`}>
          <div className="space-y-3">
            <div><label className="text-xs text-[var(--text-muted)] font-['Tajawal']">المبلغ</label><p className="text-lg font-bold text-amber-400">{markPaying.amount} ر.س</p></div>
            <div>
              <label className="text-xs text-[var(--text-muted)] font-['Tajawal']">طريقة الدفع</label>
              <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-['Tajawal']">
                <option value="bank">تحويل بنكي</option>
                <option value="stcpay">STC Pay</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] font-['Tajawal']">مرجع العملية *</label>
              <input value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]" required />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] font-['Tajawal']">تاريخ الدفع</label>
              <input type="date" value={payForm.paid_at} onChange={e => setPayForm({ ...payForm, paid_at: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-primary)]" />
            </div>
            <button onClick={() => markPaidMutation.mutate()} disabled={markPaidMutation.isPending || !payForm.reference} className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold font-['Tajawal'] disabled:opacity-50">
              {markPaidMutation.isPending ? 'جاري...' : 'تأكيد الدفع'}
            </button>
          </div>
        </Modal>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-lg text-xs font-['Tajawal'] transition ${tab === t.key ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'bg-[var(--surface-card)] text-[var(--text-muted)] border border-[var(--border-subtle)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isPending ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[var(--surface-card)] animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-[var(--text-muted)] font-['Tajawal']">لا توجد دفعات</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id}>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] text-sm font-['Tajawal']">
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div><span className="text-[var(--text-muted)] text-xs">المسوّق</span><div className="text-[var(--text-primary)]">{p.affiliates?.full_name || '—'}</div></div>
                  <div><span className="text-[var(--text-muted)] text-xs">المبلغ</span><div className="text-amber-400 font-bold">{p.amount} ر.س</div></div>
                  <div><span className="text-[var(--text-muted)] text-xs">المبيعات</span><div>{p.conversion_count}</div></div>
                  <div><span className="text-[var(--text-muted)] text-xs">الفترة</span><div className="text-xs">{p.period_start} — {p.period_end}</div></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CLS[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(p.status === 'pending' || p.status === 'processing') && (
                    <button onClick={() => setMarkPaying(p)} className="px-2 py-1 rounded text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"><CheckCircle2 size={12} /></button>
                  )}
                  <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="px-2 py-1 rounded text-xs bg-white/5 text-[var(--text-muted)] border border-[var(--border-subtle)] hover:bg-white/10"><Eye size={12} /></button>
                </div>
              </div>
              {expandedId === p.id && expandedConvs && (
                <div className="mr-4 mt-1 space-y-1">
                  {expandedConvs.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--surface-base)] text-xs font-['Tajawal']">
                      <span>{new Date(c.created_at).toLocaleDateString('ar-SA')}</span>
                      <span className="text-[var(--text-muted)]">{c.students?.profiles?.full_name?.charAt(0)}***</span>
                      <span className="text-amber-400">{c.commission_amount} ر.س</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl p-4 bg-[var(--surface-card)] border border-[var(--border-subtle)]">
      <Icon size={18} className="text-amber-400 mb-2" />
      <div className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">{value}</div>
      <div className="text-xs text-[var(--text-muted)] font-['Tajawal']">{label}</div>
    </div>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[var(--text-primary)] font-['Tajawal']">{title}</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] text-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
