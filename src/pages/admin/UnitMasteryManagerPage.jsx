import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { GlassPanel, SectionHeader } from '../../design-system/components'
import { Award, Search, Filter, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'

const LEVEL_NAMES = { 0: 'تأسيس', 1: 'أساسيات', 2: 'تطوير', 3: 'طلاقة', 4: 'تمكّن', 5: 'احتراف' }

export default function UnitMasteryManagerPage() {
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [search, setSearch] = useState('')
  const [expandedUnit, setExpandedUnit] = useState(null)

  // Fetch all assessments with unit info
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['admin-unit-mastery-assessments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('unit_mastery_assessments')
        .select(`
          id, unit_id, pass_score_percent, is_published,
          questions_per_variant, unlock_threshold_percent,
          curriculum_units!inner(unit_number, theme_ar, theme_en,
            curriculum_levels!inner(level_number, name_ar))
        `)
        .order('created_at')
      return data || []
    },
  })

  // Fetch recent attempts (last 50)
  const { data: recentAttempts = [] } = useQuery({
    queryKey: ['admin-unit-mastery-recent-attempts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('unit_mastery_attempts')
        .select(`
          id, student_id, percentage, passed, score, total_possible,
          created_at, status, skill_breakdown,
          profiles:student_id(full_name),
          unit_mastery_assessments:assessment_id(
            curriculum_units:unit_id(unit_number, theme_ar,
              curriculum_levels:level_id(level_number))
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50)
      return data || []
    },
  })

  // Fetch variant counts per assessment
  const { data: variantCounts = {} } = useQuery({
    queryKey: ['admin-unit-mastery-variant-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('unit_mastery_variants')
        .select('assessment_id, id')
      const counts = {}
      ;(data || []).forEach(v => {
        counts[v.assessment_id] = (counts[v.assessment_id] || 0) + 1
      })
      return counts
    },
  })

  // Fetch question counts per variant
  const { data: questionCounts = {} } = useQuery({
    queryKey: ['admin-unit-mastery-question-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('unit_mastery_questions')
        .select('variant_id')
      const counts = {}
      ;(data || []).forEach(q => {
        counts[q.variant_id] = (counts[q.variant_id] || 0) + 1
      })
      return counts
    },
  })

  const filtered = assessments.filter(a => {
    const unit = a.curriculum_units
    const level = unit?.curriculum_levels
    if (selectedLevel !== null && level?.level_number !== selectedLevel) return false
    if (search) {
      const s = search.toLowerCase()
      if (!unit?.theme_ar?.includes(s) && !unit?.theme_en?.toLowerCase().includes(s) && !String(unit?.unit_number).includes(s)) return false
    }
    return true
  })

  // Group by level
  const grouped = {}
  filtered.forEach(a => {
    const lvl = a.curriculum_units?.curriculum_levels?.level_number ?? '?'
    if (!grouped[lvl]) grouped[lvl] = []
    grouped[lvl].push(a)
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <SectionHeader
        title="إدارة اختبارات الإتقان"
        subtitle={`${assessments.length} اختبار · ${recentAttempts.length} محاولة أخيرة`}
        icon={<Award size={22} />}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ds-text-tertiary)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن وحدة..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm"
            style={{
              background: 'var(--ds-surface-2, rgba(255,255,255,0.06))',
              color: 'var(--ds-text-primary)',
              border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))',
            }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedLevel(null)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all`}
            style={{
              background: selectedLevel === null ? 'var(--ds-accent-primary, #38bdf8)' : 'var(--ds-surface-2)',
              color: selectedLevel === null ? '#060e1c' : 'var(--ds-text-secondary)',
            }}
          >
            الكل
          </button>
          {[0, 1, 2, 3, 4, 5].map(lvl => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl === selectedLevel ? null : lvl)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: selectedLevel === lvl ? 'var(--ds-accent-primary, #38bdf8)' : 'var(--ds-surface-2)',
                color: selectedLevel === lvl ? '#060e1c' : 'var(--ds-text-secondary)',
              }}
            >
              L{lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Assessment list by level */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--ds-surface-2)' }} />
          ))}
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([lvl, items]) => (
            <div key={lvl} className="space-y-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--ds-text-secondary)' }}>
                المستوى {lvl} — {LEVEL_NAMES[lvl] || ''}
                <span className="font-normal mr-2" style={{ color: 'var(--ds-text-tertiary)' }}>
                  ({items.length} وحدة)
                </span>
              </h2>
              {items
                .sort((a, b) => (a.curriculum_units?.unit_number || 0) - (b.curriculum_units?.unit_number || 0))
                .map(a => {
                  const unit = a.curriculum_units
                  const variants = variantCounts[a.id] || 0
                  const isExpanded = expandedUnit === a.id
                  const unitAttempts = recentAttempts.filter(att =>
                    att.unit_mastery_assessments?.curriculum_units?.unit_number === unit?.unit_number
                  )

                  return (
                    <GlassPanel key={a.id} padding="md">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedUnit(isExpanded ? null : a.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                            style={{
                              background: a.is_published ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
                              color: a.is_published ? '#4ade80' : '#fbbf24',
                            }}>
                            {unit?.unit_number}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: 'var(--ds-text-primary)' }}>
                              {unit?.theme_ar || unit?.theme_en}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                              {variants} نسخ · {a.pass_score_percent}% للنجاح · {a.is_published ? 'منشور' : 'مسودة'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {unitAttempts.length > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full"
                              style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-text-secondary)' }}>
                              {unitAttempts.length} محاولة
                            </span>
                          )}
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {isExpanded && unitAttempts.length > 0 && (
                        <div className="mt-4 pt-3 space-y-2" style={{ borderTop: '1px solid var(--ds-border-subtle)' }}>
                          <p className="text-xs font-medium" style={{ color: 'var(--ds-text-tertiary)' }}>
                            آخر المحاولات
                          </p>
                          {unitAttempts.slice(0, 10).map(att => (
                            <div key={att.id} className="flex items-center justify-between py-1.5">
                              <div className="flex items-center gap-2">
                                {att.passed ? (
                                  <CheckCircle size={14} style={{ color: '#4ade80' }} />
                                ) : (
                                  <XCircle size={14} style={{ color: '#f87171' }} />
                                )}
                                <span className="text-sm" style={{ color: 'var(--ds-text-primary)' }}>
                                  {att.profiles?.full_name || 'طالب'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono" style={{ color: att.passed ? '#4ade80' : '#f87171' }}>
                                  {Math.round(att.percentage)}%
                                </span>
                                <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                                  {att.score}/{att.total_possible}
                                </span>
                                <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                                  {new Date(att.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {isExpanded && unitAttempts.length === 0 && (
                        <p className="mt-3 text-xs text-center py-3" style={{ color: 'var(--ds-text-tertiary)' }}>
                          لا توجد محاولات بعد
                        </p>
                      )}
                    </GlassPanel>
                  )
                })}
            </div>
          ))
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: 'var(--ds-text-tertiary)' }}>لا توجد اختبارات مطابقة</p>
        </div>
      )}
    </div>
  )
}
