// IELTS V3 Phase 4 — Mock Results
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useMockAttempt } from './useMockSession'

const SKILL_CONFIG = {
  listening: { label: 'الاستماع', icon: '🎧' },
  reading:   { label: 'القراءة',  icon: '📖' },
  writing:   { label: 'الكتابة',  icon: '✍️' },
  speaking:  { label: 'المحادثة', icon: '🎤' },
}

function SkillCard({ skill, result }) {
  const cfg  = SKILL_CONFIG[skill]
  const band = result?.band
  const color = !band ? 'var(--ds-text-muted)'
    : band >= 7  ? '#4ade80'
    : band >= 5.5 ? 'var(--sunset-amber)'
    : '#f87171'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1, minWidth: 160, padding: '20px 18px', borderRadius: 18,
        background: 'color-mix(in srgb, var(--sunset-base-mid) 38%, transparent)',
        border: '1px solid color-mix(in srgb, var(--sunset-amber) 16%, transparent)',
        backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center',
      }}
    >
      <span style={{ fontSize: 24 }}>{cfg.icon}</span>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{cfg.label}</p>
      {result?.done ? (
        <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color, fontFamily: "'Playfair Display', serif" }}>
          {band != null ? Number(band).toFixed(1) : '—'}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>لم تُكمَل</p>
      )}
      {result?.queued && <p style={{ margin: 0, fontSize: 11, color: 'var(--sunset-amber)', fontFamily: "'Tajawal', sans-serif" }}>في طابور التقييم</p>}
    </motion.div>
  )
}

export default function MockResults() {
  const { attemptId } = useParams()
  const navigate      = useNavigate()
  const attemptQ      = useMockAttempt(attemptId)
  const attempt       = attemptQ.data
  const answers       = attempt?.answers || {}
  const mode          = answers.mode
  const skills        = mode === 'single' ? [answers.single_skill] : ['listening','reading','writing','speaking']

  if (attemptQ.isLoading) {
    return (
      <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        جاري تحميل النتائج…
      </div>
    )
  }

  if (!attempt) {
    return (
      <div dir="rtl" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center', color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
        لم يتم العثور على هذه المحاكاة.
      </div>
    )
  }

  const skillBands = skills.map(s => answers[s]?.band).filter(b => b != null).map(Number)
  const overallBand = skillBands.length
    ? Math.round((skillBands.reduce((a,b) => a+b) / skillBands.length) * 2) / 2
    : null

  const incomplete = attempt.status !== 'completed' && attempt.status !== 'evaluating'
  const anyQueued  = skills.some(s => answers[s]?.queued)

  return (
    <div dir="rtl" style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {incomplete && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: '16px 18px', borderRadius: 14, background: 'color-mix(in srgb, var(--sunset-amber) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 20%, transparent)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <AlertTriangle size={18} color="var(--sunset-amber)" />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>هذه المحاكاة لم تكتمل.</p>
        </motion.div>
      )}

      {anyQueued && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: '16px 18px', borderRadius: 14, background: 'color-mix(in srgb, var(--sunset-amber) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 20%, transparent)', display: 'flex', gap: 12 }}>
          <AlertTriangle size={18} color="var(--sunset-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.7 }}>بعض التقييمات في طابور المراجعة. ستُحدَّث النتيجة عند اكتمالها.</p>
        </motion.div>
      )}

      {/* Overall band */}
      {overallBand != null && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ padding: '40px 28px', borderRadius: 24, background: 'color-mix(in srgb, var(--sunset-base-mid) 48%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber) 22%, transparent)', backdropFilter: 'blur(10px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {mode === 'single' ? SKILL_CONFIG[answers.single_skill]?.label : 'Overall Mock Band'}
          </p>
          <BandDisplay band={overallBand} size="xl" animate />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
            {new Date(attempt.started_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>
      )}

      {/* Per-skill cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {skills.map(s => <SkillCard key={s} skill={s} result={answers[s]} />)}
      </div>

      {/* Writing feedback summary */}
      {answers.writing?.done && answers.writing?.feedback?.overall_feedback_ar && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ padding: '16px 18px', borderRadius: 16, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>الكتابة — ملاحظات عامة</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.8 }}>{answers.writing.feedback.overall_feedback_ar}</p>
        </motion.div>
      )}

      {/* Speaking feedback summary */}
      {answers.speaking?.done && answers.speaking?.feedback?.feedback_ar && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          style={{ padding: '16px 18px', borderRadius: 16, background: 'color-mix(in srgb, var(--ds-surface) 50%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--sunset-orange)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase' }}>المحادثة — ملاحظات عامة</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.8 }}>{answers.speaking.feedback.feedback_ar}</p>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => navigate('/student/ielts-v2/mock')}
          style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 55%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', color: 'var(--ds-text-muted)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
          محاكاة جديدة
        </button>
        <button onClick={() => navigate('/student/ielts-v2/errors')}
          style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--sunset-amber) 30%, transparent)', background: 'color-mix(in srgb, var(--sunset-amber) 8%, transparent)', color: 'var(--ds-text)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
          بنك الأخطاء
        </button>
      </motion.div>
    </div>
  )
}
