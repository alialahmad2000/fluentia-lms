import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentPulse } from '@/hooks/trainer/useStudentPulse'
import { useTrainerCockpit } from '@/hooks/trainer/useTrainerCockpit'
import { CommandCard } from '@/design-system/trainer'

const DAY_LABELS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function intensityClass(xp) {
  if (!xp || xp === 0) return 'tr-pulse__cell--empty'
  if (xp < 10) return 'tr-pulse__cell--low'
  if (xp < 30) return 'tr-pulse__cell--mid'
  if (xp < 60) return 'tr-pulse__cell--high'
  return 'tr-pulse__cell--peak'
}

function PulseSkeleton() {
  return (
    <CommandCard className="tr-pulse tr-pulse--loading">
      <div className="tr-pulse__header">
        <div className="tr-skel-line tr-skel-line--title" />
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="tr-pulse__row tr-pulse__row--skel">
          <div className="tr-skel-line tr-skel-line--name" />
          {[...Array(7)].map((_, j) => (
            <div key={j} className="tr-pulse__cell tr-pulse__cell--skel" />
          ))}
        </div>
      ))}
    </CommandCard>
  )
}

export default function StudentPulseMap() {
  const { data, isLoading } = useStudentPulse()
  const { data: cockpit } = useTrainerCockpit()
  const [activeFilter, setActiveFilter] = useState('all')

  if (isLoading) return <PulseSkeleton />

  const students = data?.students || []
  const matrix = data?.matrix || {}
  const days = data?.days || []
  const competition = cockpit?.competition

  const teamAGroupId = competition?.team_a?.group_id
  const teamBGroupId = competition?.team_b?.group_id
  const hasTeams = !!(teamAGroupId && teamBGroupId)

  const filteredStudents = students.filter(s => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'a') return s.group_id === teamAGroupId
    if (activeFilter === 'b') return s.group_id === teamBGroupId
    return true
  })

  if (students.length === 0) {
    return (
      <CommandCard className="tr-pulse">
        <div className="tr-pulse__empty">
          <p>لا يوجد طلاب في مجموعاتك حالياً</p>
          <p className="tr-pulse__empty-sub">سيظهر النبض عندما ينضم الطلاب</p>
        </div>
      </CommandCard>
    )
  }

  return (
    <CommandCard className="tr-pulse">
      <div className="tr-pulse__header">
        <h2 className="tr-display tr-pulse__title">نبض الطلاب · آخر ٧ أيام</h2>
        <span className="tr-pulse__legend" aria-hidden="true">
          <span className="tr-pulse__dot tr-pulse__dot--empty" />صامت
          <span className="tr-pulse__dot tr-pulse__dot--low" />خفيف
          <span className="tr-pulse__dot tr-pulse__dot--peak" />نشط
        </span>
      </div>

      {/* Team filter pills */}
      {hasTeams && (
        <div className="tr-pulse__filters" role="group" aria-label="فلتر الفريق">
          {[
            { key: 'all', label: 'كل الطلاب' },
            { key: 'a', label: `${competition.team_a?.emoji || ''} ${competition.team_a?.name || 'A'}` },
            { key: 'b', label: `${competition.team_b?.emoji || ''} ${competition.team_b?.name || 'B'}` },
          ].map(pill => (
            <button
              key={pill.key}
              className={`tr-pulse__pill ${activeFilter === pill.key ? 'is-active' : ''}`}
              onClick={() => setActiveFilter(pill.key)}
              type="button"
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      <div className="tr-pulse__grid" role="table" aria-label="خريطة نشاط الطلاب">
        {/* Day header */}
        <div className="tr-pulse__row tr-pulse__row--header" role="row">
          <div className="tr-pulse__name-col" role="columnheader" />
          {days.map(d => {
            const dayIdx = new Date(d).getDay()
            return (
              <div key={d} className="tr-pulse__day-label" role="columnheader">
                {DAY_LABELS_AR[dayIdx].substring(0, 3)}
              </div>
            )
          })}
        </div>

        {/* Student rows */}
        {filteredStudents.map(s => (
          <Link
            to={`/trainer/student/${s.id}`}
            key={s.id}
            className="tr-pulse__row tr-pulse__row--link"
            role="row"
            aria-label={`${s.full_name} — عرض التقدم`}
          >
            <div className="tr-pulse__name-col" role="rowheader">{s.full_name}</div>
            {days.map(d => {
              const xp = matrix[s.id]?.[d] || 0
              return (
                <div
                  key={d}
                  className={`tr-pulse__cell ${intensityClass(xp)}`}
                  title={`${s.full_name} · ${d} · ${xp} XP`}
                  role="cell"
                />
              )
            })}
          </Link>
        ))}
      </div>
    </CommandCard>
  )
}
