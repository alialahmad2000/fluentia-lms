// Mock/Diagnostic Reading segment — authentic IELTS exam UI: full-screen shell,
// split passage/questions, real per-type question controls, question palette.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getRemainingSeconds, SKILL_LIMITS } from '../useMockSession'
import { ExamShell, QuestionPalette } from '../../_ui/ExamShell'
import { ExamQuestion } from '../../_ui/ExamQuestions'

const LIMIT = SKILL_LIMITS.reading

function useIsWide(bp = 900) {
  const [w, setW] = useState(() => typeof window !== 'undefined' && window.innerWidth > bp)
  useEffect(() => {
    const on = () => setW(window.innerWidth > bp)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [bp])
  return w
}

function splitParagraphs(content) {
  return String(content || '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
}

export default function MockReading({ attemptId, answers, content, startedAt, onComplete }) {
  const [passages, setPassages] = useState([])
  const [tabIdx, setTabIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState(answers.answers || {})
  const [secsLeft, setSecsLeft] = useState(() => getRemainingSeconds(startedAt, LIMIT))
  const [submitting, setSubmitting] = useState(false)
  const [current, setCurrent] = useState(null)
  const [mobilePane, setMobilePane] = useState('passage') // passage | questions
  const isWide = useIsWide()
  const timerRef = useRef(null)
  const saveRef = useRef(null)
  const answersRef = useRef(userAnswers)
  const qScrollRef = useRef(null)
  useEffect(() => { answersRef.current = userAnswers }, [userAnswers])

  useEffect(() => {
    const ids = content.reading || []
    if (!ids.length) return
    supabase.from('ielts_reading_passages')
      .select('id, title, content, questions, answer_key, difficulty_band')
      .in('id', ids)
      .then(({ data }) => {
        const order = new Map(ids.map((id, i) => [id, i]))
        setPassages((data || []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)))
      })
  }, [content.reading])

  const handleSubmit = useCallback(() => {
    setSubmitting(true)
    clearInterval(timerRef.current); clearInterval(saveRef.current)
    const ua = answersRef.current
    let correct = 0, total = 0
    passages.forEach((p, pi) => {
      const qs = Array.isArray(p.questions) ? p.questions : []
      const key = Array.isArray(p.answer_key) ? p.answer_key : []
      qs.forEach((q) => {
        const expected = q.correct_answer ?? key.find((k) => k.question_number === q.question_number)?.correct_answer
        const given = ua[`${pi}_${q.question_number}`]
        total++
        if (expected != null && given != null && String(given).trim().toLowerCase() === String(expected).trim().toLowerCase()) correct++
      })
    })
    const scaled = total > 0 ? Math.round((correct / total) * 40) : 0
    const bandTable = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [0, 2.5]]
    const band = bandTable.find(([t]) => scaled >= t)?.[1] ?? 2.5
    onComplete({ answers: ua, correct, total, band, started_at: startedAt })
  }, [passages, onComplete, startedAt])

  // Timer
  useEffect(() => {
    if (secsLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => setSecsLeft((s) => { if (s <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passages.length])

  // Autosave every 5s
  useEffect(() => {
    if (!attemptId) return
    saveRef.current = setInterval(async () => {
      const { data: cur } = await supabase.from('ielts_mock_attempts').select('answers').eq('id', attemptId).single()
      const updated = { ...(cur?.answers || {}), reading: { ...(cur?.answers?.reading || {}), answers: answersRef.current } }
      await supabase.from('ielts_mock_attempts').update({ answers: updated }).eq('id', attemptId)
    }, 5000)
    return () => clearInterval(saveRef.current)
  }, [attemptId])

  function setAnswer(pi, qNum, val) {
    setUserAnswers((prev) => ({ ...prev, [`${pi}_${qNum}`]: val }))
    setCurrent(`${pi}_${qNum}`)
  }

  function jump(gi, n) {
    if (gi !== tabIdx) { setTabIdx(gi); setMobilePane('questions') }
    setCurrent(`${gi}_${n}`)
    setTimeout(() => {
      const el = (qScrollRef.current || document).querySelector(`[data-q="${n}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, gi !== tabIdx ? 120 : 0)
  }

  const p = passages[tabIdx]
  const paras = useMemo(() => splitParagraphs(p?.content), [p])
  const answered = useMemo(() => {
    const s = new Set()
    passages.forEach((pp, pi) => (Array.isArray(pp.questions) ? pp.questions : []).forEach((q) => {
      if (userAnswers[`${pi}_${q.question_number}`] != null && userAnswers[`${pi}_${q.question_number}`] !== '') s.add(`${pi}_${q.question_number}`)
    }))
    return s
  }, [passages, userAnswers])
  const groups = useMemo(() => passages.map((pp) => ({ label: `Passage ${passages.indexOf(pp) + 1}`, numbers: (Array.isArray(pp.questions) ? pp.questions : []).map((q) => q.question_number) })), [passages])

  const PassagePane = (
    <div style={{ padding: isWide ? '22px 26px' : '18px 18px', overflowY: 'auto', height: '100%', direction: 'ltr' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.06em', marginBottom: 4, direction: 'rtl', textAlign: 'right' }}>القطعة {tabIdx + 1}</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--iel-ink)', margin: '0 0 16px', fontFamily: "'Source Serif 4', Georgia, serif", textAlign: 'left' }}>{p?.title}</h2>
      {paras.map((para, i) => (
        <p key={i} style={{ display: 'flex', gap: 12, margin: '0 0 14px', fontSize: 15.5, color: 'var(--iel-ink)', fontFamily: "'Source Serif 4', Georgia, serif", lineHeight: 1.9, textAlign: 'left' }}>
          <span style={{ flex: 'none', fontWeight: 800, color: 'var(--iel-ink-3)', fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontSize: 13 }}>{String.fromCharCode(65 + i)}</span>
          <span>{para}</span>
        </p>
      ))}
    </div>
  )

  const QuestionsPane = (
    <div ref={qScrollRef} style={{ padding: isWide ? '22px 24px' : '18px 16px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {(Array.isArray(p?.questions) ? p.questions : []).map((q) => (
          <ExamQuestion key={q.question_number} q={q} value={userAnswers[`${tabIdx}_${q.question_number}`]} onChange={(v) => setAnswer(tabIdx, q.question_number, v)} paragraphLetters={paras.map((_, i) => String.fromCharCode(65 + i))} />
        ))}
      </div>
    </div>
  )

  return (
    <ExamShell sectionLabel="القراءة" partLabel={p ? `Reading Passage ${tabIdx + 1}` : ''} secsLeft={secsLeft} onSubmit={handleSubmit} submitting={submitting}
      footer={<QuestionPalette groups={groups} answered={answered} current={current} onJump={jump} />}>
      {!passages.length ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--iel-ink-3)', fontFamily: "'Tajawal', sans-serif" }}>جارٍ تحميل النصوص…</div>
      ) : isWide ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', minHeight: 0 }}>
          <div style={{ minHeight: 0, borderInlineStart: '1px solid var(--iel-border)', order: 2 }}>{PassagePane}</div>
          <div style={{ minHeight: 0, order: 1 }}>{QuestionsPane}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <div style={{ flex: 'none', display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--iel-border)' }}>
            {[['passage', 'النص'], ['questions', 'الأسئلة']].map(([k, l]) => (
              <button key={k} onClick={() => setMobilePane(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 700, border: `1.5px solid ${mobilePane === k ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: mobilePane === k ? 'var(--iel-accent-soft)' : 'transparent', color: mobilePane === k ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)' }}>{l}</button>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>{mobilePane === 'passage' ? PassagePane : QuestionsPane}</div>
        </div>
      )}
    </ExamShell>
  )
}
