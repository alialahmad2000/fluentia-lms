// Diagnostic Session — an organized placement exam: a cohesive stepper, a clear
// per-section intro before each part, then the section itself (reusing the proven
// segment engines), then a real band + adaptive plan.
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import { useMockAttempt, saveSegmentResult } from './Mock/useMockSession'
import MockReading from './Mock/segments/MockReading'
import MockListening from './Mock/segments/MockListening'
import MockWriting from './Mock/segments/MockWriting'
import MockSpeaking from './Mock/segments/MockSpeaking'
import { Icon, PrimaryButton } from './_ui/primitives'

const BASE = '/student/ielts-atelier'
const DIAG_SKILLS = ['reading', 'listening', 'writing', 'speaking']
const SECTION = {
  reading:   { label: 'القراءة', time: '٢٠ دقيقة', notes: ['اقرأ النصّ ثم أجِب عن الأسئلة.', 'يمكنك التنقّل بين الأسئلة بحرّية.'] },
  listening: { label: 'الاستماع', time: '١٠ دقائق', notes: ['المقطع يُشغَّل مرّة واحدة فقط — كن مستعدّاً.', 'أجِب أثناء الاستماع.'] },
  writing:   { label: 'الكتابة', time: '٢٠ دقيقة', notes: ['اكتب ردّاً منظّماً على المهمّة.', 'يُقيَّم على المعايير الأربعة الرسمية.'] },
  speaking:  { label: 'المحادثة', time: '٥ دقائق', notes: ['سجّل إجابتك صوتياً بالميكروفون.', 'تحدّث بطبيعية — لا داعي للحفظ.'] },
}
const SEG = { reading: MockReading, listening: MockListening, writing: MockWriting, speaking: MockSpeaking }

function Stepper({ current, doneSet }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 22px', flexWrap: 'wrap' }}>
      {DIAG_SKILLS.map((s, i) => {
        const done = doneSet.has(s), active = s === current
        const color = done ? 'var(--iel-accent)' : active ? 'var(--iel-ink)' : 'var(--iel-ink-3)'
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 999,
              border: `1px solid ${done ? 'color-mix(in srgb, var(--iel-accent) 45%, var(--iel-border))' : active ? 'color-mix(in srgb, var(--iel-accent) 35%, var(--iel-border))' : 'var(--iel-border)'}`,
              background: active ? 'var(--iel-accent-soft)' : 'transparent', color,
            }}>
              <span style={{ display: 'flex' }}>{done ? <Icon.readiness size={15} /> : <span style={{ width: 18, textAlign: 'center', fontSize: 12, fontWeight: 800 }}>{i + 1}</span>}</span>
              <span style={{ fontSize: 12.5, fontWeight: active || done ? 700 : 600, fontFamily: "'Tajawal', sans-serif" }}>{SECTION[s].label}</span>
            </div>
            {i < DIAG_SKILLS.length - 1 && <span style={{ color: 'var(--iel-ink-3)', opacity: .5 }}>—</span>}
          </div>
        )
      })}
    </div>
  )
}

function Finalizing() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: 20, textAlign: 'center' }}>
      <div style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid var(--iel-border)', borderTopColor: 'var(--iel-accent)', animation: 'iel-spin .8s linear infinite' }} />
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--iel-ink)' }}>نحسب نتيجتك بدقّة…</p>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--iel-ink-3)', lineHeight: 1.8 }}>نقرأ إجاباتك ونرسم خارطتك — لحظات.</p>
      </div>
    </div>
  )
}

export default function DiagnosticSession() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const attemptQ = useMockAttempt(attemptId)

  const [currentSkill, setCurrentSkill] = useState(null)
  const [phase, setPhase] = useState('intro') // intro | active
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
      const { error: fnErr } = await invokeWithRetry('complete-ielts-diagnostic', { body: { attempt_id: attemptId } }, { timeoutMs: 120000, retries: 1 })
      if (fnErr) throw new Error(fnErr)
      navigate(`${BASE}/diagnostic/results`, { replace: true })
    } catch (e) {
      setError(e.message || 'تعذّر احتساب النتيجة')
      setFinalizing(false)
      finalizeGuard.current = false
    }
  }, [attemptId, navigate])

  useEffect(() => {
    if (!attempt || currentSkill || finalizing) return
    const pending = DIAG_SKILLS.find((s) => !answers[s]?.done)
    if (!pending) { finalize(); return }
    setCurrentSkill(pending)
    setPhase('intro')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const handleSegmentComplete = useCallback(async (skill, result) => {
    if (!attemptId) return
    setTransitioning(true)
    try {
      await saveSegmentResult(attemptId, skill, result)
      const next = DIAG_SKILLS[DIAG_SKILLS.indexOf(skill) + 1]
      if (next) { setCurrentSkill(next); setPhase('intro'); await attemptQ.refetch() }
      else { setCurrentSkill(null); await finalize() }
    } finally {
      setTransitioning(false)
    }
  }, [attemptId, attemptQ, finalize])

  if (finalizing) return <Finalizing />

  if (error) {
    return (
      <div style={{ maxWidth: 440, margin: '70px auto', textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--iel-ink)', margin: '0 0 8px' }}>تعذّر احتساب نتيجتك</p>
        <p style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', margin: '0 0 20px', lineHeight: 1.8 }}>إجاباتك محفوظة. جرّب مرة أخرى.</p>
        <PrimaryButton onClick={() => { setError(null); finalize() }}>إعادة المحاولة</PrimaryButton>
      </div>
    )
  }

  if (attemptQ.isLoading || !attempt || !currentSkill) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--iel-border)', borderTopColor: 'var(--iel-accent)', animation: 'iel-spin .7s linear infinite' }} />
      </div>
    )
  }

  const doneSet = new Set(DIAG_SKILLS.filter((s) => answers[s]?.done))
  const idx = DIAG_SKILLS.indexOf(currentSkill)
  const info = SECTION[currentSkill]
  const I = Icon[currentSkill]

  if (transitioning) {
    return (
      <div>
        <Stepper current={currentSkill} doneSet={doneSet} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid var(--iel-border)', borderTopColor: 'var(--iel-accent)', animation: 'iel-spin .8s linear infinite' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--iel-ink)', margin: 0 }}>أحسنت — القسم التالي</p>
        </div>
      </div>
    )
  }

  // Per-section intro
  if (phase === 'intro') {
    return (
      <div style={{ maxWidth: 640 }}>
        <Stepper current={currentSkill} doneSet={doneSet} />
        <div style={{ background: 'var(--iel-surface)', border: '1px solid var(--iel-border)', borderRadius: 18, boxShadow: 'var(--iel-shadow)', padding: '30px 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I size={22} /></span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--iel-ink-3)', letterSpacing: '.08em' }}>القسم {idx + 1} من {DIAG_SKILLS.length} · {info.time}</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--iel-ink)', margin: '2px 0 0' }}>{info.label}</h1>
            </div>
          </div>
          <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {info.notes.map((n, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14.5, color: 'var(--iel-ink-2)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--iel-accent)', flex: 'none', marginTop: 2, display: 'flex' }}><Icon.readiness size={16} /></span>{n}
              </li>
            ))}
          </ul>
          <PrimaryButton onClick={() => setPhase('active')} style={{ padding: '13px 26px', fontSize: 15.5 }}>ابدأ القسم <Icon.chevron size={17} sw={2.4} /></PrimaryButton>
        </div>
      </div>
    )
  }

  // Active section — reuse the segment engine
  const Segment = SEG[currentSkill]
  const segmentProps = {
    attemptId,
    answers: answers[currentSkill] || {},
    content: answers.content || {},
    startedAt: answers[currentSkill]?.started_at,
    onComplete: (result) => handleSegmentComplete(currentSkill, result),
  }
  return (
    <div>
      <Stepper current={currentSkill} doneSet={doneSet} />
      <Segment {...segmentProps} />
    </div>
  )
}
