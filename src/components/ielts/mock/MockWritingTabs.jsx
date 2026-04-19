import { useState, useEffect, useRef, useCallback } from 'react'
import { GlassPanel } from '@/design-system/components'
import AutoSaveIndicator from '@/components/ielts/diagnostic/AutoSaveIndicator'
import MockSectionTimer from './MockSectionTimer'
import { useAutoSaveMockAttempt, useAdvanceMockSection } from '@/hooks/ielts/useMockCenter'

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

const TASK_LIMITS = { task1: 150, task2: 250 }

export default function MockWritingTabs({ attempt, content, onAdvance }) {
  const writingTasks = content?.writing || []
  const task1 = writingTasks.find(t => t.task_type === 'task1') || null
  const task2 = writingTasks.find(t => t.task_type === 'task2') || null

  const [activeTab, setActiveTab] = useState('task1')
  const [text1, setText1] = useState(attempt?.writing_task1_submission || attempt?.answers?.writing?.task1 || '')
  const [text2, setText2] = useState(attempt?.writing_task2_submission || attempt?.answers?.writing?.task2 || '')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(attempt?.auto_saved_at || null)
  const saveTimer = useRef(null)

  const autoSave = useAutoSaveMockAttempt()
  const advance = useAdvanceMockSection()

  const save = useCallback(async (t1, t2) => {
    setIsSaving(true)
    try {
      await autoSave.mutateAsync({
        attemptId: attempt.id,
        patch: {
          writing_task1_submission: t1,
          writing_task2_submission: t2,
          answers: { ...attempt.answers, writing: { task1: t1, task2: t2 } },
        },
      })
      setLastSaved(new Date().toISOString())
    } finally {
      setIsSaving(false)
    }
  }, [attempt.id, attempt.answers, autoSave])

  // Auto-save every 15s
  useEffect(() => {
    const id = setInterval(() => save(text1, text2), 15000)
    return () => clearInterval(id)
  }, [text1, text2, save])

  const handleChange1 = (val) => {
    setText1(val)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(val, text2), 3000)
  }

  const handleChange2 = (val) => {
    setText2(val)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(text1, val), 3000)
  }

  const handleExpire = async () => {
    await save(text1, text2)
    await advance.mutateAsync({ attemptId: attempt.id, nextSection: 'speaking' })
    onAdvance?.()
  }

  const handleDone = async () => {
    await save(text1, text2)
    await advance.mutateAsync({ attemptId: attempt.id, nextSection: 'speaking' })
    onAdvance?.()
  }

  const w1 = countWords(text1)
  const w2 = countWords(text2)

  const TABS = [
    { key: 'task1', label: 'Task 1', task: task1, text: text1, onChange: handleChange1, min: 150, words: w1 },
    { key: 'task2', label: 'Task 2', task: task2, text: text2, onChange: handleChange2, min: 250, words: w2 },
  ]

  const active = TABS.find(t => t.key === activeTab)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 18px', borderRadius: 20, fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700,
                background: activeTab === tab.key ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
                color: activeTab === tab.key ? '#a78bfa' : 'var(--text-tertiary)',
                border: activeTab === tab.key ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
              }}
            >
              {tab.label}
              {tab.words >= tab.min && (
                <span style={{ marginLeft: 6, fontSize: 10, color: '#4ade80' }}>✓</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AutoSaveIndicator isSaving={isSaving} lastSavedAt={lastSaved} />
          <MockSectionTimer
            sectionStartedAt={attempt.section_started_at}
            totalSeconds={attempt.section_time_remaining?.writing || 60 * 60}
            onExpire={handleExpire}
          />
        </div>
      </div>

      {/* Task prompt */}
      {active?.task && (
        <GlassPanel style={{ padding: 18, marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', fontFamily: 'sans-serif', letterSpacing: '0.07em', marginBottom: 8 }}>
            IELTS WRITING — {active.key === 'task1' ? 'TASK 1' : 'TASK 2'}
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.7 }}>
            {active.task.prompt || active.task.title}
          </p>
          {active.task.word_count_target && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', direction: 'ltr', marginTop: 8 }}>
              Write at least {active.key === 'task1' ? '150' : '250'} words. Suggested: ~{active.task.word_count_target} words.
            </p>
          )}
        </GlassPanel>
      )}

      {/* Textarea */}
      <GlassPanel style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        <textarea
          value={active?.text || ''}
          onChange={e => active?.onChange(e.target.value)}
          placeholder={active?.key === 'task1' ? 'اكتب إجابة Task 1 هنا...' : 'اكتب إجابة Task 2 هنا...'}
          style={{
            width: '100%', minHeight: 320, padding: '16px 20px',
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontFamily: 'sans-serif', fontSize: 14,
            lineHeight: 1.8, direction: 'ltr', resize: 'vertical', boxSizing: 'border-box',
          }}
        />
      </GlassPanel>

      {/* Word count + submit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {TABS.map(tab => {
            const below = tab.words < tab.min
            return (
              <div key={tab.key} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{tab.label}:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: below ? '#fb923c' : '#4ade80', fontFamily: 'Tajawal' }}>
                  {tab.words}
                </span>
                {below && <span style={{ fontSize: 11, color: '#fb923c', fontFamily: 'Tajawal' }}>(أقل من {tab.min})</span>}
              </div>
            )
          })}
        </div>
        <button
          onClick={handleDone}
          style={{
            padding: '10px 24px', borderRadius: 12,
            background: 'rgba(167,139,250,0.15)', color: '#a78bfa',
            border: '1.5px solid rgba(167,139,250,0.3)',
            fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          انتهيت → المحادثة
        </button>
      </div>
    </div>
  )
}
