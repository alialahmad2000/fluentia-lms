import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GlassPanel } from '@/design-system/components'
import DiagnosticTimer from '@/components/ielts/diagnostic/DiagnosticTimer'
import DiagnosticProgress from '@/components/ielts/diagnostic/DiagnosticProgress'
import AudioPlayer from '@/components/ielts/diagnostic/AudioPlayer'
import AutoSaveIndicator from '@/components/ielts/diagnostic/AutoSaveIndicator'
import { useAutoSaveAttempt, useAdvanceSection } from '@/hooks/ielts/useDiagnostic'
import DiagnosticError from './DiagnosticError'

function useDebouncedCallback(fn, delay) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

export default function DiagnosticListening({ attempt, content, onExpire, onAdvance }) {
  const sections = content?.listening || []
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [answers, setAnswers] = useState(attempt?.answers?.listening || {})
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(attempt?.auto_saved_at || null)
  const [audioPlayed, setAudioPlayed] = useState({})

  const autoSave = useAutoSaveAttempt()
  const advance = useAdvanceSection()

  if (!attempt) return <DiagnosticError message="لا يوجد اختبار نشط" />
  if (sections.length === 0) return <DiagnosticError message="لا يوجد محتوى للاستماع" />

  const save = useCallback(async (latestAnswers) => {
    setIsSaving(true)
    try {
      await autoSave.mutateAsync({
        attemptId: attempt.id,
        patch: { answers: { ...attempt.answers, listening: latestAnswers } },
      })
      setLastSaved(new Date().toISOString())
    } finally {
      setIsSaving(false)
    }
  }, [attempt.id, attempt.answers, autoSave])

  const debouncedSave = useDebouncedCallback(save, 2000)

  // Interval auto-save every 30s
  useEffect(() => {
    const id = setInterval(() => save(answers), 30000)
    return () => clearInterval(id)
  }, [answers, save])

  const handleAnswer = (qId, value) => {
    const updated = { ...answers, [qId]: value }
    setAnswers(updated)
    debouncedSave(updated)
  }

  const handleNext = async () => {
    await save(answers)
    if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx(i => i + 1)
    } else {
      await advance.mutateAsync({
        attemptId: attempt.id,
        nextSection: 'reading',
        patch: { answers: { ...attempt.answers, listening: answers } },
      })
      onAdvance?.()
    }
  }

  const currentSection = sections[currentSectionIdx]
  const qs = Array.isArray(currentSection?.questions) ? currentSection.questions : []

  return (
    <motion.div
      key={currentSectionIdx}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <DiagnosticProgress currentSection="listening" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AutoSaveIndicator isSaving={isSaving} lastSavedAt={lastSaved} />
          <DiagnosticTimer
            initialSeconds={attempt.section_time_remaining?.listening || 25 * 60}
            onExpire={onExpire || (() => {})}
          />
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 6 }}>
        الاستماع — قسم {currentSectionIdx + 1} من {sections.length}
      </h2>
      {currentSection?.title && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
          {currentSection.title}
        </p>
      )}

      {/* Audio player */}
      {currentSection?.audio_url && (
        <div style={{ marginBottom: 20 }}>
          <AudioPlayer
            src={currentSection.audio_url}
            onePlayOnly
            label="استمع للمقطع ثم أجب"
            onEnded={() => setAudioPlayed(p => ({ ...p, [currentSectionIdx]: true }))}
          />
        </div>
      )}

      {/* Questions */}
      <GlassPanel style={{ padding: 20, marginBottom: 20 }}>
        {qs.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontFamily: 'Tajawal', textAlign: 'center' }}>لا توجد أسئلة في هذا القسم</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {qs.map((q, i) => (
              <QuestionItem
                key={q.id || i}
                question={q}
                answer={answers[q.id || String(i)]}
                onChange={val => handleAnswer(q.id || String(i), val)}
              />
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12 }}>
        <button
          onClick={handleNext}
          disabled={advance.isPending}
          style={{
            padding: '12px 28px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, cursor: advance.isPending ? 'default' : 'pointer',
            background: 'rgba(56,189,248,0.2)', color: '#38bdf8',
            border: '1.5px solid rgba(56,189,248,0.4)',
          }}
        >
          {advance.isPending
            ? 'جاري الحفظ...'
            : currentSectionIdx < sections.length - 1
            ? `القسم التالي (${currentSectionIdx + 2}/${sections.length}) ←`
            : 'تم — المتابعة للقراءة ←'
          }
        </button>
      </div>
    </motion.div>
  )
}

function QuestionItem({ question, answer, onChange }) {
  const type = question.type || question.question_type || 'short_answer'
  const stem = question.question || question.stem || question.text || ''
  const options = question.options || question.choices || []

  if (type === 'multiple_choice' || options.length > 0) {
    return (
      <div>
        <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 10, lineHeight: 1.7 }}>{stem}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((opt, i) => {
            const val = typeof opt === 'object' ? opt.value || opt.label || String(i) : opt
            const lbl = typeof opt === 'object' ? opt.label || opt.value : opt
            const selected = answer === val
            return (
              <button
                key={i}
                onClick={() => onChange(val)}
                style={{
                  padding: '10px 14px', borderRadius: 10, textAlign: 'right', fontFamily: 'Tajawal', fontSize: 14, cursor: 'pointer',
                  background: selected ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                  color: selected ? '#38bdf8' : 'var(--text-secondary)',
                  border: selected ? '1.5px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {lbl}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 8, lineHeight: 1.7 }}>{stem}</p>
      <input
        value={answer || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="اكتب إجابتك..."
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, fontFamily: 'Tajawal', fontSize: 14,
          background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)',
          border: '1px solid rgba(255,255,255,0.12)', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
