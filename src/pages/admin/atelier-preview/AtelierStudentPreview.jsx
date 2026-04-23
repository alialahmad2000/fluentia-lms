import React from 'react';
import { BookOpen, Mic, Target, Flame } from 'lucide-react';
import AtelierPreviewLayout from './AtelierPreviewLayout';
import KuficMark from '../../../design-system/fluentia-atelier/KuficMark';

export default function AtelierStudentPreview() {
  return (
    <AtelierPreviewLayout role="student" title="تجربة الطالب — The Atelier">
      {/* Hero */}
      <section style={{ position: 'relative', marginBottom: 112 }}>
        <div style={{ position: 'absolute', top: -12, insetInlineStart: -8 }}>
          <KuficMark size={48} opacity={0.12} />
        </div>
        <div style={{
          fontSize: 'var(--atelier-text-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--atelier-track-wide)',
          color: 'var(--atelier-ink-whisper)',
          fontFamily: 'var(--atelier-font-en)',
          marginBottom: 16,
        }}>
          Thursday · Week 4 of your journey
        </div>
        <h1 style={{
          fontSize: 48,
          lineHeight: 1.15,
          color: 'var(--atelier-ink)',
          fontFamily: 'var(--atelier-font-ar)',
          fontWeight: 600,
          margin: 0,
          marginBottom: 16,
        }}>
          صباح الخير يا نورة،<br />
          <span style={{ color: 'var(--atelier-ink-muted)', fontWeight: 400 }}>
            الجلسة اليوم في ٨:٠٠ مساءً.
          </span>
        </h1>
        <p style={{
          fontSize: 'var(--atelier-text-lg)',
          color: 'var(--atelier-ink-muted)',
          maxWidth: 560,
          lineHeight: 1.7,
          margin: 0,
        }}>
          قبل الجلسة، راجعي الوحدة الرابعة واستكملي تمرين المحادثة. تبقى ٢٤ ساعة حتى لقائنا.
        </p>
      </section>

      {/* Stat tiles */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 112 }}>
        {[
          { label: 'Streak', value: '١٢', unit: 'يوم', icon: Flame },
          { label: 'Vocabulary mastered', value: '١٤٢', unit: 'كلمة', icon: BookOpen },
          { label: 'Level progress', value: '٦٨', unit: '٪', icon: Target },
        ].map(({ label, value, unit, icon: Icon }) => (
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
              <Icon size={18} strokeWidth={1.5} style={{ color: 'var(--atelier-ink-whisper)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--atelier-font-num)',
                fontSize: 64,
                fontWeight: 300,
                color: 'var(--atelier-ink)',
                letterSpacing: '-0.02em',
              }}>
                {value}
              </span>
              <span style={{ fontSize: 'var(--atelier-text-md)', color: 'var(--atelier-ink-muted)' }}>
                {unit}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Today's focus */}
      <section style={{ marginBottom: 112 }}>
        <div style={{
          fontSize: 'var(--atelier-text-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--atelier-track-wide)',
          color: 'var(--atelier-ink-whisper)',
          fontFamily: 'var(--atelier-font-en)',
          marginBottom: 24,
        }}>
          Today's focus
        </div>
        <div style={{
          padding: 48,
          background: 'var(--atelier-elevated)',
          border: '1px solid var(--atelier-rule)',
          borderRadius: 'var(--atelier-radius-hero)',
          boxShadow: 'var(--atelier-shadow-rest)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 28, color: 'var(--atelier-ink)', margin: 0, marginBottom: 12, fontWeight: 600 }}>
              محادثة اليوم: في المقهى
            </h2>
            <p style={{ fontSize: 'var(--atelier-text-lg)', color: 'var(--atelier-ink-muted)', margin: 0, lineHeight: 1.7 }}>
              ١٢ جملة تطبيقية. بعدها تفتح الوحدة الخامسة.
            </p>
          </div>
          <button style={{
            background: 'var(--atelier-jewel)',
            color: 'var(--atelier-jewel-ink)',
            border: 'none',
            padding: '16px 32px',
            borderRadius: 'var(--atelier-radius-input)',
            fontSize: 'var(--atelier-text-md)',
            fontFamily: 'var(--atelier-font-ar)',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all var(--atelier-dur-fast) var(--atelier-ease)',
          }}>
            ابدأي التمرين
            <Mic size={18} strokeWidth={1.5} />
          </button>
        </div>
      </section>

      {/* Journey */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{
              fontSize: 'var(--atelier-text-xs)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--atelier-track-wide)',
              color: 'var(--atelier-ink-whisper)',
              fontFamily: 'var(--atelier-font-en)',
              marginBottom: 8,
            }}>
              Your journey
            </div>
            <h2 style={{ fontSize: 28, color: 'var(--atelier-ink)', margin: 0, fontWeight: 600 }}>
              مستوى B1 · المجموعة الرابعة
            </h2>
          </div>
          <span style={{ color: 'var(--atelier-ink-muted)', fontSize: 'var(--atelier-text-md)' }}>
            ٨ من ١٢ وحدة
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12 }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const done = i < 8;
            const active = i === 8;
            return (
              <div key={i} style={{
                aspectRatio: '1',
                borderRadius: 'var(--atelier-radius-input)',
                background: done ? 'var(--atelier-jewel)' : active ? 'var(--atelier-elevated-hi)' : 'var(--atelier-surface)',
                border: active ? '1px solid var(--atelier-jewel)' : '1px solid var(--atelier-rule)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--atelier-font-num)',
                fontSize: 20,
                fontWeight: 300,
                color: done ? 'var(--atelier-jewel-ink)' : active ? 'var(--atelier-ink)' : 'var(--atelier-ink-whisper)',
              }}>
                {i + 1}
              </div>
            );
          })}
        </div>
      </section>
    </AtelierPreviewLayout>
  );
}
