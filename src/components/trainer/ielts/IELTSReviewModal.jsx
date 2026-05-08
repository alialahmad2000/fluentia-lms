import { useState } from 'react'
import { X, Mic, PenLine } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGradeIELTSSubmission } from '@/hooks/trainer/useTrainerIELTSStudents'
import { toast } from '@/components/ui/FluentiaToast'
import { useTranslation } from 'react-i18next'

function BandSlider({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--ds-text-secondary, var(--text-secondary))', fontFamily: "'Tajawal', sans-serif" }}>
          {t('trainer.ielts.adjust_band', 'تعديل البند')}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))' }}>
          {value}
        </span>
      </div>
      <input
        type="range" min={0} max={9} step={0.5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
        {[0, 1.5, 3, 4.5, 6, 7.5, 9].map(n => <span key={n}>{n}</span>)}
      </div>
    </div>
  )
}

export default function IELTSReviewModal({ item, onClose }) {
  const { t } = useTranslation()
  const grade = useGradeIELTSSubmission()
  const [band, setBand] = useState(item.band_score ?? 6)
  const [feedback, setFeedback] = useState('')
  const [done, setDone] = useState(false)

  const aiCriteria = item.ai_feedback?.criteria || {}
  const aiFeedbackAr = item.ai_feedback?.feedback_ar || item.ai_feedback?.summary_ar || ''
  const isSpeaking = item.submission_type === 'speaking'

  async function handleApprove() {
    await grade.mutateAsync({ submissionId: item.id, band, feedback })
    setDone(true)
    toast({ type: 'success', title: t('trainer.ielts.approved_toast', 'تم اعتماد التقييم') })
    setTimeout(onClose, 800)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 16 }}
          style={{
            width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
            background: 'var(--ds-bg-elevated, var(--surface-base, #0b0f18))',
            border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
            borderRadius: 20, padding: 24,
          }}
          dir="rtl"
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {isSpeaking ? <Mic size={16} style={{ color: 'var(--ds-accent-violet, #8b5cf6)' }} /> : <PenLine size={16} style={{ color: 'var(--ds-accent-sky, #38bdf8)' }} />}
                <span style={{ fontSize: 13, color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontFamily: "'Tajawal', sans-serif" }}>
                  {isSpeaking ? `${t('common.speaking')} IELTS` : `${t('common.writing')} IELTS`}
                </span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary, var(--text-primary))', margin: 0, fontFamily: "'Tajawal', sans-serif" }}>
                {item.student_name}
              </h3>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-tertiary, var(--text-tertiary))', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {/* Submission content */}
          {item.text_content && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary, var(--text-tertiary))', marginBottom: 6, fontFamily: "'Tajawal', sans-serif" }}>
                {t('trainer.ielts.submission_text', 'نص التسليم')} — {item.word_count ?? '?'} {t('trainer.debrief.word_count_label')}
              </div>
              <div style={{
                padding: 14, borderRadius: 10, maxHeight: 200, overflowY: 'auto', fontSize: 13, lineHeight: 1.7,
                background: 'var(--ds-surface-1, rgba(255,255,255,0.03))',
                border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))',
                color: 'var(--ds-text-secondary, var(--text-secondary))',
                fontFamily: 'inherit',
              }}>
                {item.text_content}
              </div>
            </div>
          )}

          {item.audio_url && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary, var(--text-tertiary))', marginBottom: 6, fontFamily: "'Tajawal', sans-serif" }}>{t('trainer.ielts.audio_recording', 'التسجيل الصوتي')}</div>
              <audio controls src={item.audio_url} style={{ width: '100%' }} />
              {item.transcript && (
                <div style={{ marginTop: 8, padding: 10, borderRadius: 8, fontSize: 12, color: 'var(--ds-text-tertiary, var(--text-tertiary))', background: 'rgba(255,255,255,0.02)', fontFamily: 'inherit' }}>
                  {item.transcript}
                </div>
              )}
            </div>
          )}

          {/* AI evaluation */}
          <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)' }}>
            <div style={{ fontSize: 11, color: 'var(--ds-accent-sky, #38bdf8)', marginBottom: 8, fontFamily: "'Tajawal', sans-serif" }}>{t('trainer.grading.ai_evaluate')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))', marginBottom: 8 }}>
              {item.band_score ?? '—'}
            </div>
            {Object.keys(aiCriteria).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {Object.entries(aiCriteria).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--ds-text-secondary, var(--text-secondary))' }}>
                    {k}: {v}
                  </span>
                ))}
              </div>
            )}
            {aiFeedbackAr && (
              <p style={{ fontSize: 12, color: 'var(--ds-text-secondary, var(--text-secondary))', margin: 0, lineHeight: 1.6, fontFamily: "'Tajawal', sans-serif" }}>
                {aiFeedbackAr}
              </p>
            )}
          </div>

          {/* Trainer adjustment */}
          <div style={{ marginBottom: 16 }}>
            <BandSlider value={band} onChange={setBand} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary, var(--text-tertiary))', marginBottom: 6, fontFamily: "'Tajawal', sans-serif" }}>{t('trainer.grading.trainer_note', 'ملاحظاتك للطالب (اختياري)')}</div>
            <textarea
              rows={3}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder={t('trainer.grading.feedback_placeholder', 'أضف ملاحظاتك هنا...')}
              dir="rtl"
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px', borderRadius: 10,
                background: 'var(--ds-surface-1, rgba(255,255,255,0.03))',
                border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
                color: 'var(--ds-text-primary, var(--text-primary))',
                fontFamily: "'Tajawal', sans-serif", fontSize: 13,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: 10, border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))',
              background: 'transparent', color: 'var(--ds-text-secondary, var(--text-secondary))',
              cursor: 'pointer', fontSize: 14, fontFamily: "'Tajawal', sans-serif",
            }}>
              {t('common.cancel')}
            </button>
            <button
              onClick={handleApprove}
              disabled={grade.isPending || done}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: done ? 'var(--ds-accent-emerald, #10b981)' : 'var(--ds-accent-primary, var(--accent-gold, #e9b949))',
                color: '#000', cursor: grade.isPending ? 'wait' : 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: "'Tajawal', sans-serif",
                opacity: grade.isPending ? 0.7 : 1,
              }}
            >
              {done ? `✓ ${t('common.saved')}` : grade.isPending ? '...' : t('trainer.ielts.approve_grade', 'اعتمد التقييم')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
