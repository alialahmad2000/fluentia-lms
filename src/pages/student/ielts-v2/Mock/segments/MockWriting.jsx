// Mock Writing Segment — strict mode (Task1+Task2, 60-min timer, eval via invokeWithRetry)
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import { getRemainingSeconds, SKILL_LIMITS } from '../useMockSession'

const LIMIT = SKILL_LIMITS.writing
const RETRY_DELAYS = [2000, 4000, 8000, 16000, 32000]

function formatTime(s) { const v = Math.max(0, Math.floor(s)); return `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}` }
function countWords(t) { return t.trim().split(/\s+/).filter(Boolean).length }

async function evalWithRetry(taskType, text, onAttempt) {
  for (let i = 0; i < 5; i++) {
    onAttempt(i + 1)
    try {
      const { data, error } = await invokeWithRetry('evaluate-writing', { body: { text, task_type: taskType === 'task1' ? 'ielts_task1' : 'ielts_task2' } }, { timeoutMs: 90000, retries: 0 })
      if (error) throw new Error(error)
      if (!data?.feedback?.band_score) throw new Error('No band score')
      return { ok: true, feedback: data.feedback }
    } catch (e) {
      if (i < 4) await new Promise(r => setTimeout(r, RETRY_DELAYS[i]))
      else return { ok: false, error: e.message }
    }
  }
}

export default function MockWriting({ attemptId, answers, content, startedAt, onComplete }) {
  const [task1, setTask1] = useState(null)
  const [task2, setTask2] = useState(null)
  const [tab, setTab] = useState('task1')
  const [draft1, setDraft1] = useState(answers.task1_text || '')
  const [draft2, setDraft2] = useState(answers.task2_text || '')
  const [secsLeft, setSecsLeft] = useState(() => getRemainingSeconds(startedAt, LIMIT))
  const [evaluating, setEvaluating] = useState(false)
  const [evalAttempt, setEvalAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const timerRef   = useRef(null)
  const saveRef    = useRef(null)
  const draft1Ref  = useRef(draft1)
  const draft2Ref  = useRef(draft2)

  useEffect(() => { draft1Ref.current = draft1 }, [draft1])
  useEffect(() => { draft2Ref.current = draft2 }, [draft2])

  useEffect(() => {
    const ids = content.writing || {}
    if (ids.task1Id) {
      supabase.from('ielts_writing_tasks').select('id, task_type, title, prompt, image_url, word_count_target').eq('id', ids.task1Id).single()
        .then(({ data }) => setTask1(data))
    }
    if (ids.task2Id) {
      supabase.from('ielts_writing_tasks').select('id, task_type, title, prompt, word_count_target').eq('id', ids.task2Id).single()
        .then(({ data }) => setTask2(data))
    }
  }, [content.writing])

  // Timer
  useEffect(() => {
    if (secsLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => setSecsLeft(s => { if (s <= 1) { handleSubmit(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save
  const doSave = useCallback(async () => {
    if (!attemptId) return
    const { data: cur } = await supabase.from('ielts_mock_attempts').select('answers').eq('id', attemptId).single()
    const updated = { ...(cur?.answers || {}), writing: { ...(cur?.answers?.writing || {}), task1_text: draft1Ref.current, task2_text: draft2Ref.current } }
    await supabase.from('ielts_mock_attempts').update({ answers: updated }).eq('id', attemptId)
  }, [attemptId])

  useEffect(() => {
    saveRef.current = setInterval(doSave, 30000)
    return () => clearInterval(saveRef.current)
  }, [doSave])

  // Blur auto-save
  const handleBlur = () => doSave()

  // Visibility change auto-save
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'hidden') doSave() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [doSave])

  async function handleSubmit() {
    if (submitting || evaluating) return
    clearInterval(timerRef.current)
    clearInterval(saveRef.current)
    setEvaluating(true)
    setEvalAttempt(0)

    let t1fb = null, t2fb = null, band1 = null, band2 = null

    if (task1 && draft1.trim().length > 20) {
      const res1 = await evalWithRetry('task1', draft1, setEvalAttempt)
      if (res1?.ok) { t1fb = res1.feedback; band1 = res1.feedback.band_score }
    }
    if (task2 && draft2.trim().length > 20) {
      const res2 = await evalWithRetry('task2', draft2, setEvalAttempt)
      if (res2?.ok) { t2fb = res2.feedback; band2 = res2.feedback.band_score }
    }

    const bands = [band1, band2].filter(b => b != null)
    const band = bands.length ? Math.round((bands.reduce((a,b) => a+b) / bands.length) * 2) / 2 : null
    const queued = !band

    setEvaluating(false)
    setSubmitting(true)
    onComplete({ task1_text: draft1, task2_text: draft2, feedback: t1fb || t2fb || {}, band, band1, band2, queued, started_at: startedAt })
  }

  const wc1 = countWords(draft1), wc2 = countWords(draft2)
  const isUrgent = secsLeft < 600, isCritical = secsLeft < 120
  const currentTask = tab === 'task1' ? task1 : task2
  const currentDraft = tab === 'task1' ? draft1 : draft2
  const currentSet = tab === 'task1' ? setDraft1 : setDraft2
  const currentWc = tab === 'task1' ? wc1 : wc2
  const currentMin = currentTask?.word_count_target || (tab === 'task1' ? 150 : 250)

  if (evaluating) {
    return (
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--sunset-orange)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>جاري تقييم الكتابة…</p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{evalAttempt > 1 ? `المحاولة ${evalAttempt}/5` : '~٣٠ ثانية'}</p>
      </div>
    )
  }

  return (
    <div dir="rtl" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 16px', borderBottom: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>✍️ الكتابة</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: isCritical ? '#f87171' : isUrgent ? 'var(--sunset-amber)' : 'var(--ds-text)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatTime(secsLeft)}</span>
        <button onClick={handleSubmit} disabled={submitting} style={{ padding: '7px 18px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--sunset-orange) 35%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)', color: 'var(--ds-text)', fontSize: 13, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: submitting ? 'not-allowed' : 'pointer' }}>إرسال للتقييم</button>
      </div>

      {/* Task tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['task1', `المهمة الأولى (${wc1}/${150}+w)`], ['task2', `المهمة الثانية (${wc2}/${250}+w)`]].map(([k, label]) => (
          <button key={k} onClick={() => { doSave(); setTab(k) }} style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${tab === k ? 'var(--sunset-orange)' : 'color-mix(in srgb, var(--ds-border) 50%, transparent)'}`, background: tab === k ? 'color-mix(in srgb, var(--sunset-orange) 12%, transparent)' : 'transparent', color: tab === k ? 'var(--ds-text)' : 'var(--ds-text-muted)', fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: tab === k ? 700 : 500, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>

      {/* Two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? '1fr 1.2fr' : '1fr', gap: 20 }}>
        {/* Prompt */}
        <div style={{ padding: '18px 20px', borderRadius: 16, background: 'color-mix(in srgb, var(--sunset-base-mid) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 14%, transparent)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>{tab === 'task1' ? 'Task 1' : 'Task 2'} · {currentMin}+ words</span>
          {currentTask?.image_url && <img src={currentTask.image_url} alt="task" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 160 }} />}
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.8, textAlign: 'right', whiteSpace: 'pre-line' }}>{currentTask?.prompt || 'جاري التحميل…'}</p>
        </div>
        {/* Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea dir="ltr" value={currentDraft} onChange={e => currentSet(e.target.value)} onBlur={handleBlur} placeholder="Start writing here..."
            style={{ width: '100%', minHeight: '55vh', padding: '16px', borderRadius: 14, resize: 'vertical', border: `1px solid ${currentDraft.length > 10 ? 'color-mix(in srgb, var(--sunset-amber) 20%, transparent)' : 'color-mix(in srgb, var(--ds-border) 40%, transparent)'}`, background: 'color-mix(in srgb, var(--ds-surface) 55%, transparent)', color: 'var(--ds-text)', fontSize: 15, fontFamily: "'Georgia', serif", lineHeight: 1.8, outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>حفظ تلقائي كل ٣٠ ثانية</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: currentWc >= currentMin ? '#4ade80' : 'var(--ds-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{currentWc} / {currentMin}+</span>
          </div>
        </div>
      </div>
    </div>
  )
}
