import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Clock } from 'lucide-react'
import { useCurriculumData } from './useCurriculumData'
import { ProgressRing, StatusChip, getUnitStatus, LoadingSkeleton, EmptyState } from './shared'
import { tracker } from '../../../../services/activityTracker'

/* ──── V2 tokens ──── */
const V2 = {
  bg: '#0c1425',
  bgLayer: '#14213d',
  gold: '#d4af37',
  goldSoft: '#f4e5a1',
  burgundy: '#8b2635',
  t1: '#fdf6e3',
  t2: '#b8a57a',
  border: 'rgba(212,175,55,0.18)',
}

const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: (i = 0) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] } }),
}

const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }

/* Islamic star SVG as data URL */
const STAR_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'%3E%3Cg stroke='%23d4af37' stroke-width='0.5' fill='none' opacity='0.04'%3E%3Cpath d='M50 5 L65 25 L95 25 L72 45 L82 75 L50 58 L18 75 L28 45 L5 25 L35 25 Z'/%3E%3Ccircle cx='50' cy='50' r='20'/%3E%3Ccircle cx='50' cy='50' r='10'/%3E%3C/g%3E%3C/svg%3E")`

function useFonts() {
  useEffect(() => {
    if (!document.getElementById('v2-fonts')) {
      const link = document.createElement('link')
      link.id = 'v2-fonts'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@400;600&display=swap'
      document.head.appendChild(link)
    }
  }, [])
}

/* ──── Ornament SVG ──── */
function Ornament({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" fill={V2.gold} fillOpacity="0.6" />
    </svg>
  )
}

export default function LevelUnitsV2() {
  useFonts()
  const { level, units, chapters, progressMap, levelProgress, nextUnit, loading, levelColor, levelNum, navigate } = useCurriculumData()

  if (loading) return <LoadingSkeleton />
  if (!level) return null

  const arabicNum = (n) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: V2.t1, minHeight: '100vh', position: 'relative' }}>

      {/* ═══ Background ═══ */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
        <div style={{ position: 'absolute', inset: 0, background: V2.bg }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: STAR_PATTERN, backgroundSize: '200px 200px' }} />
        {/* Gold glows */}
        <motion.div
          style={{ position: 'absolute', width: '800px', height: '800px', borderRadius: '50%', top: '-10%', right: '-15%', background: `radial-gradient(circle, ${V2.gold}20, transparent 70%)`, filter: 'blur(60px)' }}
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          style={{ position: 'absolute', width: '800px', height: '800px', borderRadius: '50%', bottom: '-15%', left: '-10%', background: `radial-gradient(circle, ${V2.gold}15, transparent 70%)`, filter: 'blur(60px)' }}
          animate={{ x: [0, -20, 0], y: [0, -15, 0] }}
          transition={{ duration: 55, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.02, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* ═══ Content ═══ */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>

        {/* ═══ HERO ═══ */}
        <section style={{ padding: '60px 0 50px', textAlign: 'center' }}>
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>

            {/* Back */}
            <motion.button
              variants={fadeUp}
              onClick={() => navigate('/student/curriculum')}
              className="inline-flex items-center gap-2 mb-6 transition-colors"
              style={{ fontSize: '14px', color: V2.t2 }}
            >
              <ArrowRight size={16} />
              العودة للمستويات
            </motion.button>

            {/* Top ornament line */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mb-8">
              <div style={{ width: '80px', height: '1px', background: `linear-gradient(to left, ${V2.gold}60, transparent)` }} />
              <Ornament size={20} />
              <div style={{ width: '80px', height: '1px', background: `linear-gradient(to right, ${V2.gold}60, transparent)` }} />
            </motion.div>

            {/* Level name */}
            <motion.h1 variants={fadeUp} style={{
              fontFamily: "'Amiri', serif", fontSize: 'clamp(52px, 10vw, 88px)',
              fontWeight: 700, lineHeight: 1.15, marginBottom: '16px',
              background: `linear-gradient(180deg, ${V2.goldSoft}, ${V2.gold})`,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              {level.name_ar}
            </motion.h1>

            {/* Tagline row */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mb-6">
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '3px 12px', borderRadius: '999px',
                border: `1px solid ${V2.gold}40`, color: V2.gold,
              }}>
                {level.cefr}
              </span>
              <span style={{ color: V2.gold, fontSize: '10px' }}>●</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', color: V2.t2, fontStyle: 'italic' }} dir="ltr">
                {level.name_en}
              </span>
            </motion.div>

            {/* Description */}
            {level.description_ar && (
              <motion.p variants={fadeUp} style={{ fontSize: '18px', color: V2.t1, lineHeight: 1.8, maxWidth: '640px', margin: '0 auto 24px' }}>
                {level.description_ar}
              </motion.p>
            )}

            {/* Stats pills */}
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mb-6">
              <OrnatePill label="الوحدات المكتملة" value={`${levelProgress.completedUnits}/${levelProgress.totalUnits}`} />
              <OrnatePill label="نسبة التقدّم" value={`${levelProgress.overallPercent}%`} />
            </motion.div>

            {/* Progress ring */}
            <motion.div variants={fadeUp} className="flex justify-center mb-6">
              <div style={{ position: 'relative' }}>
                <ProgressRing percent={levelProgress.overallPercent} size={100} strokeWidth={6} color={V2.gold} bgColor={`${V2.gold}15`} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'Amiri', serif", color: V2.goldSoft }}>
                    {arabicNum(levelProgress.overallPercent)}%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            {nextUnit && (
              <motion.button
                variants={fadeUp}
                onClick={() => { tracker.track('unit_selected', { unit_id: nextUnit.id }); navigate(`/student/curriculum/unit/${nextUnit.id}`) }}
                className="inline-flex items-center gap-2 font-bold transition-all"
                style={{
                  padding: '12px 28px', borderRadius: '12px', fontSize: '15px',
                  border: `1px solid ${V2.gold}50`, color: V2.goldSoft, background: `${V2.gold}08`,
                }}
                whileHover={{ background: `${V2.gold}18` }}
              >
                تابع مسيرتك
                <ArrowLeft size={18} />
              </motion.button>
            )}

            {/* Bottom ornament */}
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 mt-10">
              <div style={{ width: '80px', height: '1px', background: `linear-gradient(to left, ${V2.gold}40, transparent)` }} />
              <Ornament size={16} />
              <div style={{ width: '80px', height: '1px', background: `linear-gradient(to right, ${V2.gold}40, transparent)` }} />
            </motion.div>
          </motion.div>
        </section>

        {/* ═══ Section header ═══ */}
        <div className="text-center mb-10">
          <h2 style={{ fontFamily: "'Amiri', serif", fontSize: '28px', fontWeight: 700, color: V2.t1 }}>
            مسيرتك التعليمية
          </h2>
          <div style={{ width: '60px', height: '2px', background: V2.gold, margin: '10px auto 0', borderRadius: '1px' }} />
        </div>

        {/* ═══ CHAPTERS ═══ */}
        {units.length === 0 ? <EmptyState /> : chapters.map((chapter, ci) => (
          <section key={ci} style={{ marginBottom: '56px' }}>
            {/* Chapter divider */}
            <motion.div
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="flex items-center justify-center gap-4 mb-10"
            >
              <Ornament size={28} />
              <div className="text-center">
                <h3 style={{ fontFamily: "'Amiri', serif", fontSize: '36px', fontWeight: 700, color: V2.gold }}>
                  {chapter.name}
                </h3>
                {chapter.theme && (
                  <p style={{ fontSize: '15px', color: V2.t1, marginTop: '4px' }}>{chapter.theme}</p>
                )}
              </div>
              <Ornament size={28} />
            </motion.div>

            {/* 2-column grid */}
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {chapter.units.map(unit => (
                <V2Card key={unit.id} unit={unit} progress={getUnitStatus(progressMap, unit.id)} levelColor={levelColor} navigate={navigate} levelNum={levelNum} arabicNum={arabicNum} />
              ))}
            </motion.div>
          </section>
        ))}
      </div>
    </div>
  )
}

/* ──── Ornate Pill ──── */
function OrnatePill({ label, value }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '6px 16px', borderRadius: '999px', fontSize: '14px',
      border: `1px solid ${V2.gold}30`, color: V2.t1, background: `${V2.gold}06`,
    }}>
      <span style={{ fontWeight: 700, fontFamily: "'Amiri', serif", color: V2.goldSoft }}>{value}</span>
      {label}
    </span>
  )
}

/* ──── V2 Card ──── */
function V2Card({ unit, progress, levelColor, navigate, levelNum, arabicNum }) {
  return (
    <motion.div
      variants={fadeUp}
      onClick={() => { tracker.track('unit_selected', { unit_id: unit.id, unit_number: unit.unit_number, level: levelNum }); navigate(`/student/curriculum/unit/${unit.id}`) }}
      className="cursor-pointer overflow-hidden"
      style={{
        borderRadius: '16px', border: `1px solid ${V2.border}`,
        background: `rgba(244, 229, 161, 0.03)`, backdropFilter: 'blur(8px)',
        transition: 'border-color 0.4s, transform 0.3s, box-shadow 0.3s',
      }}
      whileHover={{ y: -4, borderColor: `${V2.gold}60`, boxShadow: `0 8px 32px ${V2.gold}10` }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Gold top strip */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${V2.gold}60, ${V2.goldSoft}80, ${V2.gold}60)` }} />

      <div style={{ padding: '20px' }}>
        {/* Cover image */}
        <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9', marginBottom: '16px' }}>
          {unit.cover_image_url ? (
            <img src={unit.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(0.2) saturate(0.9) brightness(0.95)' }} loading="lazy" />
          ) : (
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${V2.bgLayer}, ${V2.bg})` }} />
          )}
          {/* Unit number badge */}
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            width: '44px', height: '44px', borderRadius: '50%',
            background: `${V2.bg}DD`, border: `2px solid ${V2.gold}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Amiri', serif", fontSize: '22px', fontWeight: 700, color: V2.gold,
          }}>
            {arabicNum(unit.unit_number)}
          </div>
        </div>

        {/* Theme */}
        <h3 style={{ fontFamily: "'Amiri', serif", fontSize: '24px', fontWeight: 700, color: V2.t1, marginBottom: '4px' }}>
          {unit.theme_ar}
        </h3>
        {unit.theme_en && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: V2.gold, fontStyle: 'italic', marginBottom: '12px' }} dir="ltr">
            {unit.theme_en}
          </p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2 mb-3">
          <div style={{ flex: 1, height: '1px', background: `${V2.gold}20` }} />
          <span style={{ color: V2.gold, fontSize: '8px' }}>◆</span>
          <div style={{ flex: 1, height: '1px', background: `${V2.gold}20` }} />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between">
          <StatusChip status={progress.status} />
          <div className="flex items-center gap-3">
            {unit.estimated_minutes && (
              <span className="flex items-center gap-1" style={{ fontSize: '12px', color: V2.t2 }}>
                <Clock size={13} /> ~{unit.estimated_minutes} دقيقة
              </span>
            )}
            {progress.percent > 0 && (
              <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: "'Amiri', serif", color: progress.status === 'completed' ? '#4ade80' : V2.gold }}>
                {arabicNum(progress.percent)}%
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {progress.percent > 0 && (
          <div style={{ marginTop: '10px', height: '2px', borderRadius: '1px', background: `${V2.gold}15` }}>
            <div style={{ height: '100%', borderRadius: '1px', width: `${progress.percent}%`, background: progress.status === 'completed' ? '#4ade80' : V2.gold, transition: 'width 0.5s' }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
