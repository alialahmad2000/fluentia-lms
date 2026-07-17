// Mock/Diagnostic Listening segment — authentic IELTS exam UI: full-screen shell,
// play-once audio bar, real question controls (form/gap completion), palette.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getRemainingSeconds, SKILL_LIMITS } from '../useMockSession'
import { useG } from '@/i18n/gender'
import { ExamShell, QuestionPalette } from '../../_ui/ExamShell'
import { ExamQuestion, QuestionGroupInstruction } from '../../_ui/ExamQuestions'
import { questionKey, questionDisplayNumber } from '@/lib/ielts/grading'

const LIMIT = SKILL_LIMITS.listening
const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
function fmt(s) { const v = Math.max(0, Math.floor(s || 0)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` }

export default function MockListening({ attemptId, answers, content, startedAt, onComplete }) {
  const g = useG()
  const [sections, setSections] = useState([])
  const [sectionIdx, setSectionIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState(answers.answers || {})
  const [audioStarted, setAudioStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(0)
  const [secsLeft, setSecsLeft] = useState(() => getRemainingSeconds(startedAt, LIMIT))
  const [submitting, setSubmitting] = useState(false)
  const [current, setCurrent] = useState(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const answersRef = useRef(userAnswers)
  const qScrollRef = useRef(null)
  useEffect(() => { answersRef.current = userAnswers }, [userAnswers])

  useEffect(() => {
    const ids = content.listening || []
    if (!ids.length) return
    supabase.from('ielts_listening_sections')
      .select('id, section_number, title, audio_url, questions, answer_key')
      .in('id', ids).order('section_number')
      .then(({ data }) => setSections(data || []))
  }, [content.listening])

  // Highlight the first question as "current" on load so the palette shows state
  useEffect(() => {
    if (!sections.length || current) return
    const first = (Array.isArray(sections[0]?.questions) ? sections[0].questions : [])[0]
    if (first != null) setCurrent(`0_${questionDisplayNumber(first, 0)}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections])

  const handleSubmit = useCallback(() => {
    setSubmitting(true)
    clearInterval(timerRef.current)
    audioRef.current?.pause()
    const ua = answersRef.current
    let correct = 0, total = 0
    sections.forEach((section, si) => {
      const key = section.answer_key || {}
      const qs = Array.isArray(section.questions) ? section.questions : []
      qs.forEach((q, qi) => {
        const qk = questionKey(q, qi)
        const expected = q.correct_answer ?? q.correct ?? key[qk]
        const given = ua[`${si}_${qk}`]
        total++
        if (expected != null && given != null && String(given).trim().toLowerCase() === String(expected).trim().toLowerCase()) correct++
      })
    })
    const scaled = total > 0 ? Math.round((correct / total) * 40) : 0
    const bandTable = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [0, 2.5]]
    const band = bandTable.find(([t]) => scaled >= t)?.[1] ?? 2.5
    onComplete({ answers: ua, correct, total, band, started_at: startedAt })
  }, [sections, onComplete, startedAt])

  useEffect(() => {
    if (secsLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => setSecsLeft((s) => { if (s <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length])

  // Audio events
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onEnd = () => { setPlaying(false); if (sectionIdx < sections.length - 1) setTimeout(() => setSectionIdx((i) => i + 1), 400) }
    const onTime = () => { setPos(a.currentTime); setDur(a.duration || 0) }
    a.addEventListener('ended', onEnd); a.addEventListener('timeupdate', onTime)
    return () => { a.removeEventListener('ended', onEnd); a.removeEventListener('timeupdate', onTime) }
  }, [sectionIdx, sections.length])

  function start() { setAudioStarted(true); audioRef.current?.play().then(() => setPlaying(true)).catch(() => {}) }
  function setAnswer(si, qk, dispNum, val) { setUserAnswers((p) => ({ ...p, [`${si}_${qk}`]: val })); setCurrent(`${si}_${dispNum}`) }
  function jump(gi, n) {
    if (gi !== sectionIdx) setSectionIdx(gi)
    setCurrent(`${gi}_${n}`)
    setTimeout(() => { const el = (qScrollRef.current || document).querySelector(`[data-q="${n}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, gi !== sectionIdx ? 100 : 0)
  }

  const cs = sections[sectionIdx]
  const qs = Array.isArray(cs?.questions) ? cs.questions : []
  const sharedInstr = qs.find((q) => q.instruction)?.instruction || ''
  const answered = useMemo(() => {
    const s = new Set()
    sections.forEach((sec, si) => (Array.isArray(sec.questions) ? sec.questions : []).forEach((q, qi) => {
      const v = userAnswers[`${si}_${questionKey(q, qi)}`]; if (v != null && v !== '') s.add(`${si}_${questionDisplayNumber(q, qi)}`)
    }))
    return s
  }, [sections, userAnswers])
  const groups = useMemo(() => sections.map((sec, si) => ({ label: `Section ${sec.section_number ?? si + 1}`, numbers: (Array.isArray(sec.questions) ? sec.questions : []).map((q, qi) => questionDisplayNumber(q, qi)) })), [sections])
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0

  return (
    <ExamShell sectionLabel="الاستماع" partLabel={cs ? `Listening Section ${cs.section_number ?? sectionIdx + 1}` : ''} secsLeft={secsLeft} onSubmit={handleSubmit} submitting={submitting}
      footer={<QuestionPalette groups={groups} answered={answered} current={current} onJump={jump} />}>
      {!sections.length ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--iel-ink-3)', fontFamily: "'Tajawal', sans-serif" }}>جارٍ التحميل…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, maxWidth: 780, width: '100%', margin: '0 auto' }}>
          {/* Audio bar (play once) */}
          {cs?.audio_url && (
            <div style={{ flex: 'none', padding: '14px 18px', borderBottom: '1px solid var(--iel-border)' }}>
              <audio ref={audioRef} src={cs.audio_url} preload="metadata" />
              {!audioStarted ? (
                <button onClick={start} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 0, background: 'var(--iel-accent)', color: '#fff', fontSize: 15, fontWeight: 800, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13 }}>▶</span> {g('ابدأ الاستماع — يُشغَّل مرّة واحدة فقط', 'ابدئي الاستماع — يُشغَّل مرّة واحدة فقط')}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: playing ? 'var(--iel-accent)' : 'var(--iel-ink-3)', animation: playing ? 'iel-pulse 1.2s infinite' : 'none' }} />
                  <style>{`@keyframes iel-pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--iel-track)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--iel-accent)', transition: 'width .3s linear' }} />
                  </div>
                  <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--iel-ink-3)', flex: 'none' }}>{fmt(pos)} / {dur ? fmt(dur) : '—'}</span>
                </div>
              )}
            </div>
          )}
          {/* Questions */}
          <div ref={qScrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 18px 30px' }}>
            {cs?.title && <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 12px', fontFamily: SANS, direction: 'ltr', textAlign: 'left' }}>{cs.title}</h3>}
            {sharedInstr && <QuestionGroupInstruction>{sharedInstr}</QuestionGroupInstruction>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {qs.map((q, qi) => {
                const qk = questionKey(q, qi)
                const dn = questionDisplayNumber(q, qi)
                return (
                  <ExamQuestion key={qk} q={{ ...q, question_number: dn }} value={userAnswers[`${sectionIdx}_${qk}`]} onChange={(v) => setAnswer(sectionIdx, qk, dn, v)} showInstruction={q.instruction !== sharedInstr} />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </ExamShell>
  )
}
