import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { GlassPanel } from '../../design-system/components'
import { Check, X, Eye, Users, ChevronDown } from 'lucide-react'

const CEFR_MAP = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1']
const SKILL_LABELS = { grammar: 'قواعد', vocabulary: 'مفردات', reading: 'قراءة', context: 'سياق' }

function SkillBar({ breakdown }) {
  if (!breakdown) return null
  return (
    <div className="flex gap-1">
      {Object.entries(SKILL_LABELS).map(([key, label]) => {
        const val = Math.round((breakdown[key] || 0) * 100)
        return (
          <div key={key} className="flex flex-col items-center" style={{ minWidth: 32 }}>
            <div
              className="w-6 rounded-sm"
              style={{
                height: Math.max(4, val * 0.3),
                background: val >= 60
                  ? 'var(--ds-accent-primary, #38bdf8)'
                  : val >= 40
                    ? 'rgba(251,191,36,0.7)'
                    : 'rgba(239,68,68,0.6)',
              }}
            />
            <span className="text-[10px] mt-0.5" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function PlacementQueuePage() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState(null)

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['admin-placement-queue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('placement_results')
        .select(`
          *,
          profiles:student_id (id, full_name, email, avatar_url),
          recommended_group:recommended_group_id (id, name, level),
          alternate_group:alternate_group_id (id, name, level)
        `)
        .eq('admin_action', 'pending')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['admin-groups-for-placement'],
    queryFn: async () => {
      const { data } = await supabase
        .from('groups')
        .select('id, name, level, max_students')
        .eq('is_active', true)
        .order('level')
      return data || []
    },
  })

  const assignMutation = useMutation({
    mutationFn: async ({ resultId, studentId, groupId }) => {
      // Update placement result
      await supabase
        .from('placement_results')
        .update({
          admin_action: 'assigned',
          admin_reviewed: true,
        })
        .eq('id', resultId)

      // Update active_students group
      await supabase
        .from('active_students')
        .update({ group_id: groupId })
        .eq('student_id', studentId)

      // Create notification
      await supabase.from('notifications').insert({
        user_id: studentId,
        type: 'placement_assigned',
        title: 'تم تسكينكِ في قروب',
        body: 'تم تحديد مجموعتكِ بناءً على نتيجة اختبار تحديد المستوى',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-placement-queue'] })
    },
  })

  const dismissMutation = useMutation({
    mutationFn: async ({ resultId }) => {
      await supabase
        .from('placement_results')
        .update({
          admin_action: 'dismissed',
          admin_reviewed: true,
        })
        .eq('id', resultId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-placement-queue'] })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
            طابور اختبار تحديد المستوى
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
            {results.length} نتيجة بانتظار المراجعة
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: 'var(--ds-surface-1, rgba(255,255,255,0.04))',
            border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
          }}
        >
          <Users size={16} style={{ color: 'var(--ds-accent-primary, #38bdf8)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
            {results.length}
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
          جاري التحميل...
        </div>
      )}

      {!isLoading && results.length === 0 && (
        <GlassPanel padding="lg">
          <div className="text-center py-8">
            <Check size={40} className="mx-auto mb-3" style={{ color: 'var(--ds-accent-primary, #38bdf8)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              لا توجد نتائج بانتظار المراجعة
            </p>
          </div>
        </GlassPanel>
      )}

      <div className="space-y-3">
        {results.map((r) => {
          const student = r.profiles
          const isExpanded = expandedId === r.id

          return (
            <GlassPanel key={r.id} padding="md" hover>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : r.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: 'var(--ds-accent-primary, rgba(56,189,248,0.15))',
                      color: 'var(--ds-accent-primary, #38bdf8)',
                    }}
                  >
                    L{r.recommended_level}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                      {student?.full_name || 'طالب'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                      {CEFR_MAP[r.recommended_level]} • بديل: {CEFR_MAP[r.alternate_level]} •{' '}
                      {new Date(r.created_at).toLocaleDateString('ar')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SkillBar breakdown={r.skill_breakdown} />
                  <ChevronDown
                    size={16}
                    style={{
                      color: 'var(--ds-text-tertiary, #64748b)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}>
                  {/* Skill details */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {Object.entries(SKILL_LABELS).map(([key, label]) => (
                      <div key={key} className="text-center">
                        <p className="text-xl font-bold" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
                          {Math.round((r.skill_breakdown?.[key] || 0) * 100)}%
                        </p>
                        <p className="text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Strengths/weaknesses */}
                  <div className="flex gap-4 mb-4">
                    {r.strengths?.length > 0 && (
                      <div>
                        <span className="text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>قوة: </span>
                        {r.strengths.map(s => (
                          <span key={s} className="text-xs font-medium mr-1" style={{ color: '#4ade80' }}>{s}</span>
                        ))}
                      </div>
                    )}
                    {r.weaknesses?.length > 0 && (
                      <div>
                        <span className="text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>ضعف: </span>
                        {r.weaknesses.map(w => (
                          <span key={w} className="text-xs font-medium mr-1" style={{ color: '#fb923c' }}>{w}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <select
                      id={`group-${r.id}`}
                      className="flex-1 px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'var(--ds-surface-2, rgba(255,255,255,0.06))',
                        color: 'var(--ds-text-primary, #f8fafc)',
                        border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.1))',
                      }}
                      defaultValue={r.recommended_group_id || ''}
                    >
                      <option value="">اختاري قروب...</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} (L{g.level}, max {g.max_students})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const groupId = document.getElementById(`group-${r.id}`)?.value
                        if (!groupId) return
                        assignMutation.mutate({
                          resultId: r.id,
                          studentId: r.student_id,
                          groupId,
                        })
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
                      style={{
                        background: 'rgba(34,197,94,0.15)',
                        color: '#4ade80',
                        border: '1px solid rgba(34,197,94,0.25)',
                      }}
                    >
                      <Check size={15} />
                      تسكين
                    </button>
                    <button
                      onClick={() => dismissMutation.mutate({ resultId: r.id })}
                      className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}
                    >
                      <X size={15} />
                      رفض
                    </button>
                  </div>
                </div>
              )}
            </GlassPanel>
          )
        })}
      </div>
    </div>
  )
}
