import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Headphones, PenLine, Mic } from 'lucide-react'

import NarrativeReveal from '@/design-system/components/masterclass/NarrativeReveal'
import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useDiagnosticResultV2 } from '@/hooks/ielts/useDiagnosticResultV2'

const SKILL_CONFIG = [
  { key: 'listening', label: 'الاستماع', icon: Headphones },
  { key: 'reading',   label: 'القراءة',  icon: BookOpen },
  { key: 'writing',   label: 'الكتابة',  icon: PenLine },
  { key: 'speaking',  label: 'المحادثة', icon: Mic },
]

const NARRATIVE_LINES = [
  'انتهى الفصل الأول.',
  'وهنا نبدأ نرسم خارطتك.',
]

function EmptyState() {
  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 440,
        margin: '80px auto',
        padding: 16,
        textAlign: 'center',
      }}
    >
      <div style={{
        padding: '40px 32px',
        borderRadius: 20,
        background: 'color-mix(in srgb, var(--sunset-base-mid) 55%, transparent)',
        border: 'var(--ds-border-width, 1px) solid color-mix(in srgb, var(--ds-border) 60%, transparent)',
        backdropFilter: 'blur(var(--ds-blur-sm, 8px))',
      }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--ds-text)', margin: '0 0 10px', fontFamily: "'Tajawal', sans-serif" }}>
          لم تُكملي اختبار تشخيصي بعد.
        </p>
        <p style={{ fontSize: 14, color: 'var(--ds-text-muted)', margin: '0 0 24px', fontFamily: "'Tajawal', sans-serif' " }}>
          ابدأي التشخيص لتحصلي على خارطتك الكاملة.
        </p>
        <Link
          to="/student/ielts-v2/diagnostic"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 28px',
            borderRadius: 12,
            background: 'color-mix(in srgb, var(--sunset-orange) 22%, var(--sunset-base-mid))',
            border: 'var(--ds-border-width, 1px) solid color-mix(in srgb, var(--sunset-orange) 40%, transparent)',
            color: 'var(--ds-text)',
            fontSize: 15,
            fontWeight: 800,
            textDecoration: 'none',
            fontFamily: "'Tajawal', sans-serif",
          }}
        >
          ابدأي الآن
        </Link>
      </div>
    </div>
  )
}

export default function DiagnosticResults() {
  // ========== ALL HOOKS TOP ==========
  const navigate = useNavigate()
  const { data: result, isLoading } = useDiagnosticResultV2()
  const [revealed, setRevealed] = useState(false)

  if (isLoading) {
    return (
      <div dir="rtl" style={{ textAlign: 'center', padding: '80px 16px' }}>
        <p style={{ color: 'var(--ds-text-muted)', fontSize: 14, fontFamily: "'Tajawal', sans-serif" }}>
          جاري تحميل نتيجتك...
        </p>
      </div>
    )
  }

  if (!result?.hasResult) {
    return <EmptyState />
  }

  const { overallBand, skills, strengthSkills, weaknessSkills } = result

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: 680,
        margin: '0 auto',
        paddingBottom: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 48,
      }}
    >
      {/* ========== 1. NARRATIVE ========== */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{ paddingTop: 32 }}
      >
        <NarrativeReveal
          lines={NARRATIVE_LINES}
          delayBetweenLines={900}
          pauseAfterLast={600}
          onComplete={() => setRevealed(true)}
        />
      </motion.section>

      {/* ========== 2. THE REVEAL ========== */}
      <motion.section
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 24 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        style={{
          textAlign: 'center',
          padding: '40px 24px',
          borderRadius: 24,
          background: 'color-mix(in srgb, var(--sunset-base-mid) 60%, transparent)',
          border: 'var(--ds-border-width, 1px) solid color-mix(in srgb, var(--sunset-orange) 30%, transparent)',
          backdropFilter: 'blur(var(--ds-blur-sm, 10px))',
        }}
      >
        <BandDisplay band={overallBand} size="xl" animate label="نتيجتك" />
        <p style={{
          marginTop: 24,
          fontSize: 16,
          color: 'var(--ds-text-muted)',
          lineHeight: 1.8,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          Band {overallBand != null ? Number(overallBand).toFixed(1) : '—'}. هذه نقطة انطلاقك — ليست نهايتك.
        </p>
      </motion.section>

      {/* ========== 3. FOUR SKILL BREAKDOWN ========== */}
      <motion.section
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 20 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h2 style={{
          fontSize: 18,
          fontWeight: 900,
          color: 'var(--ds-text)',
          margin: '0 0 16px',
        }}>
          أداؤك في المهارات الأربع
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
        }}>
          {SKILL_CONFIG.map(({ key, label, icon: Icon }) => {
            const band = skills?.[key]
            const isStrong = band != null && overallBand != null && band >= overallBand + 0.5
            const isWeak   = band != null && overallBand != null && band <= overallBand - 0.5
            const accent = isStrong
              ? 'var(--ds-accent-success, var(--sunset-orange))'
              : isWeak
              ? 'var(--ds-text-muted)'
              : 'var(--sunset-orange)'

            return (
              <div
                key={key}
                style={{
                  padding: '18px 20px',
                  borderRadius: 16,
                  background: 'color-mix(in srgb, var(--sunset-base-mid) 55%, transparent)',
                  border: `var(--ds-border-width, 1px) solid color-mix(in srgb, ${accent} 25%, transparent)`,
                  backdropFilter: 'blur(var(--ds-blur-sm, 6px))',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: `color-mix(in srgb, ${accent} 15%, transparent)`,
                    color: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif" }}>
                    {label}
                  </span>
                </div>
                <div style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: accent,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  lineHeight: 1,
                }}>
                  {band != null ? Number(band).toFixed(1) : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </motion.section>

      {/* ========== 4. STRENGTHS NARRATIVE ========== */}
      <motion.section
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 16 }}
        transition={{ duration: 0.6, delay: 0.55 }}
        style={{
          padding: '24px',
          borderRadius: 18,
          background: 'color-mix(in srgb, var(--sunset-base-mid) 50%, transparent)',
          border: 'var(--ds-border-width, 1px) solid color-mix(in srgb, var(--sunset-orange) 18%, transparent)',
          backdropFilter: 'blur(var(--ds-blur-sm, 6px))',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange)', letterSpacing: 2, marginBottom: 10 }}>
          نقاط القوة
        </div>
        <p style={{ fontSize: 15, color: 'var(--ds-text)', lineHeight: 1.8, margin: 0, fontFamily: "'Tajawal', sans-serif" }}>
          {strengthSkills.length > 0
            ? <>نقاط قوّتكِ: <strong>{strengthSkills.join(' و')}</strong>. هذه أسس نبني عليها.</>
            : 'أداؤكِ متوازن عبر المهارات الأربع — بداية ممتازة.'}
        </p>
      </motion.section>

      {/* ========== 5. FOCUS AREAS NARRATIVE ========== */}
      <motion.section
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 16 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        style={{
          padding: '24px',
          borderRadius: 18,
          background: 'color-mix(in srgb, var(--sunset-base-mid) 50%, transparent)',
          border: 'var(--ds-border-width, 1px) solid color-mix(in srgb, var(--ds-border) 50%, transparent)',
          backdropFilter: 'blur(var(--ds-blur-sm, 6px))',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ds-text-muted)', letterSpacing: 2, marginBottom: 10 }}>
          ما سنعمل عليه
        </div>
        <p style={{ fontSize: 15, color: 'var(--ds-text)', lineHeight: 1.8, margin: 0, fontFamily: "'Tajawal', sans-serif" }}>
          {weaknessSkills.length > 0
            ? <>ما سنعمل عليه: <strong>{weaknessSkills.join(' و')}</strong>. كل أسبوع سنقترب خطوة.</>
            : 'لا يوجد ضعف واضح — سنركّز على التطوير المتوازن.'}
        </p>
      </motion.section>

      {/* ========== 6. CTA ========== */}
      <motion.section
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 16 }}
        transition={{ duration: 0.6, delay: 0.85 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
      >
        <button
          onClick={() => navigate('/student/ielts-v2/journey')}
          style={{
            width: '100%',
            maxWidth: 480,
            padding: '18px 32px',
            borderRadius: 16,
            border: 'var(--ds-border-width, 1px) solid color-mix(in srgb, var(--sunset-orange) 50%, transparent)',
            background: 'color-mix(in srgb, var(--sunset-orange) 22%, var(--sunset-base-mid))',
            color: 'var(--ds-text)',
            fontSize: 17,
            fontWeight: 900,
            fontFamily: "'Tajawal', sans-serif",
            cursor: 'pointer',
          }}
        >
          ابدأي رحلتك
        </button>

        <Link
          to="/student/ielts-v2"
          style={{
            fontSize: 13,
            color: 'var(--ds-text-muted)',
            textDecoration: 'none',
            fontFamily: "'Tajawal', sans-serif",
          }}
        >
          العودة للرئيسية
        </Link>
      </motion.section>
    </div>
  )
}
