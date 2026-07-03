import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MessageCircle, ArrowLeft, PenLine, Mic, ClipboardCheck, CalendarClock,
} from 'lucide-react';

import { useStudentId } from './_helpers/resolveStudentId';
import { useIELTSPreview } from '@/pages/admin/ielts-preview/IELTSPreviewContext';
import { useLatestResult } from '@/hooks/ielts/useIELTSHub';
import { useAuthStore } from '@/stores/authStore';
import TrainerPresence from '@/design-system/components/masterclass/TrainerPresence';

const ORANGE = 'var(--sunset-orange, #fbbf24)';
const AMBER = 'var(--sunset-amber, #f97316)';
const CARD_BG = 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 62%, transparent)';
const CARD_SHADOW = '0 10px 30px -14px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)';
const EASE = [0.22, 1, 0.36, 1];

const TRAINERS = [
  { name: 'د. علي', role: 'المدرب الرئيسي · IELTS' },
  { name: 'د. محمد', role: 'مدرب IELTS' },
];

// Human-trainer value — framed 3rd-person about the trainer (gender-neutral for the student).
const HELP = [
  { icon: PenLine, title: 'يراجع كتابتك بنفسه',
    text: 'كل مقال Task 1 و Task 2 يمرّ على عين مدرب حقيقي — ملاحظات دقيقة تتجاوز ما يراه الذكاء الاصطناعي.' },
  { icon: Mic, title: 'يستمع لمحادثتك',
    text: 'تسجيلات المحادثة تُقيَّم بشرياً: النطق، الطلاقة، والثقة — بلغة قريبة منك.' },
  { icon: ClipboardCheck, title: 'يضبط درجاتك',
    text: 'يعتمد أو يعدّل درجة كل مهارة، فتكون نطاقاتك واقعية وقريبة من الاختبار الفعلي.' },
  { icon: CalendarClock, title: 'يتابع خطتك',
    text: 'يعدّل تاريخ اختبارك وأولويات أسبوعك حسب تقدّمك — الخطة تعيش معك.' },
];

export default function Trainer() {
  // ===== ALL HOOKS TOP =====
  const reduce = useReducedMotion();
  const profile = useAuthStore((s) => s.profile);
  const preview = useIELTSPreview();
  const studentId = useStudentId();
  const { data: latestResult } = useLatestResult(studentId);

  const firstName = preview?.previewMode
    ? 'طالب المعاينة'
    : (profile?.full_name?.split(' ')[0] || null);

  const hasReviewedWork = !!latestResult && (latestResult.writing_score != null || latestResult.speaking_score != null);

  return (
    <div dir="rtl" style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 80 }}>

      {/* ===== HERO — living dual-presence ===== */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{
          textAlign: 'center', padding: '28px 24px 34px', marginTop: 8, borderRadius: 24,
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--sunset-base-mid, #2b1810) 70%, transparent), color-mix(in srgb, var(--sunset-base-deep, #1a0f08) 88%, transparent))',
          border: `1px solid color-mix(in srgb, ${ORANGE} 24%, transparent)`,
          boxShadow: CARD_SHADOW, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: ORANGE, marginBottom: 20 }}>YOUR TRAINER</div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 40, marginBottom: 24, flexWrap: 'wrap' }}>
          {TRAINERS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.1, ease: EASE, duration: 0.5 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
            >
              <TrainerPresence trainerName={t.name} size="lg" />
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ds-text)' }}>{t.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>{t.role}</div>
            </motion.div>
          ))}
        </div>

        <h1 style={{ fontSize: 'clamp(26px, 3.6vw, 40px)', fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 12, letterSpacing: '-0.02em' }}>
          مدربك. في كل خطوة.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ds-text-muted)', lineHeight: 1.7, margin: '0 auto', maxWidth: 500 }}>
          {hasReviewedWork
            ? `عملك يُراجَع بشرياً${firstName ? ` يا ${firstName}` : ''} — لست وحدك في هذه الرحلة.`
            : 'الذكاء الاصطناعي يسرّع تدريبك، لكن مدرباً حقيقياً يراجع كتابتك ومحادثتك.'}
        </p>
      </motion.section>

      {/* ===== HOW YOUR TRAINER HELPS ===== */}
      <section style={{ margin: '44px 0' }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>كيف يساعدك مدربك</h2>
          <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0 }}>الفرق بين تدريب وحيد وتدريب مصحوب.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {HELP.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, ease: EASE, duration: 0.4 }}
                style={{
                  padding: '22px', borderRadius: 16, background: CARD_BG, boxShadow: CARD_SHADOW,
                  border: `1px solid color-mix(in srgb, ${AMBER} 16%, transparent)`,
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  transition: 'transform 0.2s ease-out, border-color 0.2s ease-out',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `color-mix(in srgb, ${ORANGE} 40%, transparent)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `color-mix(in srgb, ${AMBER} 16%, transparent)`; }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 12, marginBottom: 12,
                  background: `color-mix(in srgb, ${ORANGE} 18%, transparent)`, color: ORANGE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ds-text)', marginBottom: 6 }}>{item.title}</div>
                <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', lineHeight: 1.65, margin: 0 }}>{item.text}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===== CONTACT CTA ===== */}
      <motion.section initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: EASE }}>
        <div style={{
          padding: '30px 28px', borderRadius: 20, textAlign: 'center',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--sunset-base-mid, #2b1810) 70%, transparent), color-mix(in srgb, var(--sunset-base-deep, #1a0f08) 88%, transparent))',
          border: `1px solid color-mix(in srgb, ${ORANGE} 24%, transparent)`, boxShadow: CARD_SHADOW,
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 8 }}>
            عندك سؤال؟ مدربك يسمعك مباشرة.
          </h3>
          <p style={{ fontSize: 14, color: 'var(--ds-text-muted)', lineHeight: 1.7, margin: '0 auto 20px', maxWidth: 460 }}>
            المحادثة مفتوحة — تصلك ملاحظات مدربك، ويمكنك إرسال سؤالك في أي وقت.
          </p>
          <Link
            to="/chat"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14,
              background: `linear-gradient(135deg, ${ORANGE}, ${AMBER})`,
              color: '#1a0f08', fontSize: 15, fontWeight: 800, textDecoration: 'none',
              boxShadow: `0 8px 24px -8px color-mix(in srgb, ${ORANGE} 60%, transparent)`,
              transition: 'transform 0.2s ease-out',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <MessageCircle size={18} />
            مراسلة مدربك عبر المحادثة
            <ArrowLeft size={16} />
          </Link>
        </div>
      </motion.section>

    </div>
  );
}
