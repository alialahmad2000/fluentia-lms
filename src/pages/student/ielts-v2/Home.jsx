import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Headphones, PenLine, Mic, Target, MessageCircle } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useAdaptivePlan, useLatestResult, useSkillProgress } from '@/hooks/ielts/useIELTSHub';
import { useStudentId } from './_helpers/resolveStudentId';
import { useIELTSPreview } from '@/pages/admin/ielts-preview/IELTSPreviewContext';
import { getPhaseForWeek, getWeekLabel } from './_helpers/weekPhase';
import { deriveTodayFocus } from './_helpers/todayFocus';
import { generatePlan } from '@/lib/ielts/plan-generator';

import BandDisplay from '@/design-system/components/masterclass/BandDisplay';
import TrainerPresence from '@/design-system/components/masterclass/TrainerPresence';

const SKILLS = [
  { id: 'reading',   icon: BookOpen,   title: 'القراءة',   english: 'Reading',   color: '#fbbf24', scoreField: 'reading_score' },
  { id: 'listening', icon: Headphones, title: 'الاستماع',  english: 'Listening', color: '#f97316', scoreField: 'listening_score' },
  { id: 'writing',   icon: PenLine,    title: 'الكتابة',   english: 'Writing',   color: '#fb923c', scoreField: 'writing_score' },
  { id: 'speaking',  icon: Mic,        title: 'المحادثة',  english: 'Speaking',  color: '#f59e0b', scoreField: 'speaking_score' },
];

function SkillCard({ skill, bandScore, lastUpdated, targetBand }) {
  const Icon = skill.icon;
  const pct = bandScore && targetBand ? Math.min(100, (bandScore / targetBand) * 100) : 0;
  const hasData = bandScore != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '20px 20px 22px',
        borderRadius: 16,
        background: 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 72%, transparent)',
        border: `1px solid color-mix(in srgb, ${skill.color} 18%, transparent)`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `color-mix(in srgb, ${skill.color} 20%, transparent)`,
            color: skill.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ds-text)' }}>{skill.title}</div>
          <div style={{ fontSize: 10, color: 'var(--ds-text-muted)', letterSpacing: 1 }}>{skill.english}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: hasData ? skill.color : 'var(--ds-text-muted)' }}>
          {hasData ? bandScore.toFixed(1) : '—'}
        </div>
        {hasData && targetBand && (
          <div style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>/ {targetBand.toFixed(1)}</div>
        )}
      </div>

      {hasData ? (
        <>
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: 'color-mix(in srgb, #000 30%, transparent)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${skill.color}, color-mix(in srgb, ${skill.color} 70%, #fff))`,
                borderRadius: 999,
              }}
            />
          </div>
          {lastUpdated && (
            <div style={{ fontSize: 10, color: 'var(--ds-text-muted)', marginTop: 8 }}>
              آخر قياس: {new Date(lastUpdated).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>
          بحاجة لتشخيص أولي
        </div>
      )}
    </motion.div>
  );
}

function FocusCard({ item, index }) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.08 }}
    >
      <Link
        to={item.path}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '18px 20px',
          borderRadius: 16,
          background: 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 60%, transparent)',
          border: `1px solid color-mix(in srgb, ${item.skillColor} 22%, transparent)`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'transform 0.2s, border-color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = item.skillColor; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = `color-mix(in srgb, ${item.skillColor} 22%, transparent)`; }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `color-mix(in srgb, ${item.skillColor} 18%, transparent)`,
            color: item.skillColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ds-text)' }}>{item.title}</div>
          {item.subtitle && (
            <div style={{ fontSize: 12, color: 'var(--ds-text-muted)', marginTop: 2 }}>{item.subtitle}</div>
          )}
          {item.duration && (
            <div style={{ fontSize: 11, color: item.skillColor, marginTop: 4, fontWeight: 600 }}>{item.duration}</div>
          )}
        </div>
        <div style={{ color: item.skillColor, flexShrink: 0 }}>
          <ArrowLeft size={16} />
        </div>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  // ========== ALL HOOKS TOP ==========
  const profile = useAuthStore((s) => s.profile);
  const preview = useIELTSPreview();
  const studentId = useStudentId();

  const { data: planRow, isLoading: planLoading } = useAdaptivePlan(studentId);
  const { data: latestResult } = useLatestResult(studentId);
  const { data: skillProgress } = useSkillProgress(studentId);

  // Generate fallback plan client-side when no DB row (< 50ms, no API)
  const plan = useMemo(() => {
    if (planRow) return planRow;
    if (preview?.previewMode) {
      try { return generatePlan({ studentId: 'preview', targetBand: 7.0 }); } catch { return null; }
    }
    if (studentId && !planLoading) {
      try { return generatePlan({ studentId, targetBand: 7.0 }); } catch { return null; }
    }
    return null;
  }, [planRow, preview, studentId, planLoading]);

  const currentWeek = planRow?.current_week || preview?.mockStudent?.current_week || 1;
  const targetBand = planRow?.target_band || preview?.mockStudent?.target_band || 7.0;
  const phase = getPhaseForWeek(currentWeek);
  const todayFocus = useMemo(() => deriveTodayFocus(plan), [plan]);

  const displayName = preview?.previewMode
    ? 'طالب المعاينة'
    : (profile?.full_name?.split(' ')[0] || 'يا مُتعلّم');

  const hasAnyResults = !!latestResult;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 80 }}>

      {/* ========== 1. HERO GREETING ========== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 32,
          padding: '24px 0 40px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 400px', minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--sunset-orange, #fbbf24)',
              letterSpacing: 2,
              marginBottom: 10,
            }}
          >
            IELTS MASTERCLASS
          </div>
          <h1
            style={{
              fontSize: 'clamp(30px, 4vw, 46px)',
              fontWeight: 900,
              color: 'var(--ds-text)',
              margin: 0,
              marginBottom: 14,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            السلام عليكم،{' '}
            <span style={{ color: 'var(--sunset-orange, #fbbf24)' }}>{displayName}</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ds-text-muted)', lineHeight: 1.7, margin: 0, maxWidth: 560 }}>
            {hasAnyResults ? (
              <>
                أنت في{' '}
                <strong style={{ color: 'var(--ds-text)' }}>{getWeekLabel(currentWeek)}</strong>
                {' '}— مرحلة{' '}
                <strong style={{ color: 'var(--sunset-orange, #fbbf24)' }}>{phase.title}</strong>.
              </>
            ) : (
              <>مستعد للبداية؟ لنبدأ بتشخيص بسيط — ثم نرسم خطتك.</>
            )}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          style={{ flex: '0 0 auto' }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--ds-text-muted)', letterSpacing: 1.5, marginBottom: 6 }}>
              هدفك
            </div>
            <BandDisplay band={targetBand} size="md" />
          </div>
        </motion.div>
      </motion.section>

      {/* ========== 2. TODAY'S FOCUS ========== */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>
            اليوم —{' '}
            {todayFocus.length === 1 ? 'خطوة' : `${todayFocus.length} خطوات`}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0 }}>
            {hasAnyResults ? 'ابدأ بما تشعر به أكثر استعداداً.' : 'الخطوة الأولى في رحلتك.'}
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: todayFocus.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {todayFocus.map((item, i) => <FocusCard key={item.id} item={item} index={i} />)}
        </div>
      </section>

      {/* ========== 3. CURRENT STANDING ========== */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>
            مستواك الحالي
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0 }}>
            {hasAnyResults
              ? `آخر تحديث: نتيجة ${latestResult?.result_type === 'diagnostic' ? 'تشخيصي' : 'اختبار'}`
              : 'ستظهر درجاتك هنا بعد أول تشخيص.'}
          </p>
        </div>

        {!hasAnyResults ? (
          <Link
            to="/student/ielts-v2/diagnostic"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '28px 32px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--sunset-orange, #fbbf24) 18%, transparent), color-mix(in srgb, var(--sunset-amber, #f97316) 12%, transparent))',
              border: '1px solid color-mix(in srgb, var(--sunset-orange, #fbbf24) 35%, transparent)',
              textDecoration: 'none',
              color: 'var(--ds-text)',
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            <Target size={20} style={{ color: 'var(--sunset-orange, #fbbf24)' }} />
            ابدأ الاختبار التشخيصي
            <ArrowLeft size={16} />
          </Link>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            {SKILLS.map((skill) => {
              const skillData = skillProgress?.[skill.id];
              const bandScore = skillData?.band ?? (latestResult?.[skill.scoreField] ?? null);
              const lastUpdated = latestResult?.created_at || null;
              return (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  bandScore={bandScore}
                  lastUpdated={lastUpdated}
                  targetBand={targetBand}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ========== 4. THIS WEEK ========== */}
      <section style={{ marginBottom: 56 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>
            هذا الأسبوع
          </h2>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '28px 28px 24px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--sunset-base-mid, #2b1810) 70%, transparent), color-mix(in srgb, var(--sunset-base-deep, #1a0f08) 85%, transparent))',
            border: '1px solid color-mix(in srgb, var(--sunset-amber, #f97316) 22%, transparent)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                background: 'color-mix(in srgb, var(--sunset-orange, #fbbf24) 16%, transparent)',
                color: 'var(--sunset-orange, #fbbf24)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              {phase.subtitle.toUpperCase()}
            </div>
          </div>
          <h3 style={{ fontSize: 24, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 8 }}>
            {getWeekLabel(currentWeek)} — {phase.title}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--ds-text-muted)', lineHeight: 1.7, margin: 0, marginBottom: 18 }}>
            {phase.description}
          </p>
          <Link
            to="/student/ielts-v2/journey"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--sunset-orange, #fbbf24)',
              textDecoration: 'none',
            }}
          >
            افتح رحلتك الكاملة
            <ArrowLeft size={14} />
          </Link>
        </motion.div>
      </section>

      {/* ========== 5. TRAINER PRESENCE ========== */}
      <section>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>
            نحن معك في كل خطوة.
          </h2>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '20px 24px',
            borderRadius: 16,
            background: 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 55%, transparent)',
            border: '1px solid color-mix(in srgb, var(--sunset-amber, #f97316) 18%, transparent)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrainerPresence trainerName="د. علي" size="md" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-text)' }}>د. علي</div>
                <div style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>مدرب IELTS</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrainerPresence trainerName="د. محمد" size="md" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ds-text)' }}>د. محمد</div>
                <div style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>مدرب IELTS</div>
              </div>
            </div>
          </div>
          <Link
            to="/student/ielts-v2/trainer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--sunset-orange, #fbbf24)',
              textDecoration: 'none',
            }}
          >
            <MessageCircle size={14} />
            افتح غرفة المدرب
            <ArrowLeft size={14} />
          </Link>
        </div>
      </section>

    </div>
  );
}
