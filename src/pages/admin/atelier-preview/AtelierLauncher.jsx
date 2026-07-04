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
        background: 'linear-gradient(170deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012) 60%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        boxShadow: '0 1px 2px rgba(0,0,0,0.3), 0 10px 28px -14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: 26,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Palette size={16} style={{ color: '#a78bfa' }} />
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ds-text-primary, #f8fafc)' }}>
          معاينة هوية Fluentia Atelier
        </h3>
      </div>
      <p style={{
        margin: '0 0 18px',
        fontSize: 12.5,
        color: 'var(--ds-text-tertiary, #64748b)',
        lineHeight: 1.7,
      }}>
        جرّب كيف ستبدو تجارب الطالب والمعلم والأدمن في هوية Fluentia Atelier.
        هذه معاينة معزولة — لا يراها المستخدمون الحاليون.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
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
              minHeight: 48,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 14,
              color: 'var(--ds-text-primary, #f8fafc)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1), background 0.2s cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={17} strokeWidth={1.8} style={{ color: '#a78bfa' }} />
              {label}
            </span>
            <ArrowRight size={15} style={{ transform: 'scaleX(-1)', opacity: 0.6 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
