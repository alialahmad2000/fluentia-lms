import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertTriangle, TrendingDown, Users, RefreshCw, Loader2,
  CheckCircle2, Eye, ChevronDown, Shield, Zap, Clock,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const RISK_CONFIG = {
  critical: { label: 'حرج', color: 'red', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
  high: { label: 'عالي', color: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  medium: { label: 'متوسط', color: 'gold', bg: 'bg-gold-500/10', border: 'border-gold-500/20', text: 'text-gold-400' },
  low: { label: 'منخفض', color: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
}

const STAT_COLOR_CLASSES = {
  red: 'bg-red-500/10 text-red-400',
  amber: 'bg-amber-500/10 text-amber-400',
  gold: 'bg-gold-500/10 text-gold-400',
  sky: 'bg-sky-500/10 text-sky-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
}

export default function AdminChurnPrediction() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const isAdmin = profile?.role === 'admin'

  const { data: predictions, isLoading } = useQuery({
    queryKey: ['churn-predictions'],
    queryFn: async () => {
      // Get latest prediction per student
      const { data } = await supabase
        .from('churn_predictions')
        .select(`
          *,
          profiles:student_id(full_name, display_name),
          students:student_id(group_id, academic_level, xp_total, current_streak, package,
            groups(name, code))
        `)
        .order('predicted_at', { ascending: false })

      // Deduplicate: keep only latest per student
      const seen = new Set()
      return (data || []).filter(p => {
        if (seen.has(p.student_id)) return false
        seen.add(p.student_id)
        return true
      })
    },
    enabled: !!profile?.id,
  })

  const runAnalysis = useMutation({
    mutationFn: async () => {
      const res = await invokeWithRetry('predict-churn', {
        body: {},
        
      })
      if (res.error) throw new Error(typeof res.error === 'object' ? (res.error.message || 'خطأ في التحليل') : String(res.error))
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churn-predictions'] })
    },
    onError: (err) => {
      console.error('Churn analysis error:', err)
    },
  })

  const markReviewed = useMutation({
    mutationFn: async ({ id, action }) => {
      const { error } = await supabase.from('churn_predictions').update({
        reviewed: true,
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
        action_taken: action,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churn-predictions'] })
    },
    onError: (err) => {
      console.error('Mark reviewed error:', err)
    },
  })

  const filtered = predictions?.filter(p => filter === 'all' || p.risk_level === filter) || []
  const criticalCount = predictions?.filter(p => p.risk_level === 'critical').length || 0
  const highCount = predictions?.filter(p => p.risk_level === 'high').length || 0
  const mediumCount = predictions?.filter(p => p.risk_level === 'medium').length || 0
  const avgRisk = predictions?.length ? Math.round(predictions.reduce((a, p) => a + Number(p.risk_score), 0) / predictions.length) : 0

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-[var(--text-primary)] flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Shield size={20} className="text-red-400" />
            </div>
            توقع الانسحاب
          </h1>
          <p className="text-muted text-sm mt-1">تحليل ذكي لاحتمالية انسحاب الطلاب</p>
        </div>
        <button
          onClick={() => runAnalysis.mutate()}
          disabled={runAnalysis.isPending}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {runAnalysis.isPending ? (
            <><Loader2 size={14} className="animate-spin" /> جاري التحليل...</>
          ) : (
            <><RefreshCw size={14} /> تحليل جديد</>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'حالة حرجة', value: criticalCount, icon: AlertTriangle, color: 'red' },
          { label: 'خطر عالي', value: highCount, icon: TrendingDown, color: 'amber' },
          { label: 'خطر متوسط', value: mediumCount, icon: Clock, color: 'gold' },
          { label: 'متوسط الخطورة', value: `${avgRisk}%`, icon: Users, color: 'sky' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="fl-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted text-xs">{card.label}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${STAT_COLOR_CLASSES[card.color] || 'bg-sky-500/10 text-sky-400'}`}>
                <card.icon size={16} />
              </div>
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)]">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'critical', 'high', 'medium', 'low'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              filter === f ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-[var(--surface-base)] text-muted hover:text-[var(--text-primary)]'
            }`}
          >
            {f === 'all' ? 'الكل' : RISK_CONFIG[f].label}
            {f !== 'all' && ` (${predictions?.filter(p => p.risk_level === f).length || 0})`}
          </button>
        ))}
      </div>

      {/* Predictions list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-sky-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="fl-card-static p-12 text-center">
          <Shield size={48} className="mx-auto text-muted mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">لا توجد تنبؤات</h3>
          <p className="text-muted text-sm">اضغط "تحليل جديد" لبدء تحليل الطلاب</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((prediction, i) => {
            const risk = RISK_CONFIG[prediction.risk_level]
            const name = prediction.profiles?.full_name || prediction.profiles?.display_name || 'طالب'
            const group = prediction.students?.groups?.name || '—'
            const expanded = expandedId === prediction.id

            return (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`fl-card-static overflow-hidden ${risk.border}`}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : prediction.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${risk.bg} flex items-center justify-center`}>
                        <span className={`text-lg font-bold ${risk.text}`}>
                          {Math.round(prediction.risk_score)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)] text-sm">{name}</h3>
                        <p className="text-xs text-muted">{group}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${risk.bg} ${risk.text} border ${risk.border}`}>
                        {risk.label}
                      </span>
                      {prediction.reviewed && (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      )}
                      <ChevronDown size={14} className={`text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Factor pills */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {prediction.factors?.map((f, fi) => (
                      <span key={fi} className="text-xs bg-[var(--surface-base)] text-muted px-2 py-0.5 rounded-lg">
                        {f.description}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="border-t border-border-subtle p-4 space-y-4">
                    {/* Recommendations */}
                    {prediction.recommendations?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-[var(--text-primary)] mb-2">التوصيات:</h4>
                        <div className="space-y-2">
                          {prediction.recommendations.map((rec, ri) => (
                            <div key={ri} className="flex items-start gap-2 text-xs">
                              <Zap size={12} className={`mt-0.5 ${rec.priority === 'high' ? 'text-red-400' : rec.priority === 'medium' ? 'text-gold-400' : 'text-emerald-400'}`} />
                              <span className="text-muted">{rec.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Risk score bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted">مؤشر الخطورة</span>
                        <span className={risk.text}>{prediction.risk_score}%</span>
                      </div>
                      <div className="fl-progress-track w-full">
                        <div
                          className={`fl-progress-fill ${
                            prediction.risk_score >= 75 ? 'bg-red-500' :
                            prediction.risk_score >= 50 ? 'bg-amber-500' :
                            prediction.risk_score >= 25 ? 'bg-gold-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${prediction.risk_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    {!prediction.reviewed && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); markReviewed.mutate({ id: prediction.id, action: 'contacted' }) }}
                          className="btn-primary flex-1 text-xs py-2 rounded-xl transition-all duration-200"
                        >
                          تم التواصل
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); markReviewed.mutate({ id: prediction.id, action: 'monitored' }) }}
                          className="btn-secondary flex-1 text-xs py-2 rounded-xl transition-all duration-200"
                        >
                          تحت المراقبة
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); markReviewed.mutate({ id: prediction.id, action: 'dismissed' }) }}
                          className="btn-ghost text-xs py-2 px-3 rounded-xl transition-all duration-200"
                        >
                          تجاهل
                        </button>
                      </div>
                    )}

                    {prediction.reviewed && (
                      <div className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        تمت المراجعة — {prediction.action_taken === 'contacted' ? 'تم التواصل' : prediction.action_taken === 'monitored' ? 'تحت المراقبة' : 'تم التجاهل'}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
