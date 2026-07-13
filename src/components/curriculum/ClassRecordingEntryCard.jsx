import { motion } from 'framer-motion'
import { Play, Film, ChevronLeft } from 'lucide-react'
import { useUnitRecordings } from '../../hooks/useUnitRecordings'

// ── تسجيل الحصة — the RECORDED CLASS for this unit (NOT self-recording). ──
// When a live class is recorded, staff upload it here (Part A/B); students
// watch it. This is the entry card shown below the unit mission grid.
const PART_AR = { a: 'الجزء أ', b: 'الجزء ب' }

export default function ClassRecordingEntryCard({ unitId, onOpen }) {
  const { data: recordings = [], isLoading } = useUnitRecordings(unitId)
  const available = recordings.length > 0
  const parts = recordings.map((r) => PART_AR[r.part]).filter(Boolean)

  const subtitle = isLoading
    ? '...'
    : available
      ? (parts.length ? `${parts.join(' · ')} — التسجيل المصوّر لحصتك` : 'التسجيل المصوّر لحصة هذه الوحدة')
      : 'سيظهر هنا تسجيل الحصة عند رفعه'

  return (
    <motion.div
      role="button"
      tabIndex={0}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      className="crx-card"
      style={{
        position: 'relative',
        marginTop: '18px',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        borderRadius: '16px',
        cursor: 'pointer',
        direction: 'rtl',
        overflow: 'hidden',
        background: 'linear-gradient(150deg, rgba(251,191,36,0.07), rgba(255,255,255,0.02) 62%)',
        border: '1px solid rgba(251,191,36,0.2)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 14px 34px -20px rgba(0,0,0,0.55)',
        transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1), border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3), 0 20px 40px -18px rgba(0,0,0,0.6), 0 0 28px -14px rgba(251,191,36,0.5)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = 'rgba(251,191,36,0.2)'
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3), 0 14px 34px -20px rgba(0,0,0,0.55)'
      }}
    >
      {/* gold top hairline */}
      <div style={{ position: 'absolute', top: 0, insetInline: 0, height: '1px', background: 'linear-gradient(to left, transparent, rgba(251,191,36,0.6) 35%, rgba(255,255,255,0.22) 65%, transparent)' }} />

      {/* play / film crest */}
      <div style={{
        position: 'relative', flexShrink: 0, width: '48px', height: '48px', borderRadius: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(120% 120% at 30% 0%, rgba(251,191,36,0.28), rgba(251,191,36,0.06))',
        border: '1px solid rgba(251,191,36,0.42)',
        boxShadow: '0 8px 22px -10px rgba(251,191,36,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
        color: '#fde68a',
      }}>
        {available
          ? <Play size={20} style={{ marginInlineStart: 2, filter: 'drop-shadow(0 2px 6px rgba(251,191,36,0.5))' }} fill="#fde68a" />
          : <Film size={20} />}
      </div>

      {/* label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.3, fontFamily: "'Tajawal', sans-serif" }}>
          تسجيل الحصة
        </div>
        <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', marginTop: '3px', fontFamily: "'Tajawal', sans-serif" }}>
          {subtitle}
        </div>
      </div>

      {/* availability chip */}
      {!isLoading && (
        <span style={{
          flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '999px',
          fontSize: '11.5px', fontWeight: 800, fontFamily: "'Tajawal', sans-serif",
          ...(available
            ? { color: '#fcd34d', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }
            : { color: 'rgba(255,255,255,0.42)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }),
        }}>
          {available && <span style={{ width: 6, height: 6, borderRadius: 99, background: '#fbbf24', display: 'inline-block', boxShadow: '0 0 8px 1px rgba(251,191,36,0.6)' }} />}
          {available ? 'متوفر' : 'قريباً'}
        </span>
      )}

      <ChevronLeft size={16} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
    </motion.div>
  )
}
