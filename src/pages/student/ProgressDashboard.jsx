import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Star, Flame, BookOpen, Trophy, TrendingUp, Users } from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS } from '../../lib/constants'

// ─── Helpers ──────────────────────────────────
function getLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] } }),
}

const SKILL_LABELS = {
  reading: 'القراءة',
  grammar: 'القواعد',
  vocabulary: 'المفردات',
  listening: 'الاستماع',
  writing: 'الكتابة',
  speaking: 'المحادثة',
}

const SKILL_KEYS = ['reading', 'grammar', 'vocabulary', 'listening', 'writing', 'speaking']

// ─── Page ─────────────────────────────────────
export default function ProgressDashboard() {
  const { user, studentData } = useAuthStore()
  const studentId = user?.id

  // ── Hero stats ──
  const xpTotal = studentData?.xp_total || 0
  const currentStreak = studentData?.current_streak || 0
  const longestStreak = studentData?.longest_streak || 0
  const academicLevel = studentData?.academic_level || 1
  const levelInfo = ACADEMIC_LEVELS[academicLevel]
  const gamLevel = getLevel(xpTotal)

  // ── Rank among peers ──
  const { data: rank } = useQuery({
    queryKey: ['progress-rank', studentId],
    queryFn: async () => {
      if (!studentData?.group_id) return null
      const { data } = await supabase
        .from('students')
        .select('id, xp_total')
        .eq('group_id', studentData.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('xp_total', { ascending: false })
      if (!data) return null
      const idx = data.findIndex(s => s.id === studentId)
      return { rank: idx + 1, total: data.length }
    },
    enabled: !!studentId && !!studentData?.group_id,
  })

  // ── Curriculum progress (units) ──
  const { data: currProgress } = useQuery({
    queryKey: ['progress-curriculum', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('unit_id, status, completion_percentage, reading_a_completed, reading_b_completed, vocabulary_completed, grammar_completed, writing_completed, listening_completed, speaking_completed')
        .eq('student_id', studentId)
      return data || []
    },
    enabled: !!studentId,
  })

  // ── Total units in student's level ──
  const { data: totalUnits } = useQuery({
    queryKey: ['progress-total-units', academicLevel],
    queryFn: async () => {
      const { count } = await supabase
        .from('curriculum_units')
        .select('*', { count: 'exact', head: true })
        .eq('level', academicLevel)
      return count || 12
    },
    enabled: !!academicLevel,
  })

  // ── Skill scores for radar ──
  const skillScores = useMemo(() => {
    if (!currProgress?.length) return SKILL_KEYS.map(k => ({ skill: SKILL_LABELS[k], score: 0 }))
    const total = currProgress.length || 1
    const counts = {
      reading: currProgress.filter(p => p.reading_a_completed || p.reading_b_completed).length,
      grammar: currProgress.filter(p => p.grammar_completed).length,
      vocabulary: currProgress.filter(p => p.vocabulary_completed).length,
      listening: currProgress.filter(p => p.listening_completed).length,
      writing: currProgress.filter(p => p.writing_completed).length,
      speaking: currProgress.filter(p => p.speaking_completed).length,
    }
    return SKILL_KEYS.map(k => ({
      skill: SKILL_LABELS[k],
      score: Math.round((counts[k] / total) * 100),
    }))
  }, [currProgress])

  // ── XP history (last 30 days) ──
  const { data: xpHistory } = useQuery({
    queryKey: ['progress-xp-history', studentId],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const { data } = await supabase
        .from('xp_transactions')
        .select('amount, created_at')
        .eq('student_id', studentId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })
      if (!data?.length) return []

      // Group by day
      const byDay = {}
      data.forEach(t => {
        const day = t.created_at.slice(0, 10)
        byDay[day] = (byDay[day] || 0) + t.amount
      })

      // Build 30-day array with cumulative
      const result = []
      let cumulative = 0
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        const daily = byDay[key] || 0
        cumulative += daily
        result.push({
          date: `${d.getDate()}/${d.getMonth() + 1}`,
          daily,
          cumulative,
        })
      }
      return result
    },
    enabled: !!studentId,
  })

  // ── Activity heatmap (last 12 weeks) ──
  const { data: activityMap } = useQuery({
    queryKey: ['progress-activity-heatmap', studentId],
    queryFn: async () => {
      const since = new Date()
      since.setDate(since.getDate() - 84) // 12 weeks
      const [sessRes, evtRes] = await Promise.all([
        supabase
          .from('user_sessions')
          .select('started_at')
          .eq('user_id', studentId)
          .gte('started_at', since.toISOString()),
        supabase
          .from('activity_events')
          .select('created_at')
          .eq('user_id', studentId)
          .gte('created_at', since.toISOString()),
      ])

      const counts = {}
      ;(sessRes.data || []).forEach(s => {
        const day = s.started_at.slice(0, 10)
        counts[day] = (counts[day] || 0) + 1
      })
      ;(evtRes.data || []).forEach(e => {
        const day = e.created_at.slice(0, 10)
        counts[day] = (counts[day] || 0) + 1
      })
      return counts
    },
    enabled: !!studentId,
  })

  // ── Build heatmap grid (12 weeks × 7 days) ──
  const heatmapGrid = useMemo(() => {
    const weeks = []
    const today = new Date()
    // Start from 11 weeks ago's Saturday (week start)
    const dayOfWeek = today.getDay() // 0=Sun
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - dayOfWeek - (11 * 7))

    for (let w = 0; w < 12; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + w * 7 + d)
        const key = date.toISOString().slice(0, 10)
        const count = activityMap?.[key] || 0
        const isFuture = date > today
        week.push({ key, count, isFuture })
      }
      weeks.push(week)
    }
    return weeks
  }, [activityMap])

  // ── Peer comparison ──
  const { data: peerComparison } = useQuery({
    queryKey: ['progress-peers', studentId],
    queryFn: async () => {
      if (!studentData?.group_id) return null
      // Get all group students' progress
      const { data: groupStudents } = await supabase
        .from('students')
        .select('id')
        .eq('group_id', studentData.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)

      if (!groupStudents?.length || groupStudents.length < 2) return null

      const ids = groupStudents.map(s => s.id)
      const { data: allProgress } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, reading_a_completed, reading_b_completed, vocabulary_completed, grammar_completed, writing_completed, listening_completed, speaking_completed')
        .in('student_id', ids)

      if (!allProgress?.length) return null

      // Calculate per-student skill totals
      const studentSkills = {}
      allProgress.forEach(p => {
        if (!studentSkills[p.student_id]) studentSkills[p.student_id] = {}
        const s = studentSkills[p.student_id]
        SKILL_KEYS.forEach(k => {
          if (!s[k]) s[k] = 0
          if (k === 'reading') { if (p.reading_a_completed || p.reading_b_completed) s[k]++ }
          else if (p[`${k}_completed`]) s[k]++
        })
      })

      // Compare current student vs others
      const mySkills = studentSkills[studentId] || {}
      const results = []
      SKILL_KEYS.forEach(k => {
        const myScore = mySkills[k] || 0
        const othersBelow = Object.entries(studentSkills)
          .filter(([id]) => id !== studentId)
          .filter(([, sk]) => (sk[k] || 0) < myScore).length
        const totalOthers = ids.length - 1
        if (totalOthers > 0) {
          const pct = Math.round((othersBelow / totalOthers) * 100)
          results.push({ skill: SKILL_LABELS[k], pct })
        }
      })
      return results.sort((a, b) => b.pct - a.pct)
    },
    enabled: !!studentId && !!studentData?.group_id,
  })

  // ── Achievements ──
  const { data: achievements } = useQuery({
    queryKey: ['progress-achievements', studentId],
    queryFn: async () => {
      const items = []

      // Completed units
      if (currProgress) {
        const completed = currProgress.filter(p => p.status === 'completed')
        if (completed.length > 0) items.push({ text: `أكملت ${completed.length} وحدة من المنهج!`, icon: '📚' })
      }

      // Streak milestones
      if (longestStreak >= 30) items.push({ text: `حققت سلسلة 30 يوم!`, icon: '🏆' })
      else if (longestStreak >= 14) items.push({ text: `حققت سلسلة 14 يوم!`, icon: '🔥' })
      else if (longestStreak >= 7) items.push({ text: `حققت سلسلة 7 أيام!`, icon: '🔥' })

      // XP milestones
      if (xpTotal >= 1000) items.push({ text: `تجاوزت 1,000 نقطة XP!`, icon: '⭐' })
      if (xpTotal >= 5000) items.push({ text: `تجاوزت 5,000 نقطة XP!`, icon: '🌟' })

      // Gamification level
      if (gamLevel.level >= 5) items.push({ text: `وصلت لمستوى "${gamLevel.title_ar}"!`, icon: '🎖️' })

      return items.slice(0, 5) // Max 5
    },
    enabled: !!studentId && currProgress !== undefined,
  })

  // ── Level progress ──
  const completedUnits = currProgress?.filter(p => p.status === 'completed').length || 0
  const levelPct = totalUnits ? Math.round((completedUnits / totalUnits) * 100) : 0

  const isLoading = !studentData

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
        <div className="skeleton h-72 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-page-title">تقدّمي</h1>
        <p className="text-[15px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
          تابع تطورك وإنجازاتك في رحلة التعلّم
        </p>
      </motion.div>

      {/* Section 1: Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Star, color: 'sky', label: 'نقاط XP', value: xpTotal.toLocaleString(),
            sub: rank ? `المرتبة ${rank.rank} من ${rank.total}` : gamLevel.title_ar,
          },
          {
            icon: Flame, color: 'amber', label: 'سلسلة الأيام', value: `${currentStreak} يوم`,
            sub: `أطول سلسلة: ${longestStreak}`,
          },
          {
            icon: BookOpen, color: 'emerald', label: levelInfo?.name_ar || `المستوى ${academicLevel}`,
            value: `${levelPct}%`,
            sub: `${completedUnits}/${totalUnits || 12} وحدة`,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            custom={i + 1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="rounded-2xl p-5 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-${card.color}-500/10`}>
              <card.icon size={22} className={`text-${card.color}-400`} />
            </div>
            <p className="text-[32px] font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--text-tertiary)' }}>{card.label}</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Section 2: Skill Radar */}
      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-2xl p-5 sm:p-7"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp size={18} className="text-sky-400" />
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>مهاراتي</h2>
        </div>
        {skillScores.every(s => s.score === 0) ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            أكمل أنشطة المنهج لرؤية تقدمك
          </p>
        ) : (
          <div className="w-full" style={{ height: 300 }}>
            <ResponsiveContainer>
              <RadarChart data={skillScores} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Tajawal' }}
                />
                <Radar
                  dataKey="score"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Section 3: Activity Heatmap */}
      <motion.div
        custom={5}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-2xl p-5 sm:p-7"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>نشاطي الأسبوعي</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[320px]">
            {/* Day labels */}
            <div className="flex gap-1 mb-1 text-[10px]" style={{ color: 'var(--text-tertiary)', paddingRight: 4 }}>
              {['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(d => (
                <div key={d} className="flex-1 text-center">{d}</div>
              ))}
            </div>
            {/* Weeks */}
            <div className="space-y-1">
              {heatmapGrid.map((week, wi) => (
                <div key={wi} className="flex gap-1">
                  {week.map((day) => (
                    <div
                      key={day.key}
                      className="flex-1 aspect-square rounded-sm"
                      title={`${day.key}: ${day.count} نشاط`}
                      style={{
                        background: day.isFuture
                          ? 'transparent'
                          : day.count === 0
                          ? 'rgba(255,255,255,0.04)'
                          : day.count <= 2
                          ? 'rgba(74,222,128,0.3)'
                          : 'rgba(74,222,128,0.7)',
                        minHeight: 14,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              <span>أقل</span>
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(74,222,128,0.3)' }} />
              <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(74,222,128,0.7)' }} />
              <span>أكثر</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Section 4: XP History Chart */}
      {xpHistory?.length > 0 && (
        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-2xl p-5 sm:p-7"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 className="text-[15px] font-bold mb-4" style={{ color: 'var(--text-primary)' }}>تاريخ نقاط XP</h2>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={xpHistory}>
                <defs>
                  <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                    direction: 'rtl',
                  }}
                  formatter={(v, name) => [v, name === 'cumulative' ? 'إجمالي' : 'يومي']}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#38bdf8"
                  fill="url(#xpGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Section 5: Achievements */}
      <motion.div
        custom={7}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-2xl p-5 sm:p-7"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Trophy size={18} className="text-amber-400" />
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>إنجازاتي</h2>
        </div>
        {!achievements?.length ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
            ابدأ بإكمال أنشطة المنهج لفتح الإنجازات!
          </p>
        ) : (
          <div className="space-y-2">
            {achievements.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <span className="text-xl">{a.icon}</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a.text}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Section 6: Peer Comparison */}
      {peerComparison?.length > 0 && (
        <motion.div
          custom={8}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-2xl p-5 sm:p-7"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Users size={18} className="text-violet-400" />
            <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>مقارنة مع الزملاء</h2>
          </div>
          <div className="space-y-3">
            {peerComparison.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span style={{ color: 'var(--text-secondary)' }}>{p.skill}</span>
                    <span className="font-medium" style={{ color: p.pct >= 50 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      {p.pct >= 50 ? `أفضل من ${p.pct}%` : `تحتاج تركيز أكثر`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${p.pct}%`,
                        background: p.pct >= 70 ? 'var(--accent-emerald)' : p.pct >= 40 ? 'var(--accent-sky)' : 'var(--accent-amber)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
