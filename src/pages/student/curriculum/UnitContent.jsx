// Unit Page Premium V2 — cinematic learning journey
// Safety net: UnitContentOriginal.jsx preserved until 2026-04-21
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, BookOpen } from 'lucide-react'
import ContextRibbon from '../../../components/curriculum/ContextRibbon'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { tracker } from '../../../services/activityTracker'
import { toast } from '../../../components/ui/FluentiaToast'
import StudentFAB from '../../../components/student/StudentFAB'
import NotesPanel from '../../../components/student/NotesPanel'
import SavedWordsPanel from '../../../components/student/SavedWordsPanel'
import ClassSummaryView from '../../../components/student/ClassSummaryView'
import SectionErrorBoundary from '../../../components/SectionErrorBoundary'
import { useCurriculumPreview } from '../../../contexts/CurriculumPreviewContext'
import UnitMasteryCard from '../assessment/UnitMasteryCard'

// Lazy-load activity tabs — cuts initial chunk from ~455KB to ~150KB
const ReadingTab = React.lazy(() => import('./tabs/ReadingTab'))
const GrammarTab = React.lazy(() => import('./tabs/GrammarTab'))
const VocabularyTab = React.lazy(() => import('./tabs/VocabularyTab'))
const ListeningTab = React.lazy(() => import('./tabs/ListeningTab'))
const WritingTab = React.lazy(() => import('./tabs/WritingTab'))
const SpeakingTab = React.lazy(() => import('./tabs/SpeakingTab'))
const PronunciationTab = React.lazy(() => import('./tabs/PronunciationTab'))
const RecordingTab = React.lazy(() => import('../../../components/curriculum/RecordingTab'))
import { CinematicBg, CINEMATIC_TOKENS as V1, useCinematicMotion } from './_premiumPrimitives'
import {
  TrophyButton,
  TrophyModal,
  MissionGrid,
  SmartNextStepCTA,
  UnitIntroCinematic,
  AmbientParticles,
  CelebrationLayer,
  useUnitData,
  useUnitTheme,
} from './unit-v2'
import UnitBrief from './unit-v2/UnitBrief'
import UnitDebrief from './unit-v2/components/debrief/UnitDebrief'
import { useUnitSkillSnapshot } from './unit-v2/hooks/useUnitSkillSnapshot'

const TABS = [
  { id: 'reading', label: 'القراءة' },
  { id: 'grammar', label: 'القواعد' },
  { id: 'vocabulary', label: 'المفردات' },
  { id: 'listening', label: 'الاستماع' },
  { id: 'writing', label: 'الكتابة' },
  { id: 'speaking', label: 'المحادثة' },
  { id: 'pronunciation', label: 'النطق' },
  { id: 'recording', label: 'التسجيل' },
]

const LEVEL_NAMES = {
  0: 'تأسيس',
  1: 'أساسيات',
  2: 'تطوير',
  3: 'طلاقة',
  4: 'تمكّن',
  5: 'احتراف',
}

export default function UnitContent() {
  const { unitId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile, studentData } = useAuthStore()
  const { canSeeAllLevels, basePath } = useCurriculumPreview()
  const currentLevel = canSeeAllLevels ? 999 : (studentData?.academic_level ?? 0)
  const isStudent = profile?.role === 'student' && !canSeeAllLevels
  const queryClient = useQueryClient()
  const m = useCinematicMotion()

  // V2 unified data hook
  const unitData = useUnitData(unitId)
  const { unit, progress, starRanking, nextStep, loading: unitDataLoading, error: unitDataError } = unitData

  // Active activity from URL param — null = show mission grid
  const activeActivity = searchParams.get('activity') || null

  // V2 state
  const [trophyOpen, setTrophyOpen] = useState(false)
  const [introSeen, setIntroSeen] = useState(false)
  const [showBrief, setShowBrief] = useState(false)
  const [briefMode, setBriefMode] = useState('first-visit')
  const [showNotes, setShowNotes] = useState(false)
  const [showWords, setShowWords] = useState(false)
  const [showDebrief, setShowDebrief] = useState(false)
  const [visitedTabs, setVisitedTabs] = useState(new Set())

  const isImpersonating = useAuthStore(s => s.isImpersonating)
  useUnitSkillSnapshot(unitId)

  // Particle type from unit theme
  const particleType = useUnitTheme(unit?.theme_en, unit?.theme_ar)

  // Check if Brief already seen for this student+unit — auto-show if not
  useEffect(() => {
    if (unit?.id && profile?.id && isStudent && !unitDataLoading) {
      const briefKey = `fluentia.unitBrief.seen.${profile.id}.${unit.id}`
      if (!localStorage.getItem(briefKey)) {
        setBriefMode('first-visit')
        setShowBrief(true)
      }
    }
  }, [unit?.id, profile?.id, isStudent, unitDataLoading])

  // Check if intro already seen
  useEffect(() => {
    if (unit?.id) {
      const key = `fluentia_unit_intro_${unit.id}_seen`
      if (localStorage.getItem(key) === 'true') {
        setIntroSeen(true)
      }
    }
  }, [unit?.id])

  // Lazy-mount-once: track visited tabs so they stay mounted after first open
  useEffect(() => {
    if (activeActivity) {
      setVisitedTabs(prev => {
        if (prev.has(activeActivity)) return prev
        const next = new Set(prev)
        next.add(activeActivity)
        return next
      })
    }
  }, [activeActivity])

  // Debrief trigger — show when all non-recording activities completed
  useEffect(() => {
    if (!isStudent || isImpersonating || !profile?.id || !unitId || !unitData.activities?.length) return
    const debriefKey = `fluentia.unitDebrief.shown.${profile.id}.${unitId}`
    if (localStorage.getItem(debriefKey)) return
    const nonRecording = unitData.activities.filter(a => a.key !== 'recording')
    if (nonRecording.length === 0) return
    const allDone = nonRecording.every(a => a.status === 'completed')
    if (allDone) {
      localStorage.setItem(debriefKey, '1')
      setShowDebrief(true)
    }
  }, [unitData.activities, isStudent, isImpersonating, profile?.id, unitId])

  // Bookmarks (preserved from V1)
  const { data: bookmarks = [] } = useQuery({
    queryKey: ['student-bookmarks', studentData?.id, unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_bookmarks')
        .select('section_type')
        .eq('student_id', studentData.id)
        .eq('unit_id', unitId)
      return data?.map(b => b.section_type) || []
    },
    enabled: isStudent && !!studentData?.id && !!unitId,
  })

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('student_bookmarks').upsert({
        student_id: studentData.id,
        unit_id: unitId,
        section_type: activeActivity || 'reading',
      }, { onConflict: 'student_id,unit_id,section_type' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-bookmarks', studentData?.id, unitId] })
      toast({ type: 'success', title: 'تم الحفظ 📌' })
    },
  })

  const helpMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('help_requests')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentData.id)
        .gte('created_at', today)
      if (count >= 3) throw new Error('rate_limit')
      const { error } = await supabase.from('help_requests').insert({
        student_id: studentData.id,
        unit_id: unitId,
        section_type: activeActivity || 'reading',
      })
      if (error) throw error
    },
    onSuccess: () => toast({ type: 'success', title: 'تم إرسال طلبك للمدرب ✅' }),
    onError: (err) => {
      if (err.message === 'rate_limit') toast({ type: 'error', title: 'وصلت الحد الأقصى (3 طلبات باليوم)' })
    },
  })

  const handleBookmark = useCallback(() => {
    if (bookmarks.includes(activeActivity || 'reading')) {
      toast({ type: 'success', title: 'هالقسم محفوظ مسبقاً 📌' })
    } else {
      bookmarkMutation.mutate()
    }
  }, [activeActivity, bookmarks, bookmarkMutation])

  const handleHelp = useCallback(() => {
    if (confirm('تبي المدرب يعرف إنك تحتاج مساعدة بهالقسم؟')) {
      helpMutation.mutate()
    }
  }, [helpMutation])

  // Track unit view
  useEffect(() => {
    if (unit) {
      try { tracker.track('curriculum_unit_view', { unit_id: unitId, unit_name: unit.title_ar || unit.title_en, level: unit.level?.level_number }) } catch {}
    }
  }, [unit, unitId])

  // Guard: redirect if student can't access this level
  useEffect(() => {
    if (unit?.level?.level_number != null && unit.level.level_number > currentLevel) {
      navigate(basePath, { replace: true })
    }
  }, [unit, currentLevel, navigate])

  // Navigate to activity — uses URL search param
  const handleActivitySelect = useCallback((key) => {
    tracker.track('mission_card_clicked', { activity: key, unit_id: unitId })
    setSearchParams({ activity: key }, { replace: true })
  }, [unitId, setSearchParams])

  // Return to mission grid
  const handleBackToGrid = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  // Render activity content (same as old tab content — PRESERVED)
  const renderActivityContent = (key) => {
    const ribbon = <ContextRibbon unit={unit} activityType={key} />
    switch (key) {
      case 'reading':      return <>{ribbon}<ReadingTab unitId={unitId} /></>
      case 'grammar':      return <>{ribbon}<GrammarTab unitId={unitId} /></>
      case 'vocabulary':   return <>{ribbon}<VocabularyTab unitId={unitId} /></>
      case 'listening':    return <>{ribbon}<ListeningTab unitId={unitId} /></>
      case 'writing':      return <>{ribbon}<WritingTab unitId={unitId} /></>
      case 'speaking':     return <>{ribbon}<SpeakingTab unitId={unitId} /></>
      case 'pronunciation':return <>{ribbon}<PronunciationTab unitId={unitId} /></>
      case 'recording':    return <RecordingTab unitId={unitId} />
      default:             return <>{ribbon}<ReadingTab unitId={unitId} /></>
    }
  }

  // Loading state
  if (unitDataLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
          <div className="h-8 w-64 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
          <div className="h-4 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-[var(--surface-raised)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (unitDataError || !unit) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20" dir="rtl">
        <p className="font-['Tajawal']" style={{ color: V1.textDim, fontSize: V1.type.bodyLg }}>لم يتم العثور على الوحدة</p>
        <button
          onClick={() => navigate(basePath)}
          className="font-['Tajawal']"
          style={{ fontSize: V1.type.bodySm, color: V1.accentCyan }}
        >
          العودة للمنهج
        </button>
      </div>
    )
  }

  const levelNum = unit.level?.level_number ?? ''
  const levelName = LEVEL_NAMES[levelNum] || ''
  const coverUrl = unit.cover_image_url || unit.level?.cover_image_url
  // Current student rank for trophy button badge
  const currentRank = starRanking?.currentStudentRank || null

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', position: 'relative' }}>

      {/* Unit Brief — full-screen cinematic pre-unit experience */}
      {showBrief && unit && (
        <UnitBrief
          unitId={unit.id}
          mode={briefMode}
          onStart={() => {
            if (profile?.id) localStorage.setItem(`fluentia.unitBrief.seen.${profile.id}.${unit.id}`, new Date().toISOString())
            setShowBrief(false)
            if (briefMode === 'first-visit') setIntroSeen(true)
          }}
          onSkip={() => {
            if (briefMode === 'first-visit' && profile?.id) localStorage.setItem(`fluentia.unitBrief.seen.${profile.id}.${unit.id}`, new Date().toISOString())
            setShowBrief(false)
            if (briefMode === 'first-visit') setIntroSeen(true)
          }}
        />
      )}

      {/* Unit Debrief — cinematic completion experience */}
      <AnimatePresence>
        {showDebrief && (
          <UnitDebrief unitId={unitId} onClose={() => setShowDebrief(false)} />
        )}
      </AnimatePresence>

      {/* Ambient particles — behind everything */}
      <AmbientParticles type={particleType} />

      {/* Unit intro cinematic — first visit only (skip when Brief is active) */}
      {unit && !introSeen && !showBrief && (
        <UnitIntroCinematic
          unit={unit}
          onDone={() => setIntroSeen(true)}
        />
      )}

      {/* Celebration layer — global event listener */}
      <CelebrationLayer />

      <CinematicBg coverUrl={coverUrl} />

      <motion.div
        {...m.heroEntry}
        className="w-full max-w-4xl mx-auto px-4 py-6 space-y-5"
        style={{ position: 'relative', zIndex: 10 }}
      >
        {/* ════ HERO HEADER ════ */}
        <div className="space-y-2">
          {/* Back button + Trophy button row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => activeActivity ? handleBackToGrid() : navigate(-1)}
              className="flex items-center gap-1.5 transition-colors font-['Tajawal']"
              style={{ color: V1.accentGold, opacity: 0.6, fontSize: V1.type.bodySm, background: 'none', border: 'none' }}
            >
              <ArrowRight size={16} />
              {activeActivity ? 'العودة للوحدة' : 'العودة'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setBriefMode('replay'); setShowBrief(true) }}
                aria-label="استعرض الوحدة"
                title="استعرض إيجاز الوحدة"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${V1.border}`,
                  borderRadius: '12px',
                  padding: '10px',
                  color: V1.textDim,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BookOpen size={18} />
              </button>
              <TrophyButton
                rank={currentRank}
                onClick={() => setTrophyOpen(true)}
              />
            </div>
          </div>

          {/* Unit title block */}
          <div style={{ position: 'relative', overflow: 'hidden', padding: '8px 0' }}>
            <div style={{
              position: 'absolute', top: -10, left: 0, fontSize: V1.type.bgType, fontWeight: 800,
              fontFamily: "'Inter Tight', sans-serif", lineHeight: 1,
              background: V1.goldGradient,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              opacity: 0.06, pointerEvents: 'none', userSelect: 'none',
            }} dir="ltr">
              {String(unit.unit_number).padStart(2, '0')}
            </div>

            <div className="flex items-center gap-3" style={{ position: 'relative' }}>
              {unit.cover_image_url ? (
                <img
                  src={unit.cover_image_url}
                  alt={unit.theme_ar}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  style={{ border: `1px solid ${V1.accentGoldSoft}` }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                  style={{
                    fontSize: V1.type.bodyLg,
                    background: V1.accentGoldSoft,
                    color: V1.accentGold,
                    border: `1px solid ${V1.accentGoldSoft}`,
                  }}
                >
                  {unit.unit_number}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 style={{
                  fontFamily: "'Playfair Display', 'Amiri', serif",
                  fontSize: V1.type.md, fontWeight: 700,
                  color: V1.textPrimary,
                  lineHeight: V1.leading.tight,
                }}>
                  الوحدة {unit.unit_number}: {unit.theme_ar}
                </h1>
                <p className="font-['Tajawal']" style={{ color: V1.textDim, fontSize: V1.type.bodySm }}>
                  المستوى {levelNum}{levelName && ` — ${levelName}`}
                  {unit.level?.name_ar && ` · ${unit.level.name_ar}`}
                </p>
              </div>
            </div>

            <div style={{ marginTop: '12px', height: '1px', background: `linear-gradient(90deg, ${V1.accentGoldStrong}, ${V1.accentGoldSoft}, transparent)` }} />
          </div>

          {/* Progress bar — compact, merged into header */}
          {progress && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-['Tajawal']" style={{ color: V1.textDim, fontSize: V1.type.bodyXs }}>
                  التقدم الكلي
                </span>
                <div className="flex items-center gap-1.5">
                  {progress.percentage === 100 && <Check size={12} className="text-emerald-400" />}
                  <span className="font-bold font-['Inter'] tabular-nums"
                    style={{ color: progress.percentage === 100 ? '#4ade80' : V1.textDim, fontSize: V1.type.bodyXs }}>
                    {progress.percentage}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: V1.border }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ duration: m.reduced ? 0 : 0.6, ease: 'easeOut' }}
                  style={{
                    background: progress.percentage === 100
                      ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                      : progress.percentage > 0
                        ? V1.goldGradient
                        : 'transparent',
                  }}
                />
              </div>
              <div className="flex items-center gap-1 font-['Tajawal']" style={{ color: V1.textDim, fontSize: V1.type.bodyXs }}>
                <span>{progress.completedCount}/{progress.totalCount} أنشطة مكتملة</span>
              </div>
            </div>
          )}
        </div>

        {/* Class summary (preserved) */}
        {isStudent && !activeActivity && <ClassSummaryView unitId={unitId} />}

        {/* ════ MISSION GRID + ACTIVITY CONTENT (lazy-mount-once) ════ */}
        {/* Mission grid — always mounted; hidden via CSS when inside an activity */}
        <div style={{ display: activeActivity ? 'none' : 'block' }}>
          {/* Unit Mastery Card — goalpost shown ABOVE activities so student sees it first */}
          {isStudent && studentData?.id && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ marginBottom: '24px' }}
            >
              <UnitMasteryCard unitId={unitId} studentId={studentData.id} />
            </motion.div>
          )}
          <SmartNextStepCTA nextStep={nextStep} onNavigate={handleActivitySelect} />
          <div style={{ marginTop: '24px' }}>
            <MissionGrid activities={unitData.activities} onSelect={handleActivitySelect} unit={unit} />
          </div>
        </div>

        {/* Activity panes — lazy-mount-once: rendered after first visit, toggled by CSS */}
        {TABS.map(({ id, label }) => {
          if (!visitedTabs.has(id)) return null
          return (
            <div key={id} style={{ display: activeActivity === id ? 'block' : 'none' }}>
              {label && (
                <div className="flex items-center gap-2 mb-4 font-['Tajawal']" style={{ color: V1.textDim, fontSize: V1.type.bodySm }}>
                  <button
                    onClick={handleBackToGrid}
                    style={{ color: V1.accentGold, background: 'none', border: 'none', cursor: 'pointer' }}
                    className="font-['Tajawal']"
                  >
                    الوحدة
                  </button>
                  <span style={{ color: V1.textFaint }}>›</span>
                  <span>{label}</span>
                </div>
              )}
              <SectionErrorBoundary section={id} sectionLabel={label} unitId={unitId}>
                <Suspense fallback={
                  <div className="space-y-4 mt-4">
                    <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
                    <div className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
                    <div className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
                  </div>
                }>
                  {renderActivityContent(id)}
                </Suspense>
              </SectionErrorBoundary>
            </div>
          )
        })}

        {/* Student FAB (preserved) */}
        {isStudent && (
          <>
            <StudentFAB
              onNotes={() => setShowNotes(true)}
              onBookmark={handleBookmark}
              onHelp={handleHelp}
              onWords={() => setShowWords(true)}
              onAddWord={() => setShowWords(true)}
            />
            <AnimatePresence>
              {showNotes && <NotesPanel unitId={unitId} onClose={() => setShowNotes(false)} />}
              {showWords && <SavedWordsPanel unitId={unitId} onClose={() => setShowWords(false)} />}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {/* Trophy modal */}
      <AnimatePresence>
        {trophyOpen && (
          <TrophyModal
            data={{ star: starRanking?.star, rankings: starRanking?.rankings }}
            currentStudentId={studentData?.id}
            onClose={() => setTrophyOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
