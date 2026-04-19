import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Sparkles, Send, RefreshCw, Users, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useGenerateSummary } from '@/hooks/trainer/useGenerateSummary'
import { usePublishClassSummary } from '@/hooks/trainer/usePublishClassSummary'
import { CommandCard } from '@/design-system/trainer'
import './ClassDebriefPage.css'

const QUALITY_FIELDS = [
  { key: 'energy',            label: 'طاقة الحصة',        emoji: '⚡' },
  { key: 'content_coverage',  label: 'تغطية المحتوى',     emoji: '📚' },
  { key: 'time_management',   label: 'إدارة الوقت',       emoji: '⏱️' },
]

const ATTENDANCE_OPTIONS = [
  { value: 'present',  label: 'حضر',    cls: 'present' },
  { value: 'absent',   label: 'غاب',    cls: 'absent' },
  { value: 'excused',  label: 'معذور',  cls: 'excused' },
]

function StarRater({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="cd-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`cd-star ${(hovered || value) >= n ? 'cd-star--on' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        >
          <Star size={20} fill={(hovered || value) >= n ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

function StudentRow({ student, attendance, moment, onAttendance, onMoment }) {
  const name = student.profiles?.display_name || student.profiles?.full_name || student.id
  return (
    <div className="cd-student-row">
      <span className="cd-student-row__name">{name}</span>
      <div className="cd-student-row__att">
        {ATTENDANCE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`cd-att-btn cd-att-btn--${opt.cls} ${attendance === opt.value ? 'is-active' : ''}`}
            onClick={() => onAttendance(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="cd-moment-input"
        placeholder="لحظة مميزة (اختياري)"
        value={moment || ''}
        onChange={e => onMoment(e.target.value)}
        dir="rtl"
        maxLength={120}
      />
    </div>
  )
}

export default function ClassDebriefPage() {
  const { summaryId } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)

  const generateSummary = useGenerateSummary()
  const publishSummary = usePublishClassSummary()

  // Load summary
  const { data: summary, isLoading } = useQuery({
    queryKey: ['class-summary', summaryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_summaries')
        .select('*, groups(name, level), curriculum_units(title, order_index)')
        .eq('id', summaryId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!summaryId,
  })

  // Load students for this group
  const { data: students = [] } = useQuery({
    queryKey: ['group-students', summary?.group_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', summary.group_id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('profiles(full_name)')
      if (error) throw error
      return data || []
    },
    enabled: !!summary?.group_id,
  })

  // Local state
  const [qualityRatings, setQualityRatings] = useState({})
  const [attendance, setAttendance] = useState({})
  const [moments, setMoments] = useState({})
  const [summaryText, setSummaryText] = useState('')
  const [studentsExpanded, setStudentsExpanded] = useState(true)

  // Seed from DB on load
  useEffect(() => {
    if (!summary) return
    setQualityRatings(summary.quality_ratings || {})
    setAttendance(summary.per_student_attended || {})
    setMoments(summary.per_student_moments || {})
    setSummaryText(summary.ai_summary_text || '')
  }, [summary?.id])

  // Seed attendance for students not yet set
  useEffect(() => {
    if (!students.length) return
    setAttendance(prev => {
      const next = { ...prev }
      students.forEach(s => {
        if (!next[s.id]) next[s.id] = 'present'
      })
      return next
    })
  }, [students])

  async function handleGenerateSummary() {
    const result = await generateSummary.mutateAsync(summaryId)
    if (result?.summary_text) setSummaryText(result.summary_text)
  }

  const attendedCount = Object.values(attendance).filter(v => v === 'present').length
  const canPublish = summaryText.trim().length > 10 && Object.keys(qualityRatings).length > 0

  async function handlePublish() {
    await publishSummary.mutateAsync({
      summaryId,
      aiSummaryText: summaryText,
      qualityRatings,
      perStudentAttended: attendance,
      perStudentMoments: moments,
    })
    navigate('/trainer')
  }

  if (isLoading) {
    return (
      <div className="cd-page" dir="rtl">
        <div className="cd-skeleton" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="cd-page" dir="rtl">
        <p className="cd-muted">ملخص الحصة غير موجود.</p>
      </div>
    )
  }

  const alreadyPublished = !!summary.debrief_completed_at

  return (
    <div className="cd-page" dir="rtl">
      {/* Header */}
      <div className="cd-header">
        <div>
          <h1 className="cd-header__title">تقرير الحصة</h1>
          <p className="cd-header__meta">
            {summary.groups?.name} · {summary.curriculum_units?.title || 'وحدة غير محددة'} · {summary.class_date}
          </p>
        </div>
        {alreadyPublished && (
          <span className="cd-published-badge">✓ تم النشر</span>
        )}
      </div>

      {/* Quality ratings */}
      <CommandCard className="cd-card">
        <h2 className="cd-card__title">تقييم الحصة</h2>
        <div className="cd-quality-grid">
          {QUALITY_FIELDS.map(field => (
            <div key={field.key} className="cd-quality-row">
              <span className="cd-quality-label">
                <span className="cd-quality-emoji">{field.emoji}</span>
                {field.label}
              </span>
              <StarRater
                value={qualityRatings[field.key] || 0}
                onChange={v => setQualityRatings(prev => ({ ...prev, [field.key]: v }))}
              />
            </div>
          ))}
        </div>
      </CommandCard>

      {/* Students attendance + moments */}
      <CommandCard className="cd-card">
        <button
          type="button"
          className="cd-card__toggle"
          onClick={() => setStudentsExpanded(p => !p)}
        >
          <div className="cd-card__toggle-left">
            <Users size={16} />
            <h2 className="cd-card__title cd-card__title--inline">الطلاب</h2>
            <span className="cd-att-count">{attendedCount}/{students.length} حضر</span>
          </div>
          {studentsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {studentsExpanded && (
          <div className="cd-students-list">
            {students.map(student => (
              <StudentRow
                key={student.id}
                student={student}
                attendance={attendance[student.id] || 'present'}
                moment={moments[student.id] || ''}
                onAttendance={v => setAttendance(prev => ({ ...prev, [student.id]: v }))}
                onMoment={v => setMoments(prev => ({ ...prev, [student.id]: v || undefined }))}
              />
            ))}
          </div>
        )}
      </CommandCard>

      {/* AI Summary */}
      <CommandCard className="cd-card">
        <div className="cd-summary-header">
          <h2 className="cd-card__title">ملخص الحصة للطلاب</h2>
          <button
            type="button"
            className="cd-generate-btn"
            onClick={handleGenerateSummary}
            disabled={generateSummary.isPending}
          >
            {generateSummary.isPending
              ? <><RefreshCw size={14} className="cd-spin" /> جاري التوليد...</>
              : <><Sparkles size={14} /> توليد بالذكاء الاصطناعي</>
            }
          </button>
        </div>

        <textarea
          className="cd-summary-textarea"
          rows={7}
          placeholder="سيظهر الملخص هنا بعد التوليد... أو اكتب ملخصاً يدوياً."
          value={summaryText}
          onChange={e => setSummaryText(e.target.value)}
          dir="rtl"
        />

        {summaryText && (
          <p className="cd-word-count">
            {summaryText.trim().split(/\s+/).filter(Boolean).length} كلمة
          </p>
        )}
      </CommandCard>

      {/* Publish */}
      {!alreadyPublished && (
        <motion.div
          className="cd-publish-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {!canPublish && (
            <p className="cd-publish-hint">
              أكمل تقييم الحصة وأضف الملخص لتفعيل النشر
            </p>
          )}
          <button
            type="button"
            className="cd-publish-btn"
            disabled={!canPublish || publishSummary.isPending}
            onClick={handlePublish}
          >
            {publishSummary.isPending
              ? 'جاري النشر...'
              : <><Send size={16} /> نشر للطلاب (+10 XP)</>
            }
          </button>
        </motion.div>
      )}
    </div>
  )
}
