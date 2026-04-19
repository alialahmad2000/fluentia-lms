import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassPanel } from '@/design-system/components'

const SKILL_AR = { reading: 'قراءة', listening: 'استماع', writing: 'كتابة', speaking: 'محادثة' }
const SKILL_COLOR = { reading: '#38bdf8', listening: '#a78bfa', writing: '#34d399', speaking: '#f472b6' }

export default function ErrorReviewCard({ error, cardIndex, totalCards, onCorrect, onWrong, isSubmitting }) {
  const [revealed, setReveal] = useState(false)
  const color = SKILL_COLOR[error.skill_type] || '#94a3b8'

  return (
    <motion.div
      key={error.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          {cardIndex + 1} / {totalCards}
        </span>
        <div style={{ height: 4, flex: 1, margin: '0 12px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((cardIndex + 1) / totalCards) * 100}%`, background: color, borderRadius: 4, transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ padding: '2px 8px', borderRadius: 8, background: color + '18' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'Tajawal' }}>{SKILL_AR[error.skill_type]}</span>
        </div>
      </div>

      <GlassPanel style={{ padding: 24, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 12, letterSpacing: '0.04em' }}>
          السؤال
        </p>
        <p style={{ fontSize: 15, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.7, marginBottom: 16 }}>
          {error.question_text || '–'}
        </p>

        {/* Student's previous answer */}
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 2 }}>إجابتك السابقة</p>
          <p style={{ fontSize: 13, color: '#ef4444', fontFamily: 'sans-serif', direction: 'ltr' }}>{error.student_answer || '–'}</p>
        </div>

        {!revealed ? (
          <button
            onClick={() => setReveal(true)}
            style={{ width: '100%', padding: '12px 20px', borderRadius: 12, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1.5px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            أظهر الإجابة الصحيحة
          </button>
        ) : (
          <AnimatePresence>
            <motion.div key="answer" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginBottom: 2 }}>الإجابة الصحيحة</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', fontFamily: 'sans-serif', direction: 'ltr' }}>{error.correct_answer || '–'}</p>
              </div>
              {error.explanation && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'sans-serif', direction: 'ltr', lineHeight: 1.6 }}>{error.explanation}</p>
                </div>
              )}
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'Tajawal', marginBottom: 12, textAlign: 'center' }}>
                هل أجبت صحيح هذه المرة؟
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onCorrect}
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1.5px solid rgba(74,222,128,0.35)', fontFamily: 'Tajawal', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                >
                  نعم، أتقنتها ✓
                </button>
                <button
                  onClick={onWrong}
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1.5px solid rgba(239,68,68,0.3)', fontFamily: 'Tajawal', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                >
                  لا، سأراجعها ✗
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </GlassPanel>
    </motion.div>
  )
}
