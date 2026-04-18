import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function BriefJourneyMap({ units, currentUnitId, visitedUnitIds, level }) {
  const [tooltip, setTooltip] = useState(null)

  if (!units?.length) return null

  return (
    <div style={{
      background: 'var(--ds-surface-1)',
      border: '1px solid var(--ds-border-subtle)',
      borderRadius: '16px',
      padding: 'clamp(16px, 3vw, 24px)',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--ds-text-tertiary)',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        marginBottom: '16px',
        fontFamily: "'Tajawal', sans-serif",
      }}>
        رحلتك في المستوى {level?.level_number} — {level?.cefr}
      </div>

      {/* Scrollable track */}
      <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', minWidth: 'max-content', padding: '8px 4px' }}>
          {units.map((unit, i) => {
            const isCurrent  = unit.id === currentUnitId
            const isVisited  = visitedUnitIds?.has(unit.id) && !isCurrent
            const isUpcoming = !isCurrent && !isVisited

            return (
              <div key={unit.id} style={{ display: 'flex', alignItems: 'center' }}>
                {/* Connector line */}
                {i > 0 && (
                  <div style={{
                    width: '24px',
                    height: '2px',
                    background: isVisited
                      ? 'var(--ds-accent-gold)'
                      : 'var(--ds-border-subtle)',
                  }} />
                )}

                {/* Unit circle */}
                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setTooltip(unit.id)}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <motion.div
                    animate={isCurrent ? { boxShadow: ['0 0 0 0 rgba(233,185,73,0.4)', '0 0 0 8px rgba(233,185,73,0)', '0 0 0 0 rgba(233,185,73,0.4)'] } : {}}
                    transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
                    style={{
                      width: isCurrent ? '36px' : '28px',
                      height: isCurrent ? '36px' : '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      cursor: 'default',
                      flexShrink: 0,
                      background: isCurrent
                        ? 'var(--ds-accent-gold)'
                        : isVisited
                          ? 'rgba(233, 185, 73, 0.2)'
                          : 'var(--ds-surface-2)',
                      border: isCurrent
                        ? '2px solid var(--ds-accent-gold)'
                        : isVisited
                          ? '1px solid var(--ds-accent-gold)'
                          : '1px solid var(--ds-border-subtle)',
                      color: isCurrent
                        ? 'var(--ds-text-inverse)'
                        : isVisited
                          ? 'var(--ds-accent-gold)'
                          : 'var(--ds-text-tertiary)',
                    }}
                  >
                    {isVisited ? <Check size={12} /> : unit.unit_number}
                  </motion.div>

                  {/* Tooltip */}
                  {tooltip === unit.id && (
                    <div style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--ds-bg-elevated, #0a1428)',
                      border: '1px solid var(--ds-border-subtle)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      color: 'var(--ds-text-primary)',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      pointerEvents: 'none',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}>
                      {unit.theme_ar || unit.theme_en}
                      <div style={{
                        position: 'absolute',
                        bottom: '-5px',
                        left: '50%',
                        width: '8px',
                        height: '8px',
                        background: 'var(--ds-bg-elevated, #0a1428)',
                        border: '1px solid var(--ds-border-subtle)',
                        borderTop: 'none',
                        borderRight: 'none',
                        transform: 'translateX(-50%) rotate(-45deg)',
                      }} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
        {[
          { label: 'مكتملة', color: 'var(--ds-accent-gold)', bg: 'rgba(233,185,73,0.15)' },
          { label: 'الوحدة الحالية', color: 'var(--ds-text-inverse)', bg: 'var(--ds-accent-gold)' },
          { label: 'قادمة', color: 'var(--ds-text-tertiary)', bg: 'var(--ds-surface-2)' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.bg, border: '1px solid var(--ds-border-subtle)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--ds-text-tertiary)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
