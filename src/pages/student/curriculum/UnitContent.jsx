import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BookOpen, PenLine, Languages, Headphones, FileEdit, Mic, ClipboardCheck, Video, Check, MapPin, Volume2 } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { tracker } from '../../../services/activityTracker'
import { useUnitProgress } from '../../../hooks/useUnitProgress'
import { useUnitStar } from '../../../hooks/useUnitStar'
import UnitStarCard from '../../../components/UnitStarCard'
import { toast } from '../../../components/ui/FluentiaToast'
import StudentFAB from '../../../components/student/StudentFAB'
import NotesPanel from '../../../components/student/NotesPanel'
import SavedWordsPanel from '../../../components/student/SavedWordsPanel'
import ClassSummaryView from '../../../components/student/ClassSummaryView'
import SectionErrorBoundary from '../../../components/SectionErrorBoundary'
import ReadingTab from './tabs/ReadingTab'
import GrammarTab from './tabs/GrammarTab'
import VocabularyTab from './tabs/VocabularyTab'
import ListeningTab from './tabs/ListeningTab'
import WritingTab from './tabs/WritingTab'
import SpeakingTab from './tabs/SpeakingTab'
import AssessmentTab from './tabs/AssessmentTab'
import PronunciationTab from './tabs/PronunciationTab'
import RecordingTab from '../../../components/curriculum/RecordingTab'

const TABS = [
  { id: 'reading', label: 'القراءة', shortLabel: 'قراءة', icon: BookOpen },
  { id: 'grammar', label: 'القواعد', shortLabel: 'قواعد', icon: PenLine },
  { id: 'vocabulary', label: 'المفردات', shortLabel: 'كلمات', icon: Languages },
  { id: 'listening', label: 'الاستماع', shortLabel: 'سمع', icon: Headphones },
  { id: 'writing', label: 'الكتابة', shortLabel: 'كتابة', icon: FileEdit },
  { id: 'speaking', label: 'المحادثة', shortLabel: 'محادثة', icon: Mic },
  { id: 'pronunciation', label: 'النطق', shortLabel: 'نطق', icon: Volume2 },
  { id: 'assessment', label: 'التقييم', shortLabel: 'تقييم', icon: ClipboardCheck },
  { id: 'recording', label: 'التسجيل', shortLabel: 'تسجيل', icon: Video },
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
  const { profile, studentData } = useAuthStore()
  const currentLevel = studentData?.academic_level ?? 0
  const isStudent = profile?.role === 'student'
  const [activeTab, setActiveTab] = useState('reading')
  const [showNotes, setShowNotes] = useState(false)
  const [showWords, setShowWords] = useState(false)
  const tabBarRef = useRef(null)
  const activeTabRef = useRef(null)
  const queryClient = useQueryClient()

  const { data: unit, isLoading, error } = useQuery({
    queryKey: ['unit-content', unitId],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('*, level:curriculum_levels(*)')
        .eq('id', unitId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!unitId,
  })

  // Comprehensive unit progress
  const { data: unitProgress } = useUnitProgress(studentData?.id, unitId)
  const tabStatus = unitProgress?.tabStatus || {}
  const overallProgress = unitProgress?.overall || 0

  // Unit Star
  const groupId = studentData?.group_id
  const { data: unitStarData } = useUnitStar(unitId, groupId)

  // Bookmarks for this unit (student only)
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

  // Bookmark current tab
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('student_bookmarks').upsert({
        student_id: studentData.id,
        unit_id: unitId,
        section_type: activeTab,
      }, { onConflict: 'student_id,unit_id,section_type' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-bookmarks', studentData?.id, unitId] })
      toast({ type: 'success', title: 'تم الحفظ 📌' })
    },
  })

  // Help request
  const helpMutation = useMutation({
    mutationFn: async () => {
      // Rate limit: max 3 per day
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
        section_type: activeTab,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إرسال طلبك للمدرب ✅' })
    },
    onError: (err) => {
      if (err.message === 'rate_limit') {
        toast({ type: 'error', title: 'وصلت الحد الأقصى (3 طلبات باليوم)' })
      }
    },
  })

  const handleBookmark = useCallback(() => {
    if (bookmarks.includes(activeTab)) {
      toast({ type: 'success', title: 'هالقسم محفوظ مسبقاً 📌' })
    } else {
      bookmarkMutation.mutate()
    }
  }, [activeTab, bookmarks, bookmarkMutation])

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

  // Security: redirect if level is above student's current level
  useEffect(() => {
    if (unit?.level?.level_number != null && unit.level.level_number > currentLevel) {
      navigate('/student/curriculum', { replace: true })
    }
  }, [unit, currentLevel, navigate])

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (activeTabRef.current && tabBarRef.current) {
      const bar = tabBarRef.current
      const tab = activeTabRef.current
      const barRect = bar.getBoundingClientRect()
      const tabRect = tab.getBoundingClientRect()
      const scrollLeft = tab.offsetLeft - barRect.width / 2 + tabRect.width / 2
      bar.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    }
  }, [activeTab])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reading': return <ReadingTab unitId={unitId} />
      case 'grammar': return <GrammarTab unitId={unitId} />
      case 'vocabulary': return <VocabularyTab unitId={unitId} />
      case 'listening': return <ListeningTab unitId={unitId} />
      case 'writing': return <WritingTab unitId={unitId} />
      case 'speaking': return <SpeakingTab unitId={unitId} />
      case 'pronunciation': return <PronunciationTab unitId={unitId} />
      case 'assessment': return <AssessmentTab unitId={unitId} />
      case 'recording': return <RecordingTab unitId={unitId} />
      default: return <ReadingTab unitId={unitId} />
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-32 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
          <div className="h-8 w-64 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
          <div className="h-4 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        </div>
        {/* Tab bar skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-12 w-24 rounded-xl bg-[var(--surface-raised)] animate-pulse flex-shrink-0" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="h-64 rounded-2xl bg-[var(--surface-raised)] animate-pulse" />
      </div>
    )
  }

  if (error || !unit) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20" dir="rtl">
        <p className="text-[var(--text-muted)] font-['Tajawal']">لم يتم العثور على الوحدة</p>
        <button
          onClick={() => navigate('/student/curriculum')}
          className="text-sm text-sky-400 hover:text-sky-300 font-['Tajawal']"
        >
          العودة للمنهج
        </button>
      </div>
    )
  }

  const levelNum = unit.level?.level_number ?? ''
  const levelName = LEVEL_NAMES[levelNum] || ''

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto px-4 py-6 space-y-5"
      dir="rtl"
    >
      {/* Header */}
      <div className="space-y-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-['Tajawal']"
        >
          <ArrowRight size={16} />
          العودة
        </button>

        <div className="flex items-center gap-3">
          {unit.cover_image_url ? (
            <img
              src={unit.cover_image_url}
              alt={unit.theme_ar}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))',
                color: '#fff',
              }}
            >
              {unit.unit_number}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">
              الوحدة {unit.unit_number}: {unit.theme_ar}
            </h1>
            <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">
              المستوى {levelNum}{levelName && ` — ${levelName}`}
              {unit.level?.name_ar && ` · ${unit.level.name_ar}`}
            </p>
          </div>
        </div>

        {/* Overall progress bar */}
        {unitProgress && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
                التقدم الكلي
              </span>
              <div className="flex items-center gap-1.5">
                {overallProgress === 100 && <Check size={12} className="text-emerald-400" />}
                <span className={`text-xs font-bold font-['Inter'] tabular-nums ${overallProgress === 100 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                  {overallProgress}%
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  background: overallProgress === 100
                    ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                    : overallProgress > 0
                      ? 'linear-gradient(90deg, #38bdf8, #818cf8)'
                      : 'transparent',
                }}
              />
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-['Tajawal']">
              <span>{unitProgress.completedCount}/{unitProgress.activeCount} أنشطة مكتملة</span>
            </div>
          </div>
        )}
      </div>

      {/* Unit Star Card */}
      {unitStarData?.star && (
        <UnitStarCard
          star={unitStarData.star}
          rankings={unitStarData.rankings}
          currentStudentId={studentData?.id}
        />
      )}

      {/* Class Summary (shared by trainer) */}
      {isStudent && <ClassSummaryView unitId={unitId} />}

      {/* Tab bar — responsive: scroll on mobile, compact on tablet, full on desktop */}
      <div
        ref={tabBarRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide sticky top-16 z-10 -mx-4 px-4 py-2 snap-x snap-mandatory scroll-smooth"
        style={{ background: 'var(--surface-base)' }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const secStatus = tabStatus[tab.id]
          const dotColor = secStatus === 'completed' ? 'bg-emerald-400' : secStatus === 'in_progress' ? 'bg-amber-400' : null
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : undefined}
              data-tab-id={tab.id}
              onClick={() => {
                tracker.track('tab_switched', { tab_name: tab.id, unit_id: unitId })
                setActiveTab(tab.id)
              }}
              className={`relative flex items-center gap-1 snap-start
                px-2.5 sm:px-3 lg:px-3.5 h-10 lg:h-11
                rounded-xl text-xs sm:text-[13px] lg:text-sm
                font-medium whitespace-nowrap transition-all duration-200
                flex-shrink-0 font-['Tajawal'] ${
                isActive
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              <Icon size={14} className="lg:w-4 lg:h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
              {dotColor && (
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} absolute top-1.5 left-1.5`} />
              )}
              {isStudent && bookmarks.includes(tab.id) && (
                <MapPin size={10} className="absolute top-1 right-1 text-sky-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content — wrapped in a section-level boundary so one broken tab
          can't take down the whole unit page. Remounts on tab change. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <SectionErrorBoundary
            key={activeTab}
            section={activeTab}
            sectionLabel={TABS.find(t => t.id === activeTab)?.label}
            unitId={unitId}
          >
            {renderTabContent()}
          </SectionErrorBoundary>
        </motion.div>
      </AnimatePresence>

      {/* Student Smart Tools */}
      {isStudent && (
        <>
          <StudentFAB
            onNotes={() => setShowNotes(true)}
            onBookmark={handleBookmark}
            onHelp={handleHelp}
            onWords={() => setShowWords(true)}
          />
          <AnimatePresence>
            {showNotes && <NotesPanel unitId={unitId} onClose={() => setShowNotes(false)} />}
            {showWords && <SavedWordsPanel unitId={unitId} onClose={() => setShowWords(false)} />}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}
