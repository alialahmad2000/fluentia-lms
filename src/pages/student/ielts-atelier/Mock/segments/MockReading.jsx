// Mock Reading Segment — strict mode (3 passages, 60-min global timer, free tab navigation)
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { gradeQuestions } from '@/lib/ielts/grading'
import { getRemainingSeconds, SKILL_LIMITS } from '../useMockSession'

const LIMIT = SKILL_LIMITS.reading

function formatTime(s) {
  const v = Math.max(0, Math.floor(s))
  return `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`
}

function parseOption(opt) {
  const m = String(opt).match(/^([A-Z]):\s*(.+)$/)
  return m ? { key: m[1], text: m[2] } : { key: opt, text: opt }
}

function QuestionBlock({ q, answer, onChange }) {
  const hasOptions = Array.isArray(q.options) && q.options.length > 0
  const hasLabel = Array.isArray(q.options) && q.options.some(o => /^[A-Z]:/.test(String(o)))
  const text = q.question_text || q.statement || `Question ${q.question_number}`
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: `1px solid ${answer ? 'color-mix(in srgb, var(--sunset-orange) 22%, transparent)' : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.6, direction: 'ltr', textAlign: 'left' }}>
        <strong>{q.question_number}.</strong> {text}
      </p>
      {hasOptions ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {q.options.map(opt => {
            const parsed = hasLabel ? parseOption(opt) : { key: opt, text: opt }
            const selected = answer === parsed.key
            return (
              <button key={parsed.key} onClick={() => onChange(q.question_number, parsed.key)}
                style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${selected ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`, background: selected ? 'color-mix(in srgb, var(--sunset-orange) 12%, transparent)' : 'transparent', color: selected ? 'var(--ds-text)' : 'var(--ds-text-muted)', fontSize: 12.5, fontFamily: "'IBM Plex Sans', sans-serif", cursor: 'pointer', textAlign: 'left', direction: 'ltr' }}>
                <strong>{parsed.key}</strong>{parsed.text !== parsed.key ? ` — ${parsed.text}` : ''}
              </button>
            )
          })}
        </div>
      ) : (
        <input type="text" value={answer || ''} onChange={e => onChange(q.question_number, e.target.value)} placeholder="Answer..." dir="ltr" style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${answer ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`, background: 'color-mix(in srgb, var(--ds-surface) 60%, transparent)', color: 'var(--ds-text)', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", outline: 'none', boxSizing: 'border-box' }} />
      )}
    </div>
  )
}

export default function MockReading({ attemptId, answers, content, startedAt, onComplete }) {
  const [passages, setPassages] = useState([])
  const [tabIdx, setTabIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState(answers.answers || {})
  const [secsLeft, setSecsLeft] = useState(() => getRemainingSeconds(startedAt, LIMIT))
  const [submitting, setSubmitting] = useState(false)
  const timerRef   = useRef(null)
  const saveRef    = useRef(null)

  useEffect(() => {
    const ids = content.reading || []
    if (!ids.length) return
    supabase.from('ielts_reading_passages')
      .select('id, title, passage_text, questions, answer_key, difficulty_band')
      .in('id', ids)
      .then(({ data }) => setPassages(data || []))
  }, [content.reading])

  // Timer
  useEffect(() => {
    if (secsLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => setSecsLeft(s => { if (s <= 1) { handleSubmit(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save every 5s
  useEffect(() => {
    saveRef.current = setInterval(async () => {
      if (!attemptId) return
      const { data: cur } = await import('@/lib/supabase').then(m => m.supabase.from('ielts_mock_attempts').select('answers').eq('id', attemptId).single())
      const updated = { ...(cur?.answers || {}), reading: { ...(cur?.answers?.reading || {}), answers: userAnswers } }
      await import('@/lib/supabase').then(m => m.supabase.from('ielts_mock_attempts').update({ answers: updated }).eq('id', attemptId))
    }, 5000)
    return () => clearInterval(saveRef.current)
  }, [attemptId, userAnswers])

  function handleAnswerChange(passageIdx, qNum, val) {
    setUserAnswers(prev => ({ ...prev, [`${passageIdx}_${qNum}`]: val }))
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    clearInterval(timerRef.current)
    clearInterval(saveRef.current)

    let correct = 0, total = 0
    for (let pi = 0; pi < passages.length; pi++) {
      const p = passages[pi]
      const qs = Array.isArray(p.questions) ? p.questions : []
      const key = Array.isArray(p.answer_key) ? p.answer_key : []
      for (const q of qs) {
        const expected = key.find(k => k.question_number === q.question_number)?.correct_answer
        const given    = userAnswers[`${pi}_${q.question_number}`]
        total++
        if (expected && given && String(given).trim().toLowerCase() === String(expected).trim().toLowerCase()) correct++
      }
    }
    const scaled = total > 0 ? Math.round((correct / total) * 40) : 0
    const bandTable = [[39,9],[37,8.5],[35,8],[33,7.5],[30,7],[27,6.5],[23,6],[19,5.5],[15,5],[13,4.5],[10,4],[8,3.5],[6,3],[0,2.5]]
    const band = bandTable.find(([t]) => scaled >= t)?.[1] ?? 2.5

    onComplete({ answers: userAnswers, correct, total, band, started_at: startedAt })
  }

  const p = passages[tabIdx]
  const qs = p ? (Array.isArray(p.questions) ? p.questions : []) : []
  const answeredInTab = qs.filter(q => userAnswers[`${tabIdx}_${q.question_number}`]).length
  const isUrgent = secsLeft < 600; const isCritical = secsLeft < 120

  return (
    <div dir="rtl" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 16px', borderBottom: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>📖 القراءة</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: isCritical ? '#f87171' : isUrgent ? 'var(--sunset-amber)' : 'var(--ds-text)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatTime(secsLeft)}</span>
        <button onClick={handleSubmit} disabled={submitting} style={{ padding: '7px 18px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--sunset-orange) 35%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)', color: 'var(--ds-text)', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: submitting ? 'not-allowed' : 'pointer' }}>إنهاء القسم</button>
      </div>

      {/* Passage tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {passages.map((pass, i) => {
          const pQs = Array.isArray(pass.questions) ? pass.questions : []
          const done = pQs.filter(q => userAnswers[`${i}_${q.question_number}`]).length
          const active = i === tabIdx
          return (
            <button key={pass.id} onClick={() => setTabIdx(i)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: active ? 700 : 500, border: `1px solid ${active ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`, background: active ? 'color-mix(in srgb, var(--sunset-orange) 12%, transparent)' : 'transparent', color: active ? 'var(--ds-text)' : 'var(--ds-text-muted)', cursor: 'pointer' }}>
              Passage {i + 1} ({done}/{pQs.length})
            </button>
          )
        })}
      </div>

      {p && (
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
          {/* Passage text */}
          <div style={{ padding: '18px 20px', borderRadius: 16, background: 'color-mix(in srgb, var(--sunset-base-mid) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 14%, transparent)', maxHeight: '70vh', overflowY: 'auto' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif" }}>Passage {tabIdx + 1}: {p.title}</p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text)', fontFamily: "'Georgia', serif", lineHeight: 1.9, whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left' }}>{p.passage_text}</p>
          </div>
          {/* Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {qs.map(q => (
              <QuestionBlock key={q.question_number} q={q} answer={userAnswers[`${tabIdx}_${q.question_number}`]} onChange={(qNum, val) => handleAnswerChange(tabIdx, qNum, val)} />
            ))}
          </div>
        </div>
      )}

      {!passages.length && (
        <div style={{ textAlign: 'center', color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", padding: '40px 0' }}>جاري تحميل النصوص…</div>
      )}
    </div>
  )
}
