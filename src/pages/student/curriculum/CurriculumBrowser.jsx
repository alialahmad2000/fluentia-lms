import { useState, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Lock, ChevronLeft, CheckCircle, RefreshCw, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { tracker } from '../../../services/activityTracker'
import { calculateUnitCompletion, groupProgressByUnit } from '../../../utils/curriculumProgress'
import { ProgressRing, CINEMATIC_TOKENS as V1, useCinematicMotion } from './_premiumPrimitives'
import CurriculumPageSkeleton from '../../../components/skeletons/CurriculumPageSkeleton'
import { useCurriculumPreview } from '../../../contexts/CurriculumPreviewContext'

export default function CurriculumBrowser() {
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))
  const navigate = useNavigate()
  const { canSeeAllLevels, basePath } = useCurriculumPreview()
  const currentLevel = canSeeAllLevels ? 999 : (studentData?.academic_level ?? 0)
  // Teacher-preview accounts browse the full grid (don't auto-jump to one level).
  const canAccessLower = studentData?.can_access_lower_levels === true
  // Precise per-student extra levels (e.g. a B1 student granted revisit access to A2).
  const extraLevels = Array.isArray(studentData?.extra_curriculum_levels) ? studentData.extra_curriculum_levels : []
  const hasExtra = extraLevels.length > 0
  const extraKey = extraLevels.join(',')
  const [autoNavDone, setAutoNavDone] = useState(false)
  const m = useCinematicMotion()

  // Auto-navigate students to their current level (skip in preview mode, for
  // teacher-preview accounts, and for students with an extra-level grant — all of
  // whom need the grid to reach more than one curriculum).
  useEffect(() => {
    if (!canSeeAllLevels && !canAccessLower && !hasExtra && profile?.role === 'student' && currentLevel > 0 && !autoNavDone) {
      setAutoNavDone(true)
      navigate(`${basePath}/level/${currentLevel}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role, currentLevel, canAccessLower, extraKey, autoNavDone, navigate, canSeeAllLevels, basePath])

  // Fetch all active levels
  const { data: levels, isLoading: loadingLevels, error: levelsError, refetch } = useQuery({
    queryKey: ['curriculum-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('*')
        .eq('is_active', true)
        .order('level_number')
      if (error) throw error
      return data || []
    },
  })

  // Fetch unit counts per level
  const { data: unitCounts, isLoading: loadingUnits } = useQuery({
    queryKey: ['curriculum-unit-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('level_id')
      if (error) throw error
      const counts = {}
      for (const u of (data || [])) {
        counts[u.level_id] = (counts[u.level_id] || 0) + 1
      }
      return counts
    },
  })

  // Fetch student section-level progress and calculate unit completions per level
  const { data: progressData } = useQuery({
    queryKey: ['curriculum-progress-summary', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('unit_id, section_type, status')
        .eq('student_id', profile?.id)
      if (error) throw error

      if (!data || data.length === 0) return {}

      const unitIds = [...new Set(data.map(p => p.unit_id))]
      const { data: units } = await supabase
        .from('curriculum_units')
        .select('id, level_id')
        .in('id', unitIds)

      const unitToLevel = {}
      for (const u of (units || [])) {
        unitToLevel[u.id] = u.level_id
      }

      const byUnit = groupProgressByUnit(data)
      const completedPerLevel = {}
      for (const [unitId, rows] of Object.entries(byUnit)) {
        const { status } = calculateUnitCompletion(rows)
        if (status === 'completed') {
          const levelId = unitToLevel[unitId]
          if (levelId) {
            completedPerLevel[levelId] = (completedPerLevel[levelId] || 0) + 1
          }
        }
      }
      return completedPerLevel
    },
    enabled: !!profile?.id,
  })

  const isLoading = loadingLevels || loadingUnits

  // Compute overall journey stats
  const journeyStats = (() => {
    if (!levels || !unitCounts) return { totalUnits: 0, completedUnits: 0 }
    let total = 0, completed = 0
    for (const l of levels) {
      total += unitCounts[l.id] || 0
      completed += progressData?.[l.id] || 0
    }
    return { totalUnits: total, completedUnits: completed }
  })()

  // Which levels this account may enter. Behaviour is preserved for staff-preview
  // (all levels) and teacher-preview (all lower), and for normal students (their level
  // and below — they auto-jump so never see the grid). Students with an explicit
  // extra-level grant see ONLY their current level + the granted extras (e.g. B1 + A2),
  // so "previous + current" is surfaced precisely, without opening every lower level.
  const isAccessible = (lvlNum) => {
    if (canSeeAllLevels) return true
    if (canAccessLower) return lvlNum <= currentLevel
    if (hasExtra) return lvlNum === currentLevel || extraLevels.includes(lvlNum)
    return lvlNum <= currentLevel
  }
  let unlockedLevels = (levels || []).filter(l => isAccessible(l.level_number))
  // Extra-grant view: the current level leads as the hero, granted revisit levels
  // follow (closest first). Staff/normal ordering (ascending) is left untouched.
  if (hasExtra) {
    unlockedLevels = [...unlockedLevels].sort((a, b) => {
      if (a.level_number === currentLevel) return -1
      if (b.level_number === currentLevel) return 1
      return b.level_number - a.level_number
    })
  }
  // "Next on the path" shows only levels genuinely AHEAD. A below-level granted for
  // revisit already appears above; below-and-not-granted levels stay hidden entirely
  // (never labelled "next"). Harmless for staff/normal (their locked set is all higher).
  const lockedLevels = (levels || []).filter(l => !isAccessible(l.level_number) && l.level_number > currentLevel)

  // Error state
  if (levelsError) {
    return (
      <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: V1.textPrimary, minHeight: '100vh', position: 'relative' }}>
        <CinematicBackground />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '900px', margin: '0 auto', padding: '120px 24px' }}>
          <div className="rounded-2xl p-14 flex flex-col items-center justify-center text-center"
            style={{ background: V1.bgLayer, border: `1px solid ${V1.border}`, borderRadius: '20px' }}>
            <p className="text-lg font-semibold mb-4" style={{ color: V1.textDim, fontSize: V1.type.bodyLg }}>
              حدث خطأ في تحميل المنهج — حاول مرة ثانية
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors"
              style={{ background: V1.accentCyan, color: '#fff', fontSize: V1.type.bodySm }}
            >
              <RefreshCw size={16} />
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Loading skeleton — content-shaped (matches real level card layout)
  // Legacy inline: replaced with CurriculumPageSkeleton
  if (isLoading) return <CurriculumPageSkeleton />

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif", color: V1.textPrimary, minHeight: '100vh', position: 'relative' }}>

      <CinematicBackground />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>

        {/* HERO */}
        <section style={{ padding: '80px 0 60px', position: 'relative' }}>
          <div style={{
            position: 'absolute', bottom: -20, left: 0, fontSize: V1.type.bgType, fontWeight: 800,
            fontFamily: "'Inter Tight', sans-serif", letterSpacing: '-0.05em', lineHeight: 1,
            background: V1.goldGradient,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            opacity: 0.05, pointerEvents: 'none', userSelect: 'none',
          }}>
            منهجك
          </div>

          <motion.div {...m.heroEntry}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
              <div className="flex-1">
                <motion.h1 {...m.fadeUp} style={{
                  fontFamily: "'Playfair Display', 'Amiri', serif", fontSize: V1.type.xl,
                  fontWeight: 700, lineHeight: V1.leading.tight, marginBottom: '12px',
                }}>
                  مسيرتك في طلاقة
                </motion.h1>

                <motion.div {...m.fadeUp} className="flex items-center gap-3 mb-4">
                  <div style={{ width: 30, height: 1, background: V1.accentGold }} />
                  <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: V1.type.md, color: V1.accentGold, fontStyle: 'italic' }}>
                    ستة مستويات، ثلاث سنوات من الإتقان
                  </span>
                </motion.div>

                <motion.p {...m.fadeUp} style={{ fontSize: V1.type.bodyLg, color: V1.textDim, lineHeight: V1.leading.relaxed, maxWidth: '520px' }}>
                  اختر المستوى الذي تريد استكشافه
                </motion.p>
              </div>

              <motion.div {...m.fadeUp} className="flex flex-col items-center shrink-0">
                <div style={{ position: 'relative' }}>
                  <ProgressRing
                    percent={journeyStats.totalUnits > 0 ? Math.round((journeyStats.completedUnits / journeyStats.totalUnits) * 100) : 0}
                    size={130}
                    strokeWidth={7}
                    color={V1.accentCyan}
                    bgColor={V1.border}
                  />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: V1.type.lg, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", color: V1.textPrimary }}>
                      {journeyStats.completedUnits}
                    </span>
                    <span style={{ fontSize: V1.type.bodyXs, color: V1.textDim }}>من {journeyStats.totalUnits} وحدة</span>
                  </div>
                </div>
                <span style={{ fontSize: V1.type.bodySm, color: V1.textDim, marginTop: '12px' }}>تقدّمك الكلي</span>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Journey roadmap dots */}
        {levels && levels.length > 0 && (
          <motion.div
            {...(m.reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.5 } })}
            className="flex items-center justify-center gap-0 mb-16"
          >
            {levels.map((level, i) => {
              const isCurrent = level.level_number === currentLevel
              // A below-level granted for revisit is NOT "done" — show it as a cyan
              // revisit node, never a gold completed check (would contradict its 0% card).
              const isRevisit = hasExtra && level.level_number !== currentLevel && extraLevels.includes(level.level_number)
              const isDone = level.level_number < currentLevel && !isRevisit
              const isCyan = isCurrent || isRevisit
              return (
                <div key={level.id} className="flex items-center">
                  {i > 0 && (
                    <div style={{
                      width: '40px', height: '2px',
                      background: isDone ? V1.accentGold : V1.bgElevated,
                    }} />
                  )}
                  <div
                    style={{
                      width: isCurrent ? 36 : 24,
                      height: isCurrent ? 36 : 24,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isCurrent ? V1.type.bodySm : V1.type.bodyXs,
                      fontWeight: 700,
                      fontFamily: "'Inter Tight', sans-serif",
                      border: `2px solid ${isDone ? V1.accentGold : isCyan ? V1.accentCyan : V1.border}`,
                      background: isDone ? V1.accentGoldSoft : isCyan ? V1.accentCyanSoft : 'transparent',
                      color: isDone ? V1.accentGold : isCyan ? V1.accentCyan : V1.textDim,
                      boxShadow: isCurrent ? V1.glowCyan : 'none',
                      transition: `all ${V1.duration.fast}`,
                    }}
                    title={level.name_ar}
                  >
                    {isDone ? <CheckCircle size={12} /> : level.level_number}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* LEVEL CARDS — Unlocked */}
        <motion.div
          {...m.staggerParent}
          initial="hidden" animate="visible"
          className="space-y-5"
        >
          {unlockedLevels.map(level => {
            const isCurrent = level.level_number === currentLevel
            // A level opened via an explicit extra grant (e.g. A2 for a B1 student):
            // framed as a revisit path, NOT as "completed" — she hasn't finished it.
            const isExtra = hasExtra && !isCurrent && extraLevels.includes(level.level_number)
            const isCompleted = level.level_number < currentLevel && !isExtra
            // Two-curriculum view: the current level is a true HERO (more mass), the
            // revisit level is visibly demoted — so hierarchy reads by size, not just trim.
            const heroSize = hasExtra && isCurrent
            const demote = hasExtra && isExtra
            const totalUnits = unitCounts?.[level.id] || 0
            const completedUnits = progressData?.[level.id] || 0
            const progress = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0

            const handleClick = () => {
              tracker.track('unit_opened', { level_id: level.id, level_number: level.level_number, level_name: level.name_ar })
              navigate(`${basePath}/level/${level.level_number}`)
            }
            const handleKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }

            return (
              <motion.div
                key={level.id}
                {...m.fadeUp}
                onClick={handleClick}
                onKeyDown={handleKey}
                tabIndex={0}
                role="button"
                className="cinematic-card cursor-pointer overflow-hidden"
                style={{
                  borderRadius: '20px',
                  border: `1px solid ${isCurrent ? V1.accentGoldStrong : V1.border}`,
                  background: V1.bgLayer,
                  minHeight: heroSize ? '304px' : demote ? '212px' : '260px',
                  display: 'grid',
                  gridTemplateColumns: level.cover_image_url ? '55% 45%' : '1fr',
                  transition: `border-color ${V1.duration.fast}, box-shadow ${V1.duration.fast}, transform ${V1.duration.fast}`,
                  ...(isCurrent && { boxShadow: V1.glowGold }),
                }}
                whileHover={m.reduced ? {} : {
                  y: m.hoverLift,
                  borderColor: V1.borderHover,
                  boxShadow: V1.shadowHover,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {level.cover_image_url && (
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={level.cover_image_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: `transform ${V1.duration.medium}` }}
                      loading="lazy"
                    />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to left, ${V1.overlay} 0%, ${V1.overlaySoft} 50%, transparent 100%)` }} />
                  </div>
                )}

                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                  {isCurrent && (
                    <span style={{
                      position: 'absolute', top: '16px', left: '16px',
                      fontSize: V1.type.bodyXs, fontWeight: 700, padding: '4px 12px', borderRadius: '999px',
                      background: V1.accentGoldSoft, color: V1.accentGold, border: `1px solid ${V1.accentGoldStrong}`,
                    }}>
                      مستواك الحالي
                    </span>
                  )}
                  {isCompleted && (
                    <span style={{
                      position: 'absolute', top: '16px', left: '16px',
                      fontSize: V1.type.bodyXs, fontWeight: 700, padding: '4px 12px', borderRadius: '999px',
                      background: V1.accentGoldSoft, color: V1.accentGold, border: `1px solid ${V1.accentGoldStrong}`,
                    }} className="inline-flex items-center gap-1">
                      <CheckCircle size={12} />
                      مكتمل
                    </span>
                  )}
                  {isExtra && (
                    <span style={{
                      position: 'absolute', top: '16px', left: '16px',
                      fontSize: V1.type.bodyXs, fontWeight: 700, padding: '4px 12px', borderRadius: '999px',
                      background: V1.accentCyanSoft, color: V1.accentCyan, border: `1px solid ${V1.accentCyan}`,
                    }} className="inline-flex items-center gap-1">
                      <Sparkles size={12} />
                      للمراجعة والتقوية
                    </span>
                  )}

                  <span style={{
                    fontSize: V1.type.massive, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", lineHeight: 1,
                    background: V1.goldGradient,
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                    opacity: heroSize ? 0.32 : demote ? 0.07 : isCurrent ? 0.25 : 0.1,
                  }} dir="ltr">
                    {level.cefr}
                  </span>

                  <h3 style={{
                    fontFamily: "'Playfair Display', 'Amiri', serif",
                    fontSize: V1.type.lg, fontWeight: 700,
                    color: V1.textPrimary, marginTop: '-24px', marginBottom: '4px',
                  }}>
                    {level.name_ar}
                  </h3>

                  <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: V1.type.bodyLg, color: V1.accentGold, fontStyle: 'italic', marginBottom: '8px' }} dir="ltr">
                    {level.name_en}
                  </span>

                  {level.description_ar && (
                    <p style={{ fontSize: V1.type.bodySm, color: V1.textDim, lineHeight: V1.leading.relaxed, marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {level.description_ar}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-auto">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span style={{ fontSize: V1.type.bodySm, color: V1.textDim }}>
                          {completedUnits}/{totalUnits} وحدة
                        </span>
                        <span style={{ fontSize: V1.type.bodySm, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif", color: progress === 100 ? '#4ade80' : V1.accentCyan }}>
                          {progress}%
                        </span>
                      </div>
                      <div style={{ height: '3px', borderRadius: '2px', background: V1.border }}>
                        <div style={{
                          height: '100%', borderRadius: '2px',
                          width: `${progress}%`,
                          background: progress === 100 ? '#4ade80' : V1.goldGradient,
                          transition: `width ${V1.duration.medium}`,
                        }} />
                      </div>
                    </div>
                    <ChevronLeft size={20} style={{ color: V1.accentGold, opacity: 0.6 }} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Divider between unlocked and locked */}
        {unlockedLevels.length > 0 && lockedLevels.length > 0 && (
          <div className="flex items-center gap-4 my-12">
            <div style={{ flex: 1, height: '1px', background: V1.accentGoldSoft }} />
            <span style={{ color: V1.accentGold, fontSize: V1.type.bodySm }}>◆</span>
            <span style={{ fontSize: V1.type.body, color: V1.textDim }}>التالي في الطريق</span>
            <span style={{ color: V1.accentGold, fontSize: V1.type.bodySm }}>◆</span>
            <div style={{ flex: 1, height: '1px', background: V1.accentGoldSoft }} />
          </div>
        )}

        {/* LOCKED LEVELS */}
        <motion.div
          {...m.staggerParent}
          initial="hidden" animate="visible"
          className="space-y-5 pb-20"
        >
          {lockedLevels.map(level => {
            const totalUnits = unitCounts?.[level.id] || 0

            return (
              <motion.div
                key={level.id}
                {...m.fadeUp}
                className="overflow-hidden"
                style={{
                  borderRadius: '20px',
                  border: `1px solid ${V1.border}`,
                  background: V1.bgLayer,
                  minHeight: '220px',
                  display: 'grid',
                  gridTemplateColumns: level.cover_image_url ? '55% 45%' : '1fr',
                  opacity: 0.35,
                  cursor: 'not-allowed',
                  filter: 'grayscale(0.3)',
                }}
              >
                {level.cover_image_url && (
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={level.cover_image_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }}
                      loading="lazy"
                    />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to left, ${V1.overlay} 0%, ${V1.overlaySoft} 100%)` }} />
                  </div>
                )}

                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: '16px', left: '16px',
                    width: 36, height: 36, borderRadius: '50%',
                    background: V1.bgLayer, border: `1px solid ${V1.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Lock size={16} style={{ color: V1.textDim }} />
                  </div>

                  <span style={{
                    fontSize: V1.type.massive, fontWeight: 800, fontFamily: "'Inter Tight', sans-serif", lineHeight: 1,
                    color: V1.textDim, opacity: 0.15,
                  }} dir="ltr">
                    {level.cefr}
                  </span>

                  <h3 style={{
                    fontFamily: "'Playfair Display', 'Amiri', serif",
                    fontSize: V1.type.lg, fontWeight: 700,
                    color: V1.textDim, marginTop: '-20px', marginBottom: '4px',
                  }}>
                    {level.name_ar}
                  </h3>

                  <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: V1.type.body, color: V1.textDim, fontStyle: 'italic', opacity: 0.6 }} dir="ltr">
                    {level.name_en}
                  </span>

                  <span style={{ fontSize: V1.type.bodySm, color: V1.textDim, marginTop: '12px' }}>
                    {totalUnits} وحدة
                  </span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

/* Cinematic Background */
function CinematicBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
      <div style={{ position: 'absolute', inset: 0, background: V1.bg }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse at 30% 20%, ${V1.accentGoldSoft} 0%, transparent 50%),
          radial-gradient(ellipse at 70% 70%, ${V1.accentCyanSoft} 0%, transparent 50%)
        `,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, transparent 0%, ${V1.overlaySoft} 60%, ${V1.overlay} 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: V1.filmGrainOpacity, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      <div style={{ position: 'absolute', top: '20%', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${V1.accentGoldSoft}, transparent)` }} />
      <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${V1.accentCyanSoft}, transparent)` }} />
    </div>
  )
}
