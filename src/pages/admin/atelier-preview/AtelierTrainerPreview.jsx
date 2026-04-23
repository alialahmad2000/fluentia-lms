import React from 'react';
import { AlertCircle, Users, Clock } from 'lucide-react';
import AtelierPreviewLayout from './AtelierPreviewLayout';

export default function AtelierTrainerPreview() {
  return (
    <AtelierPreviewLayout role="trainer" title="تجربة المعلم — The Atelier">
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
          Thursday · Studio hours
        </div>
        <h1 style={{ fontSize: 44, lineHeight: 1.15, color: 'var(--atelier-ink)', fontWeight: 600, margin: 0, marginBottom: 24 }}>
          صباح الخير د. علي.
        </h1>
        <div style={{ display: 'flex', gap: 16 }}>
          <button style={{
            background: 'var(--atelier-jewel)',
            color: 'var(--atelier-jewel-ink)',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 'var(--atelier-radius-input)',
            fontSize: 'var(--atelier-text-md)',
            fontFamily: 'var(--atelier-font-ar)',
            fontWeight: 500,
            cursor: 'pointer',
          }}>
            ابدأ حصة B1
          </button>
          <button style={{
            background: 'transparent',
            color: 'var(--atelier-ink-muted)',
            border: '1px solid var(--atelier-rule-strong)',
            padding: '14px 28px',
            borderRadius: 'var(--atelier-radius-input)',
            fontSize: 'var(--atelier-text-md)',
            cursor: 'pointer',
          }}>
            افتح محطة التصحيح
          </button>
        </div>
      </section>

      {/* Stat tiles */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 112 }}>
        {[
          { label: 'Awaiting grading', value: '١٤', icon: AlertCircle, accent: 'var(--atelier-warn)' },
          { label: 'Active today', value: '٢٣', icon: Users, accent: 'var(--atelier-jewel)' },
          { label: 'Next class in', value: '٣:١٢', icon: Clock, accent: 'var(--atelier-ink-muted)' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} style={{
            padding: 32,
            background: 'var(--atelier-elevated)',
            border: '1px solid var(--atelier-rule)',
            borderRadius: 'var(--atelier-radius-card)',
            boxShadow: 'var(--atelier-shadow-rest)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{
                fontSize: 'var(--atelier-text-xs)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--atelier-track-wide)',
                color: 'var(--atelier-ink-whisper)',
                fontFamily: 'var(--atelier-font-en)',
              }}>
                {label}
              </span>
              <Icon size={18} strokeWidth={1.5} style={{ color: accent }} />
            </div>
            <span style={{
              fontFamily: 'var(--atelier-font-num)',
              fontSize: 64,
              fontWeight: 300,
              color: 'var(--atelier-ink)',
              letterSpacing: '-0.02em',
            }}>
              {value}
            </span>
          </div>
        ))}
      </section>

      {/* Needs follow-up list */}
      <section>
        <div style={{
          fontSize: 'var(--atelier-text-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--atelier-track-wide)',
          color: 'var(--atelier-ink-whisper)',
          fontFamily: 'var(--atelier-font-en)',
          marginBottom: 24,
        }}>
          Needs your attention
        </div>
        <div style={{
          background: 'var(--atelier-elevated)',
          border: '1px solid var(--atelier-rule)',
          borderRadius: 'var(--atelier-radius-card)',
          overflow: 'hidden',
        }}>
          {[
            { name: 'مها السبيعي', note: 'لم تسلّم واجب الأسبوع', risk: 'high' },
            { name: 'لين القحطاني', note: 'درجة المحادثة ٥٨٪ — انخفاض', risk: 'medium' },
            { name: 'نورة الزهراني', note: 'غابت مرتين متتاليتين', risk: 'medium' },
          ].map(({ name, note, risk }, i) => (
            <div key={name} style={{
              padding: '20px 32px',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              borderBottom: i < 2 ? '1px solid var(--atelier-rule)' : 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: risk === 'high' ? 'var(--atelier-danger)' : 'var(--atelier-warn)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--atelier-ink)', fontSize: 'var(--atelier-text-md)', fontWeight: 500, marginBottom: 4 }}>
                  {name}
                </div>
                <div style={{ color: 'var(--atelier-ink-muted)', fontSize: 'var(--atelier-text-sm)' }}>
                  {note}
                </div>
              </div>
              <button style={{
                background: 'transparent',
                color: 'var(--atelier-ink-muted)',
                border: '1px solid var(--atelier-rule-strong)',
                padding: '8px 16px',
                borderRadius: 'var(--atelier-radius-input)',
                fontSize: 'var(--atelier-text-sm)',
                cursor: 'pointer',
              }}>
                فتح الملف
              </button>
            </div>
          ))}
        </div>
      </section>
    </AtelierPreviewLayout>
  );
}
