import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { refreshAppSession } from '@/lib/refreshAppSession'
import { useActiveExamAttempt } from './useActiveExamAttempt'
import { captureError } from '@/lib/errorTracker'

// Layer 7 (auto-recovery): listen for an admin "force-refresh" broadcast so Ali
// can push every connected client to reload immediately (without waiting for the
// 60s version poll). Uses Supabase Realtime BROADCAST (no table subscription).
// Students mid-exam are NOT disrupted — the update is deferred + logged.
export function useAdminBroadcastListener() {
  const isExamActive = useActiveExamAttempt()

  useEffect(() => {
    const channel = supabase.channel('admin-broadcasts')
    channel
      .on('broadcast', { event: 'force-refresh' }, (payload) => {
        if (isExamActive) {
          captureError({
            kind: 'manual',
            message: 'force-refresh broadcast deferred (active exam)',
            context: { payload: payload?.payload || null },
          })
          return
        }
        refreshAppSession({
          redirectTo: window.location.pathname + window.location.search,
          keepAuth: true,
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isExamActive])
}

// Helper used by the admin diagnostics panel to broadcast a force-refresh.
export async function broadcastForceRefresh() {
  const reason = window.prompt('سبب التحديث الطارئ (يظهر للطلاب):', 'تم نشر تحديث مهم — جاري التطبيق...')
  if (!reason) return
  const confirmed = window.confirm(
    'هل تريد إجبار كل العملاء المتصلين على إعادة التحميل؟\n\nملاحظة: الطلاب في منتصف اختبار لن يتأثروا — التحديث سيُؤجَّل لهم.',
  )
  if (!confirmed) return
  const channel = supabase.channel('admin-broadcasts')
  await channel.subscribe()
  await channel.send({
    type: 'broadcast',
    event: 'force-refresh',
    payload: { reason, by: 'admin', at: new Date().toISOString() },
  })
  await supabase.removeChannel(channel)
  alert('تم بث طلب التحديث لكل العملاء المتصلين.')
}
