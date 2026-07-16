import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Clock, Sparkles } from 'lucide-react'
import { useCurriculumData } from './_useCurriculumData'
import { StatusChip, getUnitStatus, LoadingSkeleton, EmptyState, useCinematicMotion } from './_premiumPrimitives'
import { tracker } from '../../../services/activityTracker'
import { useCurriculumPreview } from '../../../contexts/CurriculumPreviewContext'
import { useG } from '../../../i18n/gender'
import './levelUnits.css'

const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

function useIsCompact() {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = (e) => setCompact(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return compact
}

export default function LevelUnits() {
  const { level, units, chapters, progressMap, levelProgress, nextUnit, loading, levelColor, levelNum, navigate } = useCurriculumData()
  const { basePath } = useCurriculumPreview()
  const m = useCinematicMotion()
  const compact = useIsCompact()
  const g = useG()

  if (loading) return <LoadingSkeleton />
  if (!level) return null

  // The world is painted from the student's NEXT unit art (it changes as she
  // advances), falling back to any unit cover, then the level cover.
  const worldArt = nextUnit?.cover_image_url
    || units.find((u) => u.cover_image_url)?.cover_image_url
    || level.cover_image_url
    || null

  const reveal = m.reduced
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
      }

  const openUnit = (unit) => {
    tracker.track('unit_selected', { unit_id: unit.id, unit_number: unit.unit_number, level: levelNum })
    navigate(`${basePath}/unit/${unit.id}`)
  }

  return (
    <div dir="rtl" className="lvx-root">

      {/* ── THE WORLD ── */}
      <div className={`lvx-world${worldArt ? '' : ' lvx-world--empty'}`} aria-hidden>
        {worldArt && <div className="lvx-world__far" style={{ backgroundImage: `url(${worldArt})` }} />}
        <div className="lvx-world__near" style={worldArt ? { backgroundImage: `url(${worldArt})` } : undefined} />
        <div className="lvx-world__wash" style={{ background: `linear-gradient(180deg, ${levelColor}55, transparent 60%)` }} />
        <div className="lvx-world__bloom" />
        <div className="lvx-world__motes" />
        <div className="lvx-world__scrim" />
        <div className="lvx-world__grain" />
      </div>

      {/* ── CONTENT ── */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1160, margin: '0 auto', padding: '0 24px var(--mobile-bottom-clearance, 96px)' }}>

        {/* HERO */}
        <section style={{ padding: '64px 0 72px', position: 'relative' }}>
          <div className="lvx-watermark" data-text={level.cefr} dir="ltr">{level.cefr}</div>

          <motion.div {...m.heroEntry}>
            <motion.button
              {...m.fadeUp}
              onClick={() => navigate(basePath)}
              className="lvx-back"
              tabIndex={0}
            >
              <ArrowRight size={15} />
              العودة للمستويات
            </motion.button>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10" style={{ marginTop: 34 }}>
              <div className="flex-1" style={{ position: 'relative' }}>
                <motion.div {...m.fadeUp} className="lvx-eyebrow">
                  <span className="lvx-eyebrow__rule" />
                  <span className="lvx-eyebrow__text">رحلة المستوى</span>
                  <span className="lvx-cefr" dir="ltr">{level.cefr}</span>
                </motion.div>

                <motion.h1 {...m.fadeUp} className="lvx-title">
                  {level.name_ar}
                </motion.h1>

                <motion.div {...m.fadeUp} className="lvx-subtitle">
                  <span className="lvx-subtitle__name" dir="ltr">{level.name_en}</span>
                  <span className="lvx-subtitle__rule" />
                </motion.div>

                {level.description_ar && (
                  <motion.p {...m.fadeUp} className="lvx-desc">
                    {level.description_ar}
                  </motion.p>
                )}

                <motion.div {...m.fadeUp} className="lvx-chips">
                  <span className="lvx-chip">
                    <strong style={{ color: '#f5c842' }} dir="ltr">{levelProgress.completedUnits}/{levelProgress.totalUnits}</strong>
                    وحدة مكتملة
                  </span>
                  <span className="lvx-chip">
                    <strong style={{ color: '#9ee3f8' }} dir="ltr">{levelProgress.overallPercent}%</strong>
                    التقدّم الكلي
                  </span>
                  {levelProgress.inProgressUnits > 0 && (
                    <span className="lvx-chip">
                      <strong style={{ color: '#9ee3f8' }} dir="ltr">{levelProgress.inProgressUnits}</strong>
                      قيد التعلّم
                    </span>
                  )}
                </motion.div>

                {nextUnit && (
                  <motion.div {...m.fadeUp}>
                    <button className="lvx-cta" onClick={() => openUnit(nextUnit)} tabIndex={0}>
                      {g('ابدأ من حيث توقفت', 'ابدئي من حيث توقفت')}
                      <span className="lvx-cta__arrow"><ArrowLeft size={17} /></span>
                    </button>
                    <p className="lvx-cta-hint">
                      الوحدة التالية: <strong>{nextUnit.theme_ar}</strong>
                    </p>
                  </motion.div>
                )}
              </div>

              <motion.div {...m.fadeUp} className="lvx-ring shrink-0">
                <HeroRing percent={levelProgress.overallPercent} reduced={m.reduced} compact={compact} />
                <span className="lvx-ring__label">تقدّمك الكلي في المستوى</span>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* CHAPTERS & UNITS */}
        {units.length === 0 ? <EmptyState /> : chapters.map((chapter) => {
          const doneCount = chapter.units.filter((u) => (progressMap[u.id]?.overall || 0) === 100).length
          const allDone = doneCount === chapter.units.length
          return (
            <section key={chapter.index} style={{ marginBottom: 76 }}>
              <motion.div className="lvx-chapter" {...reveal}>
                <div className="lvx-chapter__medal">{toArabicDigits(chapter.index + 1)}</div>
                <div className="lvx-chapter__names">
                  <span className="lvx-chapter__name">{chapter.name}</span>
                  {chapter.theme && <span className="lvx-chapter__theme">— {chapter.theme}</span>}
                </div>
                <span className={`lvx-chapter__progress${allDone ? ' lvx-chapter__progress--done' : ''}`}>
                  {toArabicDigits(doneCount)}/{toArabicDigits(chapter.units.length)}
                </span>
                <div className="lvx-chapter__rule" />
              </motion.div>

              {chapter.units[0] && (
                <FeaturedCard
                  unit={chapter.units[0]}
                  progress={getUnitStatus(progressMap, chapter.units[0].id)}
                  isNext={nextUnit?.id === chapter.units[0].id}
                  levelColor={levelColor}
                  onOpen={openUnit}
                  reveal={reveal}
                />
              )}

              {chapter.units.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                  {chapter.units.slice(1).map((unit) => (
                    <StandardCard
                      key={unit.id}
                      unit={unit}
                      progress={getUnitStatus(progressMap, unit.id)}
                      isNext={nextUnit?.id === unit.id}
                      levelColor={levelColor}
                      onOpen={openUnit}
                      reveal={reveal}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

/* ── Hero progress ring — gradient stroke + glow + legibility disc ── */
function HeroRing({ percent = 0, reduced, compact = false }) {
  const size = compact ? 104 : 156
  const stroke = compact ? 7 : 9
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (percent / 100) * circ

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div className="lvx-ring__disc" />
      <svg width={size} height={size} className="lvx-ring__svg" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="lvxRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe9a8" />
            <stop offset="55%" stopColor="#f5c842" />
            <stop offset="100%" stopColor="#d99e2b" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={stroke} />
        {percent > 0 && (
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="url(#lvxRingGrad)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: reduced ? offset : circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduced ? 0 : 1.4, ease: 'easeOut', delay: 0.4 }}
          />
        )}
      </svg>
      <div className="lvx-ring__center">
        <span className="lvx-ring__pct" dir="ltr">{percent}%</span>
      </div>
    </div>
  )
}

/* ── Cover image with graceful gradient fallback on load failure ── */
function CoverImage({ src, levelColor }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${levelColor}, ${levelColor}66)` }} />
  }
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
}

/* ── Featured card — first unit of each chapter ── */
function FeaturedCard({ unit, progress, isNext, levelColor, onOpen, reveal }) {
  const g = useG()
  const hasCover = !!unit.cover_image_url
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(unit) }
  }

  return (
    <motion.div
      {...reveal}
      onClick={() => onOpen(unit)}
      onKeyDown={handleKey}
      tabIndex={0}
      role="button"
      aria-label={`الوحدة ${unit.unit_number}: ${unit.theme_ar}`}
      className={`lvx-feat${hasCover ? '' : ' lvx-feat--single'}`}
    >
      {hasCover && (
        <div className="lvx-feat__media">
          <CoverImage src={unit.cover_image_url} levelColor={levelColor} />
        </div>
      )}
      <div className="lvx-feat__body">
        <span className="lvx-feat__num" aria-hidden>{unit.unit_number}</span>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <StatusChip status={progress.status} />
          {isNext && progress.status !== 'completed' && (
            <span className="lvx-next-badge"><Sparkles size={12} /> وحدتك التالية</span>
          )}
        </div>

        <h3 className="lvx-feat__title">{unit.theme_ar}</h3>
        {unit.theme_en && <p className="lvx-feat__en" dir="ltr">{unit.theme_en}</p>}

        <div className="lvx-feat__meta">
          {unit.estimated_minutes && (
            <span className="lvx-feat__minutes">
              <Clock size={14} /> ~{unit.estimated_minutes} دقيقة
            </span>
          )}
        </div>

        {progress.percent > 0 && (
          <div className="lvx-bar" style={{ maxWidth: 300 }}>
            <div
              className={`lvx-bar__fill${progress.status === 'completed' ? ' lvx-bar__fill--done' : ''}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        )}

        <span className="lvx-feat__open">
          {g('افتح الوحدة', 'افتحي الوحدة')}
          <ArrowLeft size={16} />
        </span>
      </div>
    </motion.div>
  )
}

/* ── Standard card ── */
function StandardCard({ unit, progress, isNext, levelColor, onOpen, reveal }) {
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(unit) }
  }

  return (
    <motion.div
      {...reveal}
      onClick={() => onOpen(unit)}
      onKeyDown={handleKey}
      tabIndex={0}
      role="button"
      aria-label={`الوحدة ${unit.unit_number}: ${unit.theme_ar}`}
      className="lvx-card"
    >
      <div className="lvx-card__media">
        <CoverImage src={unit.cover_image_url} levelColor={levelColor} />
        <div className="lvx-card__status">
          <StatusChip status={progress.status} size="sm" />
        </div>
        <span className="lvx-card__num" aria-hidden>{unit.unit_number}</span>
      </div>

      <div className="lvx-card__body">
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 2 }}>
          <h3 className="lvx-card__title">{unit.theme_ar}</h3>
          {isNext && progress.status !== 'completed' && (
            <span className="lvx-next-badge"><Sparkles size={11} /> التالية</span>
          )}
        </div>
        {unit.theme_en && <p className="lvx-card__en" dir="ltr">{unit.theme_en}</p>}

        {progress.percent > 0 && (
          <div className="lvx-bar">
            <div
              className={`lvx-bar__fill${progress.status === 'completed' ? ' lvx-bar__fill--done' : ''}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}
