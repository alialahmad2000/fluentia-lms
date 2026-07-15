import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Map, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useG } from '@/i18n/gender'

/**
 * GrammarMapPanel — a student-facing "grammar journey" reference beside the lesson.
 * Shows the ARC of her grammar across her whole custom track: what she has mastered,
 * what she is on now (this unit), and what is coming. Answers "what grammar am I taking,
 * and what will I take next?".
 *
 * Gated to custom-curriculum students (uses_custom_curriculum). Renders null otherwise,
 * so it has ZERO effect on any generic student's grammar page.
 */
export default function GrammarMapPanel({ unitId }) {
  const g = useG()
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const isCustom = studentData?.uses_custom_curriculum === true
  const studentId = profile?.id
  const [open, setOpen] = useState(false)

  // Her whole grammar arc: owner units (ordered) + each unit's grammar topic.
  const { data: units } = useQuery({
    queryKey: ['grammar-map-units', studentId],
    enabled: isCustom && !!studentId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('id, custom_sort, theme_ar, grammar:curriculum_grammar(id, topic_name_ar, topic_name_en)')
        .eq('owner_student_id', studentId)
        .order('custom_sort', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  // Which grammar sections she has completed (best attempt).
  const { data: doneIds } = useQuery({
    queryKey: ['grammar-map-progress', studentId],
    enabled: isCustom && !!studentId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_curriculum_progress')
        .select('grammar_id')
        .eq('student_id', studentId)
        .eq('section_type', 'grammar')
        .eq('status', 'completed')
        .not('grammar_id', 'is', null)
      if (error) throw error
      return new Set((data || []).map((r) => r.grammar_id))
    },
  })

  const steps = useMemo(() => {
    if (!units?.length) return []
    return units
      .map((u) => {
        const gr = Array.isArray(u.grammar) ? u.grammar[0] : u.grammar
        if (!gr) return null
        const isCurrent = u.id === unitId
        const isDone = !isCurrent && doneIds?.has(gr.id)
        return {
          unitId: u.id,
          sort: u.custom_sort,
          topicAr: gr.topic_name_ar,
          topicEn: gr.topic_name_en,
          status: isCurrent ? 'current' : isDone ? 'done' : 'upcoming',
        }
      })
      .filter(Boolean)
  }, [units, doneIds, unitId])

  if (!isCustom || steps.length < 2) return null

  const total = steps.length
  const doneCount = steps.filter((s) => s.status === 'done').length
  const current = steps.find((s) => s.status === 'current')
  const currentIdx = steps.findIndex((s) => s.status === 'current')
  const next = currentIdx >= 0 ? steps[currentIdx + 1] : null

  return (
    <div
      className="grammar-glass"
      dir="rtl"
      style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}
    >
      {/* Header — always visible summary */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-right"
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', background: 'transparent', border: 0, cursor: 'pointer' }}
        aria-expanded={open}
      >
        <span
          style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'grid', placeItems: 'center',
            background: 'var(--accent-sky-glow, rgba(56,189,248,0.15))', color: 'var(--accent-sky, #38bdf8)',
          }}
        >
          <Map size={19} strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-['Tajawal']" style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
            {g('خريطة قواعدك', 'خريطة قواعدكِ')}
          </div>
          {current ? (
            <div className="font-['Tajawal']" style={{ fontSize: 12.5, color: 'var(--text-secondary, #c3b39c)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {g('أنت الآن', 'أنتِ الآن')}: <b style={{ color: 'var(--accent-sky, #38bdf8)' }}>{current.topicAr}</b>
            </div>
          ) : null}
        </div>
        <span
          className="font-['Tajawal']"
          style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary, #c3b39c)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
        >
          {doneCount} / {total}
        </span>
        {open ? <ChevronUp size={18} style={{ color: 'var(--text-tertiary, #8a7358)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-tertiary, #8a7358)' }} />}
      </button>

      {/* Collapsed hint: what's next */}
      {!open && next ? (
        <div className="font-['Tajawal']" style={{ padding: '0 18px 14px 18px', fontSize: 12, color: 'var(--text-tertiary, #8a7358)' }}>
          {g('التالي', 'التالي')}: {next.topicAr}
        </div>
      ) : null}

      {/* Expanded arc */}
      {open ? (
        <div style={{ padding: '4px 12px 14px 12px' }}>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
            {steps.map((s, i) => {
              const isLast = i === steps.length - 1
              const dotColor = s.status === 'done' ? 'var(--success, #34d399)' : s.status === 'current' ? 'var(--accent-sky, #38bdf8)' : 'var(--text-tertiary, #8a7358)'
              return (
                <li key={s.unitId} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '9px 8px' }}>
                  {/* rail + dot */}
                  <div style={{ position: 'relative', width: 22, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    {!isLast ? (
                      <span style={{ position: 'absolute', top: 20, bottom: -18, width: 2, background: 'var(--border, rgba(255,255,255,0.08))' }} />
                    ) : null}
                    <span
                      style={{
                        position: 'relative', zIndex: 1, width: s.status === 'current' ? 20 : 18, height: s.status === 'current' ? 20 : 18,
                        borderRadius: '50%', display: 'grid', placeItems: 'center',
                        background: s.status === 'upcoming' ? 'transparent' : (s.status === 'done' ? 'var(--success-bg, rgba(52,211,153,0.12))' : 'var(--accent-sky-glow, rgba(56,189,248,0.15))'),
                        border: `1.5px solid ${dotColor}`,
                        boxShadow: s.status === 'current' ? '0 0 10px var(--accent-sky-glow, rgba(56,189,248,0.35))' : 'none',
                      }}
                    >
                      {s.status === 'done' ? <Check size={11} strokeWidth={3} style={{ color: dotColor }} /> : s.status === 'current' ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} /> : null}
                    </span>
                  </div>
                  {/* label */}
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                    <div
                      className="font-['Tajawal']"
                      style={{ fontSize: 13.5, fontWeight: s.status === 'current' ? 800 : 600, color: s.status === 'upcoming' ? 'var(--text-tertiary, #8a7358)' : 'var(--text-primary, #f8fafc)', lineHeight: 1.4 }}
                    >
                      {s.topicAr}
                      {s.status === 'current' ? (
                        <span style={{ marginInlineStart: 8, fontSize: 10.5, fontWeight: 800, color: 'var(--accent-sky, #38bdf8)', background: 'var(--accent-sky-glow, rgba(56,189,248,0.15))', borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          {g('أنت هنا', 'أنتِ هنا')}
                        </span>
                      ) : null}
                    </div>
                    {s.topicEn ? (
                      <div style={{ fontSize: 11.5, fontStyle: 'italic', color: 'var(--text-tertiary, #8a7358)', marginTop: 1 }}>{s.topicEn}</div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}
    </div>
  )
}
