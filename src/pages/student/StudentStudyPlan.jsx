import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, MapPin, ChevronDown, ChevronUp, BookOpen, Clock, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

// ─── Helpers ────────────────────────────────────────────────
function getWeekRange(startDate, unitIndex) {
  const start = new Date(startDate)
  start.setDate(start.getDate() + unitIndex * 14) // 2 weeks per unit
  const end = new Date(start)
  end.setDate(end.getDate() + 13)
  return { start, end }
}

function formatDateAr(d) {
  return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
}

function getUnitStatus(unitIndex, currentUnitIndex) {
  if (unitIndex < currentUnitIndex) return 'completed'
  if (unitIndex === currentUnitIndex) return 'current'
  return 'upcoming'
}

const STATUS_CONFIG = {
  completed: { label: 'مكتملة', icon: CheckCircle2, color: 'var(--accent-emerald)', bg: 'var(--accent-emerald-glow, rgba(16,185,129,0.12))' },
  current: { label: 'الوحدة الحالية', icon: MapPin, color: 'var(--accent-sky)', bg: 'var(--accent-sky-glow, rgba(56,189,248,0.12))' },
  upcoming: { label: 'قادمة', icon: Circle, color: 'var(--text-tertiary)', bg: 'var(--surface-overlay)' },
}

// ─── Component ──────────────────────────────────────────────
export default function StudentStudyPlan() {
  const { profile, studentData } = useAuthStore()
  const [units, setUnits] = useState([])
  const [overrides, setOverrides] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedUnit, setExpandedUnit] = useState(null)

  const groupId = studentData?.group_id
  const levelId = studentData?.level_id

  useEffect(() => {
    let isMounted = true

    async function load() {
      if (!levelId) {
        if (isMounted) setLoading(false)
        return
      }

      // Fetch units for student's level
      const { data: unitData, error: unitErr } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, theme_ar, theme_en, description_ar, estimated_minutes, grammar_topic_ids')
        .eq('level_id', levelId)
        .eq('is_published', true)
        .order('unit_number', { ascending: true })

      if (unitErr) console.error('Error fetching units:', unitErr)

      // Fetch overrides for student's group
      let overrideData = []
      if (groupId) {
        const { data: ovData, error: ovErr } = await supabase
          .from('study_plan_overrides')
          .select('*')
          .eq('group_id', groupId)

        if (!ovErr && ovData) overrideData = ovData
      }

      if (isMounted) {
        setUnits(unitData || [])
        setOverrides(overrideData)
        setLoading(false)
      }
    }

    load()
    return () => { isMounted = false }
  }, [levelId, groupId])

  // Determine current unit index from overrides or default (first non-completed)
  const currentUnitIndex = useMemo(() => {
    if (overrides.length > 0) {
      const inProgress = overrides.find(o => o.status === 'in_progress')
      if (inProgress) {
        const idx = units.findIndex(u => u.id === inProgress.unit_id)
        if (idx >= 0) return idx
      }
      // Find first non-completed
      const completedIds = new Set(overrides.filter(o => o.status === 'completed').map(o => o.unit_id))
      const firstNonComplete = units.findIndex(u => !completedIds.has(u.id))
      return firstNonComplete >= 0 ? firstNonComplete : 0
    }
    return 0 // Default: first unit is current
  }, [units, overrides])

  const completedCount = useMemo(() => {
    if (overrides.length > 0) {
      return overrides.filter(o => o.status === 'completed').length
    }
    return currentUnitIndex
  }, [overrides, currentUnitIndex])

  // Compute group start date from overrides or fallback
  const planStartDate = useMemo(() => {
    if (overrides.length > 0) {
      const earliest = overrides
        .filter(o => o.scheduled_start)
        .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start))[0]
      if (earliest) return new Date(earliest.scheduled_start)
    }
    // Fallback: student enrollment or 2026-01-01
    return studentData?.enrolled_at ? new Date(studentData.enrolled_at) : new Date('2026-01-01')
  }, [overrides, studentData])

  // Auto-expand current unit
  useEffect(() => {
    if (units.length > 0) {
      setExpandedUnit(units[currentUnitIndex]?.id || null)
    }
  }, [units, currentUnitIndex])

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-64" />
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-24 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!levelId) {
    return (
      <div className="text-center py-20" dir="rtl">
        <BookOpen size={48} className="mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>لم يتم تعيين مستوى</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>تواصل مع المدرب لتحديد مستواك الدراسي</p>
      </div>
    )
  }

  const totalUnits = units.length
  const progressPercent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>خطة الدراسة</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          المستوى {studentData?.level || '١'} · رحلتك الكاملة
        </p>
      </div>

      {/* Progress summary card */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'var(--glass-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            أنجزت {completedCount} من {totalUnits} وحدة
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--accent-sky)' }}>
            {progressPercent}٪
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-overlay)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--accent-sky), var(--accent-violet))' }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        {totalUnits > 0 && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
            المدة التقديرية: {totalUnits * 2} أسبوع · الانتهاء المتوقع: {formatDateAr(
              (() => {
                const d = new Date(planStartDate)
                d.setDate(d.getDate() + totalUnits * 14)
                return d
              })()
            )}
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 rounded-full"
          style={{
            right: '19px',
            background: 'var(--border-subtle)',
          }}
        />

        <div className="space-y-4">
          {units.map((unit, idx) => {
            const override = overrides.find(o => o.unit_id === unit.id)
            const status = override
              ? (override.status === 'skipped' ? 'upcoming' : override.status === 'in_progress' ? 'current' : override.status)
              : getUnitStatus(idx, currentUnitIndex)
            const isSkipped = override?.status === 'skipped'
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming
            const weekRange = override?.scheduled_start
              ? { start: new Date(override.scheduled_start), end: override.scheduled_end ? new Date(override.scheduled_end) : new Date(override.scheduled_start) }
              : getWeekRange(planStartDate, idx)
            const isExpanded = expandedUnit === unit.id
            const isCurrent = status === 'current'

            return (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative pr-12"
              >
                {/* Timeline dot */}
                <div
                  className="absolute flex items-center justify-center w-10 h-10 rounded-full"
                  style={{
                    right: 0,
                    top: '12px',
                    background: config.bg,
                    border: isCurrent ? `2px solid ${config.color}` : '1px solid var(--border-subtle)',
                    boxShadow: isCurrent ? `0 0 12px ${config.color}40` : 'none',
                  }}
                >
                  <config.icon size={18} style={{ color: config.color }} />
                </div>

                {/* Card */}
                <button
                  onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                  className="w-full text-right rounded-2xl p-4 transition-all duration-200"
                  style={{
                    background: isCurrent ? 'var(--glass-card-hover)' : 'var(--glass-card)',
                    border: isCurrent ? `1.5px solid ${config.color}50` : '1px solid var(--border-subtle)',
                    boxShadow: isCurrent ? `0 0 20px ${config.color}15` : 'none',
                    opacity: isSkipped ? 0.5 : status === 'upcoming' ? 0.75 : 1,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: config.bg, color: config.color }}
                        >
                          {isSkipped ? 'تم التخطي' : config.label}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          الأسبوع {idx * 2 + 1}-{idx * 2 + 2}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        الوحدة {unit.unit_number}: {unit.theme_ar}
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {formatDateAr(weekRange.start)} – {formatDateAr(weekRange.end)}
                      </p>
                    </div>
                    <div className="shrink-0 mt-1">
                      {isExpanded ? (
                        <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} />
                      ) : (
                        <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-3 pt-3 space-y-2"
                      style={{ borderTop: '1px solid var(--border-subtle)' }}
                    >
                      {unit.description_ar && (
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {unit.description_ar}
                        </p>
                      )}
                      <div className="flex items-center gap-4 flex-wrap">
                        {unit.estimated_minutes && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <Clock size={12} />
                            {unit.estimated_minutes} دقيقة
                          </span>
                        )}
                        {unit.grammar_topic_ids?.length > 0 && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <BookOpen size={12} />
                            {unit.grammar_topic_ids.length} موضوع قواعد
                          </span>
                        )}
                      </div>
                      {override?.notes && (
                        <div
                          className="flex items-start gap-2 p-2.5 rounded-xl text-xs"
                          style={{
                            background: 'var(--accent-amber-glow, rgba(245,158,11,0.1))',
                            color: 'var(--accent-amber)',
                          }}
                        >
                          <MessageSquare size={12} className="shrink-0 mt-0.5" />
                          <span>{override.notes}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      {totalUnits > 0 && (
        <div className="text-center py-6">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
            style={{
              background: 'var(--glass-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-tertiary)',
            }}
          >
            <BookOpen size={14} />
            {totalUnits} وحدة · معدل وحدة كل أسبوعين
          </div>
        </div>
      )}
    </div>
  )
}
