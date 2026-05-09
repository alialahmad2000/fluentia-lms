import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Users, ChevronLeft, ChevronDown,
  CheckCircle, Clock, XCircle, FileEdit, PenLine,
  Languages, Headphones, Mic, ClipboardCheck,
  ArrowRight, GraduationCap, Gamepad2, Trophy,
  Save, MessageSquare, Video,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import WritingFeedback from '../../components/curriculum/WritingFeedback'
import InteractiveReadingTab from '../../components/interactive-curriculum/InteractiveReadingTab'
import InteractiveGrammarTab from '../../components/interactive-curriculum/InteractiveGrammarTab'
import InteractiveVocabularyTab from '../../components/interactive-curriculum/InteractiveVocabularyTab'
import InteractiveListeningTab from '../../components/interactive-curriculum/InteractiveListeningTab'
import InteractiveWritingTab from '../../components/interactive-curriculum/InteractiveWritingTab'
import InteractiveSpeakingTab from '../../components/interactive-curriculum/InteractiveSpeakingTab'
import InteractiveGamesTab from '../../components/interactive-curriculum/InteractiveGamesTab'
import InteractiveRecordingTab from '../../components/interactive-curriculum/InteractiveRecordingTab'

// ─── Status helpers ──────────────────────────────────
const STATUS_STYLES = {
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle, label: 'مكتمل' },
  in_progress: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: Clock, label: 'قيد التنفيذ' },
  not_started: { bg: 'bg-[rgba(255,255,255,0.04)]', text: 'text-[var(--text-muted)]', border: 'border-[var(--border-subtle)]', icon: XCircle, label: 'لم يبدأ' },
}

const SECTION_TYPE_DEFS = [
  { id: 'reading',    labelKey: 'trainer.curriculum.tabs.reading',    icon: BookOpen },
  { id: 'grammar',    labelKey: 'trainer.curriculum.tabs.grammar',    icon: PenLine },
  { id: 'vocabulary', labelKey: 'trainer.curriculum.tabs.vocabulary', icon: Languages },
  { id: 'listening',  labelKey: 'trainer.curriculum.tabs.listening',  icon: Headphones },
  { id: 'writing',    labelKey: 'trainer.curriculum.tabs.writing',    icon: FileEdit },
  { id: 'speaking',   labelKey: 'trainer.curriculum.tabs.speaking',   icon: Mic },
  { id: 'games',      labelKey: 'trainer.curriculum.tabs.games',      icon: Gamepad2 },
  { id: 'recording',  labelKey: 'trainer.curriculum.tabs.recording',  icon: Video },
]

const GAME_TYPE_LABELS = {
  match: 'مطابقة', speed: 'اسمع واكتب', scramble: 'رتّب الحروف', fill: 'أكمل الجملة',
  anki: 'أنكي', quiz: 'اختبار',
}
const CONTEXT_LABELS = { vocabulary: 'مفردات', irregular_verbs: 'أفعال شاذة' }
const MASTERY_STYLES = {
  mastered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'متقن' },
  familiar: { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'مألوف' },
  learning: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'يتعلم' },
  new: { bg: 'bg-[rgba(255,255,255,0.04)]', text: 'text-[var(--text-muted)]', label: 'جديد' },
}

// ─── Main Component ──────────────────────────────────
export default function TrainerCurriculum() {
  const { t } = useTranslation()
  const { user, profile, _realProfile } = useAuthStore()
  // Admin (or admin impersonating) should see ALL groups
  const isAdmin = _realProfile?.role === 'admin' || profile?.role === 'admin'
  const [view, setView] = useState({ level: 'groups' }) // groups | units | detail
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null) // null = all students
  const [activeTab, setActiveTab] = useState('reading')

  const breadcrumbs = useMemo(() => {
    const crumbs = [{ label: 'المنهج', onClick: () => { setView({ level: 'groups' }); setSelectedGroup(null); setSelectedUnit(null); setSelectedStudent(null) } }]
    if (selectedGroup) {
      crumbs.push({ label: selectedGroup.name, onClick: () => { setView({ level: 'units' }); setSelectedUnit(null) } })
    }
    if (selectedUnit) {
      crumbs.push({ label: `الوحدة ${selectedUnit.unit_number}` })
    }
    return crumbs
  }, [selectedGroup, selectedUnit])

  const handleGroupClick = (group) => {
    setSelectedGroup(group)
    setSelectedStudent(null)
    setView({ level: 'units' })
  }

  const handleUnitClick = (unit) => {
    setSelectedUnit(unit)
    setActiveTab('reading')
    setView({ level: 'detail' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title font-['Tajawal']">{t('trainer.curriculum.title')}</h1>
          <p className="text-sm text-[var(--text-tertiary)] font-['Tajawal'] mt-1">{t('trainer.curriculum.subtitle')}</p>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center gap-2 text-sm font-['Tajawal']">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronLeft size={14} className="text-[var(--text-muted)]" />}
              {crumb.onClick ? (
                <button onClick={crumb.onClick} className="text-sky-400 hover:text-sky-300 font-medium transition-colors">
                  {crumb.label}
                </button>
              ) : (
                <span className="text-[var(--text-primary)] font-medium">{crumb.label}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {view.level === 'groups' && (
          <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GroupsOverview trainerId={user?.id} isAdmin={isAdmin} onGroupClick={handleGroupClick} />
          </motion.div>
        )}
        {view.level === 'units' && selectedGroup && (
          <motion.div key="units" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GroupUnits
              group={selectedGroup}
              selectedStudent={selectedStudent}
              onStudentChange={setSelectedStudent}
              onUnitClick={handleUnitClick}
            />
          </motion.div>
        )}
        {view.level === 'detail' && selectedGroup && selectedUnit && (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UnitDetail
              group={selectedGroup}
              unit={selectedUnit}
              selectedStudent={selectedStudent}
              onStudentChange={setSelectedStudent}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Level 1: Groups Overview ────────────────────────
function GroupsOverview({ trainerId, isAdmin, onGroupClick }) {
  const { t } = useTranslation()
  const { data: groups, isLoading } = useQuery({
    queryKey: ['curriculum-groups', isAdmin ? 'all' : trainerId],
    queryFn: async () => {
      let query = supabase
        .from('groups')
        .select('id, name, code, level, max_students')
        .eq('is_active', true)
        .order('name')
      // Admin sees ALL groups; trainer sees only their assigned groups
      if (!isAdmin) query = query.eq('trainer_id', trainerId)
      const { data, error } = await query
      if (error) throw error

      // Get student counts
      const enriched = await Promise.all((data || []).map(async (g) => {
        const { count } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', g.id)
          .is('deleted_at', null)
        return { ...g, student_count: count || 0 }
      }))
      return enriched
    },
    enabled: isAdmin || !!trainerId,
  })

  if (isLoading) return <SkeletonCards count={3} />

  if (!groups?.length) {
    return (
      <EmptyState icon={Users} message={isAdmin ? "لا توجد مجموعات نشطة حالياً" : t('trainer.curriculum.no_groups')} />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group, i) => (
        <motion.div
          key={group.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <button
            onClick={() => onGroupClick(group)}
            className="w-full text-start rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:border-sky-500/30"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">{group.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] font-['Inter']">{group.code}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-[var(--text-muted)]" />
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] font-['Tajawal']">
              <span className="flex items-center gap-1"><Users size={13} /> {group.student_count} طالب</span>
              <span className="flex items-center gap-1"><BookOpen size={13} /> المستوى {group.level}</span>
            </div>
          </button>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Level 2: Group Units ────────────────────────────
function GroupUnits({ group, selectedStudent, onStudentChange, onUnitClick }) {
  const { t } = useTranslation()
  const SECTION_TYPES = SECTION_TYPE_DEFS.map(s => ({ ...s, label: t(s.labelKey) }))
  const [groupTab, setGroupTab] = useState('curriculum') // curriculum | games

  // Get students in group
  const { data: students } = useQuery({
    queryKey: ['group-students', group.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, avatar_url), academic_level, xp_total')
        .eq('group_id', group.id)
        .is('deleted_at', null)
        .order('profiles(full_name)')
      return data || []
    },
  })

  // Get level + units
  const { data: levelData, isLoading, error: levelError } = useQuery({
    queryKey: ['trainer-level-units', group.id, group.level],
    queryFn: async () => {
      const { data: level, error: lvlErr } = await supabase
        .from('curriculum_levels')
        .select('*')
        .eq('level_number', group.level)
        .single()
      if (lvlErr || !level) {
        console.error('[TrainerCurriculum] Level query failed:', lvlErr, 'group.level =', group.level)
        return { level: null, units: [] }
      }

      const { data: units, error: unitsErr } = await supabase
        .from('curriculum_units')
        .select('*')
        .eq('level_id', level.id)
        .order('unit_number')
      if (unitsErr) console.error('[TrainerCurriculum] Units query failed:', unitsErr)
      return { level, units: units || [] }
    },
  })

  // Get progress for all students
  const studentIds = students?.map(s => s.id) || []
  const { data: progress = [] } = useQuery({
    queryKey: ['group-progress', group.id, studentIds.join(',')],
    queryFn: async () => {
      if (!studentIds.length) return []
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, unit_id, section_type, status, score, attempt_number')
        .in('student_id', studentIds)
      if (error) console.error('[TrainerCurriculum] Group progress query failed:', error)
      return data || []
    },
    enabled: studentIds.length > 0,
    staleTime: 30000,
  })

  // Build progress map: unitId -> { sectionType -> { completed, total } }
  const progressMap = useMemo(() => {
    if (!progress || !students) return {}
    const map = {}
    const targetIds = selectedStudent ? [selectedStudent.id] : studentIds

    progress.forEach(p => {
      if (!targetIds.includes(p.student_id)) return
      if (!map[p.unit_id]) map[p.unit_id] = {}
      if (!map[p.unit_id][p.section_type]) map[p.unit_id][p.section_type] = { completed: 0, total: targetIds.length }
      if (p.status === 'completed') map[p.unit_id][p.section_type].completed++
    })
    return map
  }, [progress, students, studentIds, selectedStudent])

  if (isLoading) return <SkeletonCards count={6} />

  return (
    <div className="space-y-5">
      {/* Group header + student selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">
            {group.name} — المستوى {levelData?.level?.name_ar || group.level}
          </h2>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            {levelData?.units?.length || 0} وحدات · {students?.length || 0} طالب
          </p>
        </div>
        <StudentSelector
          students={students}
          selected={selectedStudent}
          onChange={onStudentChange}
        />
      </div>

      {/* Group tabs: curriculum | games */}
      <div className="flex gap-2">
        <button
          onClick={() => setGroupTab('curriculum')}
          className={`flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold font-['Tajawal'] border transition-colors ${
            groupTab === 'curriculum'
              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
              : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookOpen size={13} />المنهج
        </button>
        <button
          onClick={() => setGroupTab('games')}
          className={`flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold font-['Tajawal'] border transition-colors ${
            groupTab === 'games'
              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
              : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Gamepad2 size={13} />نشاط الألعاب
        </button>
      </div>

      {groupTab === 'games' ? (
        <GroupGameActivity studentIds={studentIds} students={students} />
      ) : !levelData?.units?.length ? (
        <EmptyState icon={BookOpen} message="لا توجد وحدات لهذا المستوى بعد" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {levelData.units.map((unit, i) => {
            const unitProgress = progressMap[unit.id] || {}
            return (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => onUnitClick(unit)}
                  className="w-full text-start rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:border-sky-500/30"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-sky-400 font-['Tajawal']">الوحدة {unit.unit_number}</span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mt-0.5">{unit.theme_ar}</h3>
                      <p className="text-xs text-[var(--text-muted)] font-['Inter'] mt-0.5" dir="ltr">{unit.theme_en}</p>
                    </div>
                    <ArrowRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                  </div>

                  {/* Section dots */}
                  <div className="flex flex-wrap gap-1.5">
                    {SECTION_TYPES.slice(0, 5).map(sec => {
                      const prog = unitProgress[sec.id]
                      const status = !prog ? 'not_started' : prog.completed >= prog.total ? 'completed' : 'in_progress'
                      const st = STATUS_STYLES[status]
                      return (
                        <span
                          key={sec.id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${st.bg} ${st.text} ${st.border} font-['Tajawal']`}
                          title={sec.label}
                        >
                          <sec.icon size={10} />
                          {sec.label.slice(0, 5)}
                        </span>
                      )
                    })}
                  </div>
                </button>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Group Game Activity ─────────────────────────────
function GroupGameActivity({ studentIds, students }) {
  const { data: gameSessions = [], isLoading } = useQuery({
    queryKey: ['group-game-sessions', studentIds.join(',')],
    queryFn: async () => {
      if (!studentIds.length) return []
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data || []
    },
    enabled: studentIds.length > 0,
  })

  // Stats
  const totalGames = gameSessions.length
  const avgScore = totalGames > 0
    ? Math.round(gameSessions.reduce((sum, g) => sum + (g.accuracy_percent || 0), 0) / totalGames)
    : 0

  // Leaderboard: students ranked by total score this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekSessions = gameSessions.filter(g => new Date(g.created_at) >= weekAgo)

  const leaderboard = useMemo(() => {
    const map = {}
    weekSessions.forEach(g => {
      if (!map[g.student_id]) map[g.student_id] = { score: 0, count: 0 }
      map[g.student_id].score += g.score || 0
      map[g.student_id].count++
    })
    return Object.entries(map)
      .map(([id, data]) => ({ student: students?.find(s => s.id === id), ...data }))
      .filter(e => e.student)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [weekSessions, students])

  // Most active student
  const mostActive = leaderboard[0]

  // Daily chart (last 7 days)
  const dailyChart = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('ar-SA', { weekday: 'short' })
      const count = gameSessions.filter(g => g.created_at?.slice(0, 10) === key).length
      days.push({ name: label, count })
    }
    return days
  }, [gameSessions])

  if (isLoading) return <SkeletonCards count={3} />

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 size={16} className="text-purple-400" />
            <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">إجمالي الألعاب</span>
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">{totalGames}</span>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">متوسط الدقة</span>
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">{avgScore}%</span>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-amber-400" />
            <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">الأكثر نشاطاً</span>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] truncate block">
            {mostActive?.student?.profiles?.full_name || '—'}
          </span>
        </div>
      </div>

      {/* Daily chart */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4">الألعاب في آخر ٧ أيام</h3>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChart}>
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-raised)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 12 }}
                labelStyle={{ color: 'var(--text-primary)' }}
                formatter={(v) => [v, 'ألعاب']}
              />
              <Bar dataKey="count" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4">
          <Trophy size={16} className="inline ml-1 text-amber-400" />
          الترتيب هذا الأسبوع
        </h3>
        {!leaderboard.length ? (
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">لم يلعب أي طالب هذا الأسبوع</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <div key={entry.student.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-amber-500/15 text-amber-400' : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)]'}`}>
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] font-['Tajawal'] flex-1">{entry.student.profiles?.full_name}</span>
                <span className="text-xs font-bold text-purple-400">{entry.count} لعبة</span>
                <span className="text-xs font-bold text-emerald-400">{entry.score} نقطة</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Level 3: Unit Detail ────────────────────────────
function UnitDetail({ group, unit, selectedStudent, onStudentChange, activeTab, onTabChange }) {
  const { t } = useTranslation()
  const SECTION_TYPES = SECTION_TYPE_DEFS.map(s => ({ ...s, label: t(s.labelKey) }))
  // Get students in group
  const { data: students = [], isPending: studentsLoading } = useQuery({
    queryKey: ['group-students', group.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, profiles(full_name, avatar_url), academic_level, xp_total')
        .eq('group_id', group.id)
        .is('deleted_at', null)
        .order('profiles(full_name)')
      if (error) console.error('[TrainerCurriculum] Students query failed:', error)
      return data || []
    },
    staleTime: 30000,
  })

  const studentIds = students.map(s => s.id)

  // Get all progress for this unit
  const { data: progress = [], isPending: progressLoading } = useQuery({
    queryKey: ['unit-progress', unit.id, studentIds.join(',')],
    queryFn: async () => {
      if (!studentIds.length) return []
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('*, reading:curriculum_readings(title_ar, title_en, reading_label)')
        .in('student_id', studentIds)
        .eq('unit_id', unit.id)
      if (error) console.error('[TrainerCurriculum] Progress query failed:', error)
      return data || []
    },
    enabled: studentIds.length > 0,
    staleTime: 30000,
  })

  const isLoading = studentsLoading || (studentIds.length > 0 && progressLoading)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-sky-400 font-['Tajawal']">الوحدة {unit.unit_number}</span>
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">{unit.theme_ar}</h2>
          <p className="text-xs text-[var(--text-muted)] font-['Inter']" dir="ltr">{unit.theme_en}</p>
        </div>
        <StudentSelector students={students} selected={selectedStudent} onChange={onStudentChange} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {SECTION_TYPES.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 h-9 rounded-xl text-xs font-bold whitespace-nowrap transition-colors font-['Tajawal'] border ${
              activeTab === tab.id
                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonTable />
      ) : !selectedStudent ? (
        <AllStudentsMatrix students={students} progress={progress} activeTab={activeTab} />
      ) : (
        <InteractiveTabContent
          activeTab={activeTab}
          unitId={unit.id}
          groupId={group.id}
          student={selectedStudent}
        />
      )}
    </div>
  )
}

// ─── Interactive Tab Content (per-student) ──────────
// Maps the selected student to the shape Interactive*Tabs expect, then renders
// the appropriate tab. Replaces the old custom StudentAnswers renderers.
function InteractiveTabContent({ activeTab, unitId, groupId, student }) {
  const students = [{
    user_id: student.id,
    group_id: groupId,
    full_name: student.profiles?.full_name || 'طالب',
    avatar_url: student.profiles?.avatar_url || null,
  }]

  switch (activeTab) {
    case 'reading':    return <InteractiveReadingTab    unitId={unitId} students={students} />
    case 'grammar':    return <InteractiveGrammarTab    unitId={unitId} students={students} />
    case 'vocabulary': return <InteractiveVocabularyTab unitId={unitId} students={students} />
    case 'listening':  return <InteractiveListeningTab  unitId={unitId} students={students} />
    case 'writing':    return <InteractiveWritingTab    unitId={unitId} students={students} highlightStudent={student.id} />
    case 'speaking':   return <InteractiveSpeakingTab   unitId={unitId} students={students} highlightStudent={student.id} />
    case 'games':      return <InteractiveGamesTab      unitId={unitId} students={students} />
    case 'recording':  return <InteractiveRecordingTab  unitId={unitId} />
    default:           return null
  }
}

// IDs excluded from the all-students matrix (those tables are separate)
const MATRIX_EXCLUDED_IDS = new Set(['games', 'recording'])

// ─── All Students Matrix ─────────────────────────────
function AllStudentsMatrix({ students, progress, activeTab }) {
  const { t } = useTranslation()
  const MATRIX_SECTIONS = SECTION_TYPE_DEFS.filter(s => !MATRIX_EXCLUDED_IDS.has(s.id)).map(s => ({ ...s, label: t(s.labelKey) }))
  // If games tab is active with no specific student, show group game activity
  if (activeTab === 'games') {
    const studentIds = students?.map(s => s.id) || []
    return <GroupGameActivity studentIds={studentIds} students={students} />
  }

  if (!students?.length) return <EmptyState icon={Users} message="لا يوجد طلاب في هذه المجموعة" />

  // Build student progress map
  const studentMap = useMemo(() => {
    const map = {}
    students.forEach(s => { map[s.id] = { student: s, sections: {} } })
    if (Array.isArray(progress)) {
      progress.forEach(p => {
        if (map[p.student_id]) {
          const key = p.section_type
          if (!map[p.student_id].sections[key]) map[p.student_id].sections[key] = []
          map[p.student_id].sections[key].push(p)
        }
      })
    }
    return map
  }, [students, progress])

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            <th className="text-start pb-3 pr-4 font-medium">الطالب</th>
            {MATRIX_SECTIONS.map(sec => (
              <th key={sec.id} className={`text-center pb-3 px-2 font-medium ${activeTab === sec.id ? 'text-sky-400' : ''}`}>
                {sec.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
          {Object.values(studentMap).map(({ student, sections }) => (
            <tr key={student.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  {student.profiles?.avatar_url ? (
                    <img src={student.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center text-[10px] font-bold">
                      {student.profiles?.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-[var(--text-primary)] font-['Tajawal'] whitespace-nowrap">
                    {student.profiles?.full_name || 'غير معروف'}
                  </span>
                </div>
              </td>
              {MATRIX_SECTIONS.map(sec => {
                const entries = sections[sec.id] || []
                const hasCompleted = entries.some(e => e.status === 'completed')
                const hasProgress = entries.length > 0 && !hasCompleted
                const bestScore = entries.reduce((max, e) => Math.max(max, Number(e.score) || 0), 0)
                const status = hasCompleted ? 'completed' : hasProgress ? 'in_progress' : 'not_started'
                const st = STATUS_STYLES[status]
                const Icon = st.icon
                return (
                  <td key={sec.id} className="py-3 px-2 text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${st.bg} ${st.text} font-['Tajawal']`}>
                      <Icon size={12} />
                      {status === 'completed' && bestScore > 0 ? `${bestScore}%` : st.label}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


// ─── Student Selector ────────────────────────────────
function StudentSelector({ students, selected, onChange }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium border transition-colors font-['Tajawal']"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Users size={14} className="text-[var(--text-muted)]" />
        <span className="text-[var(--text-primary)]">
          {selected ? selected.profiles?.full_name : t('trainer.curriculum.all_students')}
        </span>
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 top-full mt-1 w-56 rounded-xl overflow-hidden z-30 max-h-64 overflow-y-auto scrollbar-hide"
            style={{ background: 'var(--surface-overlay, var(--surface-raised))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
          >
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className={`w-full text-start px-4 py-2.5 text-sm font-['Tajawal'] transition-colors hover:bg-[rgba(255,255,255,0.04)] ${!selected ? 'text-sky-400 font-bold' : 'text-[var(--text-primary)]'}`}
            >
              {t('trainer.curriculum.all_students')}
            </button>
            {students?.map(s => (
              <button
                key={s.id}
                onClick={() => { onChange(s); setOpen(false) }}
                className={`w-full text-start px-4 py-2.5 text-sm font-['Tajawal'] transition-colors hover:bg-[rgba(255,255,255,0.04)] ${selected?.id === s.id ? 'text-sky-400 font-bold' : 'text-[var(--text-primary)]'}`}
              >
                {s.profiles?.full_name || 'غير معروف'}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Shared UI helpers ───────────────────────────────
function NoAnswers() {
  return <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">لا توجد إجابات محفوظة</p>
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <Icon size={40} className="text-[var(--text-muted)]" />
      <p className="text-[var(--text-muted)] font-['Tajawal']">{message}</p>
    </div>
  )
}

function SkeletonCards({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ))}
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ))}
    </div>
  )
}
