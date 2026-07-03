// Diagnostic Session — runs the four lean segments in sequence, then finalizes
// into a real band per skill + adaptive plan (which lights up the whole Atelier).
// Reuses the proven mock segment engine; gentle "measurement" framing, not exam.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Headphones, PenLine, Mic, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import { useMockAttempt, saveSegmentResult } from './Mock/useMockSession'
import MockReading from './Mock/segments/MockReading'
import MockListening from './Mock/segments/MockListening'
import MockWriting from './Mock/segments/MockWriting'
import MockSpeaking from './Mock/segments/MockSpeaking'
import { useG } from '@/i18n/gender'

// Ease in with reading; keep IELTS-familiar order after.
const DIAG_SKILLS = ['reading', 'listening', 'writing', 'speaking']
const SKILL_META = {
  reading:   { icon: BookOpen,   label: 'القراءة' },
  listening: { icon: Headphones, label: 'الاستماع' },
  writing:   { icon: PenLine,    label: 'الكتابة' },
  speaking:  { icon: Mic,        label: 'المحادثة' },
}
const MONO = "'IBM Plex Mono', 'SF Mono', ui-monospace, Menlo, monospace"

function ProgressRibbon({ current, doneSet }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '10px 0 22px', flexWrap: 'wrap' }}>
      {DIAG_SKILLS.map((s, i) => {
        const { icon: Icon, label } = SKILL_META[s]
        const done = doneSet.has(s)
        const active = s === current
        const accent = 'var(--sunset-orange)'  // re-themed to signal-teal by the layout
        const color = done ? accent : active ? 'var(--ds-text)' : 'var(--ds-text-muted)'
        const bg = active ? 'color-mix(in srgb, var(--sunset-orange) 12%, transparent)' : 'transparent'
        const border = done
          ? `color-mix(in srgb, ${accent} 45%, transparent)`
          : active ? `color-mix(in srgb, ${accent} 35%, transparent)` : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 999, background: bg, border: `1px solid ${border}` }}>
              <span style={{ display: 'flex', color }}>{done ? <Check size={14} strokeWidth={2.5} /> : <Icon size={14} strokeWidth={2} />}</span>
              <span style={{ fontSize: 12.5, fontWeight: active || done ? 700 : 500, color, fontFamily: "'Tajawal', sans-serif" }}>{label}</span>
            </div>
            {i < DIAG_SKILLS.length - 1 && <span style={{ color: 'var(--ds-text-muted)', fontSize: 11, opacity: 0.5 }}>—</span>}
          </div>
        )
      })}
    </div>
  )
}

function Finalizing() {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: 22, textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 76, height: 76 }}>
        <motion.div
          animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--sunset-orange)', borderRightColor: 'color-mix(in srgb, var(--sunset-orange) 35%, transparent)' }}
        />
        <div style={{ position: 'absolute', inset: 16, borderRadius: '50%', border: '1px solid color-mix(in srgb, var(--sunset-orange) 25%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 13, color: 'var(--sunset-orange)', fontWeight: 700 }}>?.?</div>
      </div>
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>نحسب مستواك بدقّة…</p>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.8 }}>نقرأ إجاباتك ونرسم خارطتك — لحظات.</p>
      </div>
    </div>
  )
}

export default function DiagnosticSession() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const g = useG()
  const attemptQ = useMockAttempt(attemptId)

  const [currentSkill, setCurrentSkill] = useState(null)
  const [transitioning, setTransitioning] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [error, setError] = useState(null)
  const finalizeGuard = useRef(false)

  const attempt = attemptQ.data
  const answers = attempt?.answers || {}

  const finalize = useCallback(async () => {
    if (finalizeGuard.current) return
    finalizeGuard.current = true
    setFinalizing(true)
    try {
      const { error: fnErr } = await invokeWithRetry(
        'complete-ielts-diagnostic',
        { body: { attempt_id: attemptId } },
        { timeoutMs: 120000, retries: 1 },
      )
      if (fnErr) throw new Error(fnErr)
      navigate('/student/ielts-atelier/diagnostic/results', { replace: true })
    } catch (e) {
      setError(e.message || 'تعذّر احتساب النتيجة')
      setFinalizing(false)
      finalizeGuard.current = false
    }
  }, [attemptId, navigate])

  // Resolve the current segment once the attempt loads.
  useEffect(() => {
    if (!attempt || currentSkill || finalizing) return
    const pending = DIAG_SKILLS.find((s) => !answers[s]?.done)
    if (!pending) { finalize(); return }
    setCurrentSkill(pending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const handleSegmentComplete = useCallback(async (skill, result) => {
    if (!attemptId) return
    setTransitioning(true)
    try {
      await saveSegmentResult(attemptId, skill, result)
      const nextSkill = DIAG_SKILLS[DIAG_SKILLS.indexOf(skill) + 1]
      if (nextSkill) {
        setCurrentSkill(nextSkill)
        await attemptQ.refetch()
      } else {
        setCurrentSkill(null)
        await finalize()
      }
    } finally {
      setTransitioning(false)
    }
  }, [attemptId, attemptQ, finalize])

  if (finalizing) return <Finalizing />

  if (error) {
    return (
      <div dir="rtl" style={{ maxWidth: 460, margin: '80px auto', textAlign: 'center', padding: 24 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", margin: '0 0 8px' }}>تعذّر احتساب نتيجتك</p>
        <p style={{ fontSize: 13.5, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", margin: '0 0 20px', lineHeight: 1.8 }}>إجاباتك محفوظة. جرّبي مرة أخرى.</p>
        <button onClick={() => { setError(null); finalize() }} style={{ padding: '12px 28px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--sunset-orange) 45%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 16%, transparent)', color: 'var(--ds-text)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>إعادة المحاولة</button>
      </div>
    )
  }

  if (attemptQ.isLoading || !attempt || !currentSkill) {
    return (
      <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--sunset-orange)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        جاري تحميل التشخيص…
      </div>
    )
  }

  const content = answers.content || {}
  const segmentProps = {
    attemptId,
    answers: answers[currentSkill] || {},
    content,
    startedAt: answers[currentSkill]?.started_at,
    onComplete: (result) => handleSegmentComplete(currentSkill, result),
  }
  const doneSet = new Set(DIAG_SKILLS.filter((s) => answers[s]?.done))

  return (
    <div dir="rtl" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <ProgressRibbon current={currentSkill} doneSet={doneSet} />

      {transitioning ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '45vh', gap: 14, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--sunset-orange)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-text)', margin: 0 }}>{g('أحسنت — التالي', 'أحسنتِ — التالي')}</p>
        </motion.div>
      ) : (
        <>
          {currentSkill === 'reading'   && <MockReading   key="r" {...segmentProps} />}
          {currentSkill === 'listening' && <MockListening key="l" {...segmentProps} />}
          {currentSkill === 'writing'   && <MockWriting   key="w" {...segmentProps} />}
          {currentSkill === 'speaking'  && <MockSpeaking  key="s" {...segmentProps} />}
        </>
      )}
    </div>
  )
}
