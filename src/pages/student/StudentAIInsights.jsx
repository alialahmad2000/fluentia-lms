import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, TrendingUp, TrendingDown, Minus, Target, Zap, Award,
  BookOpen, AlertTriangle, Lightbulb, ChevronDown, ChevronUp,
  BarChart3, Clock, Star, Sparkles, ArrowUpRight,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'

// ─── Constants ──────────────────────────────────────────────
const SKILLS = ['grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing']
const SKILL_LABELS = {
  grammar: 'القواعد',
  vocabulary: 'المفردات',
  speaking: 'المحادثة',
  listening: 'الاستماع',
  reading: 'القراءة',
  writing: 'الكتابة',
}
const SKILL_COLORS = {
  grammar: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', bar: 'bg-indigo-500' },
  vocabulary: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', bar: 'bg-cyan-500' },
  speaking: { text: 'text-violet-400', bg: 'bg-violet-500/10', bar: 'bg-violet-500' },
  listening: { text: 'text-pink-400', bg: 'bg-pink-500/10', bar: 'bg-pink-500' },
  reading: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' },
  writing: { text: 'text-amber-400', bg: 'bg-amber-500/10', bar: 'bg-amber-500' },
}

export default function StudentAIInsights() {
  const { profile, studentData } = useAuthStore()
  const [expandedSection, setExpandedSection] = useState(null)

  // AI student profile
  const { data: aiProfile } = useQuery({
    queryKey: ['ai-profile', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_student_profiles')
        .select('*')
        .eq('student_id', profile?.id)
        .single()
      return data
    },
    enabled: !!profile?.id,
  })

  // Latest skill snapshot
  const { data: latestSnapshot } = useQuery({
    queryKey: ['latest-snapshot', profile?.id],
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

  // Skill snapshots for trends (last 8)
  const { data: snapshots } = useQuery({
    queryKey: ['skill-trends', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('skill_snapshots')
        .select('*')
        .eq('student_id', profile?.id)
        .order('snapshot_date', { ascending: true })
        .limit(8)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Smart nudges (unread)
  const { data: nudges } = useQuery({
    queryKey: ['smart-nudges', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('smart_nudges')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(5)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Weekly tasks summary
  const { data: weeklyStats } = useQuery({
    queryKey: ['weekly-stats', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_task_sets')
        .select('completion_percentage, difficulty_score, week_start')
        .eq('student_id', profile?.id)
        .order('week_start', { ascending: false })
        .limit(4)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Recent test sessions
  const { data: recentTests } = useQuery({
    queryKey: ['recent-tests', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('test_sessions')
        .select('overall_score, recommended_level, completed_at, test_type, skill_scores')
        .eq('student_id', profile?.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(3)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Computed: strengths and weaknesses
  const currentSkills = latestSnapshot || {}
  const avgScore = SKILLS.reduce((sum, sk) => sum + (currentSkills[sk] || 0), 0) / SKILLS.length

  const skillRanking = [...SKILLS]
    .map(sk => ({ skill: sk, score: currentSkills[sk] || 0 }))
    .sort((a, b) => b.score - a.score)

  const strengths = skillRanking.filter(s => s.score > avgScore + 5).slice(0, 3)
  const weaknesses = skillRanking.filter(s => s.score < avgScore - 5).slice(-3).reverse()

  // Computed: skill trends
  const skillTrends = {}
  if (snapshots && snapshots.length >= 2) {
    SKILLS.forEach(sk => {
      const values = snapshots.map(s => s[sk] || 0)
      const current = values[values.length - 1]
      const prev = values[values.length - 2]
      const change = current - prev
      skillTrends[sk] = { current, change, trend: change > 2 ? 'up' : change < -2 ? 'down' : 'stable' }
    })
  }

  const levelInfo = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Brain size={20} className="text-violet-400" />
          </div>
          رؤى الذكاء الاصطناعي
        </h1>
        <p className="text-muted text-sm mt-1">تحليل شامل لمستواك وتوصيات مخصصة لك</p>
      </div>

      {/* Smart Nudges */}
      {nudges?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="space-y-2">
            {nudges.map((nudge, i) => (
              <motion.div
                key={nudge.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl p-4 border ${
                  nudge.priority === 'high' || nudge.priority === 'urgent'
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-border-subtle'
                }`}
                style={nudge.priority !== 'high' && nudge.priority !== 'urgent' ? { background: 'var(--surface-raised)' } : undefined}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Lightbulb size={14} className="text-sky-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{nudge.title_ar}</p>
                    <p className="text-[11px] text-muted mt-0.5">{nudge.body_ar}</p>
                  </div>
                  {nudge.action_url && (
                    <a href={nudge.action_url} className="text-sky-400 shrink-0">
                      <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Level & Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="fl-card-static p-6"
      >
        <div className="card-top-line shimmer" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Award size={22} className="text-sky-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-sky-400">{levelInfo?.cefr}</p>
              <p className="text-xs text-muted">{levelInfo?.name_ar}</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{Math.round(avgScore)}%</p>
            <p className="text-[10px] text-muted">المعدل العام</p>
          </div>
        </div>

        {/* AI Summary */}
        {aiProfile?.summary_ar && (
          <div className="rounded-xl p-4 mt-3" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-violet-400" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>ملخص الذكاء الاصطناعي</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {aiProfile.summary_ar}
            </p>
          </div>
        )}
      </motion.div>

      {/* Skill Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="fl-card-static p-6"
      >
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <BarChart3 size={16} className="text-sky-400" />
          تفاصيل المهارات
        </h3>
        <div className="space-y-3">
          {SKILLS.map(sk => {
            const score = currentSkills[sk] || 0
            const colors = SKILL_COLORS[sk]
            const trend = skillTrends[sk]
            const TrendIcon = trend?.trend === 'up' ? TrendingUp : trend?.trend === 'down' ? TrendingDown : Minus
            const trendColor = trend?.trend === 'up' ? 'text-emerald-400' : trend?.trend === 'down' ? 'text-red-400' : 'text-muted'

            return (
              <div key={sk} className="flex items-center gap-3">
                <span className={`text-[11px] w-14 text-left shrink-0 ${colors.text}`}>{SKILL_LABELS[sk]}</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${colors.bar}`}
                  />
                </div>
                <span className="text-xs font-bold w-10 text-left" style={{ color: 'var(--text-primary)' }}>{score}%</span>
                {trend && (
                  <div className="flex items-center gap-1">
                    <TrendIcon size={12} className={trendColor} />
                    {trend.change !== 0 && (
                      <span className={`text-[10px] ${trendColor}`}>
                        {trend.change > 0 ? '+' : ''}{trend.change}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="fl-card-static p-5"
        >
          <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 text-emerald-400">
            <Star size={14} /> نقاط القوة
          </h3>
          {strengths.length > 0 ? (
            <div className="space-y-2">
              {strengths.map(s => (
                <div key={s.skill} className="flex items-center justify-between rounded-lg p-2.5" style={{ background: 'var(--surface-base)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{SKILL_LABELS[s.skill]}</span>
                  <span className="text-xs font-bold text-emerald-400">{s.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">لا توجد بيانات كافية بعد</p>
          )}
          {/* AI-identified strengths */}
          {aiProfile?.strengths?.length > 0 && (
            <div className="mt-3 space-y-1">
              {aiProfile.strengths.map((s, i) => (
                <p key={i} className="text-[11px] text-muted flex items-start gap-1.5">
                  <Star size={10} className="text-emerald-400 shrink-0 mt-0.5" /> {s}
                </p>
              ))}
            </div>
          )}
        </motion.div>

        {/* Weaknesses */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="fl-card-static p-5"
        >
          <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 text-amber-400">
            <Target size={14} /> مجالات التحسين
          </h3>
          {weaknesses.length > 0 ? (
            <div className="space-y-2">
              {weaknesses.map(s => (
                <div key={s.skill} className="flex items-center justify-between rounded-lg p-2.5" style={{ background: 'var(--surface-base)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{SKILL_LABELS[s.skill]}</span>
                  <span className="text-xs font-bold text-amber-400">{s.score}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">لا توجد بيانات كافية بعد</p>
          )}
          {/* AI-identified weaknesses */}
          {aiProfile?.weaknesses?.length > 0 && (
            <div className="mt-3 space-y-1">
              {aiProfile.weaknesses.map((w, i) => (
                <p key={i} className="text-[11px] text-muted flex items-start gap-1.5">
                  <AlertTriangle size={10} className="text-amber-400 shrink-0 mt-0.5" /> {w}
                </p>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* AI Tips */}
      {aiProfile?.tips?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="fl-card-static p-5"
        >
          <h3 className="text-xs font-semibold mb-3 flex items-center gap-2 text-sky-400">
            <Lightbulb size={14} /> نصائح مخصصة لك
          </h3>
          <div className="space-y-2">
            {aiProfile.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                <div className="w-6 h-6 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-sky-400">{i + 1}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tip}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weekly Progress */}
      {weeklyStats?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fl-card-static p-5"
        >
          <h3 className="text-xs font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Clock size={14} className="text-violet-400" />
            المهام الأسبوعية — آخر {weeklyStats.length} أسابيع
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {weeklyStats.map((w, i) => {
              const pct = Math.round(w.completion_percentage || 0)
              const color = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-sky-400' : pct >= 25 ? 'text-amber-400' : 'text-red-400'
              return (
                <div key={i} className="text-center rounded-xl p-3" style={{ background: 'var(--surface-base)' }}>
                  <p className={`text-lg font-bold ${color}`}>{pct}%</p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {new Date(w.week_start).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Recent Tests */}
      {recentTests?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="fl-card-static p-5"
        >
          <h3 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Target size={14} className="text-sky-400" />
            آخر الاختبارات
          </h3>
          <div className="space-y-2">
            {recentTests.map((test, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {test.test_type === 'placement' ? 'تحديد مستوى' : test.test_type === 'periodic' ? 'اختبار دوري' : 'تشخيصي'}
                  </p>
                  <p className="text-[10px] text-muted">
                    {test.completed_at && new Date(test.completed_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-sky-400">{test.overall_score ? `${Math.round(test.overall_score)}%` : '—'}</p>
                  {test.recommended_level && (
                    <p className="text-[10px] text-muted">{ACADEMIC_LEVELS[test.recommended_level]?.cefr}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!latestSnapshot && !aiProfile && (
        <div className="fl-card-static p-12 text-center">
          <Brain size={40} className="text-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>لا توجد بيانات كافية بعد</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            استمر في إكمال المهام والاختبارات وسيقوم الذكاء الاصطناعي بتحليل أدائك وتقديم توصيات مخصصة لك
          </p>
        </div>
      )}
    </div>
  )
}
