import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, PenLine, Languages, Headphones, FileEdit, Mic,
  ClipboardCheck, Gamepad2, Video, ChevronLeft, Users, ChevronDown,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import InteractiveReadingTab from '../../components/interactive-curriculum/InteractiveReadingTab'

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
  const { profile, trainerData } = useAuthStore()
  const role = profile?.role
  const basePath = role === 'admin' ? '/admin' : '/trainer'

  const [activeTab, setActiveTab] = useState('reading')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

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

  // Fetch groups for this level
  const { data: groups } = useQuery({
    queryKey: ['ic-groups', unit?.level?.level_number, trainerData?.id, role],
    queryFn: async () => {
      let q = supabase.from('groups').select('id, name, level')
      if (unit?.level?.level_number) {
        q = q.eq('level', unit.level.level_number)
      }
      if (role === 'trainer' && trainerData?.id) {
        q = q.eq('trainer_id', trainerData.id)
      }
      const { data } = await q.order('name')
      return data || []
    },
    enabled: !!unit?.level?.level_number,
  })

  // Auto-select group
  useEffect(() => {
    if (groups?.length && !selectedGroupId) {
      setSelectedGroupId(groups[0].id)
    }
  }, [groups, selectedGroupId])

  // Fetch students for selected group
  const { data: students = [] } = useQuery({
    queryKey: ['ic-group-students', selectedGroupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('user_id, profiles:user_id(full_name, avatar_url)')
        .eq('group_id', selectedGroupId)
      return (data || []).map(s => ({
        user_id: s.user_id,
        full_name: s.profiles?.full_name || 'طالب',
        avatar_url: s.profiles?.avatar_url,
      }))
    },
    enabled: !!selectedGroupId,
  })

  // Tab completion stats
  const { data: tabStats } = useQuery({
    queryKey: ['ic-tab-stats', unitId, selectedGroupId],
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

  const selectedGroup = groups?.find(g => g.id === selectedGroupId)

  const renderTabContent = () => {
    if (!selectedGroupId) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Users size={40} className="text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)] font-['Tajawal']">اختر مجموعة لعرض إجابات الطلاب</p>
        </div>
      )
    }

    switch (activeTab) {
      case 'reading':
        return <InteractiveReadingTab unitId={unitId} groupId={selectedGroupId} students={students} />
      default:
        return (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center">
              {(() => { const Tab = TABS.find(t => t.id === activeTab); return Tab ? <Tab.icon size={28} className="text-sky-400" /> : null })()}
            </div>
            <p className="text-[var(--text-muted)] font-['Tajawal'] text-center">
              قريبًا — سيتم إضافة عرض إجابات الطلاب لتاب "{TABS.find(t => t.id === activeTab)?.label}" في التحديث القادم
            </p>
          </div>
        )
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

        {/* Group selector */}
        <div className="relative">
          <button
            onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
            className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium border transition-colors font-['Tajawal'] min-w-[200px]"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <Users size={16} className="text-sky-400 flex-shrink-0" />
            <span className="flex-1 text-start truncate">
              {selectedGroup?.name || 'اختر المجموعة'}
            </span>
            <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${groupDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {groupDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setGroupDropdownOpen(false)} />
              <div
                className="absolute left-0 sm:right-0 sm:left-auto top-12 z-50 w-64 rounded-xl overflow-hidden py-1"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
              >
                {groups?.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[var(--text-muted)] font-['Tajawal']">
                    لا توجد مجموعات في هذا المستوى
                  </div>
                ) : (
                  groups?.map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGroupId(g.id); setGroupDropdownOpen(false) }}
                      className={`w-full text-start px-4 py-2.5 text-sm font-['Tajawal'] transition-colors ${
                        g.id === selectedGroupId
                          ? 'bg-sky-500/15 text-sky-400'
                          : 'text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)]'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
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
      {selectedGroupId && tabStats?.[activeTab] && (
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
