import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GlassPanel } from '@/design-system/components'
import DiagnosticTimer from '@/components/ielts/diagnostic/DiagnosticTimer'
import DiagnosticProgress from '@/components/ielts/diagnostic/DiagnosticProgress'
import AutoSaveIndicator from '@/components/ielts/diagnostic/AutoSaveIndicator'
import { useAutoSaveAttempt, useAdvanceSection } from '@/hooks/ielts/useDiagnostic'
import DiagnosticError from './DiagnosticError'

const MIN_WORDS = 250

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export default function DiagnosticWriting({ attempt, content }) {
  const writingTasks = content?.writing || []
  const task2 = writingTasks.find(t => t.task_type === 'task2' || t.task_type === 'ielts_task2') || writingTasks[writingTasks.length - 1]

  const [text, setText] = useState(attempt?.writing_task2_submission || attempt?.answers?.writing?.task2 || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(attempt?.auto_saved_at || null)

  const autoSave = useAutoSaveAttempt()
  const advance = useAdvanceSection()
  const saveTimer = useRef(null)

  if (!attempt) return <DiagnosticError message="لا يوجد اختبار نشط" />

  const save = useCallback(async (currentText) => {
    setIsSaving(true)
    try {
      await autoSave.mutateAsync({
        attemptId: attempt.id,
        patch: {
          writing_task2_submission: currentText,
          answers: { ...attempt.answers, writing: { task2: currentText } },
        },
      })
      setLastSaved(new Date().toISOString())
    } finally {
      setIsSaving(false)
    }
  }, [attempt.id, attempt.answers, autoSave])

  useEffect(() => {
    const id = setInterval(() => save(text), 10000)
    return () => clearInterval(id)
  }, [text, save])

  const handleChange = (val) => {
    setText(val)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(val), 2000)
  }

  const handleNext = async () => {
    await save(text)
    await advance.mutateAsync({
      attemptId: attempt.id,
      nextSection: 'speaking',
      patch: {
        writing_task2_submission: text,
        answers: { ...attempt.answers, writing: { task2: text } },
      },
    })
  }

  const wordCount = countWords(text)
  const isUnderTarget = wordCount < MIN_WORDS
  const wordColor = wordCount >= MIN_WORDS ? '#4ade80' : wordCount >= 200 ? '#fb923c' : 'var(--text-tertiary)'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <DiagnosticProgress currentSection="writing" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AutoSaveIndicator isSaving={isSaving} lastSavedAt={lastSaved} />
          <DiagnosticTimer
            initialSeconds={attempt.section_time_remaining?.writing || 25 * 60}
            onExpire={() => {}}
          />
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 16 }}>
        الكتابة — Task 2
      </h2>

      {/* Task prompt */}
      {task2 ? (
        <GlassPanel style={{ padding: 20, marginBottom: 16, border: '1px solid rgba(74,222,128,0.15)' }}>
          {task2.title && (
            <p style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal', marginBottom: 8 }}>
              {task2.title}
            </p>
          )}
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 2, direction: 'ltr', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
            {task2.prompt || task2.body || task2.content || ''}
          </p>
          {task2.word_count_target && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 10 }}>
              الحد الأدنى: {task2.word_count_target || MIN_WORDS} كلمة
            </p>
          )}
        </GlassPanel>
      ) : (
        <GlassPanel style={{ padding: 20, marginBottom: 16 }}>
          <p style={{ color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
            اكتب مقالاً تحليلياً يناقش الموضوع المطروح (Task 2). الحد الأدنى 250 كلمة.
          </p>
        </GlassPanel>
      )}

      {/* Text area */}
      <GlassPanel style={{ padding: 4, marginBottom: 12 }}>
        <textarea
          value={text}
          onChange={e => handleChange(e.target.value)}
          placeholder="Write your essay here..."
          style={{
            width: '100%', minHeight: 320, padding: '16px', borderRadius: 12,
            background: 'transparent', color: 'var(--text-primary)',
            border: 'none', outline: 'none', resize: 'vertical',
            fontSize: 15, lineHeight: 1.8, direction: 'ltr', textAlign: 'left',
            fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box',
          }}
        />
      </GlassPanel>

      {/* Word count + warnings */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: wordColor, fontFamily: 'Tajawal' }}>
            {wordCount} كلمة
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
            / {MIN_WORDS} كلمة هدف
          </span>
        </div>
        {isUnderTarget && wordCount > 0 && (
          <span style={{ fontSize: 12, color: '#fb923c', fontFamily: 'Tajawal' }}>
            ⚠️ أقل من الحد الأدنى ({MIN_WORDS - wordCount} كلمة متبقية)
          </span>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={advance.isPending}
        style={{
          width: '100%', padding: '14px 24px', borderRadius: 12, fontFamily: 'Tajawal', fontWeight: 700, fontSize: 16,
          cursor: advance.isPending ? 'default' : 'pointer',
          background: 'rgba(56,189,248,0.2)', color: '#38bdf8',
          border: '1.5px solid rgba(56,189,248,0.4)',
        }}
      >
        {advance.isPending ? 'جاري الحفظ...' : 'تم — المتابعة للمحادثة ←'}
      </button>
    </motion.div>
  )
}
