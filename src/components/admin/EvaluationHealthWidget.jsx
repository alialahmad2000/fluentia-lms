import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

export default function EvaluationHealthWidget() {
  const { data: log, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['eval-health-latest'],
    queryFn: async () => {
      const { data } = await supabase
        .from('evaluation_health_log')
        .select('*')
        .order('check_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    staleTime: 5 * 60 * 1000,
  })

  // Live counts (current state, not 24h window)
  const { data: live } = useQuery({
    queryKey: ['eval-health-live'],
    queryFn: async () => {
      const [{ count: wPending }, { count: wFailed }, { count: sPending }, { count: sFailed }] = await Promise.all([
        supabase.from('student_curriculum_progress').select('*', { count: 'exact', head: true }).eq('section_type', 'writing').in('evaluation_status', ['pending', 'evaluating', 'failed']),
        supabase.from('student_curriculum_progress').select('*', { count: 'exact', head: true }).eq('section_type', 'writing').eq('evaluation_status', 'escalated'),
        supabase.from('speaking_recordings').select('*', { count: 'exact', head: true }).in('evaluation_status', ['pending', 'evaluating', 'failed_retrying']),
        supabase.from('speaking_recordings').select('*', { count: 'exact', head: true }).eq('evaluation_status', 'failed_manual'),
      ])
      return {
        writingStuck: (wPending ?? 0) + (wFailed ?? 0),
        writingManual: wFailed ?? 0,
        speakingStuck: sPending ?? 0,
        speakingManual: sFailed ?? 0,
      }
    },
    refetchInterval: 2 * 60 * 1000,
  })

  const manualTotal = (live?.writingManual ?? 0) + (live?.speakingManual ?? 0)
  const stuckTotal  = (live?.writingStuck ?? 0) + (live?.speakingStuck ?? 0)

  const statusColor = manualTotal > 3 ? 'red' : manualTotal > 0 ? 'amber' : stuckTotal > 0 ? 'amber' : 'emerald'
  const statusColors = {
    emerald: { dot: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    amber:   { dot: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    red:     { dot: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  }
  const c = statusColors[statusColor]

  const lastCheck = log?.check_at
    ? `آخر فحص: ${new Date(log.check_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}`
    : 'لم يُفحص بعد'

  if (isLoading) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: 'linear-gradient(170deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012) 60%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 10px 28px -14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <Activity size={15} style={{ color: c.dot }} />
          </div>
          <div>
            <h3 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>صحة نظام التقييم</h3>
            <p className="text-[11px] font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>{lastCheck}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: c.dot }} />
            <span className="text-[11px] font-bold font-['Tajawal']" style={{ color: c.dot }}>
              {manualTotal > 0 ? `${manualTotal} يحتاج مراجعة` : stuckTotal > 0 ? `${stuckTotal} معلق` : 'كل شيء مكتمل ✓'}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            title="تحديث"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <HealthCard
          label="الكتابة"
          stuck={live?.writingStuck ?? 0}
          manual={live?.writingManual ?? 0}
          completed={log?.writing_completed ?? 0}
        />
        <HealthCard
          label="التحدث"
          stuck={live?.speakingStuck ?? 0}
          manual={live?.speakingManual ?? 0}
          completed={log?.speaking_completed ?? 0}
        />
      </div>

      {/* Footer link */}
      <div className="flex justify-end">
        <Link
          to="/admin/evaluation-health"
          className="text-[11px] font-bold font-['Tajawal'] hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          عرض السجل الكامل ←
        </Link>
      </div>
    </motion.div>
  )
}

function HealthCard({ label, stuck, manual, completed }) {
  const hasIssue = manual > 0 || stuck > 0
  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-xs font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-['Tajawal']"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: 'var(--text-secondary)' }}
        >
          <CheckCircle size={10} style={{ color: '#22c55e' }} /> مكتمل
          <span className="font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{completed}</span>
        </span>
        {stuck > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-['Tajawal']"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', color: '#f59e0b' }}
          >
            <AlertTriangle size={10} /> معلق
            <span className="font-bold tabular-nums text-amber-400">{stuck}</span>
          </span>
        )}
        {manual > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-['Tajawal']"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#ef4444' }}
          >
            <XCircle size={10} /> يحتاج مراجعة
            <span className="font-bold tabular-nums text-red-400">{manual}</span>
          </span>
        )}
        {!hasIssue && (
          <span className="text-[10px] font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>لا توجد مشكلات</span>
        )}
      </div>
    </div>
  )
}
