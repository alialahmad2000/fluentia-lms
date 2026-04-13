import { useEffect, useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowRight, ArrowLeft, Clock, ChevronLeft } from 'lucide-react'
import { useCurriculumData } from './useCurriculumData'
import { ProgressRing, StatusChip, getUnitStatus, LoadingSkeleton, EmptyState } from './shared'
import { tracker } from '../../../../services/activityTracker'

/* ──── V3 tokens ──── */
const V3 = {
  bg: '#030712',
  bgLayer: '#0b1220',
  cyan: '#38bdf8',
  violet: '#a78bfa',
  pink: '#f472b6',
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  t1: '#f1f5f9',
  t2: '#94a3b8',
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] } }),
}

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }

function useFonts() {
  useEffect(() => {
    if (!document.getElementById('v3-fonts')) {
      const link = document.createElement('link')
      link.id = 'v3-fonts'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cairo:wght@400;600;700;800&display=swap'
      document.head.appendChild(link)
    }
  }, [])
}

/* Aurora CSS keyframes */
function useAuroraStyles() {
  useEffect(() => {
    if (!document.getElementById('v3-aurora')) {
      const style = document.createElement('style')
      style.id = 'v3-aurora'
      style.textContent = `
        @keyframes v3-drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(80px,40px)}}
        @keyframes v3-drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-60px,50px)}}
        @keyframes v3-drift3{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-60px)}}
        @keyframes v3-drift4{0%,100%{transform:translate(0,0)}50%{transform:translate(-50px,-30px)}}
      `
      document.head.appendChild(style)
    }
  }, [])
}

export default function LevelUnitsV3() {
  useFonts()
  useAuroraStyles()
  const { level, units, chapters, progressMap, levelProgress, nextUnit, loading, levelColor, levelNum, navigate } = useCurriculumData()

  if (loading) return <LoadingSkeleton />
  if (!level) return null

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", color: V3.t1, minHeight: '100vh', position: 'relative' }}>

      {/* ═══ Aurora Background ═══ */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden>
        <div style={{ position: 'absolute', inset: 0, background: V3.bg }} />

        {/* Aurora blobs */}
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(120px)' }}>
          <div style={{ position: 'absolute', width: '1000px', height: '1000px', borderRadius: '50%', top: '5%', left: '10%', background: `radial-gradient(circle, ${V3.cyan}33, transparent 70%)`, animation: 'v3-drift1 45s ease-in-out infinite', willChange: 'transform' }} />
          <div style={{ position: 'absolute', width: '900px', height: '900px', borderRadius: '50%', top: '15%', right: '5%', background: `radial-gradient(circle, ${V3.violet}2E, transparent 70%)`, animation: 'v3-drift2 52s ease-in-out infinite', willChange: 'transform' }} />
          <div style={{ position: 'absolute', width: '800px', height: '800px', borderRadius: '50%', top: '55%', right: '10%', background: `radial-gradient(circle, ${V3.pink}26, transparent 70%)`, animation: 'v3-drift3 48s ease-in-out infinite', willChange: 'transform' }} />
          <div style={{ position: 'absolute', width: '1100px', height: '1100px', borderRadius: '50%', top: '80%', left: '30%', background: `radial-gradient(circle, ${V3.cyan}2E, transparent 70%)`, animation: 'v3-drift4 55s ease-in-out infinite', willChange: 'transform' }} />
        </div>

        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Noise */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        {/* Edge fades */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '120px', background: `linear-gradient(to bottom, ${V3.bg}, transparent)` }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px', background: `linear-gradient(to top, ${V3.bg}, transparent)` }} />
      </div>

      {/* ═══ Content ═══ */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

        {/* ═══ HERO ═══ */}
        <section style={{ padding: '64px 0 40px' }}>
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>

            {/* Back */}
            <motion.button
              variants={fadeUp}
              onClick={() => navigate('/student/curriculum')}
              className="inline-flex items-center gap-2 mb-6 transition-colors"
              style={{ fontSize: '14px', color: V3.t2 }}
            >
              <ArrowRight size={16} />
              العودة للمستويات
            </motion.button>

            {/* Level badge */}
            <motion.div variants={fadeUp} className="mb-4">
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '5px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
                background: V3.glass, border: `1px solid ${V3.glassBorder}`, backdropFilter: 'blur(12px)',
                color: V3.t1,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: levelColor }} />
                {level.cefr}
              </span>
            </motion.div>

            {/* Main heading */}
            <motion.h1 variants={fadeUp} style={{
              fontFamily: "'Cairo', sans-serif", fontSize: 'clamp(40px, 8vw, 56px)',
              fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '12px',
              background: `linear-gradient(135deg, ${V3.cyan}, ${V3.violet}, ${V3.pink})`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              {level.name_ar}
            </motion.h1>

            {/* English sub */}
            <motion.p variants={fadeUp} style={{
              fontSize: '18px', color: V3.t2, letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif", marginBottom: '8px',
            }} dir="ltr">
              {level.name_en}
            </motion.p>

            {/* Description */}
            {level.description_ar && (
              <motion.p variants={fadeUp} style={{ fontSize: '17px', color: V3.t2, lineHeight: 1.7, maxWidth: '600px', marginBottom: '24px' }}>
                {level.description_ar}
              </motion.p>
            )}

            {/* Stats glass bar */}
            <motion.div
              variants={fadeUp}
              style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1px',
                background: V3.glassBorder, borderRadius: '16px', overflow: 'hidden',
                marginBottom: '24px',
              }}
            >
              <StatCell label="وحدات" value={`${levelProgress.completedUnits}/${levelProgress.totalUnits}`} gradient={`linear-gradient(135deg, ${V3.cyan}, ${V3.violet})`} />
              <StatCell label="تقدّم" value={`${levelProgress.overallPercent}%`} gradient={`linear-gradient(135deg, ${V3.violet}, ${V3.pink})`} />
              <div style={{ padding: '16px 20px', background: V3.glass, backdropFilter: 'blur(24px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                <ProgressRing percent={levelProgress.overallPercent} size={56} strokeWidth={4} color={V3.cyan} bgColor="rgba(255,255,255,0.06)" />
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              {nextUnit && (
                <button
                  onClick={() => { tracker.track('unit_selected', { unit_id: nextUnit.id }); navigate(`/student/curriculum/unit/${nextUnit.id}`) }}
                  className="inline-flex items-center gap-2 font-bold transition-all"
                  style={{
                    padding: '12px 24px', borderRadius: '12px', fontSize: '15px',
                    background: `linear-gradient(135deg, ${V3.cyan}, ${V3.violet})`, color: '#fff',
                    boxShadow: `0 4px 20px ${V3.cyan}30`,
                  }}
                >
                  متابعة التعلّم
                  <ArrowLeft size={18} />
                </button>
              )}
            </motion.div>
          </motion.div>
        </section>

        {/* ═══ CHAPTERS ═══ */}
        {units.length === 0 ? <EmptyState /> : chapters.map((chapter, ci) => (
          <section key={ci} style={{ marginBottom: '56px' }}>
            {/* Chapter divider — minimalist */}
            <motion.div
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="flex items-center gap-3 mb-8"
              style={{ padding: '48px 0 0' }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: V3.cyan }} />
              <div style={{ flex: 1, height: '1px', background: V3.glassBorder }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: V3.t2 }} dir="ltr">
                CHAPTER {String(ci + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: V3.t1 }}>
                {chapter.name}
              </span>
              <div style={{ flex: 1, height: '1px', background: V3.glassBorder }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: V3.cyan }} />
            </motion.div>

            {/* 3-column glass grid */}
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chapter.units.map(unit => (
                <V3Card key={unit.id} unit={unit} progress={getUnitStatus(progressMap, unit.id)} levelColor={levelColor} navigate={navigate} levelNum={levelNum} />
              ))}
            </motion.div>
          </section>
        ))}
      </div>
    </div>
  )
}

/* ──── Stat Cell ──── */
function StatCell({ label, value, gradient }) {
  return (
    <div style={{ flex: 1, minWidth: '120px', padding: '16px 20px', background: V3.glass, backdropFilter: 'blur(24px)', textAlign: 'center' }}>
      <div style={{
        fontSize: '24px', fontWeight: 800, fontFamily: "'Inter', sans-serif",
        background: gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        lineHeight: 1.2,
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: V3.t2, marginTop: '4px' }}>{label}</div>
    </div>
  )
}

/* ──── V3 Glass Card with cursor-magnetic hover ──── */
function V3Card({ unit, progress, levelColor, navigate, levelNum }) {
  const cardRef = useRef(null)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  const gradientX = useTransform(mouseX, [0, 1], ['0%', '100%'])
  const gradientY = useTransform(mouseY, [0, 1], ['0%', '100%'])

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }, [mouseX, mouseY])

  const hasCover = !!unit.cover_image_url

  return (
    <motion.div
      ref={cardRef}
      variants={fadeUp}
      onClick={() => { tracker.track('unit_selected', { unit_id: unit.id, unit_number: unit.unit_number, level: levelNum }); navigate(`/student/curriculum/unit/${unit.id}`) }}
      onMouseMove={handleMouseMove}
      className="cursor-pointer overflow-hidden group"
      style={{
        borderRadius: '20px', border: `1px solid ${V3.glassBorder}`,
        background: V3.glass, backdropFilter: 'blur(24px) saturate(140%)',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        position: 'relative',
      }}
      whileHover={{ y: -8, borderColor: `${V3.cyan}40`, boxShadow: `0 16px 48px ${V3.cyan}12` }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* Cursor-following gradient */}
      <motion.div
        style={{
          position: 'absolute', inset: 0, borderRadius: '20px', pointerEvents: 'none', opacity: 0,
          background: `radial-gradient(400px circle at ${gradientX} ${gradientY}, ${V3.cyan}12, transparent 60%)`,
          transition: 'opacity 0.3s',
        }}
        className="group-hover:!opacity-100"
      />

      {/* Cover */}
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '20px 20px 0 0' }}>
        {hasCover ? (
          <img src={unit.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${levelColor}40, ${V3.bgLayer})` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${V3.bg}DD, transparent 50%)` }} />

        {/* Unit badge */}
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
          background: V3.glass, backdropFilter: 'blur(12px)', border: `1px solid ${V3.glassBorder}`,
          color: V3.t1,
        }}>
          <span style={{ background: `linear-gradient(135deg, ${V3.cyan}, ${V3.violet})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {unit.unit_number}
          </span>
        </div>

        {/* Status dot */}
        {progress.status === 'in_progress' && (
          <div style={{ position: 'absolute', top: '14px', left: '14px', width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', animation: 'pulse 2s infinite' }} />
        )}
        {progress.status === 'completed' && (
          <div style={{ position: 'absolute', top: '14px', left: '14px', width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px 20px', position: 'relative' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: V3.t1, marginBottom: '4px' }}>
          {unit.theme_ar}
        </h3>
        {unit.theme_en && (
          <p style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: V3.t2, marginBottom: '12px', fontFamily: "'Inter', sans-serif" }} dir="ltr">
            {unit.theme_en}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <StatusChip status={progress.status} size="sm" />
          <div className="flex items-center gap-2">
            {unit.estimated_minutes && (
              <span className="flex items-center gap-1" style={{ fontSize: '12px', color: V3.t2 }}>
                <Clock size={13} /> {unit.estimated_minutes}د
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        {progress.percent > 0 && (
          <div style={{ marginTop: '12px', height: '2px', borderRadius: '1px', background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              style={{
                height: '100%', borderRadius: '1px',
                background: progress.status === 'completed' ? '#4ade80' : `linear-gradient(90deg, ${V3.cyan}, ${V3.violet})`,
              }}
            />
          </div>
        )}

        {/* Hover arrow */}
        <div className="absolute bottom-5 left-5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: V3.cyan }}>
          <ChevronLeft size={18} />
        </div>
      </div>
    </motion.div>
  )
}
