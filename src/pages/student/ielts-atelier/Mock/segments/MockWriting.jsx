// Mock/Diagnostic Writing segment — authentic IELTS exam UI: full-screen shell,
// split prompt/editor, live word count, Task 1/2. AI evaluation preserved.
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'
import { getRemainingSeconds, SKILL_LIMITS } from '../useMockSession'
import { ExamShell } from '../../_ui/ExamShell'

const LIMIT = SKILL_LIMITS.writing
const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const RETRY_DELAYS = [2000, 4000, 8000, 16000, 32000]
function countWords(t) { return String(t || '').trim().split(/\s+/).filter(Boolean).length }

function useIsWide(bp = 900) {
  const [w, setW] = useState(() => typeof window !== 'undefined' && window.innerWidth > bp)
  useEffect(() => { const on = () => setW(window.innerWidth > bp); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [bp])
  return w
}

async function evalWithRetry(taskType, text, onAttempt) {
  for (let i = 0; i < 5; i++) {
    onAttempt(i + 1)
    try {
      const { data, error } = await invokeWithRetry('evaluate-writing', { body: { text, task_type: taskType === 'task1' ? 'ielts_task1' : 'ielts_task2' } }, { timeoutMs: 90000, retries: 0 })
      if (error) throw new Error(error)
      if (!data?.feedback?.band_score) throw new Error('No band score')
      return { ok: true, feedback: data.feedback }
    } catch (e) {
      if (i < 4) await new Promise((r) => setTimeout(r, RETRY_DELAYS[i]))
      else return { ok: false, error: e.message }
    }
  }
}

export default function MockWriting({ attemptId, answers, content, startedAt, onComplete }) {
  const w = content.writing || {}
  const hasTask1 = !!w.task1Id, hasTask2 = !!w.task2Id
  const [task1, setTask1] = useState(null)
  const [task2, setTask2] = useState(null)
  const [tab, setTab] = useState(hasTask1 ? 'task1' : 'task2')
  const [draft1, setDraft1] = useState(answers.task1_text || '')
  const [draft2, setDraft2] = useState(answers.task2_text || '')
  const [secsLeft, setSecsLeft] = useState(() => getRemainingSeconds(startedAt, LIMIT))
  const [evaluating, setEvaluating] = useState(false)
  const [evalAttempt, setEvalAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [mobilePane, setMobilePane] = useState('prompt')
  const isWide = useIsWide()
  const timerRef = useRef(null), saveRef = useRef(null)
  const d1Ref = useRef(draft1), d2Ref = useRef(draft2)
  useEffect(() => { d1Ref.current = draft1 }, [draft1])
  useEffect(() => { d2Ref.current = draft2 }, [draft2])

  useEffect(() => {
    const ids = content.writing || {}
    if (ids.task1Id) supabase.from('ielts_writing_tasks').select('id, task_type, title, prompt, image_url, word_count_target').eq('id', ids.task1Id).single().then(({ data }) => setTask1(data))
    if (ids.task2Id) supabase.from('ielts_writing_tasks').select('id, task_type, title, prompt, word_count_target').eq('id', ids.task2Id).single().then(({ data }) => setTask2(data))
  }, [content.writing])

  const doSave = useCallback(async () => {
    if (!attemptId) return
    const { data: cur } = await supabase.from('ielts_mock_attempts').select('answers').eq('id', attemptId).single()
    const updated = { ...(cur?.answers || {}), writing: { ...(cur?.answers?.writing || {}), task1_text: d1Ref.current, task2_text: d2Ref.current } }
    await supabase.from('ielts_mock_attempts').update({ answers: updated }).eq('id', attemptId)
  }, [attemptId])

  const handleSubmit = useCallback(async () => {
    if (submitting || evaluating) return
    clearInterval(timerRef.current); clearInterval(saveRef.current)
    setEvaluating(true); setEvalAttempt(0)
    let t1fb = null, t2fb = null, band1 = null, band2 = null
    if (task1 && d1Ref.current.trim().length > 20) { const r = await evalWithRetry('task1', d1Ref.current, setEvalAttempt); if (r?.ok) { t1fb = r.feedback; band1 = r.feedback.band_score } }
    if (task2 && d2Ref.current.trim().length > 20) { const r = await evalWithRetry('task2', d2Ref.current, setEvalAttempt); if (r?.ok) { t2fb = r.feedback; band2 = r.feedback.band_score } }
    const bands = [band1, band2].filter((b) => b != null)
    const band = bands.length ? Math.round((bands.reduce((a, b) => a + b) / bands.length) * 2) / 2 : null
    setEvaluating(false); setSubmitting(true)
    onComplete({ task1_text: d1Ref.current, task2_text: d2Ref.current, feedback: t1fb || t2fb || {}, band, band1, band2, queued: !band, started_at: startedAt })
  }, [submitting, evaluating, task1, task2, onComplete, startedAt])

  useEffect(() => {
    if (secsLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => setSecsLeft((s) => { if (s <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0 } return s - 1 }), 1000)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    saveRef.current = setInterval(doSave, 30000)
    const vis = () => { if (document.visibilityState === 'hidden') doSave() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(saveRef.current); document.removeEventListener('visibilitychange', vis) }
  }, [doSave])

  const currentTask = tab === 'task1' ? task1 : task2
  const currentDraft = tab === 'task1' ? draft1 : draft2
  const setCurrentDraft = tab === 'task1' ? setDraft1 : setDraft2
  const wc = countWords(currentDraft)
  const minW = currentTask?.word_count_target || (tab === 'task1' ? 150 : 250)

  if (evaluating) {
    return (
      <div className="iel-root iel-exam-clinical" dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 130, background: 'var(--iel-ground)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid var(--iel-border)', borderTopColor: 'var(--iel-accent)', animation: 'iel-spin .8s linear infinite' }} />
        <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--iel-ink)', fontFamily: "'Tajawal', sans-serif" }}>جارٍ تقييم كتابتك…</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--iel-ink-3)', fontFamily: "'Tajawal', sans-serif" }}>{evalAttempt > 1 ? `المحاولة ${evalAttempt}/5` : 'قد يستغرق نحو ٣٠ ثانية'}</p>
      </div>
    )
  }

  const wcColor = wc >= minW ? 'var(--iel-good)' : 'var(--iel-ink-3)'
  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
      {hasTask1 && hasTask2 ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {[['task1', 'المهمة 1'], ['task2', 'المهمة 2']].map(([k, l]) => (
            <button key={k} onClick={() => { doSave(); setTab(k) }} style={{ padding: '7px 15px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 12.5, fontWeight: 700, border: `1.5px solid ${tab === k ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: tab === k ? 'var(--iel-accent-soft)' : 'transparent', color: tab === k ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)' }}>{l}</button>
          ))}
        </div>
      ) : <span style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 700 }}>{tab === 'task1' ? 'Task 1' : 'Task 2'}</span>}
      <span style={{ fontSize: 13, fontWeight: 800, color: wcColor, fontFamily: "'IBM Plex Mono', monospace" }}>{wc} / {minW}+ كلمة</span>
    </div>
  )

  const PromptPane = (
    <div style={{ padding: isWide ? '24px 28px' : '18px 18px', overflowY: 'auto', height: '100%', direction: 'ltr' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.05em', marginBottom: 10, fontFamily: SANS }}>{tab === 'task1' ? 'WRITING TASK 1' : 'WRITING TASK 2'} · {minW}+ words</div>
      {currentTask?.image_url ? (
        <img src={currentTask.image_url} alt="task" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 240, marginBottom: 16, background: 'var(--iel-surface-2)' }} />
      ) : tab === 'task1' ? (
        <div style={{ marginBottom: 16, padding: '11px 14px', borderRadius: 10, border: '1px dashed var(--iel-border-strong)', background: 'var(--iel-surface-2)', fontSize: 12.5, color: 'var(--iel-ink-3)', fontFamily: SANS, lineHeight: 1.6, direction: 'ltr', textAlign: 'left' }}>
          The visual data for this task is described in the prompt below.
        </div>
      ) : null}
      <p style={{ margin: 0, fontSize: 15.5, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.75, textAlign: 'left', whiteSpace: 'pre-line' }}>{currentTask?.prompt || 'Loading…'}</p>
    </div>
  )
  const EditorPane = (
    <div style={{ padding: isWide ? '20px 22px' : '16px 16px', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <textarea dir="ltr" value={currentDraft} onChange={(e) => setCurrentDraft(e.target.value)} onBlur={doSave} placeholder="Start writing your answer here…"
        style={{ flex: 1, width: '100%', minHeight: 0, padding: '16px 18px', borderRadius: 12, resize: 'none', boxSizing: 'border-box',
          border: `1px solid ${currentDraft.length > 10 ? 'color-mix(in srgb, var(--iel-accent) 30%, var(--iel-border))' : 'var(--iel-border)'}`,
          background: 'var(--iel-surface)', color: 'var(--iel-ink)', fontSize: 15.5, fontFamily: SANS, lineHeight: 1.7, outline: 'none' }} />
    </div>
  )

  return (
    <ExamShell sectionLabel="الكتابة" partLabel={`Writing ${tab === 'task1' ? 'Task 1' : 'Task 2'}`} secsLeft={secsLeft} onSubmit={handleSubmit} submitting={submitting} footer={footer}>
      {isWide ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', height: '100%', minHeight: 0 }}>
          <div style={{ minHeight: 0, borderInlineEnd: '1px solid var(--iel-border)' }}>{PromptPane}</div>
          <div style={{ minHeight: 0 }}>{EditorPane}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <div style={{ flex: 'none', display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--iel-border)' }}>
            {[['prompt', 'المهمة'], ['editor', 'الكتابة']].map(([k, l]) => (
              <button key={k} onClick={() => setMobilePane(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 700, border: `1.5px solid ${mobilePane === k ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: mobilePane === k ? 'var(--iel-accent-soft)' : 'transparent', color: mobilePane === k ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)' }}>{l}</button>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>{mobilePane === 'prompt' ? PromptPane : EditorPane}</div>
        </div>
      )}
    </ExamShell>
  )
}
