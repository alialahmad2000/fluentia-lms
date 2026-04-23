import React from 'react';
import { Users, DollarSign, BookOpen, Activity } from 'lucide-react';
import AtelierPreviewLayout from './AtelierPreviewLayout';

export default function AtelierAdminPreview() {
  return (
    <AtelierPreviewLayout role="admin" title="تجربة الأدمن — The Atelier">
      {/* Hero */}
      <section style={{ marginBottom: 112 }}>
        <div style={{
          fontSize: 'var(--atelier-text-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--atelier-track-wide)',
          color: 'var(--atelier-ink-whisper)',
          fontFamily: 'var(--atelier-font-en)',
          marginBottom: 16,
        }}>
          Studio command · April 2026
        </div>
        <h1 style={{ fontSize: 44, lineHeight: 1.15, color: 'var(--atelier-ink)', fontWeight: 600, margin: 0 }}>
          الأكاديمية في صحة ممتازة.
        </h1>
      </section>

      {/* 4 metric tiles */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 112 }}>
        {[
          { label: 'MRR', value: '٨٤٫٥', unit: 'ألف', trend: '+١٢٪', icon: DollarSign },
          { label: 'Active students', value: '١٤٢', unit: '', trend: '+٨', icon: Users },
          { label: 'Units completed', value: '٣٦٢', unit: 'هذا الأسبوع', trend: '+١٨٪', icon: BookOpen },
          { label: 'Satisfaction', value: '٤٫٨', unit: '/ ٥', trend: 'ثابت', icon: Activity },
        ].map(({ label, value, unit, trend, icon: Icon }) => (
          <div key={label} style={{
            padding: 28,
            background: 'var(--atelier-elevated)',
            border: '1px solid var(--atelier-rule)',
            borderRadius: 'var(--atelier-radius-card)',
            boxShadow: 'var(--atelier-shadow-rest)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{
                fontSize: 'var(--atelier-text-xs)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--atelier-track-wide)',
                color: 'var(--atelier-ink-whisper)',
                fontFamily: 'var(--atelier-font-en)',
              }}>
                {label}
              </span>
              <Icon size={16} strokeWidth={1.5} style={{ color: 'var(--atelier-ink-whisper)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <span style={{
                fontFamily: 'var(--atelier-font-num)',
                fontSize: 44,
                fontWeight: 300,
                color: 'var(--atelier-ink)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}>
                {value}
              </span>
              {unit && (
                <span style={{ fontSize: 'var(--atelier-text-sm)', color: 'var(--atelier-ink-muted)' }}>
                  {unit}
                </span>
              )}
            </div>
            <div style={{
              fontSize: 'var(--atelier-text-sm)',
              color: trend.includes('+') ? 'var(--atelier-jewel-hover)' : 'var(--atelier-ink-muted)',
              fontFamily: 'var(--atelier-font-en)',
            }}>
              {trend}
            </div>
          </div>
        ))}
      </section>

      {/* Recent activity */}
      <section>
        <div style={{
          fontSize: 'var(--atelier-text-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--atelier-track-wide)',
          color: 'var(--atelier-ink-whisper)',
          fontFamily: 'var(--atelier-font-en)',
          marginBottom: 24,
        }}>
          Activity log
        </div>
        <div style={{
          background: 'var(--atelier-elevated)',
          border: '1px solid var(--atelier-rule)',
          borderRadius: 'var(--atelier-radius-card)',
          overflow: 'hidden',
        }}>
          {[
            { when: 'قبل ١٢ دقيقة', who: 'نورة القحطاني', what: 'سجّلت في باقة طلاقة' },
            { when: 'قبل ٣٥ دقيقة', who: 'د. محمد', what: 'صحّح ١٢ واجباً' },
            { when: 'قبل ساعة', who: 'مها السبيعي', what: 'اجتازت اختبار الوحدة ٤' },
            { when: 'قبل ٣ ساعات', who: 'سارة العتيبي', what: 'أكملت التشخيص · B1' },
          ].map(({ when, who, what }, i) => (
            <div key={i} style={{
              padding: '18px 32px',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              borderBottom: i < 3 ? '1px solid var(--atelier-rule)' : 'none',
            }}>
              <span style={{
                fontSize: 'var(--atelier-text-sm)',
                color: 'var(--atelier-ink-whisper)',
                fontFamily: 'var(--atelier-font-en)',
                width: 110,
                flexShrink: 0,
              }}>
                {when}
              </span>
              <span style={{ color: 'var(--atelier-ink)', fontSize: 'var(--atelier-text-md)', fontWeight: 500, width: 160 }}>
                {who}
              </span>
              <span style={{ color: 'var(--atelier-ink-muted)', fontSize: 'var(--atelier-text-md)', flex: 1 }}>
                {what}
              </span>
            </div>
          ))}
        </div>
      </section>
    </AtelierPreviewLayout>
  );
}
