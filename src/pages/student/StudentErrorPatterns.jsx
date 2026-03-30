import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Loader2, Target, ArrowLeft,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

const SKILL_LABELS = {
  grammar: 'القرامر',
  vocabulary: 'المفردات',
  speaking: 'المحادثة',
  listening: 'الاستماع',
  reading: 'القراءة',
  writing: 'الكتابة',
}

const SKILL_COLORS = {
  grammar: 'sky',
  vocabulary: 'emerald',
  speaking: 'violet',
  listening: 'gold',
  reading: 'rose',
  writing: 'amber',
}

const SEVERITY_CONFIG = {
  high: { label: 'عالية', color: 'red', icon: AlertTriangle, badgeCls: 'bg-red-500/10 text-red-400' },
  medium: { label: 'متوسطة', color: 'gold', icon: TrendingDown, badgeCls: 'bg-gold-500/10 text-gold-400' },
  low: { label: 'منخفضة', color: 'emerald', icon: TrendingUp, badgeCls: 'bg-emerald-500/10 text-emerald-400' },
}

const SKILL_DOT_CLASSES = {
  sky: 'bg-sky-400',
  emerald: 'bg-emerald-400',
  violet: 'bg-violet-400',
  gold: 'bg-gold-400',
  rose: 'bg-rose-400',
  amber: 'bg-amber-400',
}

export default function StudentErrorPatterns() {
  const { profile } = useAuthStore()

  const { data: patterns, isLoading } = useQuery({
    queryKey: ['student-error-patterns'],
    queryFn: async () => {
      const { data } = await supabase
        .from('error_patterns')
        .select('*')
        .eq('student_id', profile?.id)
        .order('resolved', { ascending: true })
        .order('frequency', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id,
  })

  const activePatterns = patterns?.filter(p => !p.resolved) || []
  const resolvedPatterns = patterns?.filter(p => p.resolved) || []

  // Group active by skill
  const bySkill = {}
  for (const p of activePatterns) {
    if (!bySkill[p.skill]) bySkill[p.skill] = []
    bySkill[p.skill].push(p)
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-gold-400" />
            </div>
            أنماط الأخطاء
          </h1>
          <p className="text-muted text-sm mt-1">تحليل ذكي لأخطائك المتكررة وكيفية التغلب عليها</p>
        </div>
        <Link to="/student/exercises" className="btn-primary flex items-center gap-2 text-sm">
          <Target size={14} />
          التمارين المخصصة
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="fl-card p-7 text-center hover:translate-y-[-2px] transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{activePatterns.length}</p>
          <p className="text-xs text-muted mt-1">أنماط نشطة</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="fl-card p-7 text-center hover:translate-y-[-2px] transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{resolvedPatterns.length}</p>
          <p className="text-xs text-muted mt-1">تم حلها</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="fl-card p-7 text-center hover:translate-y-[-2px] transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mx-auto mb-2">
            <Target size={18} className="text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-sky-400">{Object.keys(bySkill).length}</p>
          <p className="text-xs text-muted mt-1">مهارات متأثرة</p>
        </motion.div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-sky-400" />
        </div>
      ) : activePatterns.length === 0 && resolvedPatterns.length === 0 ? (
        <div className="fl-card-static p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">لم يتم اكتشاف أنماط أخطاء</h3>
          <p className="text-muted text-sm">سيتم تحليل أدائك تلقائياً عند تقييم واجباتك</p>
        </div>
      ) : (
        <>
          {/* Active patterns by skill */}
          {Object.entries(bySkill).map(([skill, skillPatterns]) => {
            const color = SKILL_COLORS[skill] || 'sky'
            return (
              <div key={skill}>
                <h2 className="text-section-title mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span className={`w-3 h-3 rounded-full ${SKILL_DOT_CLASSES[color] || 'bg-sky-400'}`} />
                  {SKILL_LABELS[skill]}
                  <span className="badge-muted">({skillPatterns.length})</span>
                </h2>
                <div className="grid gap-3">
                  {skillPatterns.map((pattern, i) => {
                    const sev = SEVERITY_CONFIG[pattern.severity] || SEVERITY_CONFIG.low
                    const SevIcon = sev.icon
                    return (
                      <motion.div
                        key={pattern.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="fl-card p-4 hover:translate-y-[-2px] transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-[var(--text-primary)] text-sm">{pattern.description}</h3>
                            <p className="text-xs text-muted mt-0.5">
                              النوع: {(pattern.pattern_type || '').replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${sev?.badgeCls || 'bg-sky-500/10 text-sky-400'} flex items-center gap-1`}>
                              <SevIcon size={10} />
                              {sev.label}
                            </span>
                            <span className="text-xs text-muted">
                              تكرار: {pattern.frequency}×
                            </span>
                          </div>
                        </div>

                        {/* Examples */}
                        {pattern.examples?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-muted uppercase">أمثلة:</p>
                            {pattern.examples.slice(0, 3).map((ex, ei) => (
                              <div key={ei} className="text-xs rounded-lg p-2" style={{ background: 'var(--surface-raised)' }}>
                                {ex.error && (
                                  <p className="text-red-400 line-through">{ex.error}</p>
                                )}
                                {ex.correction && (
                                  <p className="text-emerald-400">{ex.correction}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Resolved patterns */}
          {resolvedPatterns.length > 0 && (
            <div>
              <h2 className="text-section-title mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                تم التغلب عليها
                <span className="badge-green">{resolvedPatterns.length}</span>
              </h2>
              <div className="grid gap-2">
                {resolvedPatterns.map((pattern) => (
                  <div key={pattern.id} className="fl-card-static p-3 opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-sm text-[var(--text-primary)]">{pattern.description}</span>
                      </div>
                      <span className="text-xs text-muted">{SKILL_LABELS[pattern.skill]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
