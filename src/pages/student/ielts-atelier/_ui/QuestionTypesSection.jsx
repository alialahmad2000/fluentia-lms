import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { SectionHeader, Card, Icon } from './primitives'

// Surfaces the taught IELTS reading question-types + their strategy (from
// ielts_reading_skills). Click a type → a drawer with steps, common mistakes,
// and a worked example.
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
  if (!skill) return null
  const steps = Array.isArray(skill.strategy_steps) ? skill.strategy_steps : []
  const ex = skill.worked_example && typeof skill.worked_example === 'object' ? skill.worked_example : null
  return (
    <div onClick={onClose} dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'flex-start' }}>
      <div onClick={(e) => e.stopPropagation()} className="iel-root" style={{
        width: '100%', maxWidth: 480, height: '100%', overflowY: 'auto', background: 'var(--iel-surface)',
        borderInlineEnd: '1px solid var(--iel-border)', boxShadow: 'var(--iel-shadow)', padding: '26px 26px 40px',
        animation: 'iel-drawer .25s ease',
      }}>
        <style>{`@keyframes iel-drawer{from{transform:translateX(-14px);opacity:.4}to{transform:none;opacity:1}}`}</style>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--iel-ink)', margin: 0 }}>{skill.name_ar}</h2>
            <div style={{ fontSize: 12, color: 'var(--iel-ink-3)', fontWeight: 700, marginTop: 3, direction: 'ltr', textAlign: 'right' }}>{skill.name_en}</div>
          </div>
          <button onClick={onClose} style={{ flex: 'none', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--iel-border)', background: 'transparent', color: 'var(--iel-ink-2)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {skill.explanation_ar && (
          <p style={{ fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.85, margin: '0 0 22px' }}>{skill.explanation_ar}</p>
        )}

        {steps.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--iel-accent)', marginBottom: 12 }}>الاستراتيجية</div>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
              {steps.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 11, fontSize: 14, color: 'var(--iel-ink)', lineHeight: 1.7 }}>
                  <span style={{ flex: 'none', width: 24, height: 24, borderRadius: 7, background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12.5, fontFamily: "'Tajawal', sans-serif" }}>{i + 1}</span>
                  <span style={{ paddingTop: 2 }}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {skill.common_mistakes_ar && (
          <div style={{ marginBottom: 22, padding: '14px 16px', borderRadius: 12, background: 'color-mix(in srgb, var(--iel-warn) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--iel-warn) 26%, transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, color: 'var(--iel-warn)', marginBottom: 7 }}><Icon.errors size={15} /> أخطاء شائعة</div>
            <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.8, margin: 0 }}>{skill.common_mistakes_ar}</p>
          </div>
        )}

        {ex && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--iel-accent)', marginBottom: 12 }}>مثال محلول</div>
            {ex.snippet && <div style={{ direction: 'ltr', textAlign: 'left', fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.7, padding: '12px 14px', borderRadius: 10, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', marginBottom: 12, fontStyle: 'italic' }}>{ex.snippet}</div>}
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
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuestionTypesSection() {
  const { data: skills = [], isLoading } = useReadingSkills()
  const [active, setActive] = useState(null)
  if (isLoading || !skills.length) return null

  return (
    <div>
      <SectionHeader title="أنواع أسئلة القراءة — أتقِن الاستراتيجية" />
      <p style={{ fontSize: 13.5, color: 'var(--iel-ink-3)', margin: '-6px 0 14px', fontWeight: 500, lineHeight: 1.7 }}>لكل نوع سؤال طريقة تعامل مختلفة. اضغط أي نوع لتعرف خطوات حلّه، الأخطاء الشائعة، ومثالاً محلولاً.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 11 }}>
        {skills.map((s) => (
          <button key={s.question_type} onClick={() => setActive(s)} style={{
            textAlign: 'start', cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
            background: 'var(--iel-surface)', border: '1px solid var(--iel-border)', borderRadius: 13, padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, transition: 'border-color .15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--iel-accent) 40%, var(--iel-border))' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--iel-border)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--iel-ink)' }}>{s.name_ar}</div>
              <div style={{ fontSize: 11, color: 'var(--iel-ink-3)', fontWeight: 600, marginTop: 2, direction: 'ltr', textAlign: 'start' }}>{s.name_en}</div>
            </div>
            <span style={{ color: 'var(--iel-ink-3)', flex: 'none', display: 'flex' }}><Icon.chevron size={16} sw={2} /></span>
          </button>
        ))}
      </div>
      <StrategyDrawer skill={active} onClose={() => setActive(null)} />
    </div>
  )
}
