import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Clock, Sparkles } from 'lucide-react'
import { useCurriculumData } from './useCurriculumData'
import { ProgressRing, StatusChip, getUnitStatus, LoadingSkeleton, EmptyState } from './shared'
import { tracker } from '../../../../services/activityTracker'

/* ──── V1 tokens ──── */
const V1 = {
  bg: '#0a0a0f',
  bgLayer: '#111119',
  cyan: '#00d4ff',
  gold: '#f5c842',
  t1: '#ffffff',
  t2: '#9ca3af',
  border: 'rgba(255,255,255,0.08)',
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] } }),
}

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } }

/* ──── V1 Fonts ──── */
function useFonts() {
  useEffect(() => {
    if (!document.getElementById('v1-fonts')) {
      const link = document.createElement('link')
      link.id = 'v1-fonts'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter+Tight:wght@400;600;800&family=Amiri:wght@700&display=swap'
      document.head.appendChild(link)
    }
  }, [])
}

export default function LevelUnitsV1() {
  useFonts()
  const { level, units, chapters, progressMap, levelProgress, nextUnit, loading, levelColor, levelNum, navigate } = useCurriculumData()

  if (loading) return <LoadingSkeleton />
  if (!level) return null

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: V1.t1, minHeight: '100vh', position: 'relative' }}>

      {/* ═══ Background ═══ */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
        <div style={{ position: 'absolute', inset: 0, background: V1.bg }} />
        {level.cover_image_url && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${level.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(40px) brightness(0.35) saturate(1.3)', transform: 'scale(1.1)',
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 0%, rgba(10,10,15,0.4) 50%, rgba(10,10,15,0.95) 100%)' }} />
        {/* Film grain */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        {/* Cinematic lines */}
        <div style={{ position: 'absolute', top: '20%', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${V1.gold}30, transparent)` }} />
        <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${V1.cyan}25, transparent)` }} />
      </div>

      {/* ═══ Content wrapper ═══ */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

        {/* ═══ HERO ═══ */}
        <section style={{ padding: '80px 0 60px', position: 'relative' }}>
          {/* Bg typography */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, fontSize: '180px', fontWeight: 800,
            fontFamily: "'Inter Tight', sans-serif", letterSpacing: '-0.05em', lineHeight: 1,
            background: `linear-gradient(135deg, ${V1.cyan}, ${V1.gold})`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            opacity: 0.06, pointerEvents: 'none', userSelect: 'none',
          }} dir="ltr">
            {level.cefr}
          </div>

          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {/* Back */}
            <motion.button
              variants={fadeUp}
              onClick={() => navigate('/student/curriculum')}
              className="inline-flex items-center gap-2 mb-8 transition-colors"
              style={{ fontSize: '14px', color: `${V1.gold}99` }}
            >
              <ArrowRight size={16} />
              العودة للمستويات
            </motion.button>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
              <div className="flex-1">
                {/* Level name */}
                <motion.h1 variants={fadeUp} style={{
                  fontFamily: "'Playfair Display', 'Amiri', serif", fontSize: 'clamp(48px, 8vw, 72px)',
                  fontWeight: 700, lineHeight: 1.1, marginBottom: '12px',
                }}>
                  {level.name_ar}
                </motion.h1>

                {/* English subtitle */}
                <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
                  <div style={{ width: 30, height: 1, background: V1.gold }} />
                  <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '20px', color: V1.gold, fontStyle: 'italic' }} dir="ltr">
                    {level.name_en}
                  </span>
                  <span style={{
                    fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px',
                    background: `${V1.cyan}15`, color: V1.cyan, border: `1px solid ${V1.cyan}30`,
                  }}>
                    {level.cefr}
                  </span>
                </motion.div>

                {/* Description */}
                {level.description_ar && (
                  <motion.p variants={fadeUp} style={{ fontSize: '17px', color: V1.t2, lineHeight: 1.8, maxWidth: '520px' }}>
                    {level.description_ar}
                  </motion.p>
                )}

                {/* Stats pills */}
                <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mt-6">
                  <Pill label="وحدة مكتملة" value={`${levelProgress.completedUnits}/${levelProgress.totalUnits}`} color={V1.cyan} />
                  <Pill label="التقدّم" value={`${levelProgress.overallPercent}%`} color={V1.gold} />
                </motion.div>

                {/* CTA */}
                {nextUnit && (
                  <motion.button
                    variants={fadeUp}
                    onClick={() => { tracker.track('unit_selected', { unit_id: nextUnit.id }); navigate(`/student/curriculum/unit/${nextUnit.id}`) }}
                    className="mt-8 inline-flex items-center gap-2 font-bold transition-all"
                    style={{
                      padding: '12px 28px', borderRadius: '999px', fontSize: '15px',
                      border: `2px solid ${V1.gold}60`, color: V1.gold, background: 'transparent',
                    }}
                    whileHover={{ background: `${V1.gold}15`, boxShadow: `0 0 20px ${V1.cyan}20` }}
                  >
                    ابدأ من حيث توقفت
                    <ArrowLeft size={18} />
                  </motion.button>
                )}
              </div>

              {/* Progress ring */}
              <motion.div variants={fadeUp} className="flex flex-col items-center shrink-0">
                <div style={{ position: 'relative' }}>
                  <ProgressRing percent={levelProgress.overallPercent} size={140} strokeWidth={8} color={V1.cyan} bgColor="rgba(255,255,255,0.06)" />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(0deg)' }}>
                    <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", color: V1.t1 }}>
                      {levelProgress.overallPercent}%
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '13px', color: V1.t2, marginTop: '12px' }}>تقدّمك الكلي</span>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ═══ CHAPTERS & UNITS ═══ */}
        {units.length === 0 ? <EmptyState /> : chapters.map((chapter, ci) => (
          <section key={ci} style={{ marginBottom: '64px' }}>
            {/* Chapter divider */}
            <motion.div
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="flex items-center gap-4 mb-10 mt-4"
            >
              <div style={{ flex: 1, height: '1px', background: `${V1.gold}30` }} />
              <span style={{ color: V1.gold, fontSize: '14px' }}>◆</span>
              <span style={{ fontFamily: "'Amiri', serif", fontSize: '28px', fontWeight: 700, color: V1.t1 }}>
                {chapter.name}
              </span>
              {chapter.theme && (
                <span style={{ fontSize: '16px', color: V1.t2 }}>— {chapter.theme}</span>
              )}
              <span style={{ color: V1.gold, fontSize: '14px' }}>◆</span>
              <div style={{ flex: 1, height: '1px', background: `${V1.gold}30` }} />
            </motion.div>

            {/* Cards: featured (first) + grid (rest) */}
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
              {/* Featured card */}
              {chapter.units[0] && <FeaturedCard unit={chapter.units[0]} progress={getUnitStatus(progressMap, chapter.units[0].id)} levelColor={levelColor} navigate={navigate} levelNum={levelNum} />}

              {/* Standard cards */}
              {chapter.units.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {chapter.units.slice(1).map(unit => (
                    <StandardCard key={unit.id} unit={unit} progress={getUnitStatus(progressMap, unit.id)} levelColor={levelColor} navigate={navigate} levelNum={levelNum} />
                  ))}
                </div>
              )}
            </motion.div>
          </section>
        ))}
      </div>
    </div>
  )
}

/* ──── Pill ──── */
function Pill({ label, value, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 14px', borderRadius: '999px', fontSize: '13px',
      background: `${color}10`, border: `1px solid ${color}25`, color: V1.t1,
    }}>
      <span style={{ fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color }}>{value}</span>
      {label}
    </span>
  )
}

/* ──── Featured Card ──── */
function FeaturedCard({ unit, progress, levelColor, navigate, levelNum }) {
  return (
    <motion.div
      variants={fadeUp}
      onClick={() => { tracker.track('unit_selected', { unit_id: unit.id, unit_number: unit.unit_number, level: levelNum }); navigate(`/student/curriculum/unit/${unit.id}`) }}
      className="cursor-pointer overflow-hidden"
      style={{
        borderRadius: '20px', border: `1px solid ${V1.border}`,
        background: V1.bgLayer, minHeight: '320px',
        display: 'grid', gridTemplateColumns: unit.cover_image_url ? '1fr 1fr' : '1fr',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
      whileHover={{ borderColor: `${V1.gold}40`, boxShadow: `0 0 40px ${V1.gold}10`, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {unit.cover_image_url && (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img src={unit.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, rgba(17,17,25,0.95) 0%, transparent 60%)' }} />
        </div>
      )}
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontSize: '80px', fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", color: V1.gold, opacity: 0.15, lineHeight: 1 }}>
          {unit.unit_number}
        </span>
        <h3 style={{ fontSize: '32px', fontWeight: 700, color: V1.t1, marginTop: '-20px', marginBottom: '8px' }}>
          {unit.theme_ar}
        </h3>
        {unit.theme_en && (
          <p style={{ fontSize: '16px', color: V1.cyan, fontStyle: 'italic', marginBottom: '16px' }} dir="ltr">
            {unit.theme_en}
          </p>
        )}
        <div className="flex items-center gap-3">
          <StatusChip status={progress.status} />
          {unit.estimated_minutes && (
            <span className="flex items-center gap-1" style={{ fontSize: '13px', color: V1.t2 }}>
              <Clock size={14} /> ~{unit.estimated_minutes} دقيقة
            </span>
          )}
        </div>
        {progress.percent > 0 && (
          <div style={{ marginTop: '12px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', borderRadius: '2px', width: `${progress.percent}%`, background: progress.status === 'completed' ? '#4ade80' : V1.cyan, transition: 'width 0.5s' }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ──── Standard Card ──── */
function StandardCard({ unit, progress, levelColor, navigate, levelNum }) {
  const hasCover = !!unit.cover_image_url

  return (
    <motion.div
      variants={fadeUp}
      onClick={() => { tracker.track('unit_selected', { unit_id: unit.id, unit_number: unit.unit_number, level: levelNum }); navigate(`/student/curriculum/unit/${unit.id}`) }}
      className="cursor-pointer overflow-hidden"
      style={{
        borderRadius: '16px', border: `1px solid ${V1.border}`,
        background: V1.bgLayer, transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s',
      }}
      whileHover={{ y: -6, borderColor: `${V1.gold}40`, boxShadow: `0 12px 40px ${V1.gold}08` }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Image */}
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
        {hasCover ? (
          <img src={unit.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${levelColor}, ${levelColor}88)` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(17,17,25,0.9) 0%, transparent 50%)' }} />
        {/* Status chip */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          <StatusChip status={progress.status} size="sm" />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px 20px' }}>
        <div className="flex items-center gap-2 mb-1">
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
            background: `${levelColor}1A`, color: levelColor,
          }}>
            {unit.unit_number}
          </span>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: V1.t1 }}>{unit.theme_ar}</h3>
        </div>
        {unit.theme_en && (
          <p style={{ fontSize: '13px', color: V1.t2, fontStyle: 'italic' }} dir="ltr">{unit.theme_en}</p>
        )}
        {progress.percent > 0 && (
          <div style={{ marginTop: '10px', height: '2px', borderRadius: '1px', background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', borderRadius: '1px', width: `${progress.percent}%`, background: progress.status === 'completed' ? '#4ade80' : V1.cyan, transition: 'width 0.5s' }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
