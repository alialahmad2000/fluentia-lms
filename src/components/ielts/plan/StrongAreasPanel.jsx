import { GlassPanel } from '@/design-system/components'

const SKILL_AR = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }
const SKILL_EMOJI = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎙️' }

export default function StrongAreasPanel({ strongAreas = [] }) {
  if (strongAreas.length === 0) return null
  return (
    <GlassPanel style={{ padding: 16, border: '1px solid rgba(74,222,128,0.15)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', fontFamily: 'Tajawal', marginBottom: 12, letterSpacing: '0.04em' }}>
        نقاط القوة
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {strongAreas.map(area => (
          <div
            key={area.skill}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            <span style={{ fontSize: 16 }}>{SKILL_EMOJI[area.skill] || '📚'}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{SKILL_AR[area.skill] || area.skill}</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#4ade80', fontFamily: 'Tajawal' }}>
              {area.band != null ? Number(area.band).toFixed(1) : '–'}
            </span>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}
