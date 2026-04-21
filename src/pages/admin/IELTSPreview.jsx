import React, { useState, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Target, Eye } from 'lucide-react';

import { PHASES, SACRED_PAGES, getPageById, getPhaseById } from './ielts-preview/ieltsSacredPages';
import { IELTSPreviewProvider } from './ielts-preview/IELTSPreviewContext';
import PhaseTimeline from './ielts-preview/PhaseTimeline';
import SacredPageCard from './ielts-preview/SacredPageCard';

function InlinePreviewBanner({ pageTitle, onBack }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 20px',
        marginBottom: 20,
        borderRadius: 14,
        background: 'linear-gradient(90deg, color-mix(in srgb, #38bdf8 18%, transparent), color-mix(in srgb, #fbbf24 12%, transparent))',
        border: '1px solid color-mix(in srgb, #38bdf8 35%, transparent)',
      }}
    >
      <Eye size={18} style={{ color: '#38bdf8' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ds-text)' }}>
          وضع المعاينة: {pageTitle}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', marginTop: 2 }}>
          تعاين صفحة IELTS V2 — كما يراها الطالب. لا يتم حفظ أي تغييرات.
        </div>
      </div>
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 10,
          background: 'var(--ds-surface)',
          border: '1px solid var(--ds-border)',
          color: 'var(--ds-text)',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <ArrowRight size={14} style={{ transform: 'scaleX(-1)' }} />
        العودة للمعاينة
      </button>
    </div>
  );
}

function HeroLanding() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative',
        padding: '56px 40px 48px',
        borderRadius: 24,
        marginBottom: 32,
        background:
          'radial-gradient(ellipse 80% 100% at 50% 0%, color-mix(in srgb, #38bdf8 18%, transparent) 0%, transparent 55%), linear-gradient(135deg, var(--ds-surface) 0%, color-mix(in srgb, var(--ds-surface) 92%, #000) 100%)',
        border: '1px solid var(--ds-border)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, #fbbf24 14%, transparent), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -60,
          left: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, #38bdf8 12%, transparent), transparent 70%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'color-mix(in srgb, #fbbf24 12%, transparent)',
            border: '1px solid color-mix(in srgb, #fbbf24 30%, transparent)',
            marginBottom: 18,
          }}
        >
          <Target size={12} style={{ color: '#fbbf24' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', letterSpacing: 2 }}>
            IELTS MASTERCLASS V2 · ADMIN PREVIEW
          </span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(32px, 4.5vw, 52px)',
            fontWeight: 900,
            color: 'var(--ds-text)',
            margin: 0,
            marginBottom: 16,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          معاينة منهج <span style={{ color: '#fbbf24' }}>IELTS</span>
        </h1>

        <p
          style={{
            fontSize: 16,
            color: 'var(--ds-text-muted)',
            lineHeight: 1.7,
            margin: 0,
            marginBottom: 28,
            maxWidth: 620,
          }}
        >
          الصفحات الإحدى عشر المقدّسة لرحلة IELTS الكاملة. منظّمة على سبع مراحل — من الأساس إلى يوم الاختبار.
          اضغط أي مرحلة للانتقال إليها، أو أي صفحة لمعاينتها كما يراها الطالب.
        </p>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--ds-text)' }}>١١</div>
            <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', letterSpacing: 1 }}>صفحة مقدّسة</div>
          </div>
          <div style={{ width: 1, background: 'var(--ds-border)' }} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--ds-text)' }}>٧</div>
            <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', letterSpacing: 1 }}>مراحل تطوّر</div>
          </div>
          <div style={{ width: 1, background: 'var(--ds-border)' }} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--ds-text)' }}>١٢</div>
            <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', letterSpacing: 1 }}>أسبوع رحلة</div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default function IELTSPreview() {
  const [activePageId, setActivePageId] = useState(null);
  const [activePhaseFilter, setActivePhaseFilter] = useState(null);

  const activePage = useMemo(() => (activePageId ? getPageById(activePageId) : null), [activePageId]);

  const visiblePages = useMemo(() => {
    if (!activePhaseFilter) return SACRED_PAGES;
    return SACRED_PAGES.filter((p) => p.phase === activePhaseFilter);
  }, [activePhaseFilter]);

  const handlePhaseClick = (phaseId) => {
    setActivePhaseFilter((curr) => (curr === phaseId ? null : phaseId));
  };

  const handlePageOpen = (pageId) => {
    setActivePageId(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setActivePageId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============ INLINE RENDER MODE ============
  if (activePage) {
    const PageComponent = activePage.Component;
    return (
      <IELTSPreviewProvider>
        <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
          <InlinePreviewBanner pageTitle={activePage.title} onBack={handleBack} />
          <div
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid var(--ds-border)',
              background: 'var(--ds-bg)',
            }}
          >
            <Suspense fallback={<div style={{ padding: 80, textAlign: 'center', color: 'var(--ds-text-muted)' }}>جاري التحميل…</div>}>
              <PageComponent />
            </Suspense>
          </div>
        </div>
      </IELTSPreviewProvider>
    );
  }

  // ============ LANDING MODE ============
  return (
    <IELTSPreviewProvider>
      <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif', paddingBottom: 60 }}>
        <HeroLanding />

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--ds-text-muted)',
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            THE SEVEN PHASES
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>
            الخط الزمني للمراحل
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0, marginBottom: 4 }}>
            {activePhaseFilter ? (
              <>
                فلتر نشط:{' '}
                <span style={{ color: 'var(--ds-text)', fontWeight: 700 }}>
                  {getPhaseById(activePhaseFilter)?.title}
                </span>{' '}
                — اضغط مرة أخرى لإلغاء الفلتر
              </>
            ) : (
              'اضغط أي مرحلة لعرض صفحاتها فقط'
            )}
          </p>
        </div>

        <div
          style={{
            padding: '8px 12px',
            borderRadius: 20,
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
            marginBottom: 32,
          }}
        >
          <PhaseTimeline activePhaseId={activePhaseFilter} onPhaseClick={handlePhaseClick} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ds-text)', margin: 0, marginBottom: 4 }}>
            {activePhaseFilter ? getPhaseById(activePhaseFilter)?.title : 'كل الصفحات المقدّسة'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ds-text-muted)', margin: 0 }}>
            {visiblePages.length} من {SACRED_PAGES.length} صفحة
          </p>
        </div>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={activePhaseFilter || 'all'}
            layout
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {visiblePages.map((page, idx) => (
              <SacredPageCard
                key={page.id}
                page={page}
                index={idx}
                onClick={() => handlePageOpen(page.id)}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        <div
          style={{
            marginTop: 36,
            padding: '16px 20px',
            borderRadius: 14,
            background: 'color-mix(in srgb, #fbbf24 6%, transparent)',
            border: '1px solid color-mix(in srgb, #fbbf24 18%, transparent)',
            fontSize: 12,
            color: 'var(--ds-text-muted)',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: '#fbbf24' }}>ملاحظة إدارية:</strong>{' '}
          الطلاب لا يرون هذه الصفحات حتى Phase 6 — مُقفلة خلف feature flag. المحتوى الحالي = scaffold placeholders؛ المحتوى الحقيقي يُضاف في Phase 1 إلى 6.
        </div>
      </div>
    </IELTSPreviewProvider>
  );
}
