import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, ChevronDown, Users, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { calculateUnitCompletion, groupProgressByUnit } from '../../utils/curriculumProgress'
import UserAvatar from '../../components/common/UserAvatar'

const SECTION_LABELS = {
  reading: 'القراءة',
  grammar: 'القواعد',
  listening: 'الاستماع',
  vocabulary: 'المفردات',
  writing: 'الكتابة',
}

const STATUS_ICON = { completed: '✅', in_progress: '🟡', not_started: '❌' }

const FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'not_started', label: 'لم يبدأوا' },
  { value: 'in_progress', label: 'قيد التقدم' },
  { value: 'completed', label: 'أكملوا' },
]

export default function TrainerProgressMatrix() {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [hoveredCell, setHoveredCell] = useState(null)

  // 1. Get groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['matrix-groups', profile?.role],
    queryFn: async () => {
      let q = supabase.from('groups').select('id, name, code, level').eq('is_active', true).order('level')
      if (!isAdmin) q = q.eq('trainer_id', profile?.id)
      const { data } = await q
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Auto-select first group
  const activeGroupId = selectedGroupId || groups?.[0]?.id
  const activeGroup = groups?.find(g => g.id === activeGroupId)

  // 2. Get students in selected group
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['matrix-students', activeGroupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name, avatar_url)')
        .eq('group_id', activeGroupId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('id')
      return (data || []).map(s => ({
        id: s.id,
        name: s.profiles?.display_name || s.profiles?.full_name || 'طالب',
        avatar_url: s.profiles?.avatar_url,
      })).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    },
    enabled: !!activeGroupId,
  })

  // 3. Get level and units
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ['matrix-units', activeGroup?.level],
    queryFn: async () => {
      const { data: level } = await supabase
        .from('curriculum_levels')
        .select('id')
        .eq('level_number', activeGroup.level)
        .single()
      if (!level) return []
      const { data: u } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, theme_ar')
        .eq('level_id', level.id)
        .order('unit_number')
      return u || []
    },
    enabled: !!activeGroup?.level != null,
  })

  // 4. Get ALL progress in one query
  const studentIds = students?.map(s => s.id) || []
  const { data: allProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['matrix-progress', studentIds.join(',')],
    queryFn: async () => {
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, unit_id, section_type, status, score, completed_at')
        .in('student_id', studentIds)
      return data || []
    },
    enabled: studentIds.length > 0,
  })

  // 5. Build matrix
  const matrix = useMemo(() => {
    if (!students?.length || !units?.length) return { rows: [], unitStats: [], topStats: null }

    const unitIds = new Set(units.map(u => u.id))
    const rows = students.map(student => {
      const studentProgress = (allProgress || []).filter(p => p.student_id === student.id)
      const byUnit = groupProgressByUnit(studentProgress)

      const cells = units.map(unit => {
        const unitProgress = (byUnit[unit.id] || []).filter(p => unitIds.has(p.unit_id))
        return calculateUnitCompletion(byUnit[unit.id] || [])
      })

      const totalCompleted = cells.filter(c => c.status === 'completed').length
      const totalInProgress = cells.filter(c => c.status === 'in_progress').length
      const overallPercent = units.length > 0 ? Math.round((totalCompleted / units.length) * 100) : 0

      let overallStatus = 'not_started'
      if (totalCompleted === units.length) overallStatus = 'completed'
      else if (totalCompleted > 0 || totalInProgress > 0) overallStatus = 'in_progress'

      return { student, cells, overallPercent, overallStatus }
    })

    // Unit stats (bottom summary)
    const unitStats = units.map((unit, colIdx) => {
      const completed = rows.filter(r => r.cells[colIdx].status === 'completed').length
      return { completed, total: rows.length }
    })

    // Top stats
    const avgCompletion = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.overallPercent, 0) / rows.length) : 0
    const unitCompletionCounts = unitStats.map((u, i) => ({ idx: i, completed: u.completed }))
    const mostCompleted = unitCompletionCounts.reduce((best, u) => u.completed > best.completed ? u : best, { idx: 0, completed: 0 })
    const leastCompleted = unitCompletionCounts.reduce((best, u) => u.completed < best.completed ? u : best, { idx: 0, completed: Infinity })
    const sortedByCompletion = [...rows].sort((a, b) => b.overallPercent - a.overallPercent)

    const topStats = {
      totalStudents: rows.length,
      avgCompletion,
      mostCompletedUnit: units[mostCompleted.idx],
      leastCompletedUnit: units.length > 0 ? units[leastCompleted.idx] : null,
      mostActiveStudent: sortedByCompletion[0]?.student,
      leastActiveStudent: sortedByCompletion[sortedByCompletion.length - 1]?.student,
    }

    return { rows, unitStats, topStats }
  }, [students, units, allProgress])

  // Apply status filter
  const filteredRows = statusFilter === 'all'
    ? matrix.rows
    : matrix.rows.filter(r => r.overallStatus === statusFilter)

  const isLoading = groupsLoading || studentsLoading || unitsLoading || progressLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title">ماتركس التقدم</h1>
        <p className="text-[15px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
          نظرة شاملة على تقدم جميع الطلاب في المنهج
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        {/* Group selector */}
        {groups?.length > 1 && (
          <div className="relative">
            <select
              value={activeGroupId || ''}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="appearance-none text-sm font-medium px-4 py-2 rounded-xl border outline-none cursor-pointer font-['Tajawal']"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', paddingLeft: '2rem' }}
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name || g.code}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {/* Status filter */}
        <div className="flex gap-1.5">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-['Tajawal'] border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  : 'text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Top Stats */}
      {matrix.topStats && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {[
            { label: 'الطلاب', value: matrix.topStats.totalStudents, icon: Users, color: 'text-sky-400' },
            { label: 'متوسط التقدم', value: `${matrix.topStats.avgCompletion}%`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'أكثر وحدة مكتملة', value: matrix.topStats.mostCompletedUnit ? `و${matrix.topStats.mostCompletedUnit.unit_number}` : '—', icon: Award, color: 'text-amber-400' },
            { label: 'أقل وحدة مكتملة', value: matrix.topStats.leastCompletedUnit ? `و${matrix.topStats.leastCompletedUnit.unit_number}` : '—', icon: AlertTriangle, color: 'text-red-400' },
            { label: 'الأنشط', value: matrix.topStats.mostActiveStudent?.name?.split(' ')[0] || '—', icon: Award, color: 'text-emerald-400' },
            { label: 'الأقل نشاطاً', value: matrix.topStats.leastActiveStudent?.name?.split(' ')[0] || '—', icon: AlertTriangle, color: 'text-amber-400' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
              <stat.icon size={16} className={`${stat.color} mx-auto mb-1.5`} />
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
              <p className="text-[10px] text-muted mt-0.5 font-['Tajawal']">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fl-card-static overflow-hidden"
      >
        {isLoading ? (
          <MatrixSkeleton />
        ) : !students?.length || !units?.length ? (
          <div className="p-10 text-center">
            <BarChart3 size={40} className="text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-muted font-['Tajawal']">
              {!units?.length ? 'لا توجد وحدات لهذا المستوى بعد' : 'لا يوجد بيانات تقدم بعد — ستظهر هنا عندما يبدأ الطلاب بحل المنهج'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="sticky right-0 z-10 text-right px-4 py-3 text-xs font-bold font-['Tajawal']" style={{ background: 'var(--surface-base)', color: 'var(--text-muted)', minWidth: '140px' }}>
                    الطالب
                  </th>
                  {units.map(unit => (
                    <th key={unit.id} className="px-1.5 py-3 text-center text-xs font-bold font-['Tajawal']" style={{ color: 'var(--text-muted)', minWidth: '52px' }} title={unit.theme_ar}>
                      و{unit.unit_number}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-bold font-['Tajawal']" style={{ color: 'var(--text-muted)', minWidth: '60px' }}>
                    الإجمالي
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, rIdx) => (
                  <tr key={row.student.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="sticky right-0 z-10 px-4 py-2" style={{ background: 'var(--surface-base)' }}>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={{ display_name: row.student.name, avatar_url: row.student.avatar_url }} size={28} rounded="full" />
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)', maxWidth: '100px' }}>
                          {row.student.name}
                        </span>
                      </div>
                    </td>
                    {row.cells.map((cell, cIdx) => {
                      const cellKey = `${rIdx}-${cIdx}`
                      return (
                        <td key={cIdx} className="px-1.5 py-2 text-center relative">
                          <div
                            onMouseEnter={() => setHoveredCell(cellKey)}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`w-12 h-12 mx-auto rounded-lg flex flex-col items-center justify-center text-[11px] font-bold border cursor-default transition-all ${
                              cell.status === 'completed'
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                : cell.status === 'in_progress'
                                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                                  : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] text-[var(--text-muted)]'
                            }`}
                          >
                            {cell.status === 'completed' ? (
                              <>
                                <span className="text-[10px] leading-none">✅</span>
                                <span className="text-[10px] leading-none mt-0.5">
                                  {Math.round(cell.sectionDetails.filter(s => s.score != null).reduce((s, d) => s + (d.score || 0), 0) / Math.max(cell.sectionDetails.filter(s => s.score != null).length, 1))}%
                                </span>
                              </>
                            ) : cell.status === 'in_progress' ? (
                              <>
                                <span className="text-[10px] leading-none">🟡</span>
                                <span className="text-[10px] leading-none mt-0.5">{cell.sectionsCompleted}/{cell.totalSections}</span>
                              </>
                            ) : (
                              <span className="text-[10px] opacity-40">—</span>
                            )}
                          </div>
                          {/* Tooltip */}
                          <AnimatePresence>
                            {hoveredCell === cellKey && cell.status !== 'not_started' && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded-xl p-3 space-y-1.5"
                                style={{
                                  background: 'var(--surface-elevated, var(--surface-raised))',
                                  border: '1px solid var(--border-subtle)',
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                }}
                              >
                                <p className="text-[11px] font-bold text-center font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
                                  {units[cIdx]?.theme_ar || `الوحدة ${cIdx + 1}`}
                                </p>
                                {cell.sectionDetails.map(sec => (
                                  <div key={sec.type} className="flex items-center justify-between text-[10px]">
                                    <span className="font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>{SECTION_LABELS[sec.type]}</span>
                                    <span>
                                      {STATUS_ICON[sec.status]}
                                      {sec.score != null && <span className="mr-1" style={{ color: 'var(--text-muted)' }}>{sec.score}%</span>}
                                    </span>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      )
                    })}
                    {/* Overall column */}
                    <td className="px-3 py-2 text-center">
                      <span className={`text-sm font-bold ${
                        row.overallPercent >= 80 ? 'text-emerald-400' : row.overallPercent >= 30 ? 'text-amber-400' : 'text-[var(--text-muted)]'
                      }`}>
                        {row.overallPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Summary row */}
              <tfoot>
                <tr style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td className="sticky right-0 z-10 px-4 py-3 text-xs font-bold font-['Tajawal']" style={{ background: 'var(--surface-base)', color: 'var(--text-muted)' }}>
                    الإجمالي
                  </td>
                  {matrix.unitStats.map((stat, i) => (
                    <td key={i} className="px-1.5 py-3 text-center">
                      <span className="text-[10px] font-bold font-['Tajawal']" style={{ color: stat.completed > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {stat.completed}/{stat.total}
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function MatrixSkeleton() {
  return (
    <div className="p-5 space-y-3">
      <div className="flex gap-3">
        <div className="skeleton h-8 w-32 rounded-lg" />
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-8 w-12 rounded-lg" />)}
      </div>
      {[...Array(5)].map((_, r) => (
        <div key={r} className="flex gap-3">
          <div className="skeleton h-12 w-32 rounded-lg" />
          {[...Array(6)].map((_, c) => <div key={c} className="skeleton h-12 w-12 rounded-lg" />)}
        </div>
      ))}
    </div>
  )
}
