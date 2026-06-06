import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Users, AlertCircle, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../utils/dateHelpers'

const PERIODS = [
  { key: 'today', label: 'اليوم' },
  { key: '7', label: 'آخر 7' },
  { key: '30', label: 'آخر 30' },
]

const FUNNEL = [
  { key: 'c_new', label: 'جديد' },
  { key: 'c_contacted', label: 'تم التواصل' },
  { key: 'c_qualified', label: 'مؤهّل' },
  { key: 'c_trial_booked', label: 'حجز تجربة' },
  { key: 'c_won', label: 'مغلق ناجح' },
  { key: 'c_lost', label: 'مغلق خاسر' },
]

const card = {
  background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)',
  borderRadius: 14, padding: 16,
}
const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) + '%' : '—')

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={card}>
      <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--ds-text-tertiary)' }}>
        <Icon size={15} style={{ color: accent }} />
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>{value}</div>
    </div>
  )
}

export default function CsPerformance() {
  const [period, setPeriod] = useState('7')
  const { data, isLoading, error } = useQuery({
    queryKey: ['cs-performance', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('crm_performance', { p_period: period })
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })

  const f = data?.funnel || {}
  const reachedContacted = (f.c_contacted || 0) + (f.c_qualified || 0) + (f.c_trial_booked || 0) + (f.c_won || 0)
  const reachedBooked = (f.c_trial_booked || 0) + (f.c_won || 0)
  const daily = data?.daily || []
  const maxDaily = Math.max(1, ...daily.map((d) => d.cnt))
  const reps = data?.per_rep || []
  const stale = data?.stale || []

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>أداء فريق العملاء</h1>
          <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>القمع، نشاط كل موظف، والعملاء الراكدون</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)' }}>
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className="px-3 py-1.5 rounded-md text-sm"
              style={{ background: period === p.key ? 'var(--ds-surface-3)' : 'transparent', color: period === p.key ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>جارٍ التحميل…</div>}
      {error && <div className="text-sm" style={{ color: 'var(--ds-accent-danger)' }}>تعذّر تحميل البيانات</div>}

      {data && (
        <>
          {/* headline stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Users} label="إجمالي العملاء" value={f.total || 0} accent="var(--ds-accent-primary)" />
            <StatCard icon={TrendingUp} label="وصلوا للتواصل" value={reachedContacted} accent="var(--ds-sky)" />
            <StatCard icon={Trophy} label="حجوزات تجربة" value={reachedBooked} accent="var(--ds-accent-gold)" />
            <StatCard icon={Trophy} label="إغلاق ناجح" value={f.c_won || 0} accent="var(--ds-accent-success)" />
          </div>

          {/* funnel */}
          <div style={card} className="mb-6">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--ds-text-secondary)' }}>القمع</div>
            <div className="flex flex-wrap gap-3 mb-3">
              {FUNNEL.map((s) => (
                <div key={s.key} className="text-center px-3 py-2 rounded-lg" style={{ background: 'var(--ds-surface-2)', minWidth: 84 }}>
                  <div className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)' }}>{f[s.key] || 0}</div>
                  <div className="text-[11px]" style={{ color: 'var(--ds-text-tertiary)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-text-secondary)' }}>تواصل: {pct(reachedContacted, f.total || 0)}</span>
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-text-secondary)' }}>حجز: {pct(reachedBooked, reachedContacted)}</span>
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-text-secondary)' }}>إغلاق: {pct(f.c_won || 0, reachedBooked)}</span>
            </div>
          </div>

          {/* per-rep table */}
          <div style={card} className="mb-6 overflow-x-auto">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--ds-text-secondary)' }}>نشاط كل موظف</div>
            <table className="w-full text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
              <thead>
                <tr style={{ color: 'var(--ds-text-tertiary)' }} className="text-xs">
                  <th className="text-right py-2 pe-2">الموظف</th>
                  <th className="py-2 px-1">أُضيف</th>
                  <th className="py-2 px-1">تواصل</th>
                  <th className="py-2 px-1">واتساب</th>
                  <th className="py-2 px-1">روابط</th>
                  <th className="py-2 px-1">تجارب</th>
                  <th className="py-2 px-1">ناجح</th>
                  <th className="py-2 px-1">خاسر</th>
                  <th className="py-2 px-1">متأخرة</th>
                </tr>
              </thead>
              <tbody>
                {reps.length === 0 && <tr><td colSpan={9} className="text-center py-4" style={{ color: 'var(--ds-text-muted)' }}>لا يوجد موظفون بعد</td></tr>}
                {reps.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
                    <td className="text-right py-2.5 pe-2" style={{ color: 'var(--ds-text-primary)' }}>{r.name}</td>
                    <td className="text-center">{r.leads_added}</td>
                    <td className="text-center">{r.marked_contacted}</td>
                    <td className="text-center">{r.whatsapp_opened}</td>
                    <td className="text-center">{r.sent_link}</td>
                    <td className="text-center">{r.trials_booked}</td>
                    <td className="text-center">{r.won}</td>
                    <td className="text-center">{r.lost}</td>
                    <td className="text-center" style={{ color: r.overdue_followups > 0 ? 'var(--ds-accent-danger)' : 'inherit' }}>{r.overdue_followups}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* daily activity mini bar */}
          <div style={card} className="mb-6">
            <div className="text-sm font-semibold mb-3" style={{ color: 'var(--ds-text-secondary)' }}>النشاط اليومي</div>
            {daily.length === 0 ? (
              <div className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>لا يوجد نشاط</div>
            ) : (
              <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                {daily.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end" title={`${d.day}: ${d.cnt}`}>
                    <div style={{ width: '100%', maxWidth: 24, height: `${(d.cnt / maxDaily) * 100}%`, minHeight: 3, background: 'var(--ds-accent-primary)', borderRadius: 4 }} />
                    <div className="text-[9px] mt-1" style={{ color: 'var(--ds-text-muted)' }}>{d.day.slice(5)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* going stale */}
          <div style={card}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} style={{ color: 'var(--ds-accent-warning)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>راكدون (٣ أيام بلا نشاط)</span>
              <span className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{stale.length}</span>
            </div>
            {stale.length === 0 ? (
              <div className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>لا يوجد</div>
            ) : (
              <div className="space-y-2">
                {stale.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
                    <span style={{ color: 'var(--ds-text-primary)' }}>{s.name}</span>
                    <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>{s.assignee || '—'} · {timeAgo(s.last_activity_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
