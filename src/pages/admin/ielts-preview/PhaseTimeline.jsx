import React from 'react';
import { motion } from 'framer-motion';
import { PHASES } from './ieltsSacredPages';

export default function PhaseTimeline({ activePhaseId, onPhaseClick }) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '28px 8px 40px',
        marginBottom: 12,
      }}
    >
      {/* Connecting gradient line */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 68,
          left: 28,
          right: 28,
          height: 2,
          background:
            'linear-gradient(90deg, #38bdf8 0%, #a78bfa 22%, #fbbf24 44%, #f97316 60%, #10b981 78%, #f43f5e 100%)',
          opacity: 0.35,
          borderRadius: 999,
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${PHASES.length}, 1fr)`,
          gap: 8,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {PHASES.map((phase, idx) => {
          const isActive = activePhaseId === phase.id;
          return (
            <motion.button
              key={phase.id}
              onClick={() => onPhaseClick?.(phase.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.4 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '8px 6px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive
                    ? phase.color
                    : `color-mix(in srgb, ${phase.color} 16%, var(--ds-surface))`,
                  border: `2px solid ${phase.color}`,
                  boxShadow: isActive
                    ? `0 0 0 6px color-mix(in srgb, ${phase.color} 22%, transparent), 0 8px 28px -8px ${phase.color}80`
                    : 'none',
                  color: isActive ? '#0b1120' : phase.color,
                  fontWeight: 900,
                  fontSize: 14,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {phase.label.replace('Phase ', '')}
              </div>

              <div style={{ textAlign: 'center', lineHeight: 1.4 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: isActive ? 'var(--ds-text)' : 'var(--ds-text-muted)',
                    marginBottom: 2,
                    transition: 'color 0.2s',
                  }}
                >
                  {phase.title}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--ds-text-muted)',
                    opacity: 0.7,
                    letterSpacing: 0.5,
                  }}
                >
                  {phase.subtitle}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
