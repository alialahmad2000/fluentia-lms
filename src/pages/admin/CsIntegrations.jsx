import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, CheckCircle2, Link2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../../components/ui/FluentiaToast'
import { timeAgo } from '../../utils/dateHelpers'

const GCAL_OAUTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gcal-oauth`

const card = { background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', borderRadius: 14, padding: 20 }

export default function CsIntegrations() {
  const qc = useQueryClient()
  const { data: google, isLoading } = useQuery({
    queryKey: ['cs-integration', 'google'],
    queryFn: async () => {
      const { data, error } = await supabase.from('integration_tokens').select('provider, connected_at').eq('provider', 'google').maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: 10_000,
  })

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('gcal')
    if (p === 'connected') { toast({ type: 'success', title: 'تم ربط تقويم Google' }); qc.invalidateQueries({ queryKey: ['cs-integration', 'google'] }) }
    else if (p === 'error') { toast({ type: 'error', title: 'تعذّر الربط', description: 'لم يتم استلام صلاحية دائمة — حاول مرة أخرى' }) }
    if (p) window.history.replaceState({}, '', '/admin/integrations')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const connected = !!google
  const disconnect = async () => {
    try { const { error } = await supabase.rpc('cs_disconnect_integration', { p_provider: 'google' }); if (error) throw error; toast({ type: 'success', title: 'تم فصل التقويم' }); qc.invalidateQueries({ queryKey: ['cs-integration', 'google'] }) }
    catch (e) { toast({ type: 'error', title: 'تعذّر الفصل', description: e?.message }) }
  }

  return (
    <div dir="rtl">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>التكاملات</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--ds-text-tertiary)' }}>ربط الخدمات الخارجية لمواعيد فريق العملاء</p>

      <div style={card} className="max-w-xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-accent-primary)' }}><CalendarClock size={22} /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ color: 'var(--ds-text-primary)' }}>تقويم Google</span>
              {connected && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--ds-accent-success)' }}><CheckCircle2 size={13} /> مربوط</span>}
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
              يُنشئ موعداً في تقويمك لكل حجز، مع تذكيرين تلقائيين (قبل ٦٠ و ١٠ دقائق).
            </p>
            {connected && google?.connected_at && (
              <p className="text-xs mt-1" style={{ color: 'var(--ds-text-muted)' }}>رُبط {timeAgo(google.connected_at)}</p>
            )}

            <div className="mt-4 flex items-center gap-2">
              {isLoading ? (
                <span className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>…</span>
              ) : connected ? (
                <button onClick={disconnect} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-accent-danger)' }}>فصل</button>
              ) : (
                <a href={GCAL_OAUTH_URL} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>
                  <Link2 size={15} /> ربط Google Calendar
                </a>
              )}
            </div>
            {!connected && !isLoading && (
              <p className="text-xs mt-3" style={{ color: 'var(--ds-text-muted)' }}>
                يتطلب إعداد Google Cloud OAuth أولاً (تُضبط المفاتيح في أسرار دوال الحافة). إن لم تُضبط بعد، سيظهر إشعار بعدم التهيئة.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
