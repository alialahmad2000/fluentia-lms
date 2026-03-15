import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radar, TrendingUp, TrendingDown, Minus, Calendar, Brain,
  Smile, Meh, Frown, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────
const SKILLS = ['grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing']
const SKILL_LABELS_AR = {
  grammar: 'قواعد',
  vocabulary: 'مفردات',
  speaking: 'محادثة',
  listening: 'استماع',
  reading: 'قراءة',
  writing: 'كتابة',
}
const TYPE_LABELS = {
  placement: 'تقييم أولي',
  periodic: 'تقييم دوري',
  self: 'تقييم ذاتي',
}
const TYPE_COLORS = {
  placement: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  periodic: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  self: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ─── SVG Radar Chart (pure SVG, no library) ───────────────────
function SkillRadarChart({ skills }) {
  const cx = 150, cy = 150, r = 110
  const levels = [0.33, 0.66, 1]
  const angleStep = (2 * Math.PI) / 6
  const startAngle = -Math.PI / 2 // start from top

  // Generate hex points for a given radius fraction
  const hexPoints = (fraction) =>
    SKILLS.map((_, i) => {
      const angle = startAngle + i * angleStep
      const x = cx + r * fraction * Math.cos(angle)
      const y = cy + r * fraction * Math.sin(angle)
      return `${x},${y}`
    }).join(' ')

  // Skill polygon
  const skillPoints = SKILLS.map((sk, i) => {
    const val = (skills[sk] || 0) / 100
    const angle = startAngle + i * angleStep
    const x = cx + r * val * Math.cos(angle)
    const y = cy + r * val * Math.sin(angle)
    return `${x},${y}`
  }).join(' ')

  // Label positions (slightly outside)
  const labelPositions = SKILLS.map((sk, i) => {
    const angle = startAngle + i * angleStep
    const lx = cx + (r + 24) * Math.cos(angle)
    const ly = cy + (r + 24) * Math.sin(angle)
    return { skill: sk, x: lx, y: ly }
  })

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
      {/* Grid levels */}
      {levels.map((lv) => (
        <polygon
          key={lv}
          points={hexPoints(lv)}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {SKILLS.map((_, i) => {
        const angle = startAngle + i * angleStep
        const x2 = cx + r * Math.cos(angle)
        const y2 = cy + r * Math.sin(angle)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x2}
            y2={y2}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        )
      })}

      {/* Skill polygon */}
      <motion.polygon
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        points={skillPoints}
        fill="rgba(14,165,233,0.2)"
        stroke="rgb(14,165,233)"
        strokeWidth="2"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Skill dots */}
      {SKILLS.map((sk, i) => {
        const val = (skills[sk] || 0) / 100
        const angle = startAngle + i * angleStep
        const x = cx + r * val * Math.cos(angle)
        const y = cy + r * val * Math.sin(angle)
        return (
          <circle
            key={sk}
            cx={x}
            cy={y}
            r="4"
            fill="rgb(14,165,233)"
            stroke="white"
            strokeWidth="1.5"
          />
        )
      })}

      {/* Labels */}
      {labelPositions.map(({ skill, x, y }) => (
        <text
          key={skill}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted text-xs"
          fontFamily="inherit"
        >
          {SKILL_LABELS_AR[skill]}
        </text>
      ))}
    </svg>
  )
}

// ─── Sparkline (tiny inline SVG) ──────────────────────────────
function Sparkline({ values }) {
  if (!values || values.length < 2) return null
  const w = 60, h = 20
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} className="inline-block ml-2">
      <polyline
        points={points}
        fill="none"
        stroke="rgb(14,165,233)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function StudentAssessments() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState(null)
  const [mood, setMood] = useState(null)
  const [confidence, setConfidence] = useState(3)

  // Fetch latest skill snapshot
  const { data: latestSnapshot } = useQuery({
    queryKey: ['skill-snapshot-latest', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('skill_snapshots')
        .select('*')
        .eq('student_id', profile?.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()
      return data
    },
    enabled: !!profile?.id,
  })

  // Fetch last 6 snapshots for trend
  const { data: snapshots } = useQuery({
    queryKey: ['skill-snapshots-trend', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('skill_snapshots')
        .select('*')
        .eq('student_id', profile?.id)
        .order('snapshot_date', { ascending: true })
        .limit(6)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Fetch assessments
  const { data: assessments, isLoading: loadingAssessments } = useQuery({
    queryKey: ['student-assessments', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessments')
        .select('*')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Check if self-assessment already submitted this week
  const { data: selfThisWeek } = useQuery({
    queryKey: ['self-assessment-week', profile?.id],
    queryFn: async () => {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      startOfWeek.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('assessments')
        .select('id')
        .eq('student_id', profile?.id)
        .eq('type', 'self')
        .gte('created_at', startOfWeek.toISOString())
        .limit(1)
      return data && data.length > 0
    },
    enabled: !!profile?.id,
  })

  // Submit self-assessment
  const submitSelf = useMutation({
    mutationFn: async () => {
      const moodScores = { good: 90, neutral: 60, bad: 30 }
      const overall = moodScores[mood] || 50
      const confScore = (confidence / 5) * 100

      const { error } = await supabase.from('assessments').insert({
        student_id: profile?.id,
        type: 'self',
        level_at_time: studentData?.academic_level || null,
        scores: { grammar: confScore, vocabulary: 0, speaking: 0, listening: 0, reading: 0, writing: 0 },
        overall_score: overall,
        ai_analysis: null,
        trainer_notes: null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['self-assessment-week'] })
      setMood(null)
      setConfidence(3)
    },
  })

  // Computed: radar skills
  const radarSkills = useMemo(() => {
    if (!latestSnapshot) return { grammar: 0, vocabulary: 0, speaking: 0, listening: 0, reading: 0, writing: 0 }
    return {
      grammar: latestSnapshot.grammar || 0,
      vocabulary: latestSnapshot.vocabulary || 0,
      speaking: latestSnapshot.speaking || 0,
      listening: latestSnapshot.listening || 0,
      reading: latestSnapshot.reading || 0,
      writing: latestSnapshot.writing || 0,
    }
  }, [latestSnapshot])

  // Computed: skill trends
  const skillTrends = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return {}
    const result = {}
    SKILLS.forEach((sk) => {
      const values = snapshots.map((s) => s[sk] || 0)
      const current = values[values.length - 1]
      let trend = 'stable'
      if (values.length >= 2) {
        const prev = values[values.length - 2]
        if (current > prev) trend = 'up'
        else if (current < prev) trend = 'down'
      }
      result[sk] = { current, values, trend }
    })
    return result
  }, [snapshots])

  return (
    <div className="space-y-12">
      {/* Page header */}
      <div>
        <h1 className="text-page-title flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Radar size={20} className="text-sky-400" />
          </div>
          التقييمات والمهارات
        </h1>
        <p className="text-muted text-sm mt-1">تابع مستواك وتطور مهاراتك</p>
      </div>

      {/* ─── Section 1: Skill Radar Chart ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fl-card-static p-7"
      >
        <h2 className="text-section-title mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Radar size={16} className="text-sky-400" />
          </div>
          رادار المهارات
        </h2>

        <SkillRadarChart skills={radarSkills} />

        {!latestSnapshot && (
          <p className="text-center text-muted text-sm mt-4">
            سيتم تحديث المهارات بعد أول تقييم
          </p>
        )}

        {/* Skill values below the chart */}
        {latestSnapshot && (
          <div className="grid grid-cols-3 gap-6 mt-4">
            {SKILLS.map((sk) => (
              <div key={sk} className="text-center">
                <p className="text-xs text-muted">{SKILL_LABELS_AR[sk]}</p>
                <p className="text-sm font-bold text-[var(--text-primary)]">{radarSkills[sk]}%</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Section 2: Skill Progress Over Time ─────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="fl-card-static p-7"
      >
        <h2 className="text-section-title mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          تطور المهارات
        </h2>

        {(!snapshots || snapshots.length === 0) ? (
          <p className="text-muted text-sm">لا توجد بيانات كافية لعرض التطور بعد</p>
        ) : (
          <div className="space-y-3">
            {SKILLS.map((sk) => {
              const info = skillTrends[sk]
              if (!info) return null
              const TrendIcon = info.trend === 'up' ? TrendingUp : info.trend === 'down' ? TrendingDown : Minus
              const trendColor = info.trend === 'up' ? 'text-emerald-400' : info.trend === 'down' ? 'text-red-400' : 'text-muted'
              const trendLabel = info.trend === 'up' ? '↑' : info.trend === 'down' ? '↓' : '—'
              const barColor = info.trend === 'up' ? 'bg-emerald-500' : info.trend === 'down' ? 'bg-red-500' : 'bg-slate-500'

              return (
                <div key={sk} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-14 text-left shrink-0">
                    {SKILL_LABELS_AR[sk]}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${info.current}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${barColor}`}
                    />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)] w-10 text-left">{info.current}%</span>
                  <TrendIcon size={14} className={`${trendColor} shrink-0`} />
                  <span className={`text-xs ${trendColor} w-4`}>{trendLabel}</span>
                  <Sparkline values={info.values} />
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ─── Section 3: Assessment History ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fl-card-static p-7"
      >
        <h2 className="text-section-title mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Calendar size={16} className="text-sky-400" />
          </div>
          سجل التقييمات
        </h2>

        {loadingAssessments ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : !assessments || assessments.length === 0 ? (
          <p className="text-muted text-sm">لم يتم إجراء أي تقييم بعد</p>
        ) : (
          <div className="space-y-3">
            {assessments.map((a) => {
              const isExpanded = expandedId === a.id
              const scores = a.scores || {}

              return (
                <motion.div
                  key={a.id}
                  layout
                  className="rounded-xl border border-border-subtle overflow-hidden"
                  style={{ background: 'var(--surface-raised)' }}
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    className="w-full flex items-center justify-between p-4 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${TYPE_COLORS[a.type] || ''}`}>
                        {TYPE_LABELS[a.type] || a.type}
                      </span>
                      <span className="text-xs text-muted">{formatDate(a.created_at)}</span>
                      {a.level_at_time && (
                        <span className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full">
                          {a.level_at_time}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-sky-400">
                        {a.overall_score != null ? `${a.overall_score}%` : '—'}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-3">
                          {/* Per-skill scores */}
                          <div className="grid grid-cols-3 gap-3">
                            {SKILLS.map((sk) => (
                              <div key={sk} className="text-center rounded-lg p-2" style={{ background: 'var(--surface-raised)' }}>
                                <p className="text-xs text-muted">{SKILL_LABELS_AR[sk]}</p>
                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                  {scores[sk] != null ? `${scores[sk]}%` : '—'}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* AI analysis */}
                          {a.ai_analysis && (
                            <div className="bg-sky-500/5 border border-sky-500/10 rounded-lg p-3">
                              <p className="text-xs text-sky-400 font-medium mb-1 flex items-center gap-1">
                                <Brain size={12} /> تحليل الذكاء الاصطناعي
                              </p>
                              <p className="text-sm text-muted leading-relaxed">{a.ai_analysis}</p>
                            </div>
                          )}

                          {/* Trainer notes */}
                          {a.trainer_notes && (
                            <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3">
                              <p className="text-xs text-purple-400 font-medium mb-1">ملاحظات المدرب</p>
                              <p className="text-sm text-muted leading-relaxed">{a.trainer_notes}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ─── Section 4: Weekly Self-Assessment ───────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="fl-card-static p-7"
      >
        <h2 className="text-section-title mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Smile size={16} className="text-amber-400" />
          </div>
          التقييم الذاتي الأسبوعي
        </h2>

        {selfThisWeek ? (
          <div className="text-center py-6">
            <p className="text-emerald-400 text-sm font-medium">تم إرسال التقييم الذاتي لهذا الأسبوع</p>
            <p className="text-muted text-xs mt-1">يمكنك الإرسال مرة أخرى الأسبوع القادم</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mood question */}
            <div>
              <p className="text-sm text-[var(--text-primary)] mb-3">كيف حاسس بمستواك هالأسبوع؟</p>
              <div className="flex gap-3 justify-center">
                {[
                  { key: 'good', icon: Smile, label: 'ممتاز', emoji: '😊', activeCls: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' },
                  { key: 'neutral', icon: Meh, label: 'متوسط', emoji: '😐', activeCls: 'bg-amber-500/20 border-amber-500/40 text-amber-400' },
                  { key: 'bad', icon: Frown, label: 'يحتاج تحسين', emoji: '😞', activeCls: 'bg-red-500/20 border-red-500/40 text-red-400' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setMood(opt.key)}
                    className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all duration-200 ${
                      mood === opt.key
                        ? opt.activeCls
                        : 'border-border-subtle text-muted hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-xs">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence slider */}
            <div>
              <p className="text-sm text-[var(--text-primary)] mb-3">
                مستوى ثقتك بالإنجليزي؟
                <span className="text-sky-400 font-bold mr-2">{confidence}/5</span>
              </p>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>ضعيف</span>
                <span>متوسط</span>
                <span>ممتاز</span>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={() => submitSelf.mutate()}
              disabled={!mood || submitSelf.isPending}
              className="btn-primary w-full py-2.5 text-sm"
            >
              {submitSelf.isPending ? 'جاري الإرسال...' : 'إرسال التقييم'}
            </button>

            {submitSelf.isError && (
              <p className="text-red-400 text-xs text-center">حدث خطأ، حاول مرة أخرى</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
