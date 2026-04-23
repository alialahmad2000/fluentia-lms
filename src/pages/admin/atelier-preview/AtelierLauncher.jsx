import React from 'react';
import { Link } from 'react-router-dom';
import { Palette, ArrowRight, GraduationCap, UserCircle, Shield } from 'lucide-react';

/**
 * AtelierLauncher — renders in standard /admin design (pre-Atelier).
 * Links to the three Atelier preview surfaces. Admin-only (gate in AtelierPreviewLayout).
 */
export default function AtelierLauncher() {
  return (
    <div
      style={{
        background: 'var(--ds-card, #1a1a1a)',
        border: '1px solid var(--ds-border, rgba(255,255,255,0.08))',
        borderRadius: 'var(--ds-radius-md, 12px)',
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Palette size={20} />
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          معاينة هوية Fluentia Atelier
        </h3>
      </div>
      <p style={{
        margin: '0 0 20px',
        fontSize: 14,
        color: 'var(--ds-text-muted, #999)',
        lineHeight: 1.6,
      }}>
        جرّب كيف ستبدو تجارب الطالب والمعلم والأدمن في هوية Fluentia Atelier.
        هذه معاينة معزولة — لا يراها المستخدمون الحاليون.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { to: '/admin/atelier-preview/student', icon: UserCircle, label: 'الطالب' },
          { to: '/admin/atelier-preview/trainer', icon: GraduationCap, label: 'المعلم' },
          { to: '/admin/atelier-preview/admin', icon: Shield, label: 'الأدمن' },
        ].map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'var(--ds-bg, #0e0e0e)',
              border: '1px solid var(--ds-border, rgba(255,255,255,0.08))',
              borderRadius: 'var(--ds-radius, 8px)',
              color: 'var(--ds-text, #eee)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 160ms ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={18} />
              {label}
            </span>
            <ArrowRight size={16} style={{ transform: 'scaleX(-1)' }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
