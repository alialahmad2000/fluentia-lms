import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { broadcastForceRefresh } from '@/hooks/useAdminBroadcastListener'

// Layer 8 (auto-recovery): admin window into client-side health. Reads
// client_error_log (migration 20260525010000). Surfaces error rate, version
// distribution, top errors, recent crashes — so issues reach Ali without
// students needing to report. Includes the emergency force-refresh broadcast.
export default function SystemDiagnostics() {
  const { data: errors = [], isLoading } = useQuery({
    queryKey: ['admin', 'client-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_error_log')
        .select('*, user:profiles(full_name)')
        .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data || []
    },
    refetchInterval: 30_000,
    staleTime: 0,
  })

  const errorsLastHour = errors.filter(
    (e) => new Date(e.created_at).getTime() > Date.now() - 3600_000,
  ).length

  const versionDist = {}
  errors.forEach((e) => {
    if (e.app_version) versionDist[e.app_version] = (versionDist[e.app_version] || 0) + 1
  })

  const groups = {}
  errors.forEach((e) => {
    const key = (e.message || '').slice(0, 100)
    if (!groups[key]) groups[key] = { count: 0, latest: e.created_at, sample: e }
    groups[key].count++
    if (new Date(e.created_at) > new Date(groups[key].latest)) groups[key].latest = e.created_at
  })
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].count - a[1].count)

  const card = 'rounded-2xl p-5 bg-[var(--ds-surface-1,rgba(255,255,255,0.03))] border border-[var(--ds-border-subtle,rgba(255,255,255,0.06))]'

  return (
    <div className="space-y-8 p-4 sm:p-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold font-['Tajawal'] text-[var(--ds-text-primary,#f8fafc)]">تشخيص النظام</h1>
        <button
          onClick={broadcastForceRefresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold font-['Tajawal']"
          style={{ background: 'rgba(245,158,11,0.16)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }}
        >
          <RefreshCw size={16} />
          إجبار كل العملاء على التحديث
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className={card}>
          <div className="text-3xl font-bold text-[var(--ds-text-primary,#f8fafc)]">{errorsLastHour}</div>
          <div className="text-sm text-[var(--ds-text-tertiary,#64748b)] font-['Tajawal']">أخطاء آخر ساعة</div>
        </div>
        <div className={card}>
          <div className="text-3xl font-bold text-[var(--ds-text-primary,#f8fafc)]">{errors.length}</div>
          <div className="text-sm text-[var(--ds-text-tertiary,#64748b)] font-['Tajawal']">أخطاء آخر ٢٤ ساعة</div>
        </div>
        <div className={card}>
          <div className="text-3xl font-bold text-[var(--ds-text-primary,#f8fafc)]">{Object.keys(versionDist).length}</div>
          <div className="text-sm text-[var(--ds-text-tertiary,#64748b)] font-['Tajawal']">نسخ نشطة</div>
        </div>
      </div>

      {Object.keys(versionDist).length > 0 && (
        <div className={card}>
          <h2 className="text-lg font-bold mb-3 font-['Tajawal'] text-[var(--ds-text-primary,#f8fafc)]">توزيع النسخ (آخر ٢٤ ساعة)</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(versionDist).map(([v, c]) => (
              <span key={v} className="px-3 py-1 rounded-full text-xs font-mono bg-white/[0.05] text-[var(--ds-text-secondary,#94a3b8)]">{v}: {c}</span>
            ))}
          </div>
        </div>
      )}

      <div className={card}>
        <h2 className="text-lg font-bold mb-3 font-['Tajawal'] text-[var(--ds-text-primary,#f8fafc)] flex items-center gap-2">
          <AlertTriangle size={18} /> الأخطاء الأكثر تكراراً
        </h2>
        {isLoading ? (
          <div className="text-sm text-[var(--ds-text-tertiary,#64748b)]">...جاري التحميل</div>
        ) : sortedGroups.length === 0 ? (
          <div className="text-sm text-[var(--ds-text-tertiary,#64748b)] font-['Tajawal']">لا توجد أخطاء في آخر ٢٤ ساعة ✓</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--ds-text-tertiary,#64748b)] text-right">
                  <th className="py-2 font-medium">الرسالة</th><th className="py-2 font-medium">عدد</th>
                  <th className="py-2 font-medium">آخر مرة</th><th className="py-2 font-medium">نسخة</th>
                </tr>
              </thead>
              <tbody>
                {sortedGroups.slice(0, 20).map(([msg, info]) => (
                  <tr key={msg} className="border-t border-white/[0.05] text-[var(--ds-text-secondary,#94a3b8)]">
                    <td className="py-2 max-w-[320px] truncate" title={msg}>{msg.slice(0, 80) || '—'}</td>
                    <td className="py-2">{info.count}</td>
                    <td className="py-2 whitespace-nowrap">{new Date(info.latest).toLocaleString('ar-SA')}</td>
                    <td className="py-2 font-mono text-xs">{info.sample.app_version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={card}>
        <h2 className="text-lg font-bold mb-3 font-['Tajawal'] text-[var(--ds-text-primary,#f8fafc)]">آخر ٢٠ خطأ</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--ds-text-tertiary,#64748b)] text-right">
                <th className="py-2 font-medium">الوقت</th><th className="py-2 font-medium">الطالب</th>
                <th className="py-2 font-medium">النوع</th><th className="py-2 font-medium">الرسالة</th>
              </tr>
            </thead>
            <tbody>
              {errors.slice(0, 20).map((e) => (
                <tr key={e.id} className="border-t border-white/[0.05] text-[var(--ds-text-secondary,#94a3b8)]">
                  <td className="py-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString('ar-SA')}</td>
                  <td className="py-2">{e.user?.full_name || '—'}</td>
                  <td className="py-2 font-mono text-xs">{e.error_kind}</td>
                  <td className="py-2 max-w-[300px] truncate" title={e.message}>{(e.message || '').slice(0, 80)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
