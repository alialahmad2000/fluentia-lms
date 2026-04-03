import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Users, TrendingUp, BookOpen, PenLine, Languages,
  Headphones, FileEdit, Mic, ClipboardCheck, CheckCircle, Clock,
  XCircle, ChevronLeft, ChevronDown, Search, GraduationCap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

// ─── Constants ───────────────────────────────────────
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
]

const LEVEL_COLORS = ['#38bdf8', '#4ade80', '#fbbf24', '#f472b6', '#a78bfa', '#fb923c']

// ─── Main Component ──────────────────────────────────
export default function CurriculumProgress() {
  const navigate = useNavigate()
  const [view, setView] = useState('levels') // levels | units | detail
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [filterGroup, setFilterGroup] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [activeTab, setActiveTab] = useState('reading')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Global data ──
  const { data: levels = [], isLoading: loadingLevels } = useQuery({
    queryKey: ['admin-progress-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('id, level_number, name_ar, name_en, color')
        .order('level_number')
      if (error) throw error
      return data || []
    },
  })

  const { data: allProgress = [] } = useQuery({
    queryKey: ['admin-all-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, unit_id, section_type, status, score')
      if (error) throw error
      return data || []
    },
  })

  const { data: allStudents = [] } = useQuery({
    queryKey: ['admin-all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, group_id, profiles(full_name, avatar_url), groups(name, code, level)')
        .is('deleted_at', null)
      if (error) throw error
      return data || []
    },
  })

  // ── Stats ──
  const totalStudents = allStudents.length
  const activeStudents = new Set(allProgress.map(p => p.student_id)).size
  const completedSections = allProgress.filter(p => p.status === 'completed').length
  const avgCompletion = totalStudents > 0 && allProgress.length > 0
    ? Math.round((completedSections / allProgress.length) * 100)
    : 0

  // ── Breadcrumbs ──
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ label: 'تقدم الطلاب', onClick: () => { setView('levels'); setSelectedLevel(null); setSelectedUnit(null); setSelectedStudent(null); setFilterGroup(null) } }]
    if (selectedLevel) {
      crumbs.push({ label: selectedLevel.name_ar, onClick: () => { setView('units'); setSelectedUnit(null); setSelectedStudent(null) } })
    }
    if (selectedUnit) {
      crumbs.push({ label: `الوحدة ${selectedUnit.unit_number}` })
    }
    return crumbs
  }, [selectedLevel, selectedUnit])

  const handleLevelClick = (level) => {
    setSelectedLevel(level)
    setFilterGroup(null)
    setSelectedStudent(null)
    setView('units')
  }

  const handleUnitClick = (unit) => {
    setSelectedUnit(unit)
    setActiveTab('reading')
    setSelectedStudent(null)
    setView('detail')
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/admin/curriculum')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <ArrowRight size={16} strokeWidth={1.5} />
        <span className="text-sm">العودة للمنهج</span>
      </motion.button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={28} strokeWidth={1.5} style={{ color: '#38bdf8' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>تقدم الطلاب</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>متابعة مستوى كل طالب في المنهج</p>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} color="#38bdf8" label="إجمالي الطلاب" value={totalStudents} />
        <StatCard icon={TrendingUp} color="#4ade80" label="طلاب نشطون" value={activeStudents} />
        <StatCard icon={CheckCircle} color="#a78bfa" label="أقسام مكتملة" value={completedSections} />
        <StatCard icon={TrendingUp} color="#fbbf24" label="نسبة الإكمال" value={`${avgCompletion}%`} />
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center gap-2 text-sm font-['Tajawal']">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronLeft size={14} className="text-[var(--text-muted)]" />}
              {crumb.onClick ? (
                <button onClick={crumb.onClick} className="text-sky-400 hover:text-sky-300 font-medium transition-colors">{crumb.label}</button>
              ) : (
                <span className="text-[var(--text-primary)] font-medium">{crumb.label}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === 'levels' && (
          <motion.div key="levels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LevelsOverview
              levels={levels}
              allStudents={allStudents}
              allProgress={allProgress}
              loading={loadingLevels}
              onLevelClick={handleLevelClick}
            />
          </motion.div>
        )}
        {view === 'units' && selectedLevel && (
          <motion.div key="units" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LevelUnits
              level={selectedLevel}
              allStudents={allStudents}
              allProgress={allProgress}
              filterGroup={filterGroup}
              onFilterGroupChange={setFilterGroup}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onUnitClick={handleUnitClick}
            />
          </motion.div>
        )}
        {view === 'detail' && selectedLevel && selectedUnit && (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UnitDetail
              level={selectedLevel}
              unit={selectedUnit}
              allStudents={allStudents}
              filterGroup={filterGroup}
              onFilterGroupChange={setFilterGroup}
              selectedStudent={selectedStudent}
              onStudentChange={setSelectedStudent}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────
function StatCard({ icon: Icon, color, label, value }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>{label}</span>
      </div>
      <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

// ─── Level 1: All Levels Overview ────────────────────
function LevelsOverview({ levels, allStudents, allProgress, loading, onLevelClick }) {
  if (loading) return <SkeletonCards count={6} />

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {levels.map((level, i) => {
        const studentsAtLevel = allStudents.filter(s => s.groups?.level === level.level_number)
        const studentIds = new Set(studentsAtLevel.map(s => s.id))
        const levelProgress = allProgress.filter(p => studentIds.has(p.student_id))
        const completed = levelProgress.filter(p => p.status === 'completed').length
        const pct = levelProgress.length > 0 ? Math.round((completed / levelProgress.length) * 100) : 0
        const color = level.color || LEVEL_COLORS[i % LEVEL_COLORS.length]

        // Count groups
        const groupIds = new Set(studentsAtLevel.map(s => s.groups?.name).filter(Boolean))

        return (
          <motion.div
            key={level.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <button
              onClick={() => onLevelClick(level)}
              className="w-full text-start rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01]"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: `${color}20`, color }}>
                    {level.level_number}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">{level.name_ar}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-['Inter']">{level.name_en}</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-[var(--text-muted)]" />
              </div>

              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] font-['Tajawal']">
                <span><Users size={13} className="inline ml-1" />{studentsAtLevel.length} طالب</span>
                <span><GraduationCap size={13} className="inline ml-1" />{groupIds.size} مجموعات</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-['Tajawal']">
                  <span className="text-[var(--text-muted)]">نسبة الإكمال</span>
                  <span style={{ color }}>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            </button>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Level 2: Level Units ────────────────────────────
function LevelUnits({ level, allStudents, allProgress, filterGroup, onFilterGroupChange, searchQuery, onSearchChange, onUnitClick }) {
  const { data: units = [], isLoading } = useQuery({
    queryKey: ['admin-level-units', level.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, title_ar, title_en, description_ar')
        .eq('level_id', level.id)
        .order('unit_number')
      if (error) throw error
      return data || []
    },
  })

  // Students at this level
  const studentsAtLevel = useMemo(() => {
    return allStudents.filter(s => s.groups?.level === level.level_number)
  }, [allStudents, level.level_number])

  // Unique groups
  const groups = useMemo(() => {
    const map = {}
    studentsAtLevel.forEach(s => {
      if (s.groups) map[s.group_id] = { id: s.group_id, name: s.groups.name, code: s.groups.code }
    })
    return Object.values(map)
  }, [studentsAtLevel])

  // Filtered students
  const filteredStudents = useMemo(() => {
    let list = studentsAtLevel
    if (filterGroup) list = list.filter(s => s.group_id === filterGroup.id)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(s => s.profiles?.full_name?.toLowerCase().includes(q))
    }
    return list
  }, [studentsAtLevel, filterGroup, searchQuery])

  const filteredIds = new Set(filteredStudents.map(s => s.id))

  // Progress map per unit
  const progressMap = useMemo(() => {
    const map = {}
    allProgress.forEach(p => {
      if (!filteredIds.has(p.student_id)) return
      if (!map[p.unit_id]) map[p.unit_id] = {}
      if (!map[p.unit_id][p.section_type]) map[p.unit_id][p.section_type] = { completed: 0, total: filteredIds.size }
      if (p.status === 'completed') map[p.unit_id][p.section_type].completed++
    })
    return map
  }, [allProgress, filteredIds])

  if (isLoading) return <SkeletonCards count={6} />

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">{level.name_ar}</h2>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{units.length} وحدات · {filteredStudents.length} طالب</p>
        </div>
        <div className="flex items-center gap-2 sm:mr-auto">
          {/* Group filter */}
          <GroupFilter groups={groups} selected={filterGroup} onChange={onFilterGroupChange} />
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="بحث بالاسم..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="h-10 pr-9 pl-4 rounded-xl text-sm font-['Tajawal'] outline-none border transition-colors focus:border-sky-500/40"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {!units.length ? (
        <EmptyState message="لا توجد وحدات لهذا المستوى بعد" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit, i) => {
            const unitProgress = progressMap[unit.id] || {}
            return (
              <motion.div key={unit.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <button
                  onClick={() => onUnitClick(unit)}
                  className="w-full text-start rounded-2xl p-5 space-y-3 transition-all hover:scale-[1.01] hover:border-sky-500/30"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-sky-400 font-['Tajawal']">الوحدة {unit.unit_number}</span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] mt-0.5">{unit.title_ar}</h3>
                      <p className="text-xs text-[var(--text-muted)] font-['Inter'] mt-0.5" dir="ltr">{unit.title_en}</p>
                    </div>
                    <ArrowRight size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SECTION_TYPES.slice(0, 5).map(sec => {
                      const prog = unitProgress[sec.id]
                      const status = !prog ? 'not_started' : prog.completed >= prog.total ? 'completed' : 'in_progress'
                      const st = STATUS_STYLES[status]
                      return (
                        <span key={sec.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${st.bg} ${st.text} ${st.border} font-['Tajawal']`}>
                          <sec.icon size={10} />
                          {prog ? `${prog.completed}/${prog.total}` : '0'}
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

// ─── Level 3: Unit Detail ────────────────────────────
function UnitDetail({ level, unit, allStudents, filterGroup, onFilterGroupChange, selectedStudent, onStudentChange, activeTab, onTabChange }) {
  // Students at this level
  const studentsAtLevel = useMemo(() => {
    let list = allStudents.filter(s => s.groups?.level === level.level_number)
    if (filterGroup) list = list.filter(s => s.group_id === filterGroup.id)
    return list
  }, [allStudents, level.level_number, filterGroup])

  const studentIds = studentsAtLevel.map(s => s.id)

  // Groups for filter
  const groups = useMemo(() => {
    const map = {}
    allStudents.filter(s => s.groups?.level === level.level_number).forEach(s => {
      if (s.groups) map[s.group_id] = { id: s.group_id, name: s.groups.name, code: s.groups.code }
    })
    return Object.values(map)
  }, [allStudents, level.level_number])

  // Full progress for this unit
  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['admin-unit-progress', unit.id, studentIds.join(',')],
    queryFn: async () => {
      if (!studentIds.length) return []
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .in('student_id', studentIds)
        .eq('unit_id', unit.id)
      if (error) throw error
      return data || []
    },
    enabled: studentIds.length > 0,
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-sky-400 font-['Tajawal']">الوحدة {unit.unit_number} — {level.name_ar}</span>
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">{unit.title_ar}</h2>
          <p className="text-xs text-[var(--text-muted)] font-['Inter']" dir="ltr">{unit.title_en}</p>
        </div>
        <div className="flex items-center gap-2">
          <GroupFilter groups={groups} selected={filterGroup} onChange={onFilterGroupChange} />
          <StudentSelector students={studentsAtLevel} selected={selectedStudent} onChange={onStudentChange} />
        </div>
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
        <AllStudentsMatrix students={studentsAtLevel} progress={progress} activeTab={activeTab} showGroup />
      ) : (
        <StudentAnswersView student={selectedStudent} progress={progress} activeTab={activeTab} />
      )}
    </div>
  )
}

// ─── All Students Matrix (with group column) ─────────
function AllStudentsMatrix({ students, progress, activeTab, showGroup }) {
  const [sortBy, setSortBy] = useState('name')

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

  // Sort
  const sorted = useMemo(() => {
    const rows = Object.values(studentMap)
    if (sortBy === 'name') return rows.sort((a, b) => (a.student.profiles?.full_name || '').localeCompare(b.student.profiles?.full_name || '', 'ar'))
    if (sortBy === 'completion') {
      return rows.sort((a, b) => {
        const aDone = Object.values(a.sections).flat().filter(p => p.status === 'completed').length
        const bDone = Object.values(b.sections).flat().filter(p => p.status === 'completed').length
        return bDone - aDone
      })
    }
    return rows
  }, [studentMap, sortBy])

  if (!students?.length) return <EmptyState message="لا يوجد طلاب" />

  return (
    <div className="space-y-3">
      {/* Sort buttons */}
      <div className="flex items-center gap-2 text-xs font-['Tajawal']">
        <span className="text-[var(--text-muted)]">ترتيب:</span>
        <button onClick={() => setSortBy('name')} className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'name' ? 'bg-sky-500/15 text-sky-400' : 'text-[var(--text-muted)]'}`}>الاسم</button>
        <button onClick={() => setSortBy('completion')} className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'completion' ? 'bg-sky-500/15 text-sky-400' : 'text-[var(--text-muted)]'}`}>الإكمال</button>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-xs text-[var(--text-muted)] font-['Tajawal']">
              <th className="text-start pb-3 pr-4 font-medium">الطالب</th>
              {showGroup && <th className="text-center pb-3 px-2 font-medium">المجموعة</th>}
              {SECTION_TYPES.map(sec => (
                <th key={sec.id} className={`text-center pb-3 px-2 font-medium ${activeTab === sec.id ? 'text-sky-400' : ''}`}>{sec.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
            {sorted.map(({ student, sections }) => (
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
                {showGroup && (
                  <td className="py-3 px-2 text-center">
                    <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">{student.groups?.code || '—'}</span>
                  </td>
                )}
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
    </div>
  )
}

// ─── Student Answers View ────────────────────────────
function StudentAnswersView({ student, progress, activeTab }) {
  const studentProgress = useMemo(() => {
    return (progress || []).filter(p => p.student_id === student.id && p.section_type === activeTab)
  }, [progress, student.id, activeTab])

  if (!studentProgress.length) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <XCircle size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">{student.profiles?.full_name} لم يبدأ هذا القسم بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {studentProgress.map(prog => (
        <ProgressCard key={prog.id} progress={prog} sectionType={activeTab} />
      ))}
    </div>
  )
}

// ─── Progress Detail Card ────────────────────────────
function ProgressCard({ progress: prog, sectionType }) {
  const st = STATUS_STYLES[prog.status] || STATUS_STYLES.not_started
  const Icon = st.icon
  const answers = prog.answers || {}

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${st.bg} ${st.text} font-['Tajawal']`}>
            <Icon size={14} />{st.label}
          </div>
          {prog.score != null && <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">{prog.score}%</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-['Tajawal']">
          {prog.time_spent_seconds > 0 && <span><Clock size={12} className="inline ml-1" />{Math.round(prog.time_spent_seconds / 60)} دقيقة</span>}
          {prog.completed_at && <span>{new Date(prog.completed_at).toLocaleDateString('ar-SA')}</span>}
        </div>
      </div>

      {sectionType === 'reading' && <AnswersList answers={answers} type="reading" />}
      {sectionType === 'grammar' && <GrammarAnswersList answers={answers} />}
      {sectionType === 'listening' && <ListeningAnswersList answers={answers} />}
      {sectionType === 'writing' && <WritingDetail answers={answers} />}
      {sectionType === 'vocabulary' && <VocabDetail answers={answers} />}
      {(sectionType === 'speaking' || sectionType === 'assessment') && (
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">البيانات التفصيلية غير متاحة حالياً</p>
      )}
    </div>
  )
}

function AnswersList({ answers }) {
  const entries = Object.entries(answers || {}).filter(([k]) => !['exercises', 'questions'].includes(k))
  if (!entries.length) return <NoAnswers />
  return (
    <div className="space-y-2">
      {entries.map(([qId, ans], i) => (
        <div key={qId} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <span className="w-6 h-6 rounded-md bg-sky-500/15 text-sky-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">{i + 1}</span>
          <span className="text-sm text-[var(--text-secondary)] font-['Inter'] flex-1" dir="ltr">{ans.selected}</span>
          {ans.correct ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
        </div>
      ))}
    </div>
  )
}

function GrammarAnswersList({ answers }) {
  const exercises = answers?.exercises || []
  if (!exercises.length) return <NoAnswers />
  return (
    <div className="space-y-2">
      {exercises.map((ex, i) => (
        <div key={ex.id || i} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <span className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-[var(--text-muted)] font-['Tajawal']">{ex.type}</span>
            <p className="text-sm text-[var(--text-secondary)] font-['Inter']" dir="ltr">{ex.studentAnswer || '—'}</p>
            {!ex.isCorrect && ex.correctAnswer && <p className="text-xs text-emerald-400 font-['Inter'] mt-0.5" dir="ltr">← {ex.correctAnswer}</p>}
          </div>
          {ex.isCorrect ? <CheckCircle size={16} className="text-emerald-400 mt-0.5" /> : <XCircle size={16} className="text-red-400 mt-0.5" />}
        </div>
      ))}
    </div>
  )
}

function ListeningAnswersList({ answers }) {
  const questions = answers?.questions || []
  if (!questions.length) return <NoAnswers />
  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <span className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
          <div className="flex-1 min-w-0">
            {q.question && <p className="text-xs text-[var(--text-muted)] font-['Inter'] truncate" dir="ltr">{q.question}</p>}
            <p className="text-sm text-[var(--text-secondary)] font-['Inter']" dir="ltr">
              {typeof q.studentAnswer === 'number' ? String.fromCharCode(65 + q.studentAnswer) : (q.studentAnswer || '—')}
            </p>
          </div>
          {q.isCorrect ? <CheckCircle size={16} className="text-emerald-400 mt-0.5" /> : <XCircle size={16} className="text-red-400 mt-0.5" />}
        </div>
      ))}
    </div>
  )
}

function WritingDetail({ answers }) {
  if (!answers?.draft) return <NoAnswers />
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-['Tajawal']">
        <span>{answers.wordCount || 0} كلمة</span>
        {answers.lastSavedAt && <span>آخر حفظ: {new Date(answers.lastSavedAt).toLocaleString('ar-SA')}</span>}
      </div>
      <div className="rounded-xl p-4 text-sm font-['Inter'] text-[var(--text-secondary)] leading-[1.8] whitespace-pre-wrap" dir="ltr" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        {answers.draft}
      </div>
    </div>
  )
}

function VocabDetail({ answers }) {
  const reviewed = answers?.reviewedWords?.length || 0
  const total = answers?.totalWords || 0
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-['Tajawal']">
        <Languages size={16} className="text-sky-400" />
        <span className="text-[var(--text-secondary)]">تمت مراجعة <strong className="text-[var(--text-primary)]">{reviewed}</strong> من <strong className="text-[var(--text-primary)]">{total}</strong> كلمة</span>
      </div>
      {total > 0 && (
        <div className="h-2 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${(reviewed / total) * 100}%`, background: reviewed >= total ? '#10b981' : '#0ea5e9' }} />
        </div>
      )}
    </div>
  )
}

// ─── Shared Components ───────────────────────────────
function GroupFilter({ groups, selected, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium border transition-colors font-['Tajawal']"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <GraduationCap size={14} className="text-[var(--text-muted)]" />
        <span className="text-[var(--text-primary)]">{selected ? selected.name : 'كل المجموعات'}</span>
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 top-full mt-1 w-48 rounded-xl overflow-hidden z-30 max-h-56 overflow-y-auto scrollbar-hide"
            style={{ background: 'var(--surface-overlay, var(--surface-raised))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
          >
            <button onClick={() => { onChange(null); setOpen(false) }} className={`w-full text-start px-4 py-2.5 text-sm font-['Tajawal'] transition-colors hover:bg-[rgba(255,255,255,0.04)] ${!selected ? 'text-sky-400 font-bold' : 'text-[var(--text-primary)]'}`}>
              كل المجموعات
            </button>
            {groups.map(g => (
              <button key={g.id} onClick={() => { onChange(g); setOpen(false) }} className={`w-full text-start px-4 py-2.5 text-sm font-['Tajawal'] transition-colors hover:bg-[rgba(255,255,255,0.04)] ${selected?.id === g.id ? 'text-sky-400 font-bold' : 'text-[var(--text-primary)]'}`}>
                {g.name} <span className="text-xs text-[var(--text-muted)]">({g.code})</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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
        <span className="text-[var(--text-primary)]">{selected ? selected.profiles?.full_name : 'كل الطلاب'}</span>
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 top-full mt-1 w-56 rounded-xl overflow-hidden z-30 max-h-64 overflow-y-auto scrollbar-hide"
            style={{ background: 'var(--surface-overlay, var(--surface-raised))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
          >
            <button onClick={() => { onChange(null); setOpen(false) }} className={`w-full text-start px-4 py-2.5 text-sm font-['Tajawal'] transition-colors hover:bg-[rgba(255,255,255,0.04)] ${!selected ? 'text-sky-400 font-bold' : 'text-[var(--text-primary)]'}`}>
              كل الطلاب
            </button>
            {students?.map(s => (
              <button key={s.id} onClick={() => { onChange(s); setOpen(false) }} className={`w-full text-start px-4 py-2.5 text-sm font-['Tajawal'] transition-colors hover:bg-[rgba(255,255,255,0.04)] ${selected?.id === s.id ? 'text-sky-400 font-bold' : 'text-[var(--text-primary)]'}`}>
                {s.profiles?.full_name || 'غير معروف'}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NoAnswers() {
  return <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">لا توجد إجابات محفوظة</p>
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <BookOpen size={40} className="text-[var(--text-muted)]" />
      <p className="text-[var(--text-muted)] font-['Tajawal']">{message}</p>
    </div>
  )
}

function SkeletonCards({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
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
