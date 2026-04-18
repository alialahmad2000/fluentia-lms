import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { TrendingUp, RefreshCw, Star, AlertTriangle, BookOpen, Lightbulb, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const CACHE_KEY = 'fluentia_weekly_report'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

function getCachedReport(trainerId) {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${trainerId}`)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function setCachedReport(trainerId, data) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${trainerId}`, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

function getWeekRange() {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now - 6 * 86400000)
  const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`
  return `${fmt(start)} — ${fmt(end)}`
}

export default function WeeklyReport() {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const [forceRefresh, setForceRefresh] = useState(0)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['trainer-weekly-report', profile?.id, forceRefresh],
    queryFn: async () => {
      // Check cache (skip if force refresh)
      if (forceRefresh === 0) {
        const cached = getCachedReport(profile?.id)
        if (cached) return cached
      }

      const result = await invokeWithRetry('trainer-weekly-report', {
        body: { trainer_id: profile?.id },
      })

      if (result?.report) {
        setCachedReport(profile?.id, result)
      }
      return result
    },
    enabled: !!profile?.id,
    staleTime: CACHE_TTL,
    retry: 1,
  })

  const report = data?.report
  const stats = data?.stats

  function handleRefresh() {
    localStorage.removeItem(`${CACHE_KEY}_${profile?.id}`)
    setForceRefresh(f => f + 1)
  }

  const anim = (i) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.08, duration: 0.4 },
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div {...anim(0)}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <TrendingUp size={20} className="text-emerald-400" />
              </div>
              <h1 className="text-page-title">التقرير الأسبوعي</h1>
            </div>
            <p className="text-sm mr-[52px]" style={{ color: 'var(--text-muted)' }}>{getWeekRange()}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>
      </motion.div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--accent-sky)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>جاري تحليل بيانات الأسبوع...</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>قد يستغرق ١٠-٢٠ ثانية</p>
          </div>
          {[1,2,3].map(i => <div key={i} className="h-32 skeleton rounded-2xl" />)}
        </div>
      ) : !report ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-lg mb-2">📊</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>لا توجد بيانات كافية لإنشاء التقرير</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <motion.div {...anim(1)} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="text-lg">✨</span> ملخص الأسبوع
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{report.summary}</p>
          </motion.div>

          {/* Stars */}
          {report.stars?.length > 0 && (
            <motion.div {...anim(2)} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Star size={16} className="text-amber-400" /> نجوم الأسبوع
              </h3>
              <div className="space-y-3">
                {report.stars.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--surface-raised)' }}>
                    <span className="text-lg">🌟</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.detail || s.improvement}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Needs attention */}
          {report.needs_attention?.length > 0 && (
            <motion.div {...anim(3)} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(251,191,36,0.1)' }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <AlertTriangle size={16} className="text-amber-400" /> يحتاجون متابعة
              </h3>
              <div className="space-y-3">
                {report.needs_attention.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--surface-raised)' }}>
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Common errors */}
          {report.common_errors?.length > 0 && (
            <motion.div {...anim(4)} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BookOpen size={16} className="text-sky-400" /> الأخطاء الشائعة
              </h3>
              <div className="space-y-2">
                {report.common_errors.map((e, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--surface-raised)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{e.error}</span>
                    {e.student_count > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: 'rgb(239,68,68)' }}>
                        {e.student_count} طلاب
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <motion.div {...anim(5)} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(52,211,153,0.1)' }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Lightbulb size={16} className="text-emerald-400" /> توصيات للأسبوع القادم
              </h3>
              <ul className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span className="text-emerald-400 mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
