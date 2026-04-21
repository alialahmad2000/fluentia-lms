import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Target, CheckCircle2, Circle, Lock, Calendar } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useAdaptivePlan, useLatestResult, useMockAttempts } from '@/hooks/ielts/useIELTSHub';
import { useStudentId } from './_helpers/resolveStudentId';
import { useIELTSPreview } from '@/pages/admin/ielts-preview/IELTSPreviewContext';
import { getPhaseForWeek, getWeekStatus, IELTS_PHASES } from './_helpers/weekPhase';
import { generatePlan } from '@/lib/ielts/plan-generator';

import ExamCountdown from '@/design-system/components/masterclass/ExamCountdown';

function WeekMarker({ week, status, onClick, isSelected, bandDelta }) {
  const config = {
    completed: { color: '#10b981', Icon: CheckCircle2 },
    current:   { color: '#fbbf24', Icon: Circle },
    upcoming:  { color: '#6b7280', Icon: Lock },
  }[status] || { color: '#6b7280', Icon: Lock };
  const { color, Icon } = config;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '6px 4px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <motion.div
        initial={false}
        animate={{
          scale: isSelected ? 1.15 : 1,
          boxShadow: isSelected ? `0 0 0 4px color-mix(in srgb, ${color} 35%, transparent)` : '0 0 0 0px transparent',
        }}
        transition={{ duration: 0.2 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: status === 'current'
            ? `color-mix(in srgb, ${color} 85%, #000)`
            : `color-mix(in srgb, ${color} 18%, var(--sunset-base-mid, #2b1810))`,
          border: `2px solid ${color}`,
          color: status === 'current' ? '#1a0f08' : color,
          position: 'relative',
        }}
      >
        <Icon size={18} strokeWidth={2} />
        {status === 'current' && (
          <div
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              opacity: 0.4,
              animation: 'pulse-current 2s ease-in-out infinite',
            }}
          />
        )}
      </motion.div>
      <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? 'var(--ds-text)' : 'var(--ds-text-muted)' }}>
        {week}
      </div>
      {bandDelta && (
        <div style={{ fontSize: 9, color: '#10b981', fontWeight: 700 }}>
          +{bandDelta.toFixed(1)}
        </div>
      )}
      <style>{`
        @keyframes pulse-current {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50%       { transform: scale(1.15); opacity: 0.2; }
        }
      `}</style>
    </button>
  );
}

function WeekDetailPanel({ week, phase, isCurrent }) {
  return (
    <motion.div
      key={week}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      style={{
        padding: '32px 32px 28px',
        borderRadius: 20,
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--sunset-base-mid, #2b1810) 72%, transparent), color-mix(in srgb, var(--sunset-base-deep, #1a0f08) 85%, transparent))',
        border: `1px solid color-mix(in srgb, var(--sunset-amber, #f97316) ${isCurrent ? 32 : 18}%, transparent)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange, #fbbf24)', letterSpacing: 2 }}>
          {phase.subtitle.toUpperCase()}
        </div>
        {isCurrent && (
          <div
            style={{
              padding: '2px 10px',
              borderRadius: 999,
              background: 'color-mix(in srgb, #fbbf24 18%, transparent)',
              border: '1px solid color-mix(in srgb, #fbbf24 35%, transparent)',
              fontSize: 10,
              fontWeight: 700,
              color: '#fbbf24',
              letterSpacing: 1,
            }}
          >
            الحالي
          </div>
        )}
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 8 }}>
        الأسبوع {week} — {phase.title}
      </h2>
      <p style={{ fontSize: 15, color: 'var(--ds-text-muted)', lineHeight: 1.8, margin: 0, marginBottom: 24 }}>
        {phase.description}
      </p>

      {week === phase.milestoneWeek && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'color-mix(in srgb, var(--sunset-orange, #fbbf24) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--sunset-orange, #fbbf24) 25%, transparent)',
            marginBottom: 20,
          }}
        >
          <Target size={16} style={{ color: 'var(--sunset-orange, #fbbf24)' }} />
          <div style={{ fontSize: 13, color: 'var(--ds-text)' }}>
            <strong>محطة:</strong> {phase.milestone}
          </div>
        </div>
      )}

      {isCurrent && (
        <Link
          to="/student/ielts-v2"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 10,
            background: 'var(--sunset-orange, #fbbf24)',
            color: '#1a0f08',
            fontSize: 13,
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          افتح مهام اليوم
          <ArrowLeft size={14} />
        </Link>
      )}
    </motion.div>
  );
}

function PhaseOverview({ currentWeek }) {
  return (
    <section style={{ marginTop: 56 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>
          المراحل الثلاث
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0 }}>
          إيقاع الرحلة الكاملة — من البناء إلى الجاهزية.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {IELTS_PHASES.map((phase, idx) => {
          const isPast    = currentWeek > phase.weekRange[1];
          const isCurrent = currentWeek >= phase.weekRange[0] && currentWeek <= phase.weekRange[1];
          const isFuture  = currentWeek < phase.weekRange[0];
          const accent    = isCurrent ? '#fbbf24' : isPast ? '#10b981' : '#6b7280';

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              style={{
                padding: '20px',
                borderRadius: 16,
                background: 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 60%, transparent)',
                border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                opacity: isFuture ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: `color-mix(in srgb, ${accent} 15%, transparent)`,
                    color: accent,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                  }}
                >
                  {isCurrent ? 'الحالي' : isPast ? 'مكتمل' : 'قادم'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ds-text-muted)' }}>
                  الأسابيع {phase.weekRange[0]}–{phase.weekRange[1]}
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ds-text)', marginBottom: 6 }}>
                {phase.title}
              </div>
              <div style={{ fontSize: 11, color: accent, fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>
                {phase.subtitle}
              </div>
              <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', lineHeight: 1.7, margin: 0 }}>
                {phase.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default function Journey() {
  // ========== ALL HOOKS TOP ==========
  const profile = useAuthStore((s) => s.profile);
  const preview = useIELTSPreview();
  const studentId = useStudentId();

  const { data: planRow, isLoading: planLoading } = useAdaptivePlan(studentId);
  const { data: latestResult } = useLatestResult(studentId);
  const { data: mockAttempts } = useMockAttempts(studentId);

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
  const examDate    = planRow?.exam_date || preview?.mockStudent?.exam_date || null;

  const displayName = preview?.previewMode
    ? 'المتعلم'
    : (profile?.full_name?.split(' ')[0] || 'المتعلم');

  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const selectedPhase = getPhaseForWeek(selectedWeek);

  // Band deltas from completed mocks (useMockAttempts returns {inProgress, completed, total})
  const bandDeltas = useMemo(() => {
    const out = {};
    const completed = mockAttempts?.completed || [];
    if (completed.length < 2) return out;
    // No overall_band in the select — just return empty (no deltas shown until result data is richer)
    return out;
  }, [mockAttempts]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 80 }}>

      {/* ========== HERO ========== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: '24px 0 32px' }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--sunset-orange, #fbbf24)',
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          THE JOURNEY
        </div>
        <h1
          style={{
            fontSize: 'clamp(32px, 4.2vw, 50px)',
            fontWeight: 900,
            color: 'var(--ds-text)',
            margin: 0,
            marginBottom: 14,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          رحلة{' '}
          <span style={{ color: 'var(--sunset-orange, #fbbf24)' }}>١٢ أسبوعاً</span>
          {' '}— محسوبة.
        </h1>
        <p style={{ fontSize: 17, color: 'var(--ds-text-muted)', lineHeight: 1.7, margin: 0, maxWidth: 640 }}>
          لا سباق. لا ضغط. إيقاع ثابت يأخذك من حيث أنت إلى هدفك.
        </p>
      </motion.section>

      {/* ========== EXAM COUNTDOWN ========== */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ marginBottom: 40 }}
      >
        {examDate ? (
          <ExamCountdown examDate={examDate} studentName={displayName} />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '20px 24px',
              borderRadius: 16,
              background: 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 55%, transparent)',
              border: '1px solid color-mix(in srgb, var(--sunset-amber, #f97316) 18%, transparent)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <Calendar size={20} style={{ color: 'var(--sunset-orange, #fbbf24)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ds-text)' }}>
                لم يُحدّد بعد
              </div>
              <div style={{ fontSize: 12, color: 'var(--ds-text-muted)', marginTop: 2 }}>
                تواصل مع مدربك لتحديد يوم اختبارك.
              </div>
            </div>
          </div>
        )}
      </motion.section>

      {/* ========== 12-WEEK TIMELINE ========== */}
      <section
        style={{
          marginBottom: 32,
          padding: '24px 20px 12px',
          borderRadius: 20,
          background: 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 55%, transparent)',
          border: '1px solid color-mix(in srgb, var(--sunset-amber, #f97316) 18%, transparent)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sunset-orange, #fbbf24)', letterSpacing: 2 }}>
            THE TWELVE WEEKS
          </div>
        </div>

        <div style={{ position: 'relative', padding: '12px 8px' }}>
          {/* Connecting line */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 34,
              left: 24,
              right: 24,
              height: 2,
              background: `linear-gradient(90deg, #10b981 0%, #10b981 ${((currentWeek - 1) / 11 * 100)}%, #fbbf24 ${((currentWeek - 1) / 11 * 100)}%, #fbbf24 ${(currentWeek / 11 * 100)}%, rgba(107,114,128,0.3) ${(currentWeek / 11 * 100)}%)`,
              borderRadius: 999,
              opacity: 0.6,
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 4,
              position: 'relative',
              zIndex: 1,
              overflowX: 'auto',
              minWidth: 600,
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => (
              <WeekMarker
                key={week}
                week={week}
                status={getWeekStatus(week, currentWeek)}
                onClick={() => setSelectedWeek(week)}
                isSelected={selectedWeek === week}
                bandDelta={bandDeltas[week]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ========== SELECTED WEEK DETAIL ========== */}
      <section style={{ marginBottom: 40 }}>
        <AnimatePresence mode="wait">
          <WeekDetailPanel
            key={selectedWeek}
            week={selectedWeek}
            phase={selectedPhase}
            isCurrent={selectedWeek === currentWeek}
          />
        </AnimatePresence>
      </section>

      {/* ========== 3 PHASES OVERVIEW ========== */}
      <PhaseOverview currentWeek={currentWeek} />

      {/* ========== FOOTER NAV ========== */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
        <Link
          to="/student/ielts-v2"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            borderRadius: 12,
            background: 'color-mix(in srgb, var(--sunset-base-mid, #2b1810) 70%, transparent)',
            border: '1px solid color-mix(in srgb, var(--sunset-amber, #f97316) 25%, transparent)',
            color: 'var(--ds-text)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <ArrowRight size={14} />
          العودة للرئيسية
        </Link>
      </div>

    </div>
  );
}
