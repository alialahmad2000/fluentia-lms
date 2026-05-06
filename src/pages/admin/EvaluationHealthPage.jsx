import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function EvaluationHealthPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['eval-health-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('evaluation_health_log')
        .select('*')
        .order('check_at', { ascending: false })
        .limit(50)
      return data || []
    },
  })

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.1)' }}>
          <Activity size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>سجل صحة نظام التقييم</h1>
          <p className="text-sm font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>آخر 50 فحص تلقائي — كل ساعة</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface-raised)' }} />
          ))}
        </div>
      ) : logs?.length === 0 ? (
        <div className="text-center py-16 font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
          لم يتم تشغيل الفحص بعد — سيعمل تلقائياً خلال الساعة القادمة
        </div>
      ) : (
        <div className="space-y-2">
          {logs?.map(log => {
            const manualCount = (log.writing_escalated ?? 0) + (log.speaking_failed_manual ?? 0)
            const stuckCount = (log.writing_pending ?? 0) + (log.writing_failed ?? 0) + (log.speaking_pending ?? 0) + (log.speaking_failed_retrying ?? 0)
            const hasIssue = manualCount > 0 || stuckCount > 0
            const borderColor = manualCount > 0 ? 'rgba(239,68,68,0.2)' : stuckCount > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.15)'

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl p-4"
                style={{ background: 'var(--surface-raised)', border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {manualCount > 0 ? (
                      <XCircle size={14} className="text-red-400 shrink-0" />
                    ) : stuckCount > 0 ? (
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                    )}
                    <span className="text-xs font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={10} className="inline ml-1" />
                      {new Date(log.check_at).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px]">
                    <StatBadge label="كتابة مكتملة" value={log.writing_completed} color="emerald" />
                    <StatBadge label="كتابة معلقة" value={log.writing_pending} color={log.writing_pending > 0 ? 'amber' : 'muted'} />
                    <StatBadge label="كتابة متصاعدة" value={log.writing_escalated} color={log.writing_escalated > 0 ? 'red' : 'muted'} />
                    <StatBadge label="تحدث مكتمل" value={log.speaking_completed} color="emerald" />
                    <StatBadge label="تحدث معلق" value={log.speaking_pending} color={log.speaking_pending > 0 ? 'amber' : 'muted'} />
                    <StatBadge label="تحدث فشل نهائي" value={log.speaking_failed_manual} color={log.speaking_failed_manual > 0 ? 'red' : 'muted'} />
                    {log.affected_students > 0 && (
                      <StatBadge label="طلاب متأثرون" value={log.affected_students} color="amber" />
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatBadge({ label, value, color }) {
  const colors = {
    emerald: { text: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    amber:   { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    red:     { text: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    muted:   { text: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)' },
  }
  const c = colors[color] || colors.muted
  if (value === 0 && color === 'muted') return null
  return (
    <span className="px-2 py-0.5 rounded-full font-bold font-['Tajawal']" style={{ color: c.text, background: c.bg }}>
      {value} {label}
    </span>
  )
}
