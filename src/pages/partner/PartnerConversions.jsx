import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Clock, CheckCircle2, CreditCard, XCircle } from 'lucide-react'

const TABS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'معلقة' },
  { key: 'approved', label: 'جاهزة' },
  { key: 'paid', label: 'مصروفة' },
  { key: 'reversed', label: 'ملغاة' },
]

const STATUS = {
  pending: { label: 'معلقة', tip: 'تحت فترة الحماية (14 يوم)', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Clock },
  approved: { label: 'جاهزة', tip: 'جاهزة للصرف في الدفعة القادمة', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  paid: { label: 'مصروفة', tip: 'تم صرفها', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30', icon: CreditCard },
  reversed: { label: 'ملغاة', tip: 'تم إلغاؤها', cls: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle },
}

function maskName(name) {
  if (!name) return '—'
  return name.split(' ').map(w => w.charAt(0) + '***').join(' ')
}

export default function PartnerConversions() {
  const { affiliate } = useOutletContext()
  const [tab, setTab] = useState('all')

  const { data: conversions = [], isPending } = useQuery({
    queryKey: ['partner-conversions', affiliate.id],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_conversions')
        .select('*, students:student_id(id, profiles:id(full_name))')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const filtered = tab === 'all' ? conversions : conversions.filter(c => c.status === tab)
  const counts = conversions.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc }, {})

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-white font-['Tajawal']">عملائي</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-['Tajawal'] whitespace-nowrap transition ${
              tab === t.key
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
            {t.key !== 'all' && counts[t.key] ? <span className="text-xs opacity-60">({counts[t.key]})</span> : null}
          </button>
        ))}
      </div>

      {/* Table */}
      {isPending ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-white/40 font-['Tajawal']">لا توجد تحويلات</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const st = STATUS[c.status] || STATUS.pending
            const StIcon = st.icon
            const studentName = c.students?.profiles?.full_name
            const dueDate = c.first_payment_at ? new Date(new Date(c.first_payment_at).getTime() + 14 * 86400000).toLocaleDateString('ar-SA') : '—'

            return (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl text-sm font-['Tajawal']" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <StIcon size={16} className={st.cls.split(' ')[1]} />
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-white/40 text-xs">التاريخ</span>
                    <div className="text-white/80">{new Date(c.created_at).toLocaleDateString('ar-SA')}</div>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs">الطالب</span>
                    <div className="text-white/80">{maskName(studentName)}</div>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs">العمولة</span>
                    <div className="text-amber-400">{c.commission_amount} ر.س</div>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs">الاستحقاق</span>
                    <div className="text-white/60">{dueDate}</div>
                  </div>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${st.cls}`} title={st.tip}>{st.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
