import { useState, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Wallet, CheckCircle2, AlertTriangle, Save, Printer, CreditCard } from 'lucide-react'

const PAYMENT_METHOD = { bank: 'تحويل بنكي', stcpay: 'STC Pay', other: 'أخرى' }
const PAYOUT_STATUS = {
  pending: { label: 'قيد الإعداد', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  processing: { label: 'قيد المعالجة', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  paid: { label: 'مدفوعة', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  failed: { label: 'فشلت', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export default function PartnerPayouts() {
  const { affiliate } = useOutletContext()
  const qc = useQueryClient()

  // Payout settings form
  const [iban, setIban] = useState(affiliate.iban || '')
  const [bankName, setBankName] = useState(affiliate.bank_name || '')
  const [stcpay, setStcpay] = useState(affiliate.stcpay_number || '')
  const hasPaymentInfo = !!(affiliate.iban || affiliate.stcpay_number)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (iban && !/^SA\d{22}$/.test(iban.replace(/\s/g, ''))) throw new Error('IBAN غير صحيح — يجب أن يبدأ بـ SA ويليه 22 رقم')
      const { error } = await supabase.from('affiliates').update({
        iban: iban.replace(/\s/g, '') || null,
        bank_name: bankName || null,
        stcpay_number: stcpay || null,
      }).eq('id', affiliate.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-affiliate'] }),
  })

  // Payouts list
  const { data: payouts = [], isPending } = useQuery({
    queryKey: ['partner-payouts', affiliate.id],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('period_end', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  // Print statement
  const printRef = useRef(null)
  const [printPayout, setPrintPayout] = useState(null)

  const handlePrint = (payout) => {
    setPrintPayout(payout)
    setTimeout(() => window.print(), 200)
  }

  return (
    <div className="space-y-6">
      {/* Print-only statement */}
      <style>{`@media print { body * { visibility: hidden; } .print-statement, .print-statement * { visibility: visible; } .print-statement { position: absolute; top: 0; right: 0; width: 100%; } .no-print { display: none !important; }}`}</style>
      {printPayout && (
        <div className="print-statement hidden print:block p-8" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, color: '#38bdf8' }}>أكاديمية طلاقة</h1>
            <h2 style={{ fontSize: 18 }}>كشف عمولات</h2>
            <p>{printPayout.period_start} — {printPayout.period_end}</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <tbody>
              <tr><td style={{ padding: 4 }}>الشريك:</td><td>{affiliate.full_name}</td></tr>
              <tr><td style={{ padding: 4 }}>كود الإحالة:</td><td>{affiliate.ref_code}</td></tr>
              <tr><td style={{ padding: 4 }}>IBAN:</td><td>{affiliate.iban ? affiliate.iban.slice(0, 6) + '****' + affiliate.iban.slice(-4) : '—'}</td></tr>
            </tbody>
          </table>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead><tr style={{ background: '#f0f0f0' }}><th style={{ padding: 8, border: '1px solid #ccc' }}>عدد المبيعات</th><th style={{ padding: 8, border: '1px solid #ccc' }}>المبلغ</th><th style={{ padding: 8, border: '1px solid #ccc' }}>طريقة الدفع</th></tr></thead>
            <tbody><tr><td style={{ padding: 8, border: '1px solid #ccc', textAlign: 'center' }}>{printPayout.conversion_count}</td><td style={{ padding: 8, border: '1px solid #ccc', textAlign: 'center' }}>{printPayout.amount} ر.س</td><td style={{ padding: 8, border: '1px solid #ccc', textAlign: 'center' }}>{PAYMENT_METHOD[printPayout.payment_method] || '—'}</td></tr></tbody>
          </table>
          {printPayout.transaction_reference && <p style={{ marginTop: 8 }}>مرجع العملية: {printPayout.transaction_reference}</p>}
          <p style={{ marginTop: 24, fontSize: 12, color: '#999', textAlign: 'center' }}>هذا كشف إلكتروني معتمد — أكاديمية طلاقة</p>
        </div>
      )}

      <h1 className="text-lg font-bold text-white font-['Tajawal'] no-print">المدفوعات</h1>

      {/* Payment Settings */}
      <div className="rounded-xl p-5 space-y-4 no-print" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-amber-400" />
          <h2 className="font-bold text-white font-['Tajawal']">معلومات الدفع</h2>
          {hasPaymentInfo ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-['Tajawal'] flex items-center gap-1"><CheckCircle2 size={10} /> مكتملة</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-['Tajawal'] flex items-center gap-1"><AlertTriangle size={10} /> أكمل المعلومات</span>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-white/50 font-['Tajawal']">IBAN (SA + 22 رقم)</label>
            <input value={iban} onChange={e => setIban(e.target.value)} placeholder="SA0000000000000000000000" dir="ltr" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white font-mono" />
          </div>
          <div>
            <label className="text-xs text-white/50 font-['Tajawal']">اسم البنك</label>
            <input value={bankName} onChange={e => setBankName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white font-['Tajawal']" />
          </div>
          <div>
            <label className="text-xs text-white/50 font-['Tajawal']">رقم STC Pay</label>
            <input value={stcpay} onChange={e => setStcpay(e.target.value)} placeholder="+9665..." dir="ltr" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white font-mono" />
          </div>
        </div>

        {saveMutation.isError && <p className="text-xs text-red-400 font-['Tajawal']">{saveMutation.error?.message}</p>}
        {saveMutation.isSuccess && <p className="text-xs text-emerald-400 font-['Tajawal']">تم الحفظ</p>}

        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold font-['Tajawal'] transition disabled:opacity-50">
          <Save size={14} /> حفظ
        </button>
      </div>

      {/* Payouts List */}
      <div className="space-y-3 no-print">
        <h2 className="font-bold text-white font-['Tajawal'] flex items-center gap-2"><CreditCard size={18} className="text-sky-400" /> كشوفات الدفع</h2>
        {isPending ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}</div>
        ) : payouts.length === 0 ? (
          <p className="text-center py-8 text-white/40 font-['Tajawal']">لا توجد دفعات بعد</p>
        ) : (
          payouts.map(p => {
            const ps = PAYOUT_STATUS[p.status] || PAYOUT_STATUS.pending
            return (
              <div key={p.id} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-['Tajawal']">
                    {new Date(p.period_end).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-['Tajawal'] ${ps.cls}`}>{ps.label}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm font-['Tajawal']">
                  <div><span className="text-white/40 text-xs">المبلغ</span><div className="text-amber-400 font-bold">{p.amount} ر.س</div></div>
                  <div><span className="text-white/40 text-xs">عدد المبيعات</span><div className="text-white/80">{p.conversion_count}</div></div>
                  <div><span className="text-white/40 text-xs">طريقة الدفع</span><div className="text-white/80">{PAYMENT_METHOD[p.payment_method] || '—'}</div></div>
                  <div><span className="text-white/40 text-xs">تاريخ الدفع</span><div className="text-white/80">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('ar-SA') : '—'}</div></div>
                </div>
                {p.transaction_reference && <p className="text-xs text-white/40 font-['Tajawal']">مرجع: {p.transaction_reference}</p>}
                <button onClick={() => handlePrint(p)} className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-['Tajawal'] transition">
                  <Printer size={12} /> تحميل كشف
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
