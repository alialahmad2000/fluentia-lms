import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getPhaseById } from './ieltsSacredPages';

export default function SacredPageCard({ page, index, onClick }) {
  const Icon = page.icon;
  const phase = getPhaseById(page.phase);
  const accent = phase ? phase.color : '#38bdf8';

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 4) * 0.05, duration: 0.35 }}
      whileHover={{ y: -4 }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '22px 22px 20px',
        borderRadius: 18,
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border)',
        textAlign: 'right',
        cursor: 'pointer',
        overflow: 'hidden',
        fontFamily: 'inherit',
        color: 'inherit',
        transition: 'border-color 0.22s, box-shadow 0.22s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.boxShadow = `0 12px 40px -16px ${accent}60`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--ds-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Decorative corner glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -40,
          left: -40,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `color-mix(in srgb, ${accent} 18%, transparent)`,
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} strokeWidth={1.8} />
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: accent,
            letterSpacing: 1.4,
            padding: '4px 10px',
            borderRadius: 999,
            background: `color-mix(in srgb, ${accent} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
          }}
        >
          {phase.label}
        </span>
      </div>

      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: 'var(--ds-text)',
            lineHeight: 1.3,
            marginBottom: 4,
          }}
        >
          {page.title}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: accent,
            letterSpacing: 0.5,
            marginBottom: 8,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {page.english}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--ds-text-muted)',
            lineHeight: 1.6,
          }}
        >
          {page.desc}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 'auto',
          paddingTop: 12,
          fontSize: 12,
          color: accent,
          fontWeight: 700,
        }}
      >
        افتح المعاينة
        <ArrowLeft size={14} />
      </div>
    </motion.button>
  );
}
