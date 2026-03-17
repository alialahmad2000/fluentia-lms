import { useState } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import JSONArrayEditor from './JSONArrayEditor'

export default function GrammarEditor({ unitId, levelId, grammar, grammarExercises = [], onRefresh }) {
  const [data, setData] = useState(grammar || {})
  const [exercises, setExercises] = useState(grammarExercises)
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))

  const exerciseTypes = ['fill_blank', 'choose_correct', 'rewrite', 'match', 'error_correction']
  const categories = ['tenses', 'modals', 'conditionals', 'passive', 'reported_speech', 'articles', 'prepositions', 'word_order', 'comparison', 'other']

  const addExercise = () => {
    setExercises([...exercises, { exercise_type: 'fill_blank', instructions_en: '', instructions_ar: '', items: [], is_auto_gradeable: true }])
  }

  const removeExercise = (i) => setExercises(exercises.filter((_, idx) => idx !== i))

  const updateExercise = (i, field, val) => {
    const next = [...exercises]
    next[i] = { ...next[i], [field]: val }
    setExercises(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        level_id: levelId, unit_id: unitId,
        topic_name_en: data.topic_name_en || '', topic_name_ar: data.topic_name_ar || '',
        category: data.category || 'other', grammar_in_use_unit: data.grammar_in_use_unit || null,
        explanation_content: data.explanation_content || {},
      }

      let grammarId = data.id
      if (grammarId) {
        const { error } = await supabase.from('curriculum_grammar').update(payload).eq('id', grammarId)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase.from('curriculum_grammar').insert(payload).select('id').single()
        if (error) throw error
        grammarId = inserted.id
        setData(prev => ({ ...prev, id: grammarId }))
      }

      // Save exercises
      await supabase.from('curriculum_grammar_exercises').delete().eq('grammar_id', grammarId)
      if (exercises.length > 0) {
        const rows = exercises.map((ex, i) => ({
          grammar_id: grammarId, exercise_type: ex.exercise_type,
          instructions_en: ex.instructions_en, instructions_ar: ex.instructions_ar,
          items: ex.items || [], is_auto_gradeable: ex.is_auto_gradeable ?? true, sort_order: i,
        }))
        const { error } = await supabase.from('curriculum_grammar_exercises').insert(rows)
        if (error) throw error
      }

      onRefresh?.()
    } catch (err) {
      console.error('Save grammar error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input value={data.topic_name_en || ''} onChange={e => update('topic_name_en', e.target.value)} placeholder="Topic name (EN)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        <input value={data.topic_name_ar || ''} onChange={e => update('topic_name_ar', e.target.value)} placeholder="اسم الموضوع" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select value={data.category || 'other'} onChange={e => update('category', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="number" value={data.grammar_in_use_unit || ''}
          onChange={e => update('grammar_in_use_unit', e.target.value ? Number(e.target.value) : null)}
          placeholder="Grammar in Use unit #"
          className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>الشرح (JSON)</label>
        <textarea
          value={typeof data.explanation_content === 'object' ? JSON.stringify(data.explanation_content, null, 2) : data.explanation_content || ''}
          onChange={e => {
            try { update('explanation_content', JSON.parse(e.target.value)) } catch { update('explanation_content', e.target.value) }
          }}
          rows={8}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none font-mono"
          style={inputStyle}
          dir="ltr"
        />
      </div>

      {/* Exercises */}
      <h4 className="text-sm font-semibold pt-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>التمارين</h4>
      {exercises.map((ex, i) => (
        <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>تمرين {i + 1}</span>
            <button onClick={() => removeExercise(i)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={14} />
            </button>
          </div>
          <select value={ex.exercise_type} onChange={e => updateExercise(i, 'exercise_type', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
            {exerciseTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={ex.instructions_en || ''} onChange={e => updateExercise(i, 'instructions_en', e.target.value)} placeholder="Instructions (EN)" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
          <input value={ex.instructions_ar || ''} onChange={e => updateExercise(i, 'instructions_ar', e.target.value)} placeholder="التعليمات" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          <JSONArrayEditor label="العناصر" value={ex.items || []} onChange={v => updateExercise(i, 'items', v)} />
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={ex.is_auto_gradeable ?? true} onChange={e => updateExercise(i, 'is_auto_gradeable', e.target.checked)} className="accent-emerald-500" />
            تصحيح تلقائي
          </label>
        </div>
      ))}

      <button onClick={addExercise} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة تمرين
      </button>

      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: saving ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.2)', color: '#38bdf8', fontFamily: 'Tajawal', border: '1px solid rgba(56,189,248,0.3)' }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'جارٍ الحفظ...' : 'حفظ القواعد'}
      </button>
    </div>
  )
}
