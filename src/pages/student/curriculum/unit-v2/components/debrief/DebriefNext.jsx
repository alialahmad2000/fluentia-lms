import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function DebriefNext({ data, onClose }) {
  const navigate = useNavigate()
  const { stats, nextUnit } = data

  const handleCopy = () => {
    const text = nextUnit
      ? `أنهيتُ ${data.unit?.theme_ar || data.unit?.theme_en} وسأبدأ "${nextUnit.theme_ar || nextUnit.theme_en}" 🎯`
      : `أنهيتُ ${data.unit?.theme_ar || data.unit?.theme_en} بنجاح 🏆`
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  const handleNext = () => {
    if (nextUnit) navigate(`/student/unit/${nextUnit.id}`)
    onClose()
  }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, textAlign: 'center', color: 'rgba(248,250,252,0.95)' }}
      >
        ماذا بعد؟
      </motion.h2>

      {/* Social proof */}
      {stats?.fasterThanPct != null && stats.fasterThanPct > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            padding: '10px 18px', borderRadius: '12px',
            background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
            fontSize: '13px', color: 'rgba(248,250,252,0.8)', textAlign: 'center',
          }}
        >
          ⚡ أسرع من <strong style={{ color: '#38bdf8' }}>{stats.fasterThanPct}%</strong> من الطالبات في هذه الوحدة
        </motion.div>
      )}

      {/* Next unit card */}
      {nextUnit ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            width: '100%', borderRadius: '20px',
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.25)',
            padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(251,191,36,0.7)', textTransform: 'uppercase' }}>
            الوحدة التالية
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'rgba(248,250,252,0.95)' }}>
            {nextUnit.unit_number}. {nextUnit.theme_ar || nextUnit.theme_en}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            padding: '16px 20px', borderRadius: '16px',
            background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
            fontSize: '15px', color: 'rgba(248,250,252,0.8)', textAlign: 'center',
          }}
        >
          🎉 أتممتِ جميع وحدات هذا المستوى!
        </motion.div>
      )}

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}
      >
        {nextUnit && (
          <button
            onClick={handleNext}
            style={{
              padding: '14px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #f5c842, #f59e0b)',
              color: '#1a1200', fontWeight: 800, fontSize: '16px',
              cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
              boxShadow: '0 4px 20px rgba(251,191,36,0.35)',
            }}
          >
            ابدئي الوحدة التالية ←
          </button>
        )}

        <button
          onClick={handleCopy}
          style={{
            padding: '12px', borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(248,250,252,0.75)', fontWeight: 600, fontSize: '14px',
            cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
          }}
        >
          📋 مشاركة إنجازكِ
        </button>

        <button
          onClick={onClose}
          style={{
            padding: '12px', borderRadius: '14px', border: 'none',
            background: 'transparent',
            color: 'rgba(248,250,252,0.4)', fontWeight: 600, fontSize: '14px',
            cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
          }}
        >
          إغلاق
        </button>
      </motion.div>
    </div>
  )
}
