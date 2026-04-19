import { useState } from 'react'
import { GlassPanel } from '@/design-system/components'
import { ChevronDown, ChevronUp } from 'lucide-react'

function bandColor(b) {
  if (!b) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

function MiniBar({ label, score }) {
  const pct = score != null ? (score / 9) * 100 : 0
  const color = bandColor(score)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>{label}</p>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'Tajawal' }}>
          {score != null ? score.toFixed(1) : '—'}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

const CRITERIA_MAP = {
  reading: [{ key: 'band', label: 'درجة القراءة' }],
  listening: [{ key: 'band', label: 'درجة الاستماع' }],
  writing: [
    { key: 'task_achievement', label: 'إنجاز المهمة' },
    { key: 'task_response', label: 'الاستجابة للمهمة' },
    { key: 'coherence_cohesion', label: 'التماسك والتنظيم' },
    { key: 'lexical_resource', label: 'الثروة اللغوية' },
    { key: 'grammatical_range', label: 'النطاق النحوي' },
  ],
  speaking: [
    { key: 'fluency_coherence', label: 'الطلاقة والتماسك' },
    { key: 'lexical_resource', label: 'الثروة اللغوية' },
    { key: 'grammatical_range', label: 'النطاق النحوي' },
    { key: 'pronunciation', label: 'النطق' },
  ],
}

const SKILL_ICONS = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎤' }
const SKILL_LABELS = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }

export default function MockResultCard({ skill, band, feedback, details }) {
  const [expanded, setExpanded] = useState(false)
  const bColor = bandColor(band)
  const criteria = CRITERIA_MAP[skill] || []
  const hasFeedback = feedback && (skill === 'writing' || skill === 'speaking')

  // Collect criteria scores
  const getCriteriaScore = (key) => {
    if (skill === 'writing') {
      const t1 = feedback?.task1?.criteria?.[key]
      const t2 = feedback?.task2?.criteria?.[key]
      const vals = [t1, t2].filter(v => v != null)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    if (skill === 'speaking') {
      const perPart = feedback?.per_part || {}
      const vals = Object.values(perPart).map((p) => p?.criteria?.[key]).filter(v => v != null)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    return null
  }

  return (
    <GlassPanel style={{ padding: 18, border: `1px solid ${bColor}22` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{SKILL_ICONS[skill]}</span>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
            {SKILL_LABELS[skill]}
          </p>
        </div>
        <span style={{ fontSize: 28, fontWeight: 900, color: bColor, fontFamily: 'Tajawal', lineHeight: 1 }}>
          {band != null ? Number(band).toFixed(1) : '—'}
        </span>
      </div>

      {(skill === 'writing' || skill === 'speaking') && criteria.filter(c => c.key !== 'band').length > 0 && (
        <div>
          {criteria.filter(c => c.key !== 'band').slice(0, 3).map(c => (
            <MiniBar key={c.key} label={c.label} score={getCriteriaScore(c.key)} />
          ))}
        </div>
      )}

      {hasFeedback && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#38bdf8', fontFamily: 'Tajawal', fontSize: 12, cursor: 'pointer', fontWeight: 700, marginTop: 8 }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </button>
          {expanded && (
            <div style={{ marginTop: 12 }}>
              {skill === 'writing' && (
                <>
                  {feedback?.task1?.feedback_ar && (
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', fontFamily: 'Tajawal', marginBottom: 4 }}>Task 1</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>{feedback.task1.feedback_ar}</p>
                    </div>
                  )}
                  {feedback?.task2?.feedback_ar && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', fontFamily: 'Tajawal', marginBottom: 4 }}>Task 2</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>{feedback.task2.feedback_ar}</p>
                    </div>
                  )}
                </>
              )}
              {skill === 'speaking' && Object.entries(feedback?.per_part || {}).map(([part, data]) => (
                <div key={part} style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', fontFamily: 'Tajawal', marginBottom: 4 }}>
                    {part === 'part1' ? 'الجزء الأول' : part === 'part2' ? 'الجزء الثاني' : 'الجزء الثالث'}
                    {data?.band != null ? ` — Band ${Number(data.band).toFixed(1)}` : ''}
                  </p>
                  {data?.feedback_ar && <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>{data.feedback_ar}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </GlassPanel>
  )
}
