import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Users, ChevronLeft, ChevronDown,
  CheckCircle, Clock, XCircle, FileEdit, PenLine,
  Languages, Headphones, Mic, ClipboardCheck,
  ArrowRight, GraduationCap, Gamepad2, Trophy,
  Save, MessageSquare,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

// ─── Status helpers ──────────────────────────────────
const STATUS_STYLES = {
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle, label: 'مكتمل' },
  in_progress: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', icon: Clock, label: 'قيد التنفيذ' },
  not_started: { bg: 'bg-[rgba(255,255,255,0.04)]', text: 'text-[var(--text-muted)]', border: 'border-[var(--border-subtle)]', icon: XCircle, label: 'لم يبدأ' },
}

const SECTION_TYPES = [
  { id: 'reading', label: 'القراءة', icon: BookOpen },
  { id: 'grammar', label: 'القواعد', icon: PenLine },
  { id: 'vocabulary', label: 'المفردات', icon: Languages },
  { id: 'listening', label: 'الاستماع', icon: Headphones },
  { id: 'writing', label: 'الكتابة', icon: FileEdit },
  { id: 'speaking', label: 'المحادثة', icon: Mic },
  { id: 'assessment', label: 'التقييم', icon: ClipboardCheck },
  { id: 'games', label: 'الألعاب', icon: Gamepad2 },
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
  const { user } = useAuthStore()
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
          <h1 className="text-page-title font-['Tajawal']">المنهج الدراسي</h1>
          <p className="text-sm text-[var(--text-tertiary)] font-['Tajawal'] mt-1">تصفّح المنهج وتابع تقدّم الطلاب</p>
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
            <GroupsOverview trainerId={user?.id} onGroupClick={handleGroupClick} />
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
function GroupsOverview({ trainerId, onGroupClick }) {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['trainer-groups', trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, code, level, max_students')
        .eq('trainer_id', trainerId)
        .eq('is_active', true)
        .order('name')
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
    enabled: !!trainerId,
  })

  if (isLoading) return <SkeletonCards count={3} />

  if (!groups?.length) {
    return (
      <EmptyState icon={Users} message="لا توجد مجموعات مسندة إليك حالياً" />
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
  const { data: progress } = useQuery({
    queryKey: ['group-progress', group.id, studentIds.join(',')],
    queryFn: async () => {
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, unit_id, section_type, status, score, attempt_number')
        .in('student_id', studentIds)
      return data || []
    },
    enabled: studentIds.length > 0,
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

  const studentIds = students?.map(s => s.id) || []

  // Get all progress for this unit
  const { data: progress, isLoading } = useQuery({
    queryKey: ['unit-progress', unit.id, studentIds.join(',')],
    queryFn: async () => {
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .in('student_id', studentIds)
        .eq('unit_id', unit.id)
      return data || []
    },
    enabled: studentIds.length > 0,
  })

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
        <StudentAnswers student={selectedStudent} progress={progress} activeTab={activeTab} unitId={unit.id} />
      )}
    </div>
  )
}

// ─── All Students Matrix ─────────────────────────────
function AllStudentsMatrix({ students, progress, activeTab }) {
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
    progress?.forEach(p => {
      if (map[p.student_id]) {
        const key = p.section_type
        if (!map[p.student_id].sections[key]) map[p.student_id].sections[key] = []
        map[p.student_id].sections[key].push(p)
      }
    })
    return map
  }, [students, progress])

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            <th className="text-start pb-3 pr-4 font-medium">الطالب</th>
            {SECTION_TYPES.map(sec => (
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
              {SECTION_TYPES.map(sec => {
                const entries = sections[sec.id] || []
                const hasCompleted = entries.some(e => e.status === 'completed')
                const hasProgress = entries.some(e => e.status === 'in_progress')
                const bestScore = entries.reduce((max, e) => Math.max(max, e.score || 0), 0)
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

// ─── Student Answers View ────────────────────────────
function StudentAnswers({ student, progress, activeTab, unitId }) {
  // Games tab has its own data fetching
  if (activeTab === 'games') {
    return <StudentGamesView studentId={student.id} studentName={student.profiles?.full_name} />
  }

  const studentProgress = useMemo(() => {
    return (progress || []).filter(p => p.student_id === student.id && p.section_type === activeTab)
  }, [progress, student.id, activeTab])

  if (!studentProgress.length) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <XCircle size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">
          {student.profiles?.full_name} لم يبدأ هذا القسم بعد
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {studentProgress.map(prog => (
        <ProgressDetailCard key={prog.id} progress={prog} sectionType={activeTab} />
      ))}
    </div>
  )
}

// ─── Student Games View ──────────────────────────────
function StudentGamesView({ studentId, studentName }) {
  const { data: gameSessions = [], isLoading: loadingGames } = useQuery({
    queryKey: ['student-game-sessions', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
  })

  const { data: verbProgress = [] } = useQuery({
    queryKey: ['student-verb-progress', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_verb_progress')
        .select('*, irregular_verbs:verb_id(verb_base, verb_past, meaning_ar)')
        .eq('student_id', studentId)
        .order('mastery')
      if (error) throw error
      return data || []
    },
  })

  const { data: spellingProgress = [] } = useQuery({
    queryKey: ['student-spelling-progress', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_spelling_progress')
        .select('*, spelling_words:word_id(word, meaning_ar)')
        .eq('student_id', studentId)
        .order('mastery')
      if (error) throw error
      return data || []
    },
  })

  if (loadingGames) return <SkeletonTable />

  return (
    <div className="space-y-6">
      {/* Game History */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4">
          <Gamepad2 size={16} className="inline ml-1 text-purple-400" />
          سجل الألعاب
        </h3>
        {!gameSessions.length ? (
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">لم يلعب أي لعبة بعد</p>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="text-xs text-[var(--text-muted)] font-['Tajawal']">
                  <th className="text-start pb-2 pr-3 font-medium">اللعبة</th>
                  <th className="text-center pb-2 px-2 font-medium">النوع</th>
                  <th className="text-center pb-2 px-2 font-medium">النتيجة</th>
                  <th className="text-center pb-2 px-2 font-medium">الدقة</th>
                  <th className="text-center pb-2 px-2 font-medium">الوقت</th>
                  <th className="text-center pb-2 px-2 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
                {gameSessions.map(g => (
                  <tr key={g.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="py-2.5 pr-3 text-sm font-medium text-[var(--text-primary)] font-['Tajawal']">
                      {GAME_TYPE_LABELS[g.game_type] || g.game_type}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-['Tajawal']">
                        {CONTEXT_LABELS[g.context] || g.context}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-sm font-bold text-[var(--text-primary)]">
                      {g.items_correct ?? g.score}/{g.items_count ?? g.max_score}
                    </td>
                    <td className="py-2.5 px-2 text-center text-sm font-bold" style={{ color: (g.accuracy_percent || 0) >= 70 ? '#4ade80' : '#f87171' }}>
                      {g.accuracy_percent != null ? `${Math.round(g.accuracy_percent)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center text-xs text-[var(--text-muted)]">
                      {g.time_seconds ? `${g.time_seconds}ث` : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center text-xs text-[var(--text-muted)] font-['Tajawal']">
                      {new Date(g.created_at).toLocaleDateString('ar-SA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verb Mastery */}
      {verbProgress.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4">
            إتقان الأفعال الشاذة
          </h3>
          <div className="flex flex-wrap gap-2">
            {verbProgress.map(v => {
              const ms = MASTERY_STYLES[v.mastery] || MASTERY_STYLES.new
              return (
                <span key={v.id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${ms.bg} ${ms.text} font-['Tajawal']`}
                  title={`${v.times_correct}/${v.times_tested} صحيح`}
                >
                  {v.irregular_verbs?.verb_base || '—'}
                  <span className="text-[9px] opacity-70">({ms.label})</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Spelling Mastery */}
      {spellingProgress.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mb-4">
            إتقان الإملاء
          </h3>
          <div className="flex flex-wrap gap-2">
            {spellingProgress.map(sp => {
              const ms = MASTERY_STYLES[sp.mastery] || MASTERY_STYLES.new
              return (
                <span key={sp.id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${ms.bg} ${ms.text} font-['Inter']`}
                  title={`${sp.times_correct}/${sp.times_tested} — ${sp.accuracy_rate}%`}
                >
                  {sp.spelling_words?.word || '—'}
                  <span className="text-[9px] opacity-70 font-['Tajawal']">({ms.label})</span>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Progress Detail Card ────────────────────────────
function ProgressDetailCard({ progress: prog, sectionType }) {
  const st = STATUS_STYLES[prog.status] || STATUS_STYLES.not_started
  const Icon = st.icon
  const answers = prog.answers || {}

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${st.bg} ${st.text} font-['Tajawal']`}>
            <Icon size={14} />
            {st.label}
          </div>
          {prog.score != null && (
            <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">{prog.score}%</span>
          )}
          {prog.attempt_number > 1 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-['Tajawal']">
              المحاولة {prog.attempt_number}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-['Tajawal']">
          {prog.time_spent_seconds > 0 && (
            <span><Clock size={12} className="inline ml-1" />{Math.round(prog.time_spent_seconds / 60)} دقيقة</span>
          )}
          {prog.completed_at && (
            <span>{new Date(prog.completed_at).toLocaleDateString('ar-SA')}</span>
          )}
        </div>
      </div>

      {/* Attempt history */}
      {Array.isArray(prog.attempt_history) && prog.attempt_history.length > 0 && (
        <div className="space-y-1 px-1">
          <p className="text-[11px] font-bold text-[var(--text-muted)] font-['Tajawal']">المحاولات السابقة:</p>
          {prog.attempt_history.map((h, i) => (
            <div key={i} className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-['Tajawal']">
              <span>المحاولة {h.attempt}</span>
              <span>{h.score != null ? `${h.score}%` : '—'}</span>
              {h.completed_at && <span dir="ltr">{new Date(h.completed_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Section-specific answer display */}
      {sectionType === 'reading' && <ReadingAnswers answers={answers} />}
      {sectionType === 'grammar' && <GrammarAnswers answers={answers} />}
      {sectionType === 'listening' && <ListeningAnswers answers={answers} />}
      {sectionType === 'writing' && <WritingAnswers answers={answers} progress={prog} />}
      {sectionType === 'vocabulary' && <VocabularyAnswers answers={answers} />}
      {sectionType === 'speaking' && <SpeakingProgress progress={prog} />}
      {sectionType === 'assessment' && (
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">البيانات التفصيلية غير متاحة حالياً</p>
      )}
    </div>
  )
}

// ─── Reading Answers ─────────────────────────────────
function ReadingAnswers({ answers }) {
  if (!answers || typeof answers !== 'object') return <NoAnswers />
  // answers shape: { [questionId]: { selected, correct } }
  const entries = Object.entries(answers).filter(([k]) => k !== 'exercises' && k !== 'questions')
  if (!entries.length) return <NoAnswers />

  return (
    <div className="space-y-2">
      {entries.map(([qId, ans], i) => (
        <div key={qId} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <span className="w-6 h-6 rounded-md bg-sky-500/15 text-sky-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
            {i + 1}
          </span>
          <span className="text-sm text-[var(--text-secondary)] font-['Inter'] flex-1" dir="ltr">{ans.selected}</span>
          {ans.correct
            ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
            : <XCircle size={16} className="text-red-400 flex-shrink-0" />
          }
        </div>
      ))}
    </div>
  )
}

// ─── Grammar Answers ─────────────────────────────────
function GrammarAnswers({ answers }) {
  const exercises = answers?.exercises || []
  if (!exercises.length) return <NoAnswers />

  return (
    <div className="space-y-2">
      {exercises.map((ex, i) => (
        <div key={ex.id || i} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <span className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-[var(--text-muted)] font-['Tajawal']">{ex.type}</span>
            <p className="text-sm text-[var(--text-secondary)] font-['Inter']" dir="ltr">
              {ex.studentAnswer || '—'}
            </p>
            {!ex.isCorrect && ex.correctAnswer && (
              <p className="text-xs text-emerald-400 font-['Inter'] mt-0.5" dir="ltr">
                ← {ex.correctAnswer}
              </p>
            )}
          </div>
          {ex.isCorrect
            ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            : <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          }
        </div>
      ))}
    </div>
  )
}

// ─── Listening Answers ───────────────────────────────
function ListeningAnswers({ answers }) {
  const questions = answers?.questions || []
  if (!questions.length) return <NoAnswers />

  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <span className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            {q.question && <p className="text-xs text-[var(--text-muted)] font-['Inter'] truncate" dir="ltr">{q.question}</p>}
            <p className="text-sm text-[var(--text-secondary)] font-['Inter']" dir="ltr">
              الإجابة: {typeof q.studentAnswer === 'number' ? String.fromCharCode(65 + q.studentAnswer) : (q.studentAnswer || '—')}
            </p>
          </div>
          {q.isCorrect
            ? <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            : <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          }
        </div>
      ))}
    </div>
  )
}

// ─── Writing Answers + Trainer Grading ──────────────
const GRADE_OPTIONS = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']
const QUICK_FEEDBACK = ['ممتاز!', 'أحسنت', 'يحتاج تحسين', 'أعد المحاولة']

function WritingAnswers({ answers, progress: prog }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState(prog?.trainer_feedback || '')
  const [grade, setGrade] = useState(prog?.trainer_grade || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync when prog changes
  useEffect(() => {
    setFeedback(prog?.trainer_feedback || '')
    setGrade(prog?.trainer_grade || '')
    setSaved(false)
  }, [prog?.id, prog?.trainer_feedback, prog?.trainer_grade])

  const handleSave = async () => {
    if (!prog?.id || !user?.id) return
    setSaving(true)
    const { error } = await supabase
      .from('student_curriculum_progress')
      .update({
        trainer_feedback: feedback.trim() || null,
        trainer_grade: grade || null,
        trainer_graded_at: new Date().toISOString(),
        trainer_graded_by: user.id,
      })
      .eq('id', prog.id)

    setSaving(false)
    if (error) {
      console.error('Grading error:', error)
      alert('حدث خطأ أثناء الحفظ')
    } else {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['unit-progress'] })
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (!answers?.draft) {
    return (
      <div className="text-center py-4">
        <FileEdit size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">لم يُرسل أي كتابة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Writing meta */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-['Tajawal']">
        <span>{answers.wordCount || 0} كلمة</span>
        {prog?.attempt_number > 1 && <span>المحاولة {prog.attempt_number}</span>}
        {answers.lastSavedAt && (
          <span>آخر حفظ: {new Date(answers.lastSavedAt).toLocaleString('ar-SA')}</span>
        )}
      </div>

      {/* Student's draft */}
      <div
        className="rounded-xl p-4 text-sm font-['Inter'] text-[var(--text-secondary)] leading-[1.8] whitespace-pre-wrap max-h-80 overflow-y-auto scrollbar-hide"
        dir="ltr"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        {answers.draft}
      </div>

      {/* Trainer grading section */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.12)' }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-sky-400" />
          <span className="text-xs font-bold text-sky-400 font-['Tajawal']">ملاحظات المدرب</span>
          {prog?.trainer_graded_at && (
            <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] mr-auto">
              آخر تقييم: {new Date(prog.trainer_graded_at).toLocaleDateString('ar-SA')}
            </span>
          )}
        </div>

        {/* Quick feedback templates */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FEEDBACK.map(t => (
            <button
              key={t}
              onClick={() => setFeedback(prev => prev ? `${prev} ${t}` : t)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold font-['Tajawal'] transition-colors bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] hover:text-sky-400 hover:bg-sky-500/10 border border-[var(--border-subtle)]"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Feedback textarea */}
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="اكتب ملاحظاتك هنا..."
          rows={3}
          className="w-full rounded-xl px-4 py-3 text-sm font-['Tajawal'] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-sky-500/40"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          dir="rtl"
        />

        {/* Grade pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[var(--text-muted)] font-['Tajawal']">التقدير:</span>
          {GRADE_OPTIONS.map(g => (
            <button
              key={g}
              onClick={() => setGrade(grade === g ? '' : g)}
              className={`px-3 py-1 rounded-full text-xs font-bold font-['Inter'] border transition-all ${
                grade === g
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 scale-105'
                  : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || (!feedback.trim() && !grade)}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold font-['Tajawal'] transition-all ${
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {saving ? (
            <Clock size={14} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={14} />
          ) : (
            <Save size={14} />
          )}
          {saving ? 'جاري الحفظ...' : saved ? 'تم حفظ التقييم ✅' : 'حفظ التقييم'}
        </button>
      </div>
    </div>
  )
}

// ─── Speaking Progress ──────────────────────────────
function SpeakingProgress({ progress: prog }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState(prog?.trainer_feedback || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setFeedback(prog?.trainer_feedback || '')
    setSaved(false)
  }, [prog?.id, prog?.trainer_feedback])

  const handleSave = async () => {
    if (!prog?.id || !user?.id) return
    setSaving(true)
    const { error } = await supabase
      .from('student_curriculum_progress')
      .update({
        trainer_feedback: feedback.trim() || null,
        trainer_graded_at: new Date().toISOString(),
        trainer_graded_by: user.id,
      })
      .eq('id', prog.id)
    setSaving(false)
    if (error) {
      alert('حدث خطأ أثناء الحفظ')
    } else {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['unit-progress'] })
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (!prog || prog.status === 'not_started') {
    return (
      <div className="text-center py-4">
        <Mic size={24} className="text-[var(--text-muted)] mx-auto mb-2" />
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">لا توجد مواضيع محادثة مكتملة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-['Tajawal']">
        <Mic size={14} className="text-emerald-400" />
        <span className="text-[var(--text-secondary)]">
          {prog.status === 'completed' ? 'تم إكمال موضوع المحادثة' : 'قيد التنفيذ'}
        </span>
        {prog.completed_at && (
          <span className="text-[var(--text-muted)] mr-auto">
            {new Date(prog.completed_at).toLocaleDateString('ar-SA')}
          </span>
        )}
      </div>

      {/* Trainer notes */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.12)' }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-sky-400" />
          <span className="text-xs font-bold text-sky-400 font-['Tajawal']">ملاحظات المدرب</span>
        </div>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="اكتب ملاحظاتك على أداء الطالب في المحادثة..."
          rows={2}
          className="w-full rounded-xl px-4 py-3 text-sm font-['Tajawal'] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-sky-500/40"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          dir="rtl"
        />
        <button
          onClick={handleSave}
          disabled={saving || !feedback.trim()}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold font-['Tajawal'] transition-all ${
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {saving ? <Clock size={12} className="animate-spin" /> : saved ? <CheckCircle size={12} /> : <Save size={12} />}
          {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ ✅' : 'حفظ الملاحظات'}
        </button>
      </div>
    </div>
  )
}

// ─── Vocabulary Answers ──────────────────────────────
function VocabularyAnswers({ answers }) {
  const reviewed = answers?.reviewedWords?.length || 0
  const total = answers?.totalWords || 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-['Tajawal']">
        <Languages size={16} className="text-sky-400" />
        <span className="text-[var(--text-secondary)]">
          تمت مراجعة <strong className="text-[var(--text-primary)]">{reviewed}</strong> من <strong className="text-[var(--text-primary)]">{total}</strong> كلمة
        </span>
      </div>
      {total > 0 && (
        <div className="h-2 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(reviewed / total) * 100}%`, background: reviewed >= total ? '#10b981' : '#0ea5e9' }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Student Selector ────────────────────────────────
function StudentSelector({ students, selected, onChange }) {
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
          {selected ? selected.profiles?.full_name : 'كل الطلاب'}
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
              كل الطلاب
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
