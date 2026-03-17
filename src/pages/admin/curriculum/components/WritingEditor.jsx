import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import JSONArrayEditor from './JSONArrayEditor'
import RubricSliders from './RubricSliders'

export default function WritingEditor({ unitId, writing, onRefresh }) {
  const [data, setData] = useState(writing || {})
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))

  const taskTypes = ['paragraph', 'essay', 'email', 'letter', 'description', 'opinion', 'narrative', 'report']
  const difficulties = ['beginner', 'intermediate', 'advanced']

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        unit_id: unitId,
        task_number: data.task_number || 1,
        task_type: data.task_type || 'paragraph',
        title_en: data.title_en || '', title_ar: data.title_ar || '',
        prompt_en: data.prompt_en || '', prompt_ar: data.prompt_ar || '',
        hints: data.hints || [],
        word_count_min: data.word_count_min || 50,
        word_count_max: data.word_count_max || 150,
        vocabulary_to_use: data.vocabulary_to_use || [],
        grammar_to_use: data.grammar_to_use || '',
        model_answer: data.model_answer || '',
        rubric: data.rubric || { content: 25, grammar: 25, vocabulary: 25, organization: 25 },
        difficulty: data.difficulty || 'intermediate',
      }

      if (data.id) {
        const { error } = await supabase.from('curriculum_writing').update(payload).eq('id', data.id)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase.from('curriculum_writing').insert(payload).select('id').single()
        if (error) throw error
        setData(prev => ({ ...prev, id: inserted.id }))
      }
      onRefresh?.()
    } catch (err) {
      console.error('Save writing error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select value={data.task_type || 'paragraph'} onChange={e => update('task_type', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
          {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={data.difficulty || 'intermediate'} onChange={e => update('difficulty', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
          {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input value={data.title_en || ''} onChange={e => update('title_en', e.target.value)} placeholder="Title (EN)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        <input value={data.title_ar || ''} onChange={e => update('title_ar', e.target.value)} placeholder="العنوان" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
      </div>

      <textarea value={data.prompt_en || ''} onChange={e => update('prompt_en', e.target.value)} placeholder="Writing prompt (English)" rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />
      <textarea value={data.prompt_ar || ''} onChange={e => update('prompt_ar', e.target.value)} placeholder="تعليمات الكتابة" rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الحد الأدنى للكلمات</label>
          <input type="number" value={data.word_count_min || 50} onChange={e => update('word_count_min', Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الحد الأقصى للكلمات</label>
          <input type="number" value={data.word_count_max || 150} onChange={e => update('word_count_max', Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
      </div>

      <JSONArrayEditor label="تلميحات" value={data.hints || []} onChange={v => update('hints', v)} placeholder="تلميح..." />

      <input value={data.grammar_to_use || ''} onChange={e => update('grammar_to_use', e.target.value)} placeholder="القواعد المطلوبة" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />

      <textarea value={data.model_answer || ''} onChange={e => update('model_answer', e.target.value)} placeholder="الإجابة النموذجية" rows={5} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />

      <RubricSliders value={data.rubric || {}} onChange={v => update('rubric', v)} />

      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: saving ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.2)', color: '#38bdf8', fontFamily: 'Tajawal', border: '1px solid rgba(56,189,248,0.3)' }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'جارٍ الحفظ...' : 'حفظ الكتابة'}
      </button>
    </div>
  )
}
