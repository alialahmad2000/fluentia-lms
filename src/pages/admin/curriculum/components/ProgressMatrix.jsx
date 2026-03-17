import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Clock, Star, Zap } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

function getColor(pct) {
  if (pct === 0) return { bg: 'rgba(255,255,255,0.04)', text: 'var(--text-muted)' }
  if (pct <= 30) return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' }
  if (pct <= 60) return { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' }
  if (pct <= 90) return { bg: 'rgba(56,189,248,0.15)', text: '#38bdf8' }
  return { bg: 'rgba(74,222,128,0.15)', text: '#4ade80' }
}

function StatusCell({ status }) {
  if (status === 'completed') return <span style={{ color: '#4ade80' }}>&#10003;</span>
  if (status === 'in_progress') return <span style={{ color: '#fbbf24' }}>&#8635;</span>
  return <span style={{ color: 'var(--text-muted)' }}>&#9633;</span>
}

export default function ProgressMatrix({ students = [], progress = [], levels = [], units = [] }) {
  const [expandedStudent, setExpandedStudent] = useState(null)
  const [filterLevel, setFilterLevel] = useState('')

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  // Calculate per-student, per-level completion
  const getStudentLevelPct = (studentId, levelId) => {
    const levelUnits = units.filter(u => u.level_id === levelId)
    if (levelUnits.length === 0) return 0
    const sectionTypes = ['reading', 'grammar', 'writing', 'listening', 'speaking', 'assessment']
    const totalSections = levelUnits.length * sectionTypes.length
    if (totalSections === 0) return 0

    const completed = progress.filter(p =>
      p.student_id === studentId &&
      levelUnits.some(u => u.id === p.unit_id) &&
      p.status === 'completed'
    ).length

    return Math.round((completed / totalSections) * 100)
  }

  // Get per-unit breakdown for expanded view
  const getUnitBreakdown = (studentId, levelId) => {
    const levelUnits = units.filter(u => u.level_id === levelId).sort((a, b) => a.unit_number - b.unit_number)
    return levelUnits.map(unit => {
      const unitProgress = progress.filter(p => p.student_id === studentId && p.unit_id === unit.id)
      const getStatus = (type) => {
        const match = unitProgress.find(p => p.section_type === type)
        return match?.status || 'not_started'
      }
      return {
        unit,
        reading: getStatus('reading'),
        grammar: getStatus('grammar'),
        writing: getStatus('writing'),
        listening: getStatus('listening'),
        speaking: getStatus('speaking'),
        assessment: getStatus('assessment'),
      }
    })
  }

  const filteredLevels = filterLevel ? levels.filter(l => l.id === filterLevel) : levels

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={inputStyle}
        >
          <option value="">جميع المستويات</option>
          {levels.map(l => <option key={l.id} value={l.id}>{l.name_ar}</option>)}
        </select>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-right px-3 py-2" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal', fontWeight: 600 }}>الطالب</th>
              {filteredLevels.map(l => (
                <th key={l.id} className="px-3 py-2 text-center" style={{ color: l.color || 'var(--text-muted)', fontFamily: 'Tajawal', fontWeight: 600 }}>
                  {l.name_ar}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const isExpanded = expandedStudent === student.id
              return (
                <tr key={student.id} className="group">
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {student.full_name}
                    </button>

                    {isExpanded && filteredLevels.length > 0 && (
                      <div className="mt-3 mr-4 space-y-3">
                        {filteredLevels.map(level => {
                          const breakdown = getUnitBreakdown(student.id, level.id)
                          if (breakdown.length === 0) return null
                          return (
                            <div key={level.id} className="space-y-1">
                              <span className="text-xs font-semibold" style={{ color: level.color }}>{level.name_ar}</span>
                              <div className="overflow-x-auto">
                                <table className="text-xs w-full" style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
                                  <thead>
                                    <tr>
                                      <th className="px-2 py-1" style={{ color: 'var(--text-muted)' }}>الوحدة</th>
                                      <th className="px-2 py-1" style={{ color: 'var(--text-muted)' }}>القراءة</th>
                                      <th className="px-2 py-1" style={{ color: 'var(--text-muted)' }}>القواعد</th>
                                      <th className="px-2 py-1" style={{ color: 'var(--text-muted)' }}>الكتابة</th>
                                      <th className="px-2 py-1" style={{ color: 'var(--text-muted)' }}>الاستماع</th>
                                      <th className="px-2 py-1" style={{ color: 'var(--text-muted)' }}>المحادثة</th>
                                      <th className="px-2 py-1" style={{ color: 'var(--text-muted)' }}>التقييم</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {breakdown.map(b => (
                                      <tr key={b.unit.id}>
                                        <td className="px-2 py-1" style={{ color: 'var(--text-secondary)' }}>{b.unit.unit_number}</td>
                                        <td className="px-2 py-1 text-center"><StatusCell status={b.reading} /></td>
                                        <td className="px-2 py-1 text-center"><StatusCell status={b.grammar} /></td>
                                        <td className="px-2 py-1 text-center"><StatusCell status={b.writing} /></td>
                                        <td className="px-2 py-1 text-center"><StatusCell status={b.listening} /></td>
                                        <td className="px-2 py-1 text-center"><StatusCell status={b.speaking} /></td>
                                        <td className="px-2 py-1 text-center"><StatusCell status={b.assessment} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </td>
                  {filteredLevels.map(level => {
                    const pct = getStudentLevelPct(student.id, level.id)
                    const colors = getColor(pct)
                    return (
                      <td key={level.id} className="px-3 py-2 text-center">
                        <span
                          className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg min-w-[48px]"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {pct}%
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
          لا يوجد طلاب
        </div>
      )}
    </div>
  )
}
