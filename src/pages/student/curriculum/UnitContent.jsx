import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, BookOpen, PenLine, Languages, Headphones, FileEdit, Mic, ClipboardCheck } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { tracker } from '../../../services/activityTracker'
import ReadingTab from './tabs/ReadingTab'
import GrammarTab from './tabs/GrammarTab'
import VocabularyTab from './tabs/VocabularyTab'
import ListeningTab from './tabs/ListeningTab'
import WritingTab from './tabs/WritingTab'
import SpeakingTab from './tabs/SpeakingTab'
import AssessmentTab from './tabs/AssessmentTab'

const TABS = [
  { id: 'reading', label: 'القراءة', icon: BookOpen },
  { id: 'grammar', label: 'القواعد', icon: PenLine },
  { id: 'vocabulary', label: 'المفردات', icon: Languages },
  { id: 'listening', label: 'الاستماع', icon: Headphones },
  { id: 'writing', label: 'الكتابة', icon: FileEdit },
  { id: 'speaking', label: 'المحادثة', icon: Mic },
  { id: 'assessment', label: 'التقييم', icon: ClipboardCheck },
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
  const { studentData } = useAuthStore()
  const currentLevel = studentData?.academic_level ?? 0
  const [activeTab, setActiveTab] = useState('reading')
  const tabBarRef = useRef(null)
  const activeTabRef = useRef(null)

  const { data: unit, isLoading, error } = useQuery({
    queryKey: ['unit-content', unitId],
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

  // Fetch section completion status for this unit
  const { data: sectionProgress } = useQuery({
    queryKey: ['unit-section-progress', studentData?.id, unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('section_type, status')
        .eq('student_id', studentData?.id)
        .eq('unit_id', unitId)
      if (error) throw error
      return data || []
    },
    enabled: !!studentData?.id && !!unitId,
  })

  const sectionStatusMap = useMemo(() => {
    const map = {}
    // Group rows by section_type
    const grouped = {}
    for (const p of (sectionProgress || [])) {
      if (!grouped[p.section_type]) grouped[p.section_type] = []
      grouped[p.section_type].push(p)
    }
    for (const [type, rows] of Object.entries(grouped)) {
      if (type === 'reading' && rows.length > 0) {
        // Reading may have multiple passages — only "completed" if ALL are completed
        const allCompleted = rows.every(r => r.status === 'completed')
        const anyInProgress = rows.some(r => r.status === 'in_progress' || r.status === 'completed')
        map[type] = allCompleted ? 'completed' : anyInProgress ? 'in_progress' : rows[0].status
      } else {
        // Other sections: pick the best status
        for (const p of rows) {
          const existing = map[type]
          if (!existing || p.status === 'completed' || (p.status === 'in_progress' && existing !== 'completed')) {
            map[type] = p.status
          }
        }
      }
    }
    return map
  }, [sectionProgress])

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
      case 'assessment': return <AssessmentTab unitId={unitId} />
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
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">
              الوحدة {unit.unit_number}: {unit.theme_ar}
            </h1>
            <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">
              المستوى {levelNum}{levelName && ` — ${levelName}`}
              {unit.level?.name_ar && ` · ${unit.level.name_ar}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div
        ref={tabBarRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide sticky top-16 z-10 -mx-4 px-4 py-2"
        style={{ background: 'var(--surface-base)' }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const secStatus = sectionStatusMap[tab.id]
          const dotColor = secStatus === 'completed' ? 'bg-emerald-400' : secStatus === 'in_progress' ? 'bg-amber-400' : null
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : undefined}
              onClick={() => {
                tracker.track('tab_switched', { tab_name: tab.id, unit_id: unitId })
                setActiveTab(tab.id)
              }}
              className={`relative flex items-center gap-1.5 px-4 h-12 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 font-['Tajawal'] ${
                isActive
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {dotColor && (
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} absolute top-2 left-2`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
