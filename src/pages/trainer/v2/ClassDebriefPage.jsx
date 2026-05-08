import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Sparkles, Send, RefreshCw, Users, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useGenerateSummary } from '@/hooks/trainer/useGenerateSummary'
import { usePublishClassSummary } from '@/hooks/trainer/usePublishClassSummary'
import { CommandCard } from '@/design-system/trainer'
import './ClassDebriefPage.css'

const QUALITY_FIELD_KEYS = [
  { key: 'energy',           tKey: 'trainer.debrief.quality_energy',            emoji: '⚡' },
  { key: 'content_coverage', tKey: 'trainer.debrief.quality_content_coverage',  emoji: '📚' },
  { key: 'time_management',  tKey: 'trainer.debrief.quality_time_management',   emoji: '⏱️' },
]

const ATTENDANCE_OPTION_KEYS = [
  { value: 'present',  tKey: 'trainer.debrief.attendance_present',  cls: 'present' },
  { value: 'absent',   tKey: 'trainer.debrief.attendance_absent',   cls: 'absent' },
  { value: 'excused',  tKey: 'trainer.debrief.attendance_excused',  cls: 'excused' },
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
  const { t } = useTranslation()
  const name = student.profiles?.display_name || student.profiles?.full_name || student.id
  const ATTENDANCE_OPTIONS = ATTENDANCE_OPTION_KEYS.map(o => ({ ...o, label: t(o.tKey) }))
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
  const { t } = useTranslation()
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
        <p className="cd-muted">{t('trainer.debrief.not_found')}</p>
      </div>
    )
  }

  const alreadyPublished = !!summary.debrief_completed_at

  return (
    <div className="cd-page" dir="rtl">
      {/* Header */}
      <div className="cd-header">
        <div>
          <h1 className="cd-header__title">{t('trainer.debrief.page_title')}</h1>
          <p className="cd-header__meta">
            {summary.groups?.name} · {summary.curriculum_units?.title || t('common.unit_not_specified')} · {summary.class_date}
          </p>
        </div>
        {alreadyPublished && (
          <span className="cd-published-badge">{t('trainer.debrief.already_published_badge')}</span>
        )}
      </div>

      {/* Quality ratings */}
      <CommandCard className="cd-card">
        <h2 className="cd-card__title">{t('trainer.debrief.quality_section_title')}</h2>
        <div className="cd-quality-grid">
          {QUALITY_FIELD_KEYS.map(field => (
            <div key={field.key} className="cd-quality-row">
              <span className="cd-quality-label">
                <span className="cd-quality-emoji">{field.emoji}</span>
                {t(field.tKey)}
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
            <h2 className="cd-card__title cd-card__title--inline">{t('trainer.debrief.students_section_title')}</h2>
            <span className="cd-att-count">{attendedCount}/{students.length} {t('trainer.debrief.attendance_present')}</span>
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
          <h2 className="cd-card__title">{t('trainer.debrief.ai_summary_title')}</h2>
          <button
            type="button"
            className="cd-generate-btn"
            onClick={handleGenerateSummary}
            disabled={generateSummary.isPending}
          >
            {generateSummary.isPending
              ? <><RefreshCw size={14} className="cd-spin" /> {t('trainer.debrief.generating')}</>
              : <><Sparkles size={14} /> {t('trainer.debrief.generate_button')}</>
            }
          </button>
        </div>

        <textarea
          className="cd-summary-textarea"
          rows={7}
          placeholder={t('trainer.debrief.summary_placeholder')}
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
              {t('trainer.debrief.publish_hint')}
            </p>
          )}
          <button
            type="button"
            className="cd-publish-btn"
            disabled={!canPublish || publishSummary.isPending}
            onClick={handlePublish}
          >
            {publishSummary.isPending
              ? t('trainer.debrief.publishing')
              : <><Send size={16} /> {t('trainer.debrief.publish_button')}</>
            }
          </button>
        </motion.div>
      )}
    </div>
  )
}
