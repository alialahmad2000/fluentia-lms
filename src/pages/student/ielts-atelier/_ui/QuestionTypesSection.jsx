import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileQuestion, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SectionHeader, Icon } from './primitives'
import { ReadingDrawer, DrawerLede, DrawerSteps, DrawerExample, DrawerCallout } from './ReadingDrawer'

// Surfaces the taught IELTS reading question-types + their strategy (from
// ielts_reading_skills). Click a type → the premium ReadingDrawer with steps,
// common mistakes, and a worked example.
function useReadingSkills() {
  return useQuery({
    queryKey: ['ielts-reading-skills'],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_reading_skills')
        .select('question_type, name_ar, name_en, explanation_ar, strategy_steps, common_mistakes_ar, worked_example, sort_order')
        .order('sort_order', { ascending: true })
      if (error) throw error
      // Dedup near-identical entries by Arabic name (table/note, diagram variants…)
      const seen = new Set()
      return (data || []).filter((r) => {
        const k = r.name_ar?.trim()
        if (!k || seen.has(k)) return false
        seen.add(k); return true
      })
    },
  })
}

function StrategyDrawer({ skill, onClose }) {
  const steps = Array.isArray(skill?.strategy_steps) ? skill.strategy_steps : []
  const ex = skill?.worked_example && typeof skill.worked_example === 'object' ? skill.worked_example : null
  return (
    <ReadingDrawer
      open={!!skill}
      onClose={onClose}
      icon={FileQuestion}
      color="var(--iel-accent)"
      kicker="نوع سؤال"
      title={skill?.name_ar}
      subtitle={skill?.name_en}
    >
      {skill && (
        <>
          {skill.explanation_ar && <DrawerLede>{skill.explanation_ar}</DrawerLede>}
          <DrawerSteps title="الاستراتيجية" steps={steps} color="var(--iel-accent)" />
          {skill.common_mistakes_ar && (
            <DrawerCallout icon={AlertTriangle} tone="warn" title="أخطاء شائعة">{skill.common_mistakes_ar}</DrawerCallout>
          )}
          {ex && (
            <DrawerExample title="مثال محلول">
              {ex.snippet && <div style={{ direction: 'ltr', textAlign: 'left', fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.7, padding: '11px 13px', borderRadius: 10, background: 'var(--iel-surface)', border: '1px solid var(--iel-border)', marginBottom: 12, fontStyle: 'italic' }}>{ex.snippet}</div>}
              {ex.question && <div style={{ direction: 'ltr', textAlign: 'left', fontSize: 13.5, fontWeight: 700, color: 'var(--iel-ink)', marginBottom: 10 }}>{ex.question}</div>}
              {Array.isArray(ex.options) && (
                <ul style={{ direction: 'ltr', textAlign: 'left', margin: '0 0 12px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ex.options.map((o, i) => {
                    const correct = String(ex.answer || '').includes(o)
                    return <li key={i} style={{ fontSize: 13, padding: '7px 11px', borderRadius: 8, background: correct ? 'var(--iel-accent-soft)' : 'transparent', border: `1px solid ${correct ? 'color-mix(in srgb, var(--iel-accent) 40%, var(--iel-border))' : 'var(--iel-border)'}`, color: correct ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)', fontWeight: correct ? 700 : 500 }}>{o}{correct ? ' ✓' : ''}</li>
                  })}
                </ul>
              )}
              {ex.answer && !Array.isArray(ex.options) && <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--iel-accent-ink)', marginBottom: 10 }}>الإجابة: <span style={{ direction: 'ltr' }}>{ex.answer}</span></div>}
              {ex.why_ar && <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.8, margin: 0 }}>{ex.why_ar}</p>}
            </DrawerExample>
          )}
        </>
      )}
    </ReadingDrawer>
  )
}

export default function QuestionTypesSection({ hideHeader = false }) {
  const { data: skills = [], isLoading } = useReadingSkills()
  const [active, setActive] = useState(null)
  if (isLoading || !skills.length) return null

  return (
    <div>
      {!hideHeader && (
        <>
          <SectionHeader title="أنواع أسئلة القراءة — أتقِن الاستراتيجية" />
          <p style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', margin: '-6px 0 14px', fontWeight: 500, lineHeight: 1.7 }}>لكل نوع سؤال طريقة تعامل مختلفة. اضغط أي نوع لتعرف خطوات حلّه، الأخطاء الشائعة، ومثالاً محلولاً.</p>
        </>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
        {skills.map((s) => (
          <button key={s.question_type} onClick={() => setActive(s)} className="iel-gcard" style={{
            textAlign: 'start', cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", padding: '15px 17px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', border: '1px solid color-mix(in srgb, var(--iel-accent) 28%, transparent)', color: 'var(--iel-accent)' }}>
              <FileQuestion size={17} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', letterSpacing: '-.01em' }}>{s.name_ar}</div>
              <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 600, marginTop: 3, direction: 'ltr', textAlign: 'start' }}>{s.name_en}</div>
            </div>
            <span style={{ color: 'var(--iel-accent)', flex: 'none', display: 'flex' }}><Icon.chevron size={16} sw={2.2} /></span>
          </button>
        ))}
      </div>
      <StrategyDrawer skill={active} onClose={() => setActive(null)} />
    </div>
  )
}
