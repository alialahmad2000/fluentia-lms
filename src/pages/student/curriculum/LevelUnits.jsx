import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Clock } from 'lucide-react'
import { useCurriculumData } from './_useCurriculumData'
import { ProgressRing, StatusChip, getUnitStatus, LoadingSkeleton, EmptyState, CINEMATIC_TOKENS as V1, useCinematicMotion } from './_premiumPrimitives'
import { tracker } from '../../../services/activityTracker'

export default function LevelUnits() {
  const { level, units, chapters, progressMap, levelProgress, nextUnit, loading, levelColor, levelNum, navigate } = useCurriculumData()
  const m = useCinematicMotion()

  if (loading) return <LoadingSkeleton />
  if (!level) return null

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: V1.textPrimary, minHeight: '100vh', position: 'relative' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
        <div style={{ position: 'absolute', inset: 0, background: V1.bg }} />
        {level.cover_image_url && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${level.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(40px) brightness(0.35) saturate(1.3)', transform: 'scale(1.1)', willChange: 'transform',
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, transparent 0%, ${V1.overlaySoft} 50%, ${V1.overlay} 100%)` }} />
        <div style={{ position: 'absolute', inset: 0, opacity: V1.filmGrainOpacity, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div style={{ position: 'absolute', top: '20%', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${V1.accentGoldSoft}, transparent)` }} />
        <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${V1.accentCyanSoft}, transparent)` }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

        {/* HERO */}
        <section style={{ padding: '80px 0 60px', position: 'relative' }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, fontSize: V1.type.bgType, fontWeight: 800,
            fontFamily: "'Inter Tight', sans-serif", letterSpacing: '-0.05em', lineHeight: V1.leading.tight,
            background: V1.goldGradient,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            opacity: 0.06, pointerEvents: 'none', userSelect: 'none',
          }} dir="ltr">
            {level.cefr}
          </div>

          <motion.div {...m.heroEntry}>
            <motion.button
              {...m.fadeUp}
              onClick={() => navigate('/student/curriculum')}
              className="cinematic-card inline-flex items-center gap-2 mb-8 transition-colors"
              style={{ fontSize: V1.type.bodySm, color: V1.accentGold, opacity: 0.6, background: 'none', border: 'none' }}
              tabIndex={0}
            >
              <ArrowRight size={16} />
              العودة للمستويات
            </motion.button>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
              <div className="flex-1">
                <motion.h1 {...m.fadeUp} style={{
                  fontFamily: "'Playfair Display', 'Amiri', serif", fontSize: V1.type.xl,
                  fontWeight: 700, lineHeight: V1.leading.tight, marginBottom: '12px',
                }}>
                  {level.name_ar}
                </motion.h1>

                <motion.div {...m.fadeUp} className="flex items-center gap-3 mb-4">
                  <div style={{ width: 30, height: 1, background: V1.accentGold }} />
                  <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: V1.type.md, color: V1.accentGold, fontStyle: 'italic' }} dir="ltr">
                    {level.name_en}
                  </span>
                  <span style={{
                    fontSize: V1.type.bodyXs, fontWeight: 600, padding: '3px 10px', borderRadius: '999px',
                    background: V1.accentCyanSoft, color: V1.accentCyan, border: `1px solid ${V1.accentCyanStrong}`,
                  }}>
                    {level.cefr}
                  </span>
                </motion.div>

                {level.description_ar && (
                  <motion.p {...m.fadeUp} style={{ fontSize: V1.type.bodyLg, color: V1.textDim, lineHeight: V1.leading.relaxed, maxWidth: '520px' }}>
                    {level.description_ar}
                  </motion.p>
                )}

                <motion.div {...m.fadeUp} className="flex flex-wrap gap-3 mt-6">
                  <Pill label="وحدة مكتملة" value={`${levelProgress.completedUnits}/${levelProgress.totalUnits}`} color={V1.accentCyan} />
                  <Pill label="التقدّم" value={`${levelProgress.overallPercent}%`} color={V1.accentGold} />
                </motion.div>

                {nextUnit && (
                  <motion.button
                    {...m.fadeUp}
                    onClick={() => { tracker.track('unit_selected', { unit_id: nextUnit.id }); navigate(`/student/curriculum/unit/${nextUnit.id}`) }}
                    className="cinematic-card mt-8 inline-flex items-center gap-2 font-bold transition-all"
                    style={{
                      padding: '12px 28px', borderRadius: '999px', fontSize: V1.type.bodySm,
                      border: `2px solid ${V1.accentGoldStrong}`, color: V1.accentGold, background: 'transparent',
                    }}
                    whileHover={m.reduced ? {} : { background: V1.accentGoldSoft, boxShadow: V1.glowCyan }}
                    tabIndex={0}
                  >
                    ابدأ من حيث توقفت
                    <ArrowLeft size={18} />
                  </motion.button>
                )}
              </div>

              <motion.div {...m.fadeUp} className="flex flex-col items-center shrink-0">
                <div style={{ position: 'relative' }}>
                  <ProgressRing percent={levelProgress.overallPercent} size={140} strokeWidth={8} color={V1.accentCyan} bgColor={V1.border} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: V1.type.lg, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", color: V1.textPrimary }}>
                      {levelProgress.overallPercent}%
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: V1.type.bodySm, color: V1.textDim, marginTop: '12px' }}>تقدّمك الكلي</span>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* CHAPTERS & UNITS */}
        {units.length === 0 ? <EmptyState /> : chapters.map((chapter, ci) => (
          <section key={ci} style={{ marginBottom: '64px' }}>
            <motion.div
              {...(m.reduced ? {} : { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true } })}
              className="flex items-center gap-4 mb-10 mt-4"
            >
              <div style={{ flex: 1, height: '1px', background: V1.accentGoldSoft }} />
              <span style={{ color: V1.accentGold, fontSize: V1.type.bodySm }}>◆</span>
              <span style={{ fontFamily: "'Amiri', serif", fontSize: V1.type.lg, fontWeight: 700, color: V1.textPrimary }}>
                {chapter.name}
              </span>
              {chapter.theme && (
                <span style={{ fontSize: V1.type.body, color: V1.textDim }}>— {chapter.theme}</span>
              )}
              <span style={{ color: V1.accentGold, fontSize: V1.type.bodySm }}>◆</span>
              <div style={{ flex: 1, height: '1px', background: V1.accentGoldSoft }} />
            </motion.div>

            <motion.div {...m.staggerParent} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
              {chapter.units[0] && <FeaturedCard unit={chapter.units[0]} progress={getUnitStatus(progressMap, chapter.units[0].id)} levelColor={levelColor} navigate={navigate} levelNum={levelNum} m={m} />}

              {chapter.units.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {chapter.units.slice(1).map(unit => (
                    <StandardCard key={unit.id} unit={unit} progress={getUnitStatus(progressMap, unit.id)} levelColor={levelColor} navigate={navigate} levelNum={levelNum} m={m} />
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

/* Pill */
function Pill({ label, value, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 14px', borderRadius: '999px', fontSize: V1.type.bodySm,
      background: V1.bgElevated, border: `1px solid ${V1.border}`, color: V1.textPrimary,
    }}>
      <span style={{ fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color }}>{value}</span>
      {label}
    </span>
  )
}

/* Featured Card */
function FeaturedCard({ unit, progress, levelColor, navigate, levelNum, m }) {
  const handleClick = () => { tracker.track('unit_selected', { unit_id: unit.id, unit_number: unit.unit_number, level: levelNum }); navigate(`/student/curriculum/unit/${unit.id}`) }
  const handleKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }

  return (
    <motion.div
      {...m.fadeUp}
      onClick={handleClick}
      onKeyDown={handleKey}
      tabIndex={0}
      role="button"
      className="cinematic-card cursor-pointer overflow-hidden"
      style={{
        borderRadius: '20px', border: `1px solid ${V1.border}`,
        background: V1.bgLayer, minHeight: '320px',
        display: 'grid', gridTemplateColumns: unit.cover_image_url ? '1fr 1fr' : '1fr',
        transition: `border-color ${V1.duration.fast}, box-shadow ${V1.duration.fast}`,
      }}
      whileHover={m.reduced ? {} : { borderColor: V1.borderHover, boxShadow: V1.glowGold, scale: m.hoverScale }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {unit.cover_image_url && (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img src={unit.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to left, ${V1.overlay} 0%, transparent 60%)` }} />
        </div>
      )}
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ fontSize: V1.type.massive, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", color: V1.accentGold, opacity: 0.15, lineHeight: 1 }}>
          {unit.unit_number}
        </span>
        <h3 style={{ fontSize: V1.type.lg, fontWeight: 700, color: V1.textPrimary, marginTop: '-20px', marginBottom: '8px' }}>
          {unit.theme_ar}
        </h3>
        {unit.theme_en && (
          <p style={{ fontSize: V1.type.body, color: V1.accentCyan, fontStyle: 'italic', marginBottom: '16px' }} dir="ltr">
            {unit.theme_en}
          </p>
        )}
        <div className="flex items-center gap-3">
          <StatusChip status={progress.status} />
          {unit.estimated_minutes && (
            <span className="flex items-center gap-1" style={{ fontSize: V1.type.bodySm, color: V1.textDim }}>
              <Clock size={14} /> ~{unit.estimated_minutes} دقيقة
            </span>
          )}
        </div>
        {progress.percent > 0 && (
          <div style={{ marginTop: '12px', height: '3px', borderRadius: '2px', background: V1.border }}>
            <div style={{ height: '100%', borderRadius: '2px', width: `${progress.percent}%`, background: progress.status === 'completed' ? '#4ade80' : V1.accentCyan, transition: `width ${V1.duration.medium}` }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* Standard Card */
function StandardCard({ unit, progress, levelColor, navigate, levelNum, m }) {
  const hasCover = !!unit.cover_image_url
  const handleClick = () => { tracker.track('unit_selected', { unit_id: unit.id, unit_number: unit.unit_number, level: levelNum }); navigate(`/student/curriculum/unit/${unit.id}`) }
  const handleKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }

  return (
    <motion.div
      {...m.fadeUp}
      onClick={handleClick}
      onKeyDown={handleKey}
      tabIndex={0}
      role="button"
      className="cinematic-card cursor-pointer overflow-hidden"
      style={{
        borderRadius: '16px', border: `1px solid ${V1.border}`,
        background: V1.bgLayer, transition: `border-color ${V1.duration.fast}, transform ${V1.duration.fast}, box-shadow ${V1.duration.fast}`,
      }}
      whileHover={m.reduced ? {} : { y: m.hoverLift, borderColor: V1.borderHover, boxShadow: V1.shadowHover }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
        {hasCover ? (
          <img src={unit.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${levelColor}, ${levelColor}88)` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${V1.overlay} 0%, transparent 50%)` }} />
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          <StatusChip status={progress.status} size="sm" />
        </div>
      </div>

      <div style={{ padding: '16px 20px 20px' }}>
        <div className="flex items-center gap-2 mb-1">
          <span style={{
            fontSize: V1.type.bodyXs, fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
            background: V1.accentGoldSoft, color: V1.accentGold,
          }}>
            {unit.unit_number}
          </span>
          <h3 style={{ fontSize: V1.type.bodyLg, fontWeight: 700, color: V1.textPrimary }}>{unit.theme_ar}</h3>
        </div>
        {unit.theme_en && (
          <p style={{ fontSize: V1.type.bodySm, color: V1.textDim, fontStyle: 'italic' }} dir="ltr">{unit.theme_en}</p>
        )}
        {progress.percent > 0 && (
          <div style={{ marginTop: '10px', height: '2px', borderRadius: '1px', background: V1.border }}>
            <div style={{ height: '100%', borderRadius: '1px', width: `${progress.percent}%`, background: progress.status === 'completed' ? '#4ade80' : V1.accentCyan, transition: `width ${V1.duration.medium}` }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
