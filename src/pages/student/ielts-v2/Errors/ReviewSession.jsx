// IELTS V3 Phase 5a — Review Session (focused SM-2 review)
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react'
import { useStudentId } from '../_helpers/resolveStudentId'
import { useDueErrors, useMarkReviewed, useAddNote, SKILL_LABELS } from './useErrorBank'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

function useErrorById(errorId) {
  return useQuery({
    queryKey: ['v3-error-single', errorId],
    enabled: !!errorId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_error_bank')
        .select('*')
        .eq('id', errorId)
        .single()
      if (error) throw error
      return data
    },
  })
}

function ReviewCard({ item, onAction, onNote, totalRemaining }) {
  const [showNotes, setShowNotes] = useState(false)
  const [noteText, setNoteText] = useState(item.notes || '')
  const [saving, setSaving] = useState(false)
  const isRL = item.skill_type === 'reading' || item.skill_type === 'listening'

  async function handleSaveNote() {
    setSaving(true)
    try { await onNote({ id: item.id, notes: noteText }) } finally { setSaving(false) }
  }

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Skill badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>
          {SKILL_LABELS[item.skill_type]} · {item.question_type || ''}
        </span>
        {totalRemaining > 1 && (
          <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
            متبقي {totalRemaining}
          </span>
        )}
      </div>

      {/* Question */}
      <div style={{ padding: '20px 22px', borderRadius: 18, background: 'color-mix(in srgb, var(--sunset-base-mid) 40%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 18%, transparent)', backdropFilter: 'blur(8px)' }}>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text)', fontFamily: isRL ? "'IBM Plex Sans', sans-serif" : "'Tajawal', sans-serif", lineHeight: 1.8, direction: isRL ? 'ltr' : 'rtl', textAlign: isRL ? 'left' : 'right', whiteSpace: 'pre-line' }}>
          {item.question_text}
        </p>
      </div>

      {/* Answers (R/L) */}
      {isRL && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'color-mix(in srgb, #f87171 7%, transparent)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <XCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
            <div dir="ltr" style={{ textAlign: 'left' }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, color: '#f87171', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>إجابتك</p>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text)', fontFamily: "'IBM Plex Mono', monospace" }}>{item.student_answer || '—'}</p>
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'color-mix(in srgb, #4ade80 7%, transparent)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <CheckCircle size={16} color="#4ade80" style={{ flexShrink: 0 }} />
            <div dir="ltr" style={{ textAlign: 'left' }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, color: '#4ade80', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>الإجابة الصحيحة</p>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text)', fontFamily: "'IBM Plex Mono', monospace" }}>{item.correct_answer || '—'}</p>
            </div>
          </div>
          {item.explanation && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>الشرح</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7, textAlign: 'right' }}>{item.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <button onClick={() => setShowNotes(n => !n)} style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          {showNotes ? '▲ إخفاء الملاحظات' : '▼ أضفي ملاحظة'}
        </button>
        <AnimatePresence>
          {showNotes && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginTop: 8 }}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onBlur={handleSaveNote}
                placeholder="ملاحظاتي على هذا الخطأ..."
                dir="rtl"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 55%, transparent)', color: 'var(--ds-text)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", resize: 'vertical', minHeight: 80, outline: 'none', boxSizing: 'border-box' }}
              />
              {saving && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>جاري الحفظ…</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SM-2 action buttons */}
      <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
        {[
          { key: 'hard',     label: 'صعب', sub: 'راجع غداً',        color: '#f87171', bg: 'color-mix(in srgb, #f87171 10%, transparent)', border: 'rgba(248,113,113,0.3)' },
          { key: 'good',     label: 'فهمت', sub: 'راجع بعد أسبوع', color: 'var(--sunset-amber)', bg: 'color-mix(in srgb, var(--sunset-amber) 10%, transparent)', border: 'color-mix(in srgb, var(--sunset-amber) 30%, transparent)' },
          { key: 'mastered', label: 'أتقنته', sub: 'لا مراجعة',    color: '#4ade80', bg: 'color-mix(in srgb, #4ade80 10%, transparent)', border: 'rgba(74,222,128,0.3)' },
        ].map(btn => (
          <motion.button key={btn.key} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => onAction(item, btn.key)}
            style={{ flex: 1, padding: '14px 8px', borderRadius: 14, border: `1px solid ${btn.border}`, background: btn.bg, color: btn.color, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 900, fontFamily: "'Tajawal', sans-serif" }}>{btn.label}</span>
            <span style={{ fontSize: 10, fontFamily: "'Tajawal', sans-serif", opacity: 0.8 }}>{btn.sub}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

export default function ReviewSession() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const studentId     = useStudentId()
  const singleId      = params.get('id')

  const dueQ          = useDueErrors(studentId, 20)
  const singleQ       = useErrorById(singleId)
  const markMut       = useMarkReviewed()
  const noteMut       = useAddNote()

  // ── 1. useState ────────────────────────────────────────────────────────────
  const [queue, setQueue]     = useState(null)  // null = loading, [] = done
  const [idx, setIdx]         = useState(0)
  const [doneCount, setDoneCount] = useState(0)

  // ── 2. useEffect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (singleId) {
      if (singleQ.data) setQueue([singleQ.data])
    } else if (dueQ.data) {
      setQueue(dueQ.data.length > 0 ? dueQ.data : [])
    }
  }, [singleId, singleQ.data, dueQ.data])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAction = useCallback(async (item, difficulty) => {
    await markMut.mutateAsync({ id: item.id, studentId, difficulty })
    setDoneCount(c => c + 1)
    setQueue(prev => {
      const next = (prev || []).filter(e => e.id !== item.id)
      return next
    })
    setIdx(0)
  }, [markMut, studentId])

  const handleNote = useCallback(async ({ id, notes }) => {
    await noteMut.mutateAsync({ id, studentId, notes })
  }, [noteMut, studentId])

  // ── Guards (after all hooks) ───────────────────────────────────────────────
  const isLoading = queue === null || (singleId ? singleQ.isLoading : dueQ.isLoading)
  const current   = queue?.[idx] || null
  const remaining = queue?.length || 0

  if (isLoading) {
    return (
      <div dir="rtl" style={{ maxWidth: 600, margin: '60px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        جاري التحميل…
      </div>
    )
  }

  if (!current) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        dir="rtl" style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 48 }}>🎉</span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>
          {doneCount > 0 ? `أحسنت! راجعت ${doneCount} درس` : 'لا توجد دروس للمراجعة اليوم'}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
          {doneCount > 0 ? 'كل مراجعة تقربك خطوة من هدفك.' : 'أكملي جلسة ممارسة وتعالي مرة أخرى.'}
        </p>
        <button onClick={() => navigate('/student/ielts-v2/errors')}
          style={{ padding: '12px 28px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--sunset-orange) 35%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange) 14%, transparent)', color: 'var(--ds-text)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
          عودة لبنك الدروس
        </button>
      </motion.div>
    )
  }

  return (
    <div dir="rtl" style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0 20px', borderBottom: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', marginBottom: 24 }}>
        <button onClick={() => navigate('/student/ielts-v2/errors')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid color-mix(in srgb, var(--ds-border) 50%, transparent)', background: 'transparent', color: 'var(--ds-text-muted)', fontSize: 13, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
          <ChevronLeft size={13} /> البنك
        </button>
        <h2 style={{ margin: 0, flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>
          جلسة المراجعة
        </h2>
        <span style={{ fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {doneCount} ✓
        </span>
      </div>

      <AnimatePresence mode="wait">
        <ReviewCard key={current.id} item={current} onAction={handleAction} onNote={handleNote} totalRemaining={remaining} />
      </AnimatePresence>
    </div>
  )
}
