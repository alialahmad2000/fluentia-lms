import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CheckCircle2, Circle, CalendarClock, ArrowLeft,
  BookOpen, Headphones, PenLine, Mic, Target, Moon, IdCard, Timer, HeartHandshake,
} from 'lucide-react';

import { useStudentId } from './_helpers/resolveStudentId';
import { useIELTSPreview } from '@/pages/admin/ielts-preview/IELTSPreviewContext';
import {
  useAdaptivePlan, useLatestResult, useMockAttempts, useSkillProgress, useErrorBankCount,
} from '@/hooks/ielts/useIELTSHub';
import { useAuthStore } from '@/stores/authStore';
import ExamCountdown from '@/design-system/components/masterclass/ExamCountdown';

const ORANGE = 'var(--sunset-orange, #fbbf24)';
const AMBER = 'var(--sunset-amber, #f97316)';
const GREEN = '#4ade80';
const CARD_BG = 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 62%, transparent)';
const CARD_SHADOW = '0 10px 30px -14px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)';
const EASE = [0.22, 1, 0.36, 1];

const SKILLS = [
  { id: 'reading', title: 'القراءة', icon: BookOpen },
  { id: 'listening', title: 'الاستماع', icon: Headphones },
  { id: 'writing', title: 'الكتابة', icon: PenLine },
  { id: 'speaking', title: 'المحادثة', icon: Mic },
];

const DAY_OF_CHECKLIST = [
  { icon: Moon, title: 'نوم مبكر', text: 'الليلة التي تسبق الاختبار أهم من مراجعة إضافية.' },
  { icon: IdCard, title: 'الهوية والوثائق', text: 'نفس الهوية التي جرى التسجيل بها — والأفضل تجهيزها من الليل.' },
  { icon: Timer, title: 'إدارة الوقت', text: 'التوقّف الطويل عند سؤال واحد يكلّف وقتاً — الأفضل وضع علامة والمتابعة، ثم العودة إليه لاحقاً.' },
  { icon: HeartHandshake, title: 'الطمأنينة', text: 'أسابيع من التدريب مضت. اليوم فرصة لإظهار ما جرى التدرّب عليه فقط. بسم الله.' },
];

// ── Focal showpiece: readiness gauge (readyCount / total) ──
function ReadinessGauge({ value, total, reduce }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  const offset = c * (1 - pct);
  return (
    <div style={{ position: 'relative', width: 148, height: 148 }}>
      <svg width="148" height="148" viewBox="0 0 148 148" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="readyGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <circle cx="74" cy="74" r={r} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="11" />
        <motion.circle
          cx="74" cy="74" r={r} fill="none" stroke="url(#readyGaugeGrad)" strokeWidth="11"
          strokeLinecap="round" strokeDasharray={c}
          initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1, ease: EASE, delay: 0.2 }}
          style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.35))' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: ORANGE, lineHeight: 1, fontFamily: "'Playfair Display', Georgia, serif" }}>{value}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ds-text-muted)' }}>/ {total}</span>
        </div>
        <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--ds-text-muted)', marginTop: 4 }}>جاهزية</div>
      </div>
    </div>
  );
}

function ChecklistRow({ done, title, subtitle, isLast, delay, reduce }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
      {/* stepper rail */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 18 }}>
        <Icon size={22} strokeWidth={done ? 2 : 1.8} style={{ color: done ? GREEN : 'var(--ds-text-muted)', flexShrink: 0 }} />
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 20, marginTop: 6, borderRadius: 2, background: done ? `color-mix(in srgb, ${GREEN} 55%, transparent)` : `color-mix(in srgb, ${AMBER} 22%, transparent)` }} />
        )}
      </div>
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, ease: EASE, duration: 0.4 }}
        style={{
          flex: 1, marginBottom: 12, padding: '16px 18px', borderRadius: 14,
          background: done ? `color-mix(in srgb, ${GREEN} 8%, ${CARD_BG})` : CARD_BG,
          border: `1px solid color-mix(in srgb, ${done ? GREEN : AMBER} ${done ? 26 : 16}%, transparent)`,
          boxShadow: CARD_SHADOW, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ds-text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--ds-text-muted)', marginTop: 3 }}>{subtitle}</div>}
        </div>
        {done && <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: 0.5, flexShrink: 0 }}>تم</span>}
      </motion.div>
    </div>
  );
}

export default function Readiness() {
  // ===== ALL HOOKS TOP =====
  const reduce = useReducedMotion();
  const profile = useAuthStore((s) => s.profile);
  const preview = useIELTSPreview();
  const studentId = useStudentId();

  const { data: planRow } = useAdaptivePlan(studentId);
  const { data: latestResult } = useLatestResult(studentId);
  const { data: mocks } = useMockAttempts(studentId);
  const { data: skillProgress } = useSkillProgress(studentId);
  const { data: errorsLeft } = useErrorBankCount(studentId);

  const examDate = planRow?.target_exam_date || preview?.mockStudent?.target_exam_date || preview?.mockStudent?.exam_date || null;
  const validExamDate = useMemo(() => {
    if (!examDate) return null;
    const t = new Date(examDate).getTime();
    return Number.isFinite(t) ? examDate : null;
  }, [examDate]);

  const targetBand = planRow?.target_band || preview?.mockStudent?.target_band || 7.0;
  const overall = latestResult?.overall_band ?? null;
  const firstName = preview?.previewMode
    ? 'طالب المعاينة'
    : (profile?.full_name?.split(' ')[0] || null);

  // Real readiness signals
  const diagnosticDone = !!latestResult;
  const mockDone = (mocks?.completed?.length || 0) > 0;
  const skillsStarted = SKILLS.filter((s) => (skillProgress?.[s.id]?.attempts || 0) > 0).length;
  const allSkillsStarted = skillsStarted === SKILLS.length;
  const errorsMastered = (errorsLeft ?? 0) === 0;

  const checklist = [
    { done: diagnosticDone, title: 'التشخيص الأولي',
      subtitle: diagnosticDone ? 'عرفنا نقطة انطلاقك.' : 'نبدأ به لنرسم خطتك على أساس واقعي.' },
    { done: allSkillsStarted, title: `تدريب المهارات الأربع (${skillsStarted}/4)`,
      subtitle: allSkillsStarted ? 'كل مهارة لُمست مرة على الأقل.' : 'المهارة التي لم تبدأ بعد هي أكبر فرصة لك.' },
    { done: mockDone, title: 'اختبار محاكاة كامل',
      subtitle: mockDone ? 'تجربة ظروف الاختبار الحقيقية تمّت.' : 'محاكاة واحدة كاملة تكشف الجاهزية أكثر من أي شيء.' },
    { done: errorsMastered, title: 'مراجعة بنك الدروس',
      subtitle: errorsMastered ? 'لا أخطاء عالقة — أُتقنت كلها.' : `دروس بانتظار مراجعتك: ${errorsLeft}` },
  ];

  const readyCount = checklist.filter((c) => c.done).length;
  const gap = overall != null ? Math.max(0, targetBand - overall) : null;

  return (
    <div dir="rtl" style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 80 }}>

      {/* ===== HERO — gauge showpiece ===== */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 32, padding: '24px 0 8px', flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: ORANGE, marginBottom: 10 }}>
            EXAM WEEK
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 14, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            الجاهزية النهائية
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ds-text-muted)', lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
            {readyCount === 4
              ? `كل شيء جاهز${firstName ? ` يا ${firstName}` : ''}. تبقّت الثقة بالتدريب.`
              : `${readyCount} من 4 محطات مكتملة. لنُغلق الباقي بهدوء.`}
          </p>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, ease: EASE, duration: 0.5 }}
          style={{ flex: '0 0 auto' }}
        >
          <ReadinessGauge value={readyCount} total={4} reduce={reduce} />
        </motion.div>
      </motion.section>

      {/* ===== COUNTDOWN ===== */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, ease: EASE }}
        style={{ margin: '28px 0 48px' }}
      >
        {validExamDate ? (
          <div style={{
            borderRadius: 22,
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--sunset-base-mid, #2b1810) 72%, transparent), color-mix(in srgb, var(--sunset-base-deep, #1a0f08) 88%, transparent))',
            border: `1px solid color-mix(in srgb, ${AMBER} 24%, transparent)`,
            boxShadow: CARD_SHADOW, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          }}>
            <ExamCountdown examDate={validExamDate} studentName={firstName || 'IELTS'} examType="academic" />
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '22px 24px', borderRadius: 18,
            background: CARD_BG, border: `1px solid color-mix(in srgb, ${AMBER} 18%, transparent)`,
            boxShadow: CARD_SHADOW, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexWrap: 'wrap',
          }}>
            <CalendarClock size={26} style={{ color: ORANGE, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ds-text)' }}>لم يُحدَّد تاريخ اختبارك بعد</div>
              <div style={{ fontSize: 13, color: 'var(--ds-text-muted)', marginTop: 4 }}>
                بالاتفاق مع مدربك على الموعد يظهر لك العدّاد وخطة الأسبوع الأخير المخصّصة.
              </div>
            </div>
            <Link to="/student/ielts-atelier/trainer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: ORANGE, textDecoration: 'none', flexShrink: 0 }}>
              التواصل مع مدربك
              <ArrowLeft size={14} />
            </Link>
          </div>
        )}
      </motion.section>

      {/* ===== READINESS CHECKLIST (stepper) ===== */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>محطات الجاهزية</h2>
          <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0 }}>مبنية على تقدّمك الحقيقي — لا مجرد قائمة.</p>
        </div>
        <div>
          {checklist.map((c, i) => (
            <ChecklistRow key={c.title} done={c.done} title={c.title} subtitle={c.subtitle}
              isLast={i === checklist.length - 1} delay={0.1 + i * 0.07} reduce={reduce} />
          ))}
        </div>

        {gap != null && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, ease: EASE }}
            style={{
              marginTop: 8, padding: '18px 22px', borderRadius: 16,
              background: `linear-gradient(135deg, color-mix(in srgb, ${ORANGE} 14%, transparent), color-mix(in srgb, ${AMBER} 8%, transparent))`,
              border: `1px solid color-mix(in srgb, ${ORANGE} 28%, transparent)`, boxShadow: CARD_SHADOW,
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}
          >
            <Target size={22} style={{ color: ORANGE, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ds-text)' }}>
                {gap <= 0
                  ? `بلغت هدفك — نطاق ${targetBand.toFixed(1)}. الآن وقت تثبيته.`
                  : `أنت على بُعد ${gap.toFixed(1)} نطاق من هدفك (${targetBand.toFixed(1)}).`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ds-text-muted)', marginTop: 3 }}>
                آخر تقدير عام: {overall != null ? overall.toFixed(1) : '—'}
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* ===== DAY-OF ESSENTIALS ===== */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>يوم الاختبار</h2>
          <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0 }}>أربعة أشياء تصحبك إلى القاعة.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {DAY_OF_CHECKLIST.map((item, i) => {
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Icon size={18} style={{ color: ORANGE }} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ds-text)' }}>{item.title}</div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', lineHeight: 1.6, margin: 0 }}>{item.text}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <motion.section initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: EASE }}>
        <Link
          to={mockDone ? '/student/ielts-atelier/journey' : '/student/ielts-atelier/mock'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '24px 32px', borderRadius: 16,
            background: `linear-gradient(135deg, color-mix(in srgb, ${ORANGE} 18%, transparent), color-mix(in srgb, ${AMBER} 12%, transparent))`,
            border: `1px solid color-mix(in srgb, ${ORANGE} 35%, transparent)`, boxShadow: CARD_SHADOW,
            textDecoration: 'none', color: 'var(--ds-text)', fontSize: 16, fontWeight: 800,
            transition: 'transform 0.2s ease-out, border-color 0.2s ease-out',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = ORANGE; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `color-mix(in srgb, ${ORANGE} 35%, transparent)`; }}
        >
          <Target size={20} style={{ color: ORANGE }} />
          {mockDone ? 'مراجعة رحلتك الكاملة' : 'بدء اختبار محاكاة كامل'}
          <ArrowLeft size={16} />
        </Link>
      </motion.section>

    </div>
  );
}
