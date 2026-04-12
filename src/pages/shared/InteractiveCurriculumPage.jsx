import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, PenLine, Languages, Headphones, FileEdit, Mic,
  ClipboardCheck, Gamepad2, Video, ChevronLeft, Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import InteractiveReadingTab from '../../components/interactive-curriculum/InteractiveReadingTab'
import InteractiveGrammarTab from '../../components/interactive-curriculum/InteractiveGrammarTab'
import InteractiveVocabularyTab from '../../components/interactive-curriculum/InteractiveVocabularyTab'
import InteractiveListeningTab from '../../components/interactive-curriculum/InteractiveListeningTab'
import InteractiveWritingTab from '../../components/interactive-curriculum/InteractiveWritingTab'
import InteractiveSpeakingTab from '../../components/interactive-curriculum/InteractiveSpeakingTab'
import InteractiveAssessmentTab from '../../components/interactive-curriculum/InteractiveAssessmentTab'
import InteractiveGamesTab from '../../components/interactive-curriculum/InteractiveGamesTab'
import InteractiveRecordingTab from '../../components/interactive-curriculum/InteractiveRecordingTab'

const TABS = [
  { id: 'reading', label: 'القراءة', icon: BookOpen },
  { id: 'grammar', label: 'القواعد', icon: PenLine },
  { id: 'vocabulary', label: 'المفردات', icon: Languages },
  { id: 'listening', label: 'الاستماع', icon: Headphones },
  { id: 'writing', label: 'الكتابة', icon: FileEdit },
  { id: 'speaking', label: 'المحادثة', icon: Mic },
  { id: 'assessment', label: 'التقييم', icon: ClipboardCheck },
  { id: 'games', label: 'الألعاب', icon: Gamepad2 },
  { id: 'recording', label: 'التسجيل', icon: Video },
]

export default function InteractiveCurriculumPage() {
  const { levelId, unitId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile, trainerData } = useAuthStore()
  const role = profile?.role
  const basePath = role === 'admin' ? '/admin' : '/trainer'

  // Deep-link support: ?tab=writing&student=uuid
  const tabParam = searchParams.get('tab')
  const highlightStudent = searchParams.get('student')
  const [activeTab, setActiveTab] = useState(tabParam || 'reading')

  // Fetch unit details
  const { data: unit } = useQuery({
    queryKey: ['ic-unit', unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_units')
        .select('*, level:curriculum_levels(*)')
        .eq('id', unitId)
        .single()
      return data
    },
    enabled: !!unitId,
  })

  const levelNumber = unit?.level?.level_number

  // Fetch groups for this level
  const { data: groups = [] } = useQuery({
    queryKey: ['ic-level-groups', levelNumber, trainerData?.id, role],
    queryFn: async () => {
      let q = supabase.from('groups').select('id, name, level')
      if (levelNumber) {
        q = q.eq('level', levelNumber)
      }
      if (role === 'trainer' && trainerData?.id) {
        q = q.eq('trainer_id', trainerData.id)
      }
      const { data } = await q.order('name')
      return data || []
    },
    enabled: !!levelNumber,
  })

  // Fetch ALL students in this level (across all groups)
  const groupIds = useMemo(() => groups.map(g => g.id), [groups])

  const { data: students = [] } = useQuery({
    queryKey: ['ic-level-students', groupIds],
    queryFn: async () => {
      if (!groupIds.length) return []
      const { data } = await supabase
        .from('students')
        .select('id, group_id, profiles(full_name, avatar_url)')
        .in('group_id', groupIds)
        .eq('status', 'active')
      return (data || []).map(s => ({
        user_id: s.id,
        group_id: s.group_id,
        full_name: s.profiles?.full_name || 'طالب',
        avatar_url: s.profiles?.avatar_url,
      }))
    },
    enabled: groupIds.length > 0,
  })

  // Tab completion stats
  const { data: tabStats } = useQuery({
    queryKey: ['ic-tab-stats', unitId, groupIds],
    queryFn: async () => {
      const studentIds = students.map(s => s.user_id)
      if (!studentIds.length) return {}
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('section_type, student_id, status')
        .eq('unit_id', unitId)
        .in('student_id', studentIds)
      const stats = {}
      data?.forEach(row => {
        if (!stats[row.section_type]) stats[row.section_type] = { completed: 0, total: studentIds.length }
        if (row.status === 'completed') stats[row.section_type].completed++
      })
      return stats
    },
    enabled: !!unitId && students.length > 0,
    staleTime: 30000,
  })

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reading':
        return <InteractiveReadingTab unitId={unitId} students={students} />
      case 'grammar':
        return <InteractiveGrammarTab unitId={unitId} students={students} />
      case 'vocabulary':
        return <InteractiveVocabularyTab unitId={unitId} students={students} />
      case 'listening':
        return <InteractiveListeningTab unitId={unitId} students={students} />
      case 'writing':
        return <InteractiveWritingTab unitId={unitId} students={students} highlightStudent={activeTab === 'writing' ? highlightStudent : null} />
      case 'speaking':
        return <InteractiveSpeakingTab unitId={unitId} students={students} highlightStudent={activeTab === 'speaking' ? highlightStudent : null} />
      case 'assessment':
        return <InteractiveAssessmentTab unitId={unitId} students={students} />
      case 'games':
        return <InteractiveGamesTab unitId={unitId} students={students} />
      case 'recording':
        return <InteractiveRecordingTab unitId={unitId} />
      default:
        return null
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] font-['Tajawal'] flex-wrap">
        <button onClick={() => navigate(`${basePath}/interactive-curriculum`)} className="hover:text-[var(--text-primary)] transition-colors">
          المنهج التفاعلي
        </button>
        <ChevronLeft size={14} />
        <button onClick={() => navigate(`${basePath}/interactive-curriculum/${levelId}`)} className="hover:text-[var(--text-primary)] transition-colors">
          {unit?.level?.name_ar || 'المستوى'}
        </button>
        <ChevronLeft size={14} />
        <span className="text-[var(--text-primary)]">الوحدة {unit?.unit_number}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">
            الوحدة {unit?.unit_number}: {unit?.theme_ar}
          </h1>
          <p className="text-sm text-[var(--text-muted)] font-['Inter']">{unit?.theme_en}</p>
        </div>

        {/* Student count badge */}
        {students.length > 0 && (
          <div className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-['Tajawal']"
            style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            <Users size={16} className="text-sky-400" />
            <span className="text-sky-400 font-bold">{students.length}</span>
            <span className="text-[var(--text-muted)]">طالب في هذا المستوى</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map(tab => {
          const Icon = tab.icon
          const stat = tabStats?.[tab.id]
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-xs font-bold border transition-all duration-200 flex-shrink-0 font-['Tajawal'] ${
                isActive
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {stat && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-sky-500/30 text-sky-300' : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]'
                }`}>
                  {stat.completed}/{stat.total}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {renderTabContent()}
      </motion.div>

      {/* Footer stats */}
      {tabStats?.[activeTab] && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Users size={16} className="text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-muted)] font-['Tajawal']">
            {tabStats[activeTab].completed}/{tabStats[activeTab].total} طلاب أكملوا هذا التاب
          </span>
        </div>
      )}
    </div>
  )
}
