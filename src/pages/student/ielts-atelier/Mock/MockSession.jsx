// IELTS V3 Phase 4 — Mock Session Orchestrator
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useMockAttempt, useUpdateAttempt, saveSegmentResult, SKILLS_ORDER, getRemainingSeconds } from './useMockSession'
import MockListening from './segments/MockListening'
import MockReading   from './segments/MockReading'
import MockWriting   from './segments/MockWriting'
import MockSpeaking  from './segments/MockSpeaking'

const SEGMENT_LABELS = {
  listening: '🎧 الاستماع',
  reading:   '📖 القراءة',
  writing:   '✍️ الكتابة',
  speaking:  '🎤 المحادثة',
}

function SegmentProgress({ skills, current }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', padding: '8px 0 16px' }}>
      {skills.map((s, i) => {
        const done = skills.indexOf(current) > i
        const active = s === current
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontFamily: "'Tajawal', sans-serif", fontWeight: active ? 700 : 500,
              background: done ? 'color-mix(in srgb, #4ade80 12%, transparent)' : active ? 'color-mix(in srgb, var(--sunset-orange) 16%, transparent)' : 'color-mix(in srgb, var(--ds-surface) 40%, transparent)',
              border: `1px solid ${done ? 'rgba(74,222,128,0.3)' : active ? 'color-mix(in srgb, var(--sunset-orange) 35%, transparent)' : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'}`,
              color: done ? '#4ade80' : active ? 'var(--ds-text)' : 'var(--ds-text-muted)',
            }}>
              {done ? '✓' : ''} {SEGMENT_LABELS[s]}
            </span>
            {i < skills.length - 1 && <span style={{ color: 'var(--ds-text-muted)', fontSize: 10 }}>›</span>}
          </div>
        )
      })}
    </div>
  )
}

export default function MockSession() {
  const { attemptId } = useParams()
  const navigate      = useNavigate()
  const attemptQ      = useMockAttempt(attemptId)
  const updateMut     = useUpdateAttempt()

  const [currentSkill, setCurrentSkill] = useState(null)
  const [transitioning, setTransitioning] = useState(false)

  const attempt = attemptQ.data
  const answers = attempt?.answers || {}
  const mode    = answers.mode
  const skills  = mode === 'single' ? [answers.single_skill] : SKILLS_ORDER

  // Determine current segment on mount and after updates
  useEffect(() => {
    if (!attempt || currentSkill) return
    // Find first skill not done
    const pending = skills.find(s => !answers[s]?.done)
    if (!pending) {
      // All done → go to results
      navigate(`/student/ielts-v2/mock/${attemptId}/results`, { replace: true })
      return
    }
    setCurrentSkill(pending)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const handleSegmentComplete = useCallback(async (skill, result) => {
    if (!attemptId) return
    setTransitioning(true)
    try {
      await saveSegmentResult(attemptId, skill, result)
      await attemptQ.refetch()
      const nextSkill = skills[skills.indexOf(skill) + 1]
      if (nextSkill) {
        // Mark next segment start time
        const { data: current } = await import('@/lib/supabase').then(m =>
          m.supabase.from('ielts_mock_attempts').select('answers').eq('id', attemptId).single()
        )
        const updatedAnswers = {
          ...(current?.answers || {}),
          [nextSkill]: { ...(current?.answers?.[nextSkill] || {}), started_at: new Date().toISOString() },
        }
        await import('@/lib/supabase').then(m =>
          m.supabase.from('ielts_mock_attempts').update({ answers: updatedAnswers }).eq('id', attemptId)
        )
        setCurrentSkill(nextSkill)
      } else {
        navigate(`/student/ielts-v2/mock/${attemptId}/results`, { replace: true })
      }
    } finally {
      setTransitioning(false)
    }
  }, [attemptId, skills, navigate, attemptQ])

  // Start current segment (write started_at if not set)
  useEffect(() => {
    if (!currentSkill || !attemptId || !answers[currentSkill]) return
    if (answers[currentSkill].started_at) return
    const mark = async () => {
      const { data: cur } = await import('@/lib/supabase').then(m =>
        m.supabase.from('ielts_mock_attempts').select('answers').eq('id', attemptId).single()
      )
      const updatedAnswers = {
        ...(cur?.answers || {}),
        [currentSkill]: { ...(cur?.answers?.[currentSkill] || {}), started_at: new Date().toISOString() },
      }
      await import('@/lib/supabase').then(m =>
        m.supabase.from('ielts_mock_attempts').update({ answers: updatedAnswers }).eq('id', attemptId)
      )
      await attemptQ.refetch()
    }
    mark()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSkill, attemptId])

  if (attemptQ.isLoading || !attempt || !currentSkill) {
    return (
      <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        جاري تحميل الاختبار…
      </div>
    )
  }

  const segmentAnswers  = answers[currentSkill] || {}
  const content         = answers.content || {}
  const startedAt       = segmentAnswers.started_at

  const segmentProps = {
    attemptId,
    answers: segmentAnswers,
    content,
    startedAt,
    onComplete: (result) => handleSegmentComplete(currentSkill, result),
  }

  return (
    <div dir="rtl" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <SegmentProgress skills={skills} current={currentSkill} />

      {transitioning ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          <Loader2 size={36} color="var(--sunset-orange)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-text)' }}>جاري الانتقال…</p>
        </motion.div>
      ) : (
        <>
          {currentSkill === 'listening' && <MockListening {...segmentProps} />}
          {currentSkill === 'reading'   && <MockReading   {...segmentProps} />}
          {currentSkill === 'writing'   && <MockWriting   {...segmentProps} />}
          {currentSkill === 'speaking'  && <MockSpeaking  {...segmentProps} />}
        </>
      )}
    </div>
  )
}
