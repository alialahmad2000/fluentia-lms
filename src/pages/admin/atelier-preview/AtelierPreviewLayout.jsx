import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, Palette } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import AtelierScope from '../../../design-system/fluentia-atelier/AtelierScope';

export default function AtelierPreviewLayout({ role, title, children }) {
  // HOOKS AT TOP — RULE
  const { profile } = useAuthStore();
  const location = useLocation();

  // Role gate (AFTER hooks)
  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return (
    <AtelierScope>
      {/* Top chrome — preview banner */}
      <div
        style={{
          borderBottom: '1px solid var(--atelier-rule)',
          background: 'var(--atelier-surface)',
          padding: '16px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Palette size={20} strokeWidth={1.5} style={{ color: 'var(--atelier-gold)' }} />
          <div>
            <div
              style={{
                fontSize: 'var(--atelier-text-xs)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--atelier-track-wide)',
                color: 'var(--atelier-ink-whisper)',
                fontFamily: 'var(--atelier-font-en)',
                marginBottom: 4,
              }}
            >
              معاينة هوية — Fluentia Atelier
            </div>
            <div
              style={{
                fontSize: 'var(--atelier-text-lg)',
                color: 'var(--atelier-ink)',
                fontWeight: 500,
              }}
            >
              {title}
            </div>
          </div>
        </div>

        <Link
          to="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 'var(--atelier-radius-input)',
            border: '1px solid var(--atelier-rule-strong)',
            color: 'var(--atelier-ink-muted)',
            fontSize: 'var(--atelier-text-sm)',
            transition: 'all var(--atelier-dur-fast) var(--atelier-ease)',
          }}
        >
          <span>رجوع للوحة الأدمن</span>
          <ArrowRight size={16} strokeWidth={1.5} style={{ transform: 'scaleX(-1)' }} />
        </Link>
      </div>

      {/* Preview content */}
      <main style={{ padding: '48px', maxWidth: 1280, margin: '0 auto' }}>
        {children}
      </main>
    </AtelierScope>
  );
}
