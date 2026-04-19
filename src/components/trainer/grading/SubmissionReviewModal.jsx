import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Star, RotateCcw, Mic, PenLine, Zap } from 'lucide-react'
import { useApproveSubmission } from '@/hooks/trainer/useApproveSubmission'
import { useRequestRedo } from '@/hooks/trainer/useRequestRedo'
import './SubmissionReviewModal.css'

function XPBurst({ show }) {
  if (!show) return null
  return (
    <motion.div
      className="srm-xp-burst"
      initial={{ opacity: 0, scale: 0.6, y: 0 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.2, 1, 0.8], y: [0, -40, -60, -80] }}
      transition={{ duration: 1.2, times: [0, 0.2, 0.7, 1] }}
    >
      <Zap size={14} /> +XP
    </motion.div>
  )
}

function RedoSheet({ onSubmit, onCancel }) {
  const [note, setNote] = useState('')
  return (
    <div className="srm-redo-sheet">
      <p className="srm-redo-sheet__label">سبب الإعادة (اختياري)</p>
      <textarea
        className="srm-redo-sheet__textarea"
        rows={3}
        placeholder="مثال: الإجابة قصيرة جداً، يرجى التوسع..."
        value={note}
        onChange={e => setNote(e.target.value)}
        dir="rtl"
      />
      <div className="srm-redo-sheet__actions">
        <button className="srm-btn srm-btn--ghost" onClick={onCancel}>إلغاء</button>
        <button className="srm-btn srm-btn--danger" onClick={() => onSubmit(note)}>
          <RotateCcw size={14} /> طلب الإعادة
        </button>
      </div>
    </div>
  )
}

function ScoreSlider({ value, onChange }) {
  return (
    <div className="srm-score">
      <div className="srm-score__label">
        <span>التقييم النهائي</span>
        <span className="srm-score__val">{value}<span className="srm-score__denom">/10</span></span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="srm-score__slider"
      />
      <div className="srm-score__ticks">
        {[0, 2, 4, 6, 8, 10].map(n => (
          <span key={n} className="srm-score__tick">{n}</span>
        ))}
      </div>
    </div>
  )
}

export default function SubmissionReviewModal({ item, queue, onClose, onAdvance }) {
  const approve = useApproveSubmission()
  const redo = useRequestRedo()

  const [score, setScore] = useState(item.ai_score > 0 ? item.ai_score : 7)
  const [feedback, setFeedback] = useState('')
  const [showRedo, setShowRedo] = useState(false)
  const [showXP, setShowXP] = useState(false)

  // Reset on item change
  useEffect(() => {
    setScore(item.ai_score > 0 ? item.ai_score : 7)
    setFeedback('')
    setShowRedo(false)
    setShowXP(false)
  }, [item.submission_id])

  const currentIdx = queue.findIndex(q => q.submission_id === item.submission_id)
  const hasPrev = currentIdx > 0
  const hasNext = currentIdx < queue.length - 1

  const isWriting = item.submission_type === 'writing'
  const aiEval = item.ai_feedback_json || {}

  function getTranscript() {
    if (!isWriting) return aiEval.transcript || ''
    return aiEval.content || item.content_preview || ''
  }

  function getAIComment() {
    if (isWriting) return aiEval.overall_comment_ar || aiEval.overall_feedback || ''
    return aiEval.feedback_ar || ''
  }

  async function handleApprove() {
    try {
      await approve.mutateAsync({
        submissionType: item.submission_type,
        submissionId: item.submission_id,
        finalScore: score,
        trainerFeedback: feedback || null,
      })
      setShowXP(true)
      setTimeout(() => {
        const next = queue[currentIdx + 1] || queue[currentIdx - 1] || null
        onAdvance(next)
      }, 800)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRedo(note) {
    try {
      await redo.mutateAsync({
        submissionType: item.submission_type,
        submissionId: item.submission_id,
        redoNote: note,
      })
      const next = queue[currentIdx + 1] || queue[currentIdx - 1] || null
      onAdvance(next)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <motion.div
      className="srm-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="srm-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        dir="rtl"
      >
        {/* Header */}
        <div className="srm-header">
          <div className="srm-header__info">
            <div className="srm-header__type">
              {isWriting
                ? <><PenLine size={14} /> كتابة</>
                : <><Mic size={14} /> محادثة</>}
            </div>
            <div className="srm-header__name">{item.student_name}</div>
            <div className="srm-header__meta">{item.group_name} · {item.unit_title || 'وحدة غير محددة'}</div>
          </div>
          <div className="srm-header__actions">
            {/* Navigation */}
            <div className="srm-nav">
              <button
                className="srm-nav__btn"
                disabled={!hasPrev}
                onClick={() => onAdvance(queue[currentIdx - 1])}
                title="السابق"
              >
                <ChevronRight size={16} />
              </button>
              <span className="srm-nav__count">{currentIdx + 1}/{queue.length}</span>
              <button
                className="srm-nav__btn"
                disabled={!hasNext}
                onClick={() => onAdvance(queue[currentIdx + 1])}
                title="التالي"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            <button className="srm-close" onClick={onClose} title="إغلاق">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="srm-body">
          {/* AI Score pill */}
          {item.ai_score > 0 && (
            <div className="srm-ai-badge">
              <Star size={12} /> تقييم الذكاء الاصطناعي: {item.ai_score}/10
            </div>
          )}

          {/* Student content / transcript */}
          <section className="srm-section">
            <h4 className="srm-section__title">
              {isWriting ? 'إجابة الطالب' : 'النص المنطوق'}
            </h4>
            <div className="srm-content-box">
              {getTranscript() || <span className="srm-muted">لا يوجد محتوى</span>}
            </div>
          </section>

          {/* AI feedback */}
          {getAIComment() && (
            <section className="srm-section">
              <h4 className="srm-section__title">ملاحظات الذكاء الاصطناعي</h4>
              <div className="srm-ai-comment">{getAIComment()}</div>
            </section>
          )}

          {/* Score slider */}
          <section className="srm-section">
            <ScoreSlider value={score} onChange={setScore} />
          </section>

          {/* Trainer feedback */}
          <section className="srm-section">
            <h4 className="srm-section__title">ملاحظة للطالب (اختياري)</h4>
            <textarea
              className="srm-feedback-textarea"
              rows={3}
              placeholder="اكتب ملاحظة تشجيعية أو تصحيحية..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              dir="rtl"
            />
          </section>

          {/* Redo sheet */}
          {showRedo && (
            <RedoSheet
              onSubmit={handleRedo}
              onCancel={() => setShowRedo(false)}
            />
          )}
        </div>

        {/* Footer actions */}
        {!showRedo && (
          <div className="srm-footer">
            <button
              className="srm-btn srm-btn--ghost"
              onClick={() => setShowRedo(true)}
              disabled={redo.isPending}
            >
              <RotateCcw size={14} /> إعادة
            </button>
            <button
              className="srm-btn srm-btn--primary"
              onClick={handleApprove}
              disabled={approve.isPending}
            >
              {approve.isPending ? 'جاري الحفظ...' : 'تأكيد التقييم'}
            </button>
          </div>
        )}

        <XPBurst show={showXP} />
      </motion.div>
    </motion.div>
  )
}
