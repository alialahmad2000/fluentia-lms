import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Save, Loader2, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  useWritingTask, useWritingDraft, useWritingQuota,
  useSaveDraft, useEvaluateSubmission, useUpdateWritingProgress,
} from '@/hooks/ielts/useWritingLab'

function useTimer(active) {
  const [elapsed, setElapsed] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (active) ref.current = setInterval(() => setElapsed(e => e + 1), 1000)
    else clearInterval(ref.current)
    return () => clearInterval(ref.current)
  }, [active])
  return elapsed
}

function WordCountBar({ wordCount, target }) {
  const pct = Math.min((wordCount / target) * 100, 100)
  const color = wordCount >= target ? '#4ade80' : wordCount >= target * 0.8 ? '#fb923c' : '#ef4444'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>عدد الكلمات</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'Tajawal' }}>
          {wordCount} / {target}+
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function QuotaExceededPanel({ quota, onBack }) {
  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
      <GlassPanel style={{ padding: 40 }}>
        <AlertTriangle size={32} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 8 }}>
          استهلكت حصتك الشهرية
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 20 }}>
          استخدمت {quota.used} من {quota.limit} تقييم هذا الشهر. ستتجدد الحصة في أول الشهر القادم.
        </p>
        <button onClick={onBack} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>
          العودة لمعمل الكتابة
        </button>
      </GlassPanel>
    </div>
  )
}

function PromptPanel({ task }) {
  const [collapsed, setCollapsed] = useState(false)
  const TIPS = [
    `اكتب ${task.word_count_target || 150}+ كلمة`,
    'خطّط لإجابتك قبل الكتابة (2-3 دقائق)',
    'راجع النحو والإملاء قبل التسليم',
    task.task_type === 'task2'
      ? 'قسّم المقال: مقدمة، فقرتا نقاش، خاتمة'
      : 'ابدأ بجملة تمهيدية تصف الرسم العام',
  ]

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <GlassPanel style={{ padding: 20, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 2 }}>
              {task.title}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#38bdf8', fontFamily: 'sans-serif' }}>
                {task.task_type === 'task1' ? 'Task 1' : 'Task 2'}
              </span>
              {task.test_variant && (
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif' }}>
                  {task.test_variant === 'general_training' ? 'General Training' : 'Academic'}
                </span>
              )}
              {task.difficulty_band && (
                <span style={{ fontSize: 11, color: '#a78bfa', fontFamily: 'sans-serif' }}>
                  Band {task.difficulty_band}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Tajawal', display: 'block', marginTop: 4 }}
          >
            {collapsed ? '▼ عرض' : '▲ طيّ'}
          </button>
        </div>
        {!collapsed && (
          <pre style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left', fontFamily: 'sans-serif', margin: 0 }}>
            {task.prompt}
          </pre>
        )}
      </GlassPanel>

      <GlassPanel style={{ padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 10 }}>نصائح</p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TIPS.map((tip, i) => (
            <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', display: 'flex', gap: 6 }}>
              <span style={{ color: '#38bdf8', flexShrink: 0 }}>•</span> {tip}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 10 }}>
          💡 نموذج إجابة Band 7 متاح بعد التسليم
        </p>
      </GlassPanel>
    </div>
  )
}

export default function WritingWorkspace() {
  const { category, taskId } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentData = useAuthStore(s => s.studentData)
  const studentId = profile?.id

  const taskQ = useWritingTask(taskId)
  const draftQ = useWritingDraft(studentId, taskId)
  const quotaQ = useWritingQuota(studentId, studentData)
  const saveMut = useSaveDraft()
  const evalMut = useEvaluateSubmission()
  const progressMut = useUpdateWritingProgress()

  const [text, setText] = useState('')
  const [draftId, setDraftId] = useState(null)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [aiError, setAiError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const startedAtRef = useRef(Date.now())
  const draftIdRef = useRef(null)

  // Initialize text from draft
  useEffect(() => {
    if (draftQ.data && !text) {
      setText(draftQ.data.text_content || '')
      setDraftId(draftQ.data.id)
      draftIdRef.current = draftQ.data.id
    }
  }, [draftQ.data])

  const elapsed = useTimer(!submitting)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  const debouncedText = useDebouncedValue(text, 2000)

  // Auto-save
  useEffect(() => {
    if (!studentId || !taskId || !debouncedText || !taskQ.data) return
    const task = taskQ.data
    saveMut.mutate({
      studentId, taskId,
      taskType: task.task_type,
      testVariant: task.test_variant || (category === 'task1-gt' ? 'general_training' : 'academic'),
      text: debouncedText,
      draftId: draftIdRef.current,
    }, {
      onSuccess: (data) => {
        if (!draftIdRef.current && data?.id) {
          draftIdRef.current = data.id
          setDraftId(data.id)
        }
        setLastSavedAt(new Date())
      },
    })
  }, [debouncedText])

  const hasAccess = useMemo(() => {
    if (!studentData) return false
    if (studentData.package === 'ielts') return true
    if (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts')) return true
    return false
  }, [studentData])

  if (!studentId) return null
  if (!hasAccess) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 16 }} dir="rtl">
        <GlassPanel style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: 'Tajawal', fontSize: 16, color: 'var(--text-primary)' }}>هذه الخدمة متاحة لباقة IELTS</p>
        </GlassPanel>
      </div>
    )
  }
  if (taskQ.isLoading || draftQ.isLoading) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }} dir="rtl">
        <div style={{ height: 48, background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 300, background: 'rgba(255,255,255,0.04)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    )
  }
  if (!taskQ.data) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: 16, textAlign: 'center' }} dir="rtl">
        <GlassPanel style={{ padding: 40 }}>
          <p style={{ fontFamily: 'Tajawal', fontSize: 15, color: 'var(--text-primary)', marginBottom: 16 }}>المهمة غير موجودة</p>
          <button onClick={() => navigate('/student/ielts/writing')} style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, cursor: 'pointer' }}>رجوع</button>
        </GlassPanel>
      </div>
    )
  }
  if (quotaQ.data?.remaining === 0) {
    return <QuotaExceededPanel quota={quotaQ.data} onBack={() => navigate('/student/ielts/writing')} />
  }

  const task = taskQ.data
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const minWords = task.word_count_target || 150
  const canSubmit = wordCount >= 50 && !submitting

  const handleSubmit = async () => {
    if (wordCount < minWords) {
      if (!window.confirm(`أنت كتبت ${wordCount} كلمة فقط (الحد الأدنى الموصى به ${minWords}). تريد المتابعة؟`)) return
    }

    setAiError('')
    setSubmitting(true)

    try {
      // Ensure draft saved before evaluating
      const saved = await saveMut.mutateAsync({
        studentId, taskId,
        taskType: task.task_type,
        testVariant: task.test_variant || (category === 'task1-gt' ? 'general_training' : 'academic'),
        text,
        draftId: draftIdRef.current,
      })
      const resolvedDraftId = saved?.id || draftIdRef.current
      if (!draftIdRef.current && saved?.id) draftIdRef.current = saved.id

      const result = await evalMut.mutateAsync({
        submissionId: resolvedDraftId,
        studentId, taskId,
        taskType: task.task_type,
        text,
      })

      const durationSec = Math.floor((Date.now() - startedAtRef.current) / 1000)
      await progressMut.mutateAsync({
        studentId,
        taskType: task.task_type,
        bandScore: Number(result.band_score),
        wordCount,
        durationSeconds: durationSec,
      })

      navigate(`/student/ielts/writing/feedback/${resolvedDraftId}`)
    } catch (e) {
      setAiError(e.message || 'حصلت مشكلة في التقييم — إجابتك محفوظة، أعد المحاولة')
      setSubmitting(false)
    }
  }

  const savingStatus = saveMut.isPending
    ? '💾 جاري الحفظ...'
    : lastSavedAt
      ? `✓ محفوظة`
      : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <button
          onClick={() => {
            if (text.length > 50 && !window.confirm('إجابتك محفوظة كمسودة — تريد الخروج؟')) return
            navigate(`/student/ielts/writing/${category}`)
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer' }}
        >
          <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          إنهاء الجلسة
        </button>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Save size={12} /> {savingStatus}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontVariantNumeric: 'tabular-nums' }}>
            ⏱ {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: 16, alignItems: 'start' }}>
        <PromptPanel task={task} />

        {/* Writing panel */}
        <div>
          <GlassPanel style={{ padding: 20, marginBottom: 12 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={submitting}
              placeholder={`ابدأ الكتابة هنا... (${minWords}+ كلمة مطلوبة)`}
              style={{
                width: '100%', minHeight: 340, padding: '12px 14px', borderRadius: 10,
                fontSize: 14, lineHeight: 1.8,
                background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)',
                border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'sans-serif', direction: 'ltr', textAlign: 'left',
              }}
            />
            <div style={{ marginTop: 12 }}>
              <WordCountBar wordCount={wordCount} target={minWords} />
            </div>
          </GlassPanel>

          {aiError && (
            <GlassPanel style={{ padding: 16, marginBottom: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
              <p style={{ fontSize: 13, color: '#ef4444', fontFamily: 'Tajawal', lineHeight: 1.6 }}>
                ⚠️ {aiError}
              </p>
            </GlassPanel>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 14,
              fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15,
              cursor: canSubmit ? 'pointer' : 'default',
              background: canSubmit ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
              color: canSubmit ? '#a78bfa' : 'var(--text-tertiary)',
              border: `1.5px solid ${canSubmit ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                جاري التقييم...
              </>
            ) : wordCount < 50 ? (
              'اكتب 50 كلمة على الأقل'
            ) : (
              'تسليم للتقييم ←'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
