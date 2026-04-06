import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, Users, Zap, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { useNavigate } from 'react-router-dom'
import useClassMode from '../../stores/classModeStore'

export default function ClassPrepCard({ groupId, groupName }) {
  const navigate = useNavigate()
  const { startClass } = useClassMode()
  const [expanded, setExpanded] = useState(true)

  // Get group's current unit
  const { data: group } = useQuery({
    queryKey: ['group-current-unit', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('groups')
        .select('current_unit_id, level')
        .eq('id', groupId)
        .single()
      return data
    },
    enabled: !!groupId,
  })

  const unitId = group?.current_unit_id

  // Get unit details
  const { data: unit } = useQuery({
    queryKey: ['prep-unit-details', unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, theme_ar, theme_en')
        .eq('id', unitId)
        .single()
      return data
    },
    enabled: !!unitId,
  })

  // Get unit content — readings, vocabulary count, grammar topic
  const { data: unitContent } = useQuery({
    queryKey: ['prep-unit-content', unitId],
    queryFn: async () => {
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id, reading_label, title_en, title_ar')
        .eq('unit_id', unitId)
        .order('sort_order')

      let vocabCount = 0
      if (readings?.length) {
        const readingIds = readings.map(r => r.id)
        const { count } = await supabase
          .from('curriculum_vocabulary')
          .select('id', { count: 'exact', head: true })
          .in('reading_id', readingIds)
        vocabCount = count || 0
      }

      const { data: grammar } = await supabase
        .from('curriculum_grammar')
        .select('topic_en, topic_ar')
        .eq('unit_id', unitId)
        .limit(1)
        .maybeSingle()

      return { readings: readings || [], vocabCount, grammar }
    },
    enabled: !!unitId,
  })

  // Get students in group
  const { data: students = [] } = useQuery({
    queryKey: ['prep-students', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!groupId,
  })

  // Student readiness — who has progress on this unit
  const { data: readiness } = useQuery({
    queryKey: ['prep-readiness', groupId, unitId],
    queryFn: async () => {
      const studentIds = students.map(s => s.id)
      if (!studentIds.length) return { reviewed: 0, opened: 0, notOpened: [] }

      // Check who has any progress on this unit
      const { data: progress } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, section_type, status')
        .eq('unit_id', unitId)
        .in('student_id', studentIds)

      const studentsWithProgress = new Set(progress?.map(p => p.student_id) || [])
      const vocabReviewers = new Set(progress?.filter(p => p.section_type === 'vocabulary' && p.status !== 'locked').map(p => p.student_id) || [])
      const readingOpeners = new Set(progress?.filter(p => (p.section_type === 'reading' || p.section_type === 'reading_a') && p.status !== 'locked').map(p => p.student_id) || [])

      const notOpened = students
        .filter(s => !studentsWithProgress.has(s.id))
        .map(s => s.profiles?.display_name || s.profiles?.full_name || 'طالب')

      return {
        reviewed: vocabReviewers.size,
        opened: readingOpeners.size,
        notOpened,
        total: students.length,
      }
    },
    enabled: !!unitId && students.length > 0,
  })

  // AI focus points (cached 6 hours)
  const { data: aiAnalysis, isLoading: aiLoading } = useQuery({
    queryKey: ['prep-ai-analysis', groupId, unitId],
    queryFn: async () => {
      const { data, error } = await invokeWithRetry('class-prep-analysis', {
        body: { group_id: groupId, unit_id: unitId },
      }, { timeoutMs: 20000 })
      if (error) return { focus_points: [] }
      return data || { focus_points: [] }
    },
    enabled: !!groupId && !!unitId && students.length > 0,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    gcTime: 6 * 60 * 60 * 1000,
  })

  if (!unitId) {
    return (
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span>🎓</span>
          <h3 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>تحضير الحصة</h3>
        </div>
        <p className="text-xs font-['Tajawal']" style={{ color: 'var(--text-muted)' }}>
          حدد الوحدة الحالية للمجموعة لعرض تحضير الحصة
        </p>
      </div>
    )
  }

  const focusPoints = aiAnalysis?.focus_points || []
  const TYPE_ICONS = { grammar: '📝', pronunciation: '🎤', vocabulary: '📚', student_attention: '👤' }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(56,189,248,0.15)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ borderBottom: expanded ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
      >
        <div className="flex items-center gap-2">
          <span>🎓</span>
          <h3 className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-primary)' }}>
            تحضير الحصة القادمة
          </h3>
          {unit && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-['Tajawal']" style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)' }}>
              الوحدة {unit.unit_number}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-4">
          {/* Unit content preview */}
          {unitContent && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
                <BookOpen size={12} className="inline ml-1" /> محتوى الحصة:
              </p>
              {unitContent.readings.map(r => (
                <p key={r.id} className="text-[12px] font-['Tajawal'] pr-4" style={{ color: 'var(--text-tertiary)' }}>
                  • قراءة: "{r.title_en || r.title_ar || r.reading_label}"
                </p>
              ))}
              {unitContent.vocabCount > 0 && (
                <p className="text-[12px] font-['Tajawal'] pr-4" style={{ color: 'var(--text-tertiary)' }}>
                  • مفردات: {unitContent.vocabCount} كلمة
                </p>
              )}
              {unitContent.grammar && (
                <p className="text-[12px] font-['Tajawal'] pr-4" style={{ color: 'var(--text-tertiary)' }}>
                  • قواعد: {unitContent.grammar.topic_en || unitContent.grammar.topic_ar}
                </p>
              )}
            </div>
          )}

          {/* Student readiness */}
          {readiness && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
                <Users size={12} className="inline ml-1" /> جاهزية الطلاب:
              </p>
              <p className="text-[12px] font-['Tajawal'] pr-4" style={{ color: 'var(--text-tertiary)' }}>
                ✅ {readiness.reviewed}/{readiness.total} راجعوا المفردات
              </p>
              <p className="text-[12px] font-['Tajawal'] pr-4" style={{ color: 'var(--text-tertiary)' }}>
                ✅ {readiness.opened}/{readiness.total} فتحوا القراءة
              </p>
              {readiness.notOpened?.length > 0 && readiness.notOpened.map((name, i) => (
                <p key={i} className="text-[12px] font-['Tajawal'] pr-4 text-amber-400/80">
                  ⚠️ {name} لم تفتح الوحدة بعد
                </p>
              ))}
            </div>
          )}

          {/* AI Focus Points */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
              <Zap size={12} className="inline ml-1" /> نقاط تركيز مقترحة:
            </p>
            {aiLoading ? (
              <div className="space-y-2 pr-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', width: `${80 - i * 10}%` }} />
                ))}
              </div>
            ) : focusPoints.length > 0 ? (
              focusPoints.map((point, i) => (
                <div key={i} className="text-[12px] font-['Tajawal'] pr-4" style={{ color: 'var(--text-tertiary)' }}>
                  <span>{TYPE_ICONS[point.type] || '💡'} </span>
                  <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>{point.title}</span>
                  {point.detail && <span> — {point.detail}</span>}
                  {point.affected_students?.length > 0 && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}> ({point.affected_students.join('، ')})</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-[11px] font-['Tajawal'] pr-4" style={{ color: 'var(--text-muted)' }}>
                لا توجد بيانات كافية للتحليل بعد
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => navigate(`/student/curriculum/unit/${unitId}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold font-['Tajawal'] transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              📋 عرض المنهج
            </button>
            <button
              onClick={() => { startClass(unitId); navigate(`/trainer/curriculum/unit/${unitId}`) }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold font-['Tajawal'] transition-colors"
              style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent-sky)' }}
            >
              🎓 ابدأ الكلاس
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
