import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GlassPanel } from '@/design-system/components'
import DiagnosticTimer from '@/components/ielts/diagnostic/DiagnosticTimer'
import DiagnosticProgress from '@/components/ielts/diagnostic/DiagnosticProgress'
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

export default function DiagnosticReading({ attempt, content, onExpire, onAdvance }) {
  const passages = content?.passages || []
  const [passageIdx, setPassageIdx] = useState(0)
  const [answers, setAnswers] = useState(attempt?.answers?.reading || {})
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(attempt?.auto_saved_at || null)
  const [showPassage, setShowPassage] = useState(true)

  const autoSave = useAutoSaveAttempt()
  const advance = useAdvanceSection()

  if (!attempt) return <DiagnosticError message="لا يوجد اختبار نشط" />
  if (passages.length === 0) return <DiagnosticError message="لا يوجد محتوى للقراءة" />

  const save = useCallback(async (latestAnswers) => {
    setIsSaving(true)
    try {
      await autoSave.mutateAsync({
        attemptId: attempt.id,
        patch: { answers: { ...attempt.answers, reading: latestAnswers } },
      })
      setLastSaved(new Date().toISOString())
    } finally {
      setIsSaving(false)
    }
  }, [attempt.id, attempt.answers, autoSave])

  const debouncedSave = useDebouncedCallback(save, 2000)

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
    if (passageIdx < passages.length - 1) {
      setPassageIdx(i => i + 1)
      setShowPassage(true)
    } else {
      await advance.mutateAsync({
        attemptId: attempt.id,
        nextSection: 'writing',
        patch: { answers: { ...attempt.answers, reading: answers } },
      })
      onAdvance?.()
    }
  }

  const passage = passages[passageIdx]
  const qs = Array.isArray(passage?.questions) ? passage.questions : []

  return (
    <motion.div
      key={passageIdx}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <DiagnosticProgress currentSection="reading" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AutoSaveIndicator isSaving={isSaving} lastSavedAt={lastSaved} />
          <DiagnosticTimer
            initialSeconds={attempt.section_time_remaining?.reading || 35 * 60}
            onExpire={onExpire || (() => {})}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Passage panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Mobile toggle */}
          <button
            onClick={() => setShowPassage(p => !p)}
            className="lg:hidden"
            style={{ width: '100%', marginBottom: 10, padding: '8px 14px', borderRadius: 10, fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}
          >
            {showPassage ? 'أخفِ النص — اعرض الأسئلة' : 'اعرض النص ←'}
          </button>

          <GlassPanel
            style={{
              padding: 20,
              display: showPassage ? 'block' : 'none',
              maxHeight: '70vh', overflowY: 'auto',
            }}
            className="lg:block"
          >
            {passage?.title && (
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 12 }}>
                {passage.title}
              </h3>
            )}
            <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 2, direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
              {passage?.body || passage?.passage_text || passage?.content || ''}
            </p>
          </GlassPanel>
        </div>

        {/* Questions panel */}
        <div style={{ flex: 1, minWidth: 0, maxHeight: '70vh', overflowY: 'auto' }}>
          <GlassPanel style={{ padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 14 }}>
              نص {passageIdx + 1} / {passages.length} — {qs.length} سؤال
            </p>
            {qs.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontFamily: 'Tajawal', textAlign: 'center' }}>لا توجد أسئلة</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {qs.map((q, i) => (
                  <ReadingQuestion
                    key={q.id || i}
                    question={q}
                    index={i + 1}
                    answer={answers[q.id || String(i)]}
                    onChange={val => handleAnswer(q.id || String(i), val)}
                  />
                ))}
              </div>
            )}
          </GlassPanel>
        </div>
      </div>

      {/* Next button */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-start' }}>
        <button
          onClick={handleNext}
          disabled={advance.isPending}
          style={{
            padding: '12px 28px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15,
            cursor: advance.isPending ? 'default' : 'pointer',
            background: 'rgba(56,189,248,0.2)', color: '#38bdf8',
            border: '1.5px solid rgba(56,189,248,0.4)',
          }}
        >
          {advance.isPending
            ? 'جاري الحفظ...'
            : passageIdx < passages.length - 1
            ? `النص التالي (${passageIdx + 2}/${passages.length}) ←`
            : 'تم — المتابعة للكتابة ←'
          }
        </button>
      </div>
    </motion.div>
  )
}

function ReadingQuestion({ question, index, answer, onChange }) {
  const type = question.type || question.question_type || 'short_answer'
  const stem = question.question || question.stem || question.text || ''
  const options = question.options || question.choices || []

  const TFNGOptions = ['True', 'False', 'Not Given']
  const isTFNG = type === 'true_false_not_given' || stem.toLowerCase().includes('true / false')

  if (isTFNG) {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 4 }}>سؤال {index}</p>
        <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 1.7, marginBottom: 10, direction: 'ltr', textAlign: 'left' }}>{stem}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {TFNGOptions.map(opt => (
            <button key={opt} onClick={() => onChange(opt)} style={{
              padding: '8px 14px', borderRadius: 8, fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer',
              background: answer === opt ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
              color: answer === opt ? '#38bdf8' : 'var(--text-secondary)',
              border: answer === opt ? '1.5px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
            }}>{opt}</button>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'multiple_choice' || options.length > 0) {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 4 }}>سؤال {index}</p>
        <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 1.7, marginBottom: 10, direction: 'ltr', textAlign: 'left' }}>{stem}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((opt, i) => {
            const val = typeof opt === 'object' ? opt.value || String(i) : opt
            const lbl = typeof opt === 'object' ? opt.label || opt.value : opt
            return (
              <button key={i} onClick={() => onChange(val)} style={{
                padding: '9px 14px', borderRadius: 9, textAlign: 'left', fontFamily: 'sans-serif', fontSize: 13, cursor: 'pointer',
                background: answer === val ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
                color: answer === val ? '#38bdf8' : 'var(--text-secondary)',
                border: answer === val ? '1.5px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.08)',
              }}>{lbl}</button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 4 }}>سؤال {index}</p>
      <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 1.7, marginBottom: 8, direction: 'ltr', textAlign: 'left' }}>{stem}</p>
      <input value={answer || ''} onChange={e => onChange(e.target.value)} placeholder="Answer..." style={{
        width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
        background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)',
        border: '1px solid rgba(255,255,255,0.12)', outline: 'none', boxSizing: 'border-box', direction: 'ltr',
      }} />
    </div>
  )
}
