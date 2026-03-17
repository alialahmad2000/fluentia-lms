import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import JSONArrayEditor from './JSONArrayEditor'

export default function IELTSReadingManager() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState(null)

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['ielts-reading-skills'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_reading_skills').select('*').order('sort_order')
      if (error) throw error
      return data || []
    },
  })

  if (isLoading) return <div className="animate-pulse space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />)}</div>

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-5 gap-4 px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
        <span>#</span>
        <span>النوع</span>
        <span>الاسم بالعربي</span>
        <span>عدد التمارين</span>
        <span>الحالة</span>
      </div>

      {skills.map((skill, i) => (
        <SkillRow
          key={skill.id}
          skill={skill}
          index={i + 1}
          expanded={expandedId === skill.id}
          onToggle={() => setExpandedId(expandedId === skill.id ? null : skill.id)}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['ielts-reading-skills'] })}
        />
      ))}
    </div>
  )
}

function SkillRow({ skill, index, expanded, onToggle, onRefresh }) {
  const [data, setData] = useState(skill)
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))

  const practiceCount = Array.isArray(data.practice_items) ? data.practice_items.length : 0
  const isEmpty = practiceCount === 0

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ielts_reading_skills').update({
        explanation_ar: data.explanation_ar,
        strategy_steps: data.strategy_steps,
        worked_example: data.worked_example,
        practice_items: data.practice_items || [],
      }).eq('id', skill.id)
      if (error) throw error
      onRefresh()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-5 gap-4 px-4 py-3 items-center text-sm"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <span style={{ color: 'var(--text-muted)' }}>{index}</span>
        <span style={{ color: 'var(--text-primary)' }} dir="ltr">{skill.question_type}</span>
        <span style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>{skill.name_ar}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{practiceCount}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full w-fit font-medium"
          style={{
            background: isEmpty ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.15)',
            color: isEmpty ? '#ef4444' : '#4ade80',
          }}
        >
          {isEmpty ? 'فارغ' : 'جاهز'}
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
          <textarea
            value={data.explanation_ar || ''}
            onChange={e => update('explanation_ar', e.target.value)}
            placeholder="الشرح بالعربي"
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={inputStyle}
          />

          <JSONArrayEditor label="خطوات الاستراتيجية" value={data.strategy_steps || []} onChange={v => update('strategy_steps', v)} placeholder="خطوة..." />

          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>مثال عملي (JSON)</label>
            <textarea
              value={typeof data.worked_example === 'object' ? JSON.stringify(data.worked_example, null, 2) : data.worked_example || ''}
              onChange={e => { try { update('worked_example', JSON.parse(e.target.value)) } catch { update('worked_example', e.target.value) } }}
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none font-mono"
              style={inputStyle}
              dir="ltr"
            />
          </div>

          <JSONArrayEditor label="تمارين تدريبية" value={data.practice_items || []} onChange={v => update('practice_items', v)} placeholder="تمرين..." />

          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      )}
    </div>
  )
}
