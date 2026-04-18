import { motion } from 'framer-motion'

const FALLBACK = 'أتممتِ كل أنشطة الوحدة — مهارات جديدة محفوظة في قاموسكِ ورصيدكِ.'

export default function DebriefOutcomes({ data }) {
  const outcomes = data?.unit?.outcomes || []

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, textAlign: 'center', color: 'rgba(248,250,252,0.95)' }}
      >
        أنتِ الآن قادرة على...
      </motion.h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {outcomes.length > 0 ? outcomes.map((outcome, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              background: 'rgba(74,222,128,0.06)',
              border: '1px solid rgba(74,222,128,0.15)',
              borderRadius: '14px',
              padding: '14px 16px',
            }}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 400, damping: 20 }}
              style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}
            >
              ✅
            </motion.span>
            <span style={{ fontSize: '15px', lineHeight: 1.6, color: 'rgba(248,250,252,0.85)', fontFamily: "'Tajawal', sans-serif" }}>
              {outcome}
            </span>
          </motion.div>
        )) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'rgba(74,222,128,0.06)',
              border: '1px solid rgba(74,222,128,0.15)',
              borderRadius: '14px',
              padding: '16px 18px',
            }}
          >
            <span style={{ fontSize: '20px' }}>✅</span>
            <span style={{ fontSize: '15px', lineHeight: 1.6, color: 'rgba(248,250,252,0.75)', fontFamily: "'Tajawal', sans-serif" }}>
              {FALLBACK}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
