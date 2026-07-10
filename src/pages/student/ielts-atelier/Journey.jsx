import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentId } from './_helpers/resolveStudentId'
import { useAdaptivePlan, useLatestResult } from '@/hooks/ielts/useIELTSHub'
import { generatePlan } from '@/lib/ielts/plan-generator'
import { useG } from '@/i18n/gender'
import { Card, SectionHeader, Chip, Icon } from './_ui/primitives'
import JourneyStations from './_ui/JourneyStations'
import CoachHelps from './_ui/CoachHelps'
import GoalModal from './_ui/GoalModal'

const BASE = '/student/ielts-atelier'
const SKILLS = ['reading', 'listening', 'writing', 'speaking']
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const DAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const TASK_META = {
  reading: { tag: 'قراءة', route: 'reading' }, listening: { tag: 'استماع', route: 'listening' },
  writing: { tag: 'كتابة', route: 'writing' }, speaking: { tag: 'محادثة', route: 'speaking' },
  errors: { tag: 'مراجعة', route: 'errors' }, mock: { tag: 'محاكاة', route: 'mock' },
  vocab: { tag: 'مفردات', route: 'reading' },
}

function daysUntil(d) {
  if (!d) return null
  const t = new Date(d); if (isNaN(t)) return null
  return Math.max(0, Math.ceil((t.getTime() - Date.now()) / 86400000))
}

function TaskRow({ t, onClick, first }) {
  const m = TASK_META[t.task_type] || { tag: t.task_type, route: '' }
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 4px', cursor: 'pointer', borderTop: first ? 0 : '1px solid var(--iel-border)' }}>
      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 8, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', flex: 'none', minWidth: 56, textAlign: 'center' }}>{m.tag}</span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--iel-ink)' }}>{t.description_ar}</div>
      {t.duration_min != null && <span style={{ fontSize: 12, color: 'var(--iel-ink-2)', fontWeight: 700 }}>{t.duration_min} د</span>}
      <span style={{ color: 'var(--iel-ink-3)', display: 'flex' }}><Icon.chevron size={17} sw={2} /></span>
    </div>
  )
}

export default function Journey() {
  const navigate = useNavigate()
  const g = useG()
  const studentId = useStudentId()
  const { data: planRow } = useAdaptivePlan(studentId)
  const { data: result } = useLatestResult(studentId)
  const [showGoal, setShowGoal] = useState(false)

  const target = planRow?.target_band != null ? Number(planRow.target_band) : 7
  const examDate = planRow?.target_exam_date || planRow?.exam_date || null
  const days = daysUntil(examDate)

  const weakest = useMemo(() => {
    const s = Object.fromEntries(SKILLS.map((k) => [k, result?.[`${k}_score`]]))
    const rated = Object.entries(s).filter(([, v]) => v != null)
    return rated.length ? rated.reduce((a, b) => (Number(a[1]) <= Number(b[1]) ? a : b))[0] : null
  }, [result])

  const schedule = useMemo(() => {
    try {
      const p = generatePlan({ studentId: studentId || 'x', targetBand: target, examDate, weakAreas: weakest ? [{ skill: weakest }] : [], hasDiagnostic: result?.overall_band != null })
      return p?.weekly_schedule || {}
    } catch { return {} }
  }, [studentId, target, examDate, weakest, result])

  const todayIdx = new Date().getDay()
  const go = (r) => navigate(r ? `${BASE}/${r}` : BASE)
  const daysWithTasks = DAY_KEYS.map((k, i) => ({ key: k, ar: DAY_AR[i], idx: i, tasks: schedule[k] || [] }))
  const todayTasks = schedule[DAY_KEYS[todayIdx]] || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 2, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-accent)', letterSpacing: '.1em', marginBottom: 8 }}>طريقك إلى الهدف</div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: 'var(--iel-ink)', margin: 0 }}>رحلتك الكاملة نحو النطاق</h1>
        </div>
        {days != null
          ? <Chip><span style={{ color: 'var(--iel-ink-3)', fontWeight: 600 }}>الاختبار بعد</span> {days} يوماً</Chip>
          : <button onClick={() => setShowGoal(true)} style={{ background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', border: 0, borderRadius: 11, padding: '9px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>حدّد هدفك وموعدك</button>}
      </div>

      {/* You are here — the journey arc */}
      <Card style={{ padding: '18px 22px' }}>
        <JourneyStations hasResult={result?.overall_band != null} daysLeft={days} />
      </Card>

      {/* How the plan is built — the method, in one line */}
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.85, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', borderRadius: 12, padding: '13px 16px', backdropFilter: 'blur(8px)' }}>
        خطّتك تلمس المهارات الأربع كل أسبوع حتى لا تبرد أيّ مهارة، وتعطي مهارتك الأضعف تركيزاً مضاعفاً. تابع خطة اليوم، ولك الحرية أن تتدرّب على أي شيء متى شئت.
      </p>

      {/* Today */}
      <Card style={{ padding: '20px 22px' }}>
        <SectionHeader title={`خطة اليوم — ${DAY_AR[todayIdx]}`} />
        {todayTasks.length ? todayTasks.map((t, i) => (
          <TaskRow key={i} t={t} first={i === 0} onClick={() => go(TASK_META[t.task_type]?.route)} />
        )) : (
          <p style={{ fontSize: 14, color: 'var(--iel-ink-3)', margin: 0, fontWeight: 600 }}>يوم راحة — لا مهام مجدولة اليوم. يمكنك التدرّب على أي مهارة متى شئت.</p>
        )}
      </Card>

      {/* This week */}
      <div>
        <SectionHeader title="هذا الأسبوع" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {daysWithTasks.map((d) => (
            <Card key={d.key} style={{ padding: '14px 16px', borderColor: d.idx === todayIdx ? 'color-mix(in srgb, var(--iel-accent) 45%, var(--iel-border))' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: d.idx === todayIdx ? 'var(--iel-accent-ink)' : 'var(--iel-ink)' }}>{d.ar}</span>
                {d.idx === todayIdx && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--iel-accent)' }}>اليوم</span>}
              </div>
              {d.tasks.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.tasks.map((t, i) => (
                    <div key={i} onClick={() => go(TASK_META[t.task_type]?.route)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', flex: 'none' }}>{TASK_META[t.task_type]?.tag || t.task_type}</span>
                      <span style={{ fontSize: 12, color: 'var(--iel-ink-2)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description_ar}</span>
                    </div>
                  ))}
                </div>
              ) : <span style={{ fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 600 }}>راحة</span>}
            </Card>
          ))}
        </div>
      </div>

      {/* How your coach helps — the framing */}
      <div style={{ marginTop: 4 }}>
        <CoachHelps />
      </div>

      <GoalModal open={showGoal} onClose={() => setShowGoal(false)} studentId={studentId} initial={planRow} />
    </div>
  )
}
