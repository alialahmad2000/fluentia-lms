// Unit page route handler — decides V2 (Mission Grid) vs V3 (Movements)
// based on the feature flag resolved by useUnitLayoutVersion.
//
// Default for every user: V2 (unchanged).
// To preview V3: append ?layout=v3 to any unit URL (admins only) or set
//   profiles.unit_layout_preference = 'v3' for the target user, or flip
//   app_config[unit_layout] = '"v3"' globally.
//
// Rollback in 10 seconds:
//   UPDATE app_config SET value='"v2"', updated_at=now() WHERE key='unit_layout';
// Hard rollback: git revert this commit -> route mounts V2 directly,
// V3 code stays on disk but unreachable.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BookOpen } from 'lucide-react'

import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { tracker } from '../../../services/activityTracker'
import { toast } from '../../../components/ui/FluentiaToast'
import StudentFAB from '../../../components/student/StudentFAB'
import NotesPanel from '../../../components/student/NotesPanel'
import SavedWordsPanel from '../../../components/student/SavedWordsPanel'
import ClassSummaryView from '../../../components/student/ClassSummaryView'
import { useCurriculumPreview } from '../../../contexts/CurriculumPreviewContext'
import UnitMasteryCard from '../assessment/UnitMasteryCard'

import { useUnitLayoutVersion } from '../../../hooks/useUnitLayoutVersion'

import UnitContent from './UnitContent'
import { CinematicBg, CINEMATIC_TOKENS as V1 } from './_premiumPrimitives'
import {
  TrophyButton,
  TrophyModal,
  UnitIntroCinematic,
  AmbientParticles,
  CelebrationLayer,
  useUnitData,
  useUnitTheme,
} from './unit-v2'
import UnitBrief from './unit-v2/UnitBrief'
import UnitDebriefV2 from './unit-v2/components/debrief/UnitDebrief'
import { useUnitSkillSnapshot } from './unit-v2/hooks/useUnitSkillSnapshot'

import UnitContentV3 from './unit-v3/UnitContentV3'
import ActivityContentDispatcher from './unit-v3/ActivityContentDispatcher'

const LEVEL_NAMES = {
  0: 'تأسيس',
  1: 'أساسيات',
  2: 'تطوير',
  3: 'طلاقة',
  4: 'تمكّن',
  5: 'احتراف',
}

export default function UnitContentRouter() {
  const { version, loading } = useUnitLayoutVersion()

  // While the global flag is being fetched, render V2 — perceived "first
  // paint" is identical to today. When the flag resolves (a few ms thanks
  // to the session-level cache), if the resolved version is v3 we mount
  // the V3 wrapper.
  if (loading) return <UnitContent />
  return version === 'v3' ? <UnitContentV3Wrapper /> : <UnitContent />
}

// ───────────────────────────────────────────────────────────────────────────
// V3 wrapper — forks V2's UnitContent surface (Brief, Debrief, particles,
// celebration, intro, FAB, notes, saved-words, trophy modal, bookmarks, help,
// tracker, level guard, height sentinel, activity-complete listener) and
// replaces only the central grid block with the Movements layout.
//
// Kept inline (not exported) so nothing outside this file can import it.
// ───────────────────────────────────────────────────────────────────────────
function UnitContentV3Wrapper() {
  // ─── Hooks at top, all unconditional ───
  const { unitId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const isImpersonating = useAuthStore((s) => s.isImpersonating)
  const { canSeeAllLevels, basePath } = useCurriculumPreview()
  const currentLevel = canSeeAllLevels ? 999 : (studentData?.academic_level ?? 0)
  const isStudent = profile?.role === 'student' && !canSeeAllLevels
  const queryClient = useQueryClient()

  const unitData = useUnitData(unitId)
  const { unit, starRanking, activities, loading: unitDataLoading, error: unitDataError } = unitData

  const activeActivity = searchParams.get('activity') || null

  const [trophyOpen, setTrophyOpen] = useState(false)
  const [introSeen, setIntroSeen] = useState(false)
  const [showBrief, setShowBrief] = useState(false)
  const [briefMode, setBriefMode] = useState('first-visit')
  const [showNotes, setShowNotes] = useState(false)
  const [showWords, setShowWords] = useState(false)
  const [showDebrief, setShowDebrief] = useState(false)

  useUnitSkillSnapshot(unitId)

  const particleType = useUnitTheme(unit?.theme_en, unit?.theme_ar)

  const resolvedTheme = useMemo(() => {
    if (typeof document === 'undefined') return 'dark'
    const t = document.documentElement.dataset.theme || 'night'
    return t === 'frost-white' || t === 'light' || t === 'minimal' ? 'light' : 'dark'
  }, [])

  // Brief gate — show on first visit
  useEffect(() => {
    if (unit?.id && profile?.id && isStudent && !unitDataLoading) {
      const briefKey = `fluentia.unitBrief.seen.${profile.id}.${unit.id}`
      if (!localStorage.getItem(briefKey)) {
        setBriefMode('first-visit')
        setShowBrief(true)
      }
    }
  }, [unit?.id, profile?.id, isStudent, unitDataLoading])

  // Intro gate
  useEffect(() => {
    if (unit?.id) {
      const key = `fluentia_unit_intro_${unit.id}_seen`
      if (localStorage.getItem(key) === 'true') setIntroSeen(true)
    }
  }, [unit?.id])

  // Debrief — fires once when all non-recording activities completed
  useEffect(() => {
    if (!isStudent || isImpersonating || !profile?.id || !unitId || !activities?.length) return
    const debriefKey = `fluentia.unitDebrief.shown.${profile.id}.${unitId}`
    if (localStorage.getItem(debriefKey)) return
    const nonRecording = activities.filter(a => a.key !== 'recording')
    if (nonRecording.length === 0) return
    const allDone = nonRecording.every(a => a.status === 'completed')
    if (allDone) {
      localStorage.setItem(debriefKey, '1')
      setShowDebrief(true)
    }
  }, [activities, isStudent, isImpersonating, profile?.id, unitId])

  // Bookmarks (preserved from V2)
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
      try {
        tracker.track('curriculum_unit_view', {
          unit_id: unitId,
          unit_name: unit.title_ar || unit.title_en || unit.theme_ar,
          level: unit.level?.level_number,
          layout: 'v3',
        })
      } catch {}
    }
  }, [unit, unitId])

  // Level guard — redirect if student can't access this level
  useEffect(() => {
    if (unit?.level?.level_number != null && unit.level.level_number > currentLevel) {
      navigate(basePath, { replace: true })
    }
  }, [unit, currentLevel, navigate, basePath])

  // Activity nav helpers
  const handleActivitySelect = useCallback((key) => {
    if (!key) {
      setSearchParams({}, { replace: true })
      return
    }
    tracker.track('mission_card_clicked', { activity: key, unit_id: unitId, layout: 'v3' })
    setSearchParams({ activity: key }, { replace: true })
  }, [unitId, setSearchParams])

  // Activity-complete listener — invalidate progress + return to layout after 3s
  useEffect(() => {
    let returnTimer = null
    const handleActivityComplete = () => {
      const studentId = profile?.id ?? studentData?.id
      if (studentId && unitId) {
        queryClient.invalidateQueries({ queryKey: ['unit-progress-comprehensive', studentId, unitId] })
      }
      returnTimer = setTimeout(() => setSearchParams({}, { replace: true }), 3000)
    }
    window.addEventListener('fluentia:activity:complete', handleActivityComplete)
    return () => {
      window.removeEventListener('fluentia:activity:complete', handleActivityComplete)
      if (returnTimer) clearTimeout(returnTimer)
    }
  }, [profile?.id, studentData?.id, unitId, queryClient, setSearchParams])

  // Height sentinel — if active activity renders <10px after 1.5s, bail out
  const activityContainerRef = useRef(null)
  useEffect(() => {
    if (!activeActivity) return
    const t = setTimeout(() => {
      const el = activityContainerRef.current
      if (el && el.offsetHeight < 10) {
        console.warn('[unit-v3] Active activity rendered empty, bailing out:', activeActivity)
        setSearchParams({}, { replace: true })
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [activeActivity, setSearchParams])

  // ─── Render ───
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
        <p className="font-['Tajawal']" style={{ color: V1.textDim, fontSize: V1.type.bodyLg }}>
          لم يتم العثور على الوحدة
        </p>
        <button
          onClick={() => navigate(basePath)}
          className="font-['Tajawal']"
          style={{ fontSize: V1.type.bodySm, color: V1.accentCyan, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          العودة للمنهج
        </button>
      </div>
    )
  }

  const levelNum = unit.level?.level_number ?? ''
  const levelName = LEVEL_NAMES[levelNum] || ''
  const coverUrl = unit.cover_image_url || unit.level?.cover_image_url
  const currentRank = starRanking?.currentStudentRank || null

  const activityBody = activeActivity ? (
    <div ref={activityContainerRef}>
      <ActivityContentDispatcher activityKey={activeActivity} unitId={unitId} unit={unit} />
    </div>
  ) : null

  const masteryCardSlot = isStudent && studentData?.id ? (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ marginBottom: '20px' }}
    >
      <UnitMasteryCard unitId={unitId} studentId={studentData.id} />
    </motion.div>
  ) : null

  const classSummarySlot = (isStudent && !activeActivity) ? (
    <div style={{ marginBottom: '24px' }}>
      <ClassSummaryView unitId={unitId} />
    </div>
  ) : null

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', position: 'relative' }}>
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
            if (briefMode === 'first-visit' && profile?.id) {
              localStorage.setItem(`fluentia.unitBrief.seen.${profile.id}.${unit.id}`, new Date().toISOString())
            }
            setShowBrief(false)
            if (briefMode === 'first-visit') setIntroSeen(true)
          }}
        />
      )}

      <AnimatePresence>
        {showDebrief && <UnitDebriefV2 unitId={unitId} onClose={() => setShowDebrief(false)} />}
      </AnimatePresence>

      <AmbientParticles type={particleType} />

      {unit && !introSeen && !showBrief && (
        <UnitIntroCinematic unit={unit} onDone={() => setIntroSeen(true)} />
      )}

      <CelebrationLayer />

      <CinematicBg coverUrl={coverUrl} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <div className="w-full max-w-4xl mx-auto px-4 pt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => activeActivity ? setSearchParams({}, { replace: true }) : navigate(-1)}
              className="flex items-center gap-1.5 transition-colors font-['Tajawal']"
              style={{ color: V1.accentGold, opacity: 0.7, fontSize: V1.type.bodySm, background: 'none', border: 'none', cursor: 'pointer' }}
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
              <TrophyButton rank={currentRank} onClick={() => setTrophyOpen(true)} />
            </div>
          </div>
        </div>

        <UnitContentV3
          unitData={unit}
          activities={activities}
          studentId={studentData?.id}
          activeActivity={activeActivity}
          ActivityContent={activityBody}
          onActivitySelect={handleActivitySelect}
          onTrophyClick={() => setTrophyOpen(true)}
          theme={resolvedTheme}
          levelLabelAr={levelName}
          extraTopSlot={(
            <>
              {classSummarySlot}
            </>
          )}
        />
      </div>

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
