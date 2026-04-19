import { useNavigate } from 'react-router-dom'
import { GlassPanel } from '@/design-system/components'

const SKILL_AR = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }
const SKILL_ROUTE = { reading: '/student/ielts/reading', listening: '/student/ielts/listening', writing: '/student/ielts/writing', speaking: '/student/ielts/speaking' }
const SKILL_EMOJI = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎙️' }

function bandColor(b) {
  if (b == null) return 'var(--text-tertiary)'
  return b >= 7 ? '#4ade80' : b >= 5.5 ? '#38bdf8' : '#fb923c'
}

export default function WeakAreasPanel({ weakAreas = [], targetBand }) {
  const navigate = useNavigate()
  if (weakAreas.length === 0) return null

  return (
    <GlassPanel style={{ padding: 16, border: '1px solid rgba(251,146,60,0.15)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', fontFamily: 'Tajawal', marginBottom: 12, letterSpacing: '0.04em' }}>
        نقاط الضعف — تحتاج تركيزاً
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {weakAreas.map((area, i) => {
          const gap = targetBand && area.band != null ? +(targetBand - area.band).toFixed(1) : null
          return (
            <div
              key={area.skill}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.12)', cursor: 'pointer' }}
              onClick={() => navigate(SKILL_ROUTE[area.skill] || '/student/ielts')}
            >
              <span style={{ fontSize: 18 }}>{SKILL_EMOJI[area.skill] || '📚'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                  {SKILL_AR[area.skill] || area.skill}
                </p>
                {gap != null && (
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
                    تحتاج {gap} نقطة للهدف
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: bandColor(area.band), fontFamily: 'Tajawal', lineHeight: 1 }}>
                  {area.band != null ? Number(area.band).toFixed(1) : '–'}
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#fb923c', fontFamily: 'Tajawal' }}>تدرّب →</span>
            </div>
          )
        })}
      </div>
    </GlassPanel>
  )
}
