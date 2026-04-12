import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ChevronDown, ChevronUp, BookOpen, Gamepad2, PenTool,
  Clock, Trophy, Target, Flame, Star, RotateCcw, Volume2,
  CheckCircle2, XCircle, AlertTriangle, Sparkles, MessageSquare,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import UserAvatar from '../../components/common/UserAvatar'
import { calculateUnitCompletion, groupProgressByUnit } from '../../utils/curriculumProgress'

// ─── Constants & Helpers ────────────────────────────────────
const SECTION_META = {
  reading: { label: 'القراءة', icon: BookOpen, color: 'var(--accent-sky)' },
  grammar: { label: 'القواعد', icon: PenTool, color: 'var(--accent-violet)' },
  listening: { label: 'الاستماع', icon: Volume2, color: 'var(--accent-amber)' },
  vocabulary: { label: 'المفردات', icon: Sparkles, color: 'var(--accent-emerald)' },
  writing: { label: 'الكتابة', icon: MessageSquare, color: 'var(--accent-rose)' },
}

const PACKAGE_LABELS = { asas: 'أساس', talaqa: 'طلاقة', tamayuz: 'تميّز', ielts: 'IELTS' }

const GAME_LABELS = {
  matching: 'مطابقة', word_scramble: 'ترتيب حروف', sentence_order: 'ترتيب جمل',
  fill_blank: 'ملء الفراغ', flashcards: 'بطاقات', quiz: 'اختبار سريع',
  memory: 'ذاكرة', speed_vocab: 'مفردات سريعة',
}

const CONTEXT_LABELS = {
  vocabulary: 'مفردات', grammar: 'قواعد', verbs: 'أفعال', spelling: 'إملاء', general: 'عام',
}

const MASTERY_CONFIG = {
  mastered: { label: 'متقن', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.12)' },
  familiar: { label: 'مألوف', color: 'var(--accent-sky)', bg: 'rgba(56,189,248,0.12)' },
  learning: { label: 'يتعلم', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.1)' },
  new: { label: 'جديد', color: 'var(--text-tertiary)', bg: 'var(--surface-overlay)' },
}

function timeAgo(date) {
  if (!date) return 'غير معروف'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `قبل ${hrs} ساعة`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `قبل ${days} يوم`
  return new Date(date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'اليوم'
  if (d.toDateString() === yesterday.toDateString()) return 'أمس'
  return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
}

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}

// ─── Main Component ─────────────────────────────────────────
export default function StudentProgressDetail() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { profile: currentUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')

  // ── Fetch student profile ────────────────────────
  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student-profile-detail', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, students(*, groups(name, code, level), teams(name, color))')
        .eq('id', studentId)
        .single()
      if (error) {
        console.error('StudentProgressDetail: failed to load student', studentId, error.message)
        return null
      }
      return data
    },
    enabled: !!studentId,
  })

  // ── Fetch curriculum progress ────────────────────
  const { data: progressData, isLoading: loadingProgress } = useQuery({
    queryKey: ['student-curriculum-progress', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', studentId)
      return data || []
    },
    enabled: !!studentId,
  })

  // ── Fetch units for the student's level ──────────
  const { data: units } = useQuery({
    queryKey: ['student-level-units', student?.students?.[0]?.groups?.level],
    queryFn: async () => {
      const levelNum = student?.students?.[0]?.groups?.level
      if (!levelNum) return []
      const { data: level } = await supabase
        .from('curriculum_levels')
        .select('id')
        .eq('level_number', levelNum)
        .single()
      if (!level) return []
      const { data } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, theme_ar')
        .eq('level_id', level.id)
        .order('unit_number')
      return data || []
    },
    enabled: !!student?.students?.[0]?.groups?.level,
  })

  // ── Fetch game sessions ──────────────────────────
  const { data: games, isLoading: loadingGames } = useQuery({
    queryKey: ['student-games', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!studentId,
  })

  // ── Fetch spelling progress ──────────────────────
  const { data: spellingData, isLoading: loadingSpelling } = useQuery({
    queryKey: ['student-spelling', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_spelling_progress')
        .select('*, spelling_words(word, meaning_ar)')
        .eq('student_id', studentId)
      return data || []
    },
    enabled: !!studentId,
  })

  // ── Fetch verb progress ──────────────────────────
  const { data: verbData, isLoading: loadingVerbs } = useQuery({
    queryKey: ['student-verbs', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_verb_progress')
        .select('*, irregular_verbs(base_form, past_simple, past_participle, meaning_ar)')
        .eq('student_id', studentId)
      return data || []
    },
    enabled: !!studentId,
  })

  // ── Fetch writing history ────────────────────────
  const { data: writingData, isLoading: loadingWriting } = useQuery({
    queryKey: ['student-writing', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('writing_history')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!studentId,
  })

  // ── Fetch XP transactions ───────────────────────
  const { data: xpData } = useQuery({
    queryKey: ['student-xp', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50)
      return data || []
    },
    enabled: !!studentId,
  })

  // ── Computed data ────────────────────────────────
  const progressByUnit = useMemo(() => groupProgressByUnit(progressData || []), [progressData])

  const overviewStats = useMemo(() => {
    if (!progressData?.length) return { completedSections: 0, totalSections: 0, avgScore: 0, gamesThisWeek: 0, masteredWords: 0, totalWords: 0 }

    const completed = progressData.filter(p => p.status === 'completed')
    const scores = completed.filter(p => p.score != null).map(p => p.score)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    const weekAgo = Date.now() - 7 * 86400000
    const gamesThisWeek = (games || []).filter(g => new Date(g.created_at).getTime() > weekAgo).length

    const masteredWords = (spellingData || []).filter(s => s.mastery === 'mastered' || (s.accuracy_rate && s.accuracy_rate >= 80)).length

    return {
      completedSections: completed.length,
      totalSections: (units?.length || 0) * 5,
      avgScore,
      gamesThisWeek,
      masteredWords,
      totalWords: (spellingData || []).length,
    }
  }, [progressData, games, spellingData, units])

  // Activity chart: last 30 days
  const activityChart = useMemo(() => {
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toDateString()
      const label = d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'numeric' })

      const sections = (progressData || []).filter(p =>
        p.completed_at && new Date(p.completed_at).toDateString() === key
      ).length
      const gameCount = (games || []).filter(g =>
        new Date(g.created_at).toDateString() === key
      ).length

      days.push({ name: label, activity: sections + gameCount })
    }
    return days
  }, [progressData, games])

  // Game stats
  const gameStats = useMemo(() => {
    if (!games?.length) return null
    const accuracies = games.filter(g => g.accuracy_percent != null).map(g => Number(g.accuracy_percent))
    const avgAccuracy = accuracies.length > 0 ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) : 0
    const bestScore = games.reduce((max, g) => Math.max(max, g.score || 0), 0)

    // Favorite game type
    const typeCounts = {}
    games.forEach(g => { typeCounts[g.game_type] = (typeCounts[g.game_type] || 0) + 1 })
    const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

    // Accuracy trend (last 10)
    const trend = games.slice(0, 10).reverse().map((g, i) => ({
      name: `${i + 1}`,
      accuracy: Number(g.accuracy_percent) || 0,
    }))

    return { total: games.length, avgAccuracy, bestScore, favoriteType, trend }
  }, [games])

  // Timeline: merge all sources
  const timeline = useMemo(() => {
    const items = []

    // Curriculum completions
    ;(progressData || []).filter(p => p.completed_at).forEach(p => {
      const unitNum = units?.find(u => u.id === p.unit_id)?.unit_number
      items.push({
        type: 'curriculum',
        icon: '🟢',
        label: `أكمل ${SECTION_META[p.section_type]?.label || p.section_type}`,
        detail: unitNum ? `الوحدة ${unitNum}` : '',
        score: p.score != null ? `${p.score}%` : null,
        date: p.completed_at,
      })
    })

    // Games
    ;(games || []).forEach(g => {
      items.push({
        type: 'game',
        icon: '🎮',
        label: `لعب ${GAME_LABELS[g.game_type] || g.game_type}`,
        detail: CONTEXT_LABELS[g.context] || g.context,
        score: g.accuracy_percent != null ? `${Math.round(g.accuracy_percent)}%` : null,
        date: g.created_at,
      })
    })

    // XP
    ;(xpData || []).forEach(x => {
      items.push({
        type: 'xp',
        icon: '🏆',
        label: `حصل على ${x.amount} XP`,
        detail: x.description || x.reason,
        score: null,
        date: x.created_at,
      })
    })

    // Writing
    ;(writingData || []).forEach(w => {
      items.push({
        type: 'writing',
        icon: '✍️',
        label: `كتابة — ${w.task_type === 'sentence_building' ? 'بناء جمل' : w.task_type}`,
        detail: w.band_score ? `Band ${w.band_score}` : '',
        score: null,
        date: w.created_at,
      })
    })

    items.sort((a, b) => new Date(b.date) - new Date(a.date))
    return items
  }, [progressData, games, xpData, writingData, units])

  // ── Loading state ────────────────────────────────
  if (loadingStudent) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-20" dir="rtl">
        <p style={{ color: 'var(--text-secondary)' }}>الطالب غير موجود</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm" style={{ color: 'var(--accent-sky)' }}>
          رجوع
        </button>
      </div>
    )
  }

  const studentInfo = student.students?.[0] || student.students || {}
  const group = studentInfo.groups
  const team = studentInfo.teams

  const TABS = [
    { key: 'overview', label: 'نظرة عامة' },
    { key: 'answers', label: 'إجابات المنهج' },
    { key: 'games', label: 'الألعاب' },
    { key: 'spelling', label: 'الإملاء والأفعال' },
    { key: 'writing', label: 'الكتابة' },
    { key: 'timeline', label: 'الجدول الزمني' },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium min-h-[44px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowRight size={16} />
        رجوع
      </button>

      {/* ── Header Card ─────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-4">
          <UserAvatar user={student} size={56} rounded="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {student.full_name || student.display_name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              {studentInfo.package && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--accent-sky)' }}>
                  {PACKAGE_LABELS[studentInfo.package] || studentInfo.package}
                </span>
              )}
              {studentInfo.academic_level && (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  المستوى {studentInfo.academic_level}
                </span>
              )}
              {group && (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {group.name}
                </span>
              )}
              {team && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: team.color || 'var(--accent-sky)' }} />
                  {team.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {studentInfo.xp_total != null && (
                <span className="text-xs font-bold" style={{ color: 'var(--accent-amber)' }}>
                  ⭐ {studentInfo.xp_total} XP
                </span>
              )}
              {studentInfo.streak_days > 0 && (
                <span className="text-xs font-bold" style={{ color: 'var(--accent-rose)' }}>
                  🔥 {studentInfo.streak_days} يوم متتالي
                </span>
              )}
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                آخر نشاط: {timeAgo(studentInfo.last_active_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 sticky top-0 z-10 py-2"
        style={{ background: 'var(--surface-base)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px]"
            style={{
              background: activeTab === tab.key ? 'rgba(56,189,248,0.12)' : 'transparent',
              color: activeTab === tab.key ? 'var(--accent-sky)' : 'var(--text-secondary)',
              border: activeTab === tab.key ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────── */}
      {activeTab === 'overview' && (
        <OverviewTab
          progressByUnit={progressByUnit}
          units={units || []}
          stats={overviewStats}
          activityChart={activityChart}
          loading={loadingProgress}
        />
      )}

      {activeTab === 'answers' && (
        <AnswersTab
          progressByUnit={progressByUnit}
          units={units || []}
          loading={loadingProgress}
        />
      )}

      {activeTab === 'games' && (
        <GamesTab games={games || []} stats={gameStats} loading={loadingGames} />
      )}

      {activeTab === 'spelling' && (
        <SpellingVerbsTab
          spellingData={spellingData || []}
          verbData={verbData || []}
          loadingSpelling={loadingSpelling}
          loadingVerbs={loadingVerbs}
        />
      )}

      {activeTab === 'writing' && (
        <WritingTab data={writingData || []} loading={loadingWriting} />
      )}

      {activeTab === 'timeline' && (
        <TimelineTab items={timeline} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: Overview
// ═══════════════════════════════════════════════════════════════
function OverviewTab({ progressByUnit, units, stats, activityChart, loading }) {
  if (loading) return <SkeletonSection />

  return (
    <div className="space-y-5">
      {/* Mini Progress Matrix */}
      {units.length > 0 && (
        <Card title="تقدم الوحدات">
          <div className="flex gap-2 flex-wrap">
            {units.map(unit => {
              const unitProgress = progressByUnit[unit.id] || []
              const calc = calculateUnitCompletion(unitProgress)
              const avgScore = unitProgress.filter(p => p.score != null).length > 0
                ? Math.round(unitProgress.filter(p => p.score != null).reduce((s, p) => s + p.score, 0) / unitProgress.filter(p => p.score != null).length)
                : null

              let bg, border, textColor
              if (calc.status === 'completed') {
                bg = 'rgba(16,185,129,0.15)'; border = 'rgba(16,185,129,0.3)'; textColor = 'var(--accent-emerald)'
              } else if (calc.status === 'in_progress') {
                bg = 'rgba(245,158,11,0.12)'; border = 'rgba(245,158,11,0.25)'; textColor = 'var(--accent-amber)'
              } else {
                bg = 'var(--surface-overlay)'; border = 'var(--border-subtle)'; textColor = 'var(--text-tertiary)'
              }

              return (
                <div
                  key={unit.id}
                  className="flex flex-col items-center justify-center rounded-xl min-w-[56px] h-[56px] px-2 text-center cursor-default"
                  style={{ background: bg, border: `1px solid ${border}` }}
                  title={`${unit.theme_ar}\n${calc.sectionDetails.map(s => `${SECTION_META[s.type]?.label}: ${s.status === 'completed' ? '✅' : s.status === 'in_progress' ? '🟡' : '❌'}${s.score != null ? ` ${s.score}%` : ''}`).join('\n')}`}
                >
                  <span className="text-[10px] font-bold" style={{ color: textColor }}>و{unit.unit_number}</span>
                  <span className="text-xs font-bold" style={{ color: textColor }}>
                    {calc.status === 'completed' ? (avgScore != null ? `${avgScore}%` : '✅')
                      : calc.status === 'in_progress' ? `${calc.sectionsCompleted}/5`
                      : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={BookOpen} label="أقسام مكتملة" value={`${stats.completedSections} من ${stats.totalSections}`} color="sky" />
        <MiniStat icon={Target} label="متوسط الدرجة" value={`${stats.avgScore}%`} color="emerald" />
        <MiniStat icon={Gamepad2} label="ألعاب هالأسبوع" value={stats.gamesThisWeek} color="violet" />
        <MiniStat icon={Star} label="كلمات مُتقنة" value={`${stats.masteredWords} من ${stats.totalWords}`} color="amber" />
      </div>

      {/* Activity Chart */}
      <Card title="النشاط — آخر 30 يوم">
        {activityChart.every(d => d.activity === 0) ? (
          <EmptyState text="لا يوجد نشاط مسجّل بعد" />
        ) : (
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={activityChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 12, fontSize: 12, direction: 'rtl' }}
                  formatter={(v) => [`${v}`, 'نشاط']}
                />
                <Bar dataKey="activity" fill="var(--accent-sky)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: Curriculum Answers
// ═══════════════════════════════════════════════════════════════
function AnswersTab({ progressByUnit, units, loading }) {
  if (loading) return <SkeletonSection />

  const unitsWithProgress = units.filter(u => progressByUnit[u.id]?.length > 0)

  if (unitsWithProgress.length === 0) {
    return <EmptyState text="لا يوجد إجابات منهج بعد" />
  }

  return (
    <div className="space-y-3">
      {unitsWithProgress.map(unit => {
        const sections = progressByUnit[unit.id] || []
        return (
          <div key={unit.id} className="space-y-2">
            {sections.map(section => (
              <SectionAccordion
                key={`${unit.id}-${section.section_type}`}
                unitNumber={unit.unit_number}
                unitTheme={unit.theme_ar}
                section={section}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function SectionAccordion({ unitNumber, unitTheme, section }) {
  const [open, setOpen] = useState(false)
  const meta = SECTION_META[section.section_type] || {}
  const Icon = meta.icon || BookOpen
  const statusIcon = section.status === 'completed' ? '✅' : section.status === 'in_progress' ? '🟡' : '❌'

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 min-h-[52px]"
      >
        <Icon size={16} style={{ color: meta.color }} />
        <span className="flex-1 text-right text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          الوحدة {unitNumber} — {meta.label} {statusIcon}
          {section.score != null && <span className="mr-2 text-xs font-bold" style={{ color: meta.color }}>{section.score}%</span>}
        </span>
        {section.attempt_number > 1 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--accent-violet)' }}>
            المحاولة {section.attempt_number}
          </span>
        )}
        {open ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              <AnswerContent section={section} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AnswerContent({ section }) {
  const answers = section.answers
  if (!answers) return <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>لا توجد إجابات محفوظة</p>

  try {
    const type = section.section_type

    // Reading: { [questionId]: { selected, correct } }
    if (type === 'reading') {
      const entries = Object.entries(answers)
      if (entries.length === 0) return <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>لا توجد إجابات</p>
      return (
        <div className="space-y-2">
          {entries.map(([qId, ans], i) => (
            <div key={qId} className="text-sm p-3 rounded-xl" style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>السؤال {i + 1}</p>
              <div className="flex items-start gap-2">
                {ans.correct ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                  : <XCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-rose)' }} />}
                <span style={{ color: 'var(--text-primary)' }}>{ans.selected}</span>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Grammar: { exercises: [{ id, type, studentAnswer, correctAnswer, isCorrect }] }
    if (type === 'grammar') {
      const exercises = answers.exercises || []
      if (exercises.length === 0) return <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>لا توجد إجابات</p>
      return (
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <div key={ex.id || i} className="text-sm p-3 rounded-xl" style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                تمرين {i + 1} ({ex.type})
              </p>
              <div className="flex items-start gap-2">
                {ex.isCorrect ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                  : <XCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-rose)' }} />}
                <div>
                  <p style={{ color: 'var(--text-primary)' }}>إجابة الطالب: {ex.studentAnswer || '—'}</p>
                  {!ex.isCorrect && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--accent-emerald)' }}>الإجابة الصحيحة: {ex.correctAnswer}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Listening: { questions: [{ questionIndex, question, studentAnswer, correctAnswer, isCorrect }] }
    if (type === 'listening') {
      const questions = answers.questions || []
      if (questions.length === 0) return <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>لا توجد إجابات</p>
      return (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={i} className="text-sm p-3 rounded-xl" style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                {q.question || `السؤال ${i + 1}`}
              </p>
              <div className="flex items-start gap-2">
                {q.isCorrect ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-emerald)' }} />
                  : <XCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-rose)' }} />}
                <div>
                  <p style={{ color: 'var(--text-primary)' }}>الاختيار: {q.studentAnswer != null ? `الخيار ${q.studentAnswer + 1}` : '—'}</p>
                  {!q.isCorrect && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--accent-emerald)' }}>الإجابة الصحيحة: الخيار {q.correctAnswer + 1}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Writing: { draft, wordCount, lastSavedAt }
    if (type === 'writing') {
      return (
        <div className="space-y-2">
          {answers.draft && (
            <div className="text-sm p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>مسودة الطالب:</p>
              <p className="leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{answers.draft}</p>
              <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {answers.wordCount != null && <span>عدد الكلمات: {answers.wordCount}</span>}
                {answers.lastSavedAt && <span>آخر حفظ: {timeAgo(answers.lastSavedAt)}</span>}
              </div>
            </div>
          )}
        </div>
      )
    }

    // Vocabulary or unknown: show raw
    if (type === 'vocabulary') {
      return <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>تمت مراجعة المفردات</p>
    }

    return <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>نوع غير معروف</p>
  } catch {
    return <p className="text-xs" style={{ color: 'var(--accent-rose)' }}>تعذر عرض الإجابات</p>
  }
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: Games
// ═══════════════════════════════════════════════════════════════
function GamesTab({ games, stats, loading }) {
  if (loading) return <SkeletonSection />
  if (!games.length) return <EmptyState text="لا يوجد بيانات ألعاب بعد" />

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat icon={Gamepad2} label="إجمالي الألعاب" value={stats.total} color="violet" />
          <MiniStat icon={Target} label="متوسط الدقة" value={`${stats.avgAccuracy}%`} color="emerald" />
          <MiniStat icon={Trophy} label="أعلى نتيجة" value={stats.bestScore} color="amber" />
          <MiniStat icon={Star} label="اللعبة المفضلة" value={GAME_LABELS[stats.favoriteType] || stats.favoriteType || '—'} color="sky" />
        </div>
      )}

      {/* Accuracy trend */}
      {stats?.trend?.length > 1 && (
        <Card title="اتجاه الدقة — آخر 10 ألعاب">
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={stats.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, 'الدقة']}
                />
                <Line type="monotone" dataKey="accuracy" stroke="var(--accent-emerald)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-emerald)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Games table */}
      <Card title="جميع الألعاب">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm" style={{ minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['اللعبة', 'النوع', 'النتيجة', 'الدقة', 'الوقت', 'التاريخ'].map(h => (
                  <th key={h} className="text-right py-2 px-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="py-2 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {GAME_LABELS[g.game_type] || g.game_type}
                  </td>
                  <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>
                    {CONTEXT_LABELS[g.context] || g.context}
                  </td>
                  <td className="py-2 px-2" style={{ color: 'var(--text-primary)' }}>
                    {g.items_correct != null && g.items_count ? `${g.items_correct}/${g.items_count}` : g.score}
                  </td>
                  <td className="py-2 px-2">
                    <span style={{ color: Number(g.accuracy_percent) >= 70 ? 'var(--accent-emerald)' : Number(g.accuracy_percent) >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                      {g.accuracy_percent != null ? `${Math.round(Number(g.accuracy_percent))}%` : '—'}
                    </span>
                  </td>
                  <td className="py-2 px-2" style={{ color: 'var(--text-tertiary)' }}>
                    {g.time_seconds ? `${g.time_seconds}ث` : '—'}
                  </td>
                  <td className="py-2 px-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {timeAgo(g.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: Spelling & Verbs
// ═══════════════════════════════════════════════════════════════
function SpellingVerbsTab({ spellingData, verbData, loadingSpelling, loadingVerbs }) {
  return (
    <div className="space-y-5">
      {/* Spelling */}
      <Card title="إتقان الإملاء">
        {loadingSpelling ? <SkeletonRows /> : spellingData.length === 0 ? (
          <EmptyState text="لا يوجد بيانات إملاء بعد" />
        ) : (
          <>
            <div className="flex gap-3 mb-4 flex-wrap text-xs">
              <span style={{ color: 'var(--accent-emerald)' }}>🟢 متقن: {spellingData.filter(s => s.mastery === 'mastered').length}</span>
              <span style={{ color: 'var(--accent-amber)' }}>🟡 يتعلم: {spellingData.filter(s => s.mastery === 'learning' || s.mastery === 'familiar').length}</span>
              <span style={{ color: 'var(--accent-rose)' }}>🔴 جديد: {spellingData.filter(s => s.mastery === 'new').length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {spellingData.map(s => {
                const m = MASTERY_CONFIG[s.mastery] || MASTERY_CONFIG.new
                return (
                  <div key={s.id} className="rounded-xl p-3" style={{ background: m.bg, border: `1px solid ${m.color}20` }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.spelling_words?.word || '—'}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.spelling_words?.meaning_ar}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: m.color }}>
                      <span>{m.label}</span>
                      {s.times_tested > 0 && <span>· {s.times_correct}/{s.times_tested}</span>}
                    </div>
                    {s.last_wrong_spelling && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--accent-rose)' }}>آخر خطأ: {s.last_wrong_spelling}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* Verbs */}
      <Card title="إتقان الأفعال الشاذة">
        {loadingVerbs ? <SkeletonRows /> : verbData.length === 0 ? (
          <EmptyState text="لا يوجد بيانات أفعال بعد" />
        ) : (
          <>
            <div className="flex gap-3 mb-4 flex-wrap text-xs">
              <span style={{ color: 'var(--accent-emerald)' }}>🟢 متقن: {verbData.filter(v => v.mastery === 'mastered').length}</span>
              <span style={{ color: 'var(--accent-amber)' }}>🟡 يتعلم: {verbData.filter(v => v.mastery === 'learning' || v.mastery === 'familiar').length}</span>
              <span style={{ color: 'var(--accent-rose)' }}>🔴 جديد: {verbData.filter(v => v.mastery === 'new').length}</span>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm" style={{ minWidth: 480 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['الفعل', 'الماضي', 'التصريف الثالث', 'المعنى', 'الإتقان', 'اختبارات'].map(h => (
                      <th key={h} className="text-right py-2 px-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {verbData.map(v => {
                    const m = MASTERY_CONFIG[v.mastery] || MASTERY_CONFIG.new
                    const verb = v.irregular_verbs || {}
                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="py-2 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>{verb.base_form}</td>
                        <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{verb.past_simple}</td>
                        <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{verb.past_participle}</td>
                        <td className="py-2 px-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{verb.meaning_ar}</td>
                        <td className="py-2 px-2">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: m.bg, color: m.color }}>{m.label}</span>
                        </td>
                        <td className="py-2 px-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {v.times_tested > 0 ? `${v.times_correct}/${v.times_tested}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB 5: Writing
// ═══════════════════════════════════════════════════════════════
function WritingTab({ data, loading }) {
  const [expandedId, setExpandedId] = useState(null)

  if (loading) return <SkeletonSection />
  if (!data.length) return <EmptyState text="لا يوجد بيانات كتابة بعد" />

  const taskLabels = { sentence_building: 'بناء جمل', ielts_task1: 'IELTS Task 1', ielts_task2: 'IELTS Task 2' }

  return (
    <div className="space-y-3">
      {data.map(w => (
        <div key={w.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
            className="w-full flex items-center gap-3 p-4 min-h-[52px]"
          >
            <PenTool size={16} style={{ color: 'var(--accent-violet)' }} />
            <div className="flex-1 text-right">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {taskLabels[w.task_type] || w.task_type}
              </span>
              <span className="text-xs mr-2" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(w.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {w.band_score && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--accent-sky)' }}>
                  Band {w.band_score}
                </span>
              )}
              {w.fluency_score && (
                <span className="text-xs font-bold" style={{ color: 'var(--accent-emerald)' }}>
                  {w.fluency_score}%
                </span>
              )}
              {expandedId === w.id ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
            </div>
          </button>

          <AnimatePresence>
            {expandedId === w.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {w.prompt_used && (
                    <div className="text-xs p-2 rounded-lg" style={{ background: 'var(--surface-overlay)', color: 'var(--text-tertiary)' }}>
                      المطلوب: {w.prompt_used}
                    </div>
                  )}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                    {w.original_text}
                  </div>
                  {w.feedback && (
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: 'var(--accent-violet)' }}>ملاحظات الذكاء الاصطناعي:</p>
                      <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {typeof w.feedback === 'string' ? w.feedback : (
                          <>
                            {w.feedback.corrected_text && <p className="mb-1">النص المصحح: {w.feedback.corrected_text}</p>}
                            {w.feedback.errors?.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {w.feedback.errors.map((err, i) => (
                                  <p key={i}>• {err.explanation || err.message || JSON.stringify(err)}</p>
                                ))}
                              </div>
                            )}
                            {w.feedback.suggestions && <p className="mt-1">اقتراحات: {typeof w.feedback.suggestions === 'string' ? w.feedback.suggestions : JSON.stringify(w.feedback.suggestions)}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {w.xp_earned > 0 && (
                    <p className="text-xs" style={{ color: 'var(--accent-amber)' }}>⭐ +{w.xp_earned} XP</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB 6: Timeline
// ═══════════════════════════════════════════════════════════════
function TimelineTab({ items }) {
  const [limit, setLimit] = useState(20)

  if (!items.length) return <EmptyState text="لا يوجد نشاط مسجّل بعد" />

  const visible = items.slice(0, limit)

  return (
    <div className="space-y-2">
      {visible.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-xl text-sm"
          style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
        >
          <span className="text-base mt-0.5">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <p style={{ color: 'var(--text-primary)' }}>
              {item.label}
              {item.detail && <span className="text-xs mr-2" style={{ color: 'var(--text-tertiary)' }}>— {item.detail}</span>}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {formatDate(item.date)} {formatTime(item.date)}
            </p>
          </div>
          {item.score && (
            <span className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)' }}>
              {item.score}
            </span>
          )}
        </div>
      ))}

      {items.length > limit && (
        <button
          onClick={() => setLimit(l => l + 20)}
          className="w-full py-3 text-sm font-medium text-center rounded-xl min-h-[44px]"
          style={{ color: 'var(--accent-sky)', background: 'rgba(56,189,248,0.06)' }}
        >
          تحميل المزيد ({items.length - limit} متبقي)
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════════════════════
function Card({ title, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
      {title && <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h3>}
      {children}
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, color }) {
  const colors = {
    sky: { bg: 'rgba(56,189,248,0.12)', fg: 'var(--accent-sky)' },
    emerald: { bg: 'rgba(16,185,129,0.12)', fg: 'var(--accent-emerald)' },
    violet: { bg: 'rgba(139,92,246,0.12)', fg: 'var(--accent-violet)' },
    amber: { bg: 'rgba(245,158,11,0.1)', fg: 'var(--accent-amber)' },
  }
  const c = colors[color] || colors.sky
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: c.bg }}>
        <Icon size={16} style={{ color: c.fg }} />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{text}</p>
    </div>
  )
}

function SkeletonSection() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
    </div>
  )
}
