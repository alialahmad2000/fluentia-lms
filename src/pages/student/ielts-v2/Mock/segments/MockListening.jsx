// Mock Listening Segment — strict mode (no replay, no scrub, no speed)
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getRemainingSeconds, SKILL_LIMITS } from '../useMockSession'

const LIMIT = SKILL_LIMITS.listening

function formatTime(s) {
  const v = Math.max(0, Math.floor(s))
  return `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`
}

function countWords(text) { return text.trim().split(/\s+/).filter(Boolean).length }

function QuestionItem({ q, answer, onChange }) {
  const hasOptions = Array.isArray(q.options) && q.options.length > 0
  const isLetterMCQ = hasOptions && q.options.every(o => /^[A-Z]$/.test(String(o)))
  const text = q.text || q.question_text || q.statement || `سؤال ${q.number}`
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'color-mix(in srgb, var(--ds-surface) 55%, transparent)', border: `1px solid ${answer ? 'color-mix(in srgb, var(--sunset-orange) 25%, transparent)' : 'color-mix(in srgb, var(--ds-border) 45%, transparent)'}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: answer ? 'color-mix(in srgb, var(--sunset-orange) 16%, transparent)' : 'transparent', border: `1px solid ${answer ? 'var(--sunset-orange)' : 'var(--ds-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: answer ? 'var(--sunset-orange)' : 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{q.number}</span>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7 }}>{text}</p>
      </div>
      {isLetterMCQ ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {q.options.map(opt => (
            <button key={opt} onClick={() => onChange(q.number, opt)} style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${answer === opt ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 60%, transparent)'}`, background: answer === opt ? 'color-mix(in srgb, var(--sunset-orange) 16%, transparent)' : 'transparent', color: answer === opt ? 'var(--ds-text)' : 'var(--ds-text-muted)', fontSize: 12, fontWeight: 700, fontFamily: "'IBM Plex Sans', sans-serif", cursor: 'pointer' }}>{opt}</button>
          ))}
        </div>
      ) : hasOptions ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {q.options.map(opt => (
            <button key={opt} onClick={() => onChange(q.number, String(opt))} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${answer?.toLowerCase() === String(opt).toLowerCase() ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`, background: answer?.toLowerCase() === String(opt).toLowerCase() ? 'color-mix(in srgb, var(--sunset-orange) 12%, transparent)' : 'transparent', color: answer?.toLowerCase() === String(opt).toLowerCase() ? 'var(--ds-text)' : 'var(--ds-text-muted)', fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", cursor: 'pointer' }}>{opt}</button>
          ))}
        </div>
      ) : (
        <input type="text" value={answer || ''} onChange={e => onChange(q.number, e.target.value)} placeholder="..." dir="ltr" style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${answer ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`, background: 'color-mix(in srgb, var(--ds-surface) 60%, transparent)', color: 'var(--ds-text)', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", outline: 'none', boxSizing: 'border-box' }} />
      )}
    </div>
  )
}

export default function MockListening({ attemptId, answers, content, startedAt, onComplete }) {
  const [sections, setSections] = useState([])
  const [sectionIdx, setSectionIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState(answers.answers || {})
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioStarted, setAudioStarted] = useState(false)
  const [secsLeft, setSecsLeft] = useState(() => getRemainingSeconds(startedAt, LIMIT))
  const [submitting, setSubmitting] = useState(false)
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  // Load sections
  useEffect(() => {
    const ids = content.listening || []
    if (!ids.length) return
    supabase.from('ielts_listening_sections')
      .select('id, section_number, title, audio_url, questions')
      .in('id', ids)
      .order('section_number')
      .then(({ data }) => setSections(data || []))
  }, [content.listening])

  // Timer — server anchored
  useEffect(() => {
    if (secsLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => setSecsLeft(s => { if (s <= 1) { handleSubmit(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-advance section when audio ends
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => {
      setIsPlaying(false)
      if (sectionIdx < sections.length - 1) setSectionIdx(i => i + 1)
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [sectionIdx, sections.length])

  function handleStart() {
    setAudioStarted(true)
    audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {})
  }

  function handleAnswerChange(qNum, val) {
    setUserAnswers(prev => ({ ...prev, [`${sectionIdx}_${qNum}`]: val }))
  }

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    clearInterval(timerRef.current)
    if (audioRef.current) { audioRef.current.pause() }

    // Grade answers
    let correct = 0, total = 0
    for (const section of sections) {
      const key = section.answer_key || {}
      const qs = Array.isArray(section.questions) ? section.questions : []
      for (const q of qs) {
        const expected = key[String(q.number)] || key[q.number]
        const given = userAnswers[`${sections.indexOf(section)}_${q.number}`]
        total++
        if (expected && given && String(given).trim().toLowerCase() === String(expected).trim().toLowerCase()) correct++
      }
    }
    const scaled = total > 0 ? Math.round((correct / total) * 40) : 0
    const bandTable = [[39,9],[37,8.5],[35,8],[33,7.5],[30,7],[27,6.5],[23,6],[19,5.5],[15,5],[13,4.5],[10,4],[8,3.5],[6,3],[0,2.5]]
    const band = bandTable.find(([t]) => scaled >= t)?.[1] ?? 2.5

    onComplete({ answers: userAnswers, correct, total, band, started_at: startedAt })
  }

  const currentSection = sections[sectionIdx]
  const qs = currentSection?.questions || []
  const answeredCount = Object.keys(userAnswers).filter(k => k.startsWith(`${sectionIdx}_`)).length
  const isUrgent = secsLeft < 300; const isCritical = secsLeft < 60

  return (
    <div dir="rtl" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 16px', borderBottom: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>🎧 الاستماع</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: isCritical ? '#f87171' : isUrgent ? 'var(--sunset-amber)' : 'var(--ds-text)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatTime(secsLeft)}</span>
        <button onClick={handleSubmit} disabled={submitting} style={{ padding: '7px 18px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--sunset-orange) 35%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)', color: 'var(--ds-text)', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: submitting ? 'not-allowed' : 'pointer' }}>إنهاء القسم</button>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {sections.map((s, i) => (
          <span key={s.id} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: i === sectionIdx ? 700 : 500, background: i === sectionIdx ? 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)' : 'transparent', border: `1px solid ${i === sectionIdx ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 45%, transparent)'}`, color: i === sectionIdx ? 'var(--ds-text)' : 'var(--ds-text-muted)' }}>
            Section {s.section_number}
          </span>
        ))}
      </div>

      {/* Audio controls — strict mode: play once only */}
      {currentSection?.audio_url && (
        <div style={{ marginBottom: 16 }}>
          <audio ref={audioRef} src={currentSection.audio_url} preload="metadata" />
          {!audioStarted ? (
            <button onClick={handleStart} style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1px solid color-mix(in srgb, var(--sunset-orange) 35%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)', color: 'var(--ds-text)', fontSize: 16, fontWeight: 900, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
              ▶ ابدأ الاستماع (مرة واحدة — لا يمكن الإعادة)
            </button>
          ) : (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isPlaying ? '#f87171' : 'var(--ds-text-muted)', animation: isPlaying ? 'pulse 1s infinite' : 'none' }} />
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
              <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                {isPlaying ? 'يُشغَّل الآن — أجيبي على الأسئلة' : 'انتهى التشغيل'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {qs.map(q => (
          <QuestionItem key={q.number} q={q} answer={userAnswers[`${sectionIdx}_${q.number}`]} onChange={handleAnswerChange} />
        ))}
      </div>

      {sections.length > 1 && sectionIdx < sections.length - 1 && !isPlaying && audioStarted && (
        <button onClick={() => setSectionIdx(i => i + 1)} style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'transparent', color: 'var(--ds-text-muted)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
          القسم التالي ›
        </button>
      )}
    </div>
  )
}
