import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import AudioPreview from './AudioPreview'
import JSONArrayEditor from './JSONArrayEditor'
import RubricSliders from './RubricSliders'

export default function SpeakingEditor({ unitId, speaking, onRefresh }) {
  const [data, setData] = useState(speaking || {})
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))
  const topicTypes = ['discussion', 'describe_image', 'role_play', 'presentation', 'storytelling', 'opinion', 'compare']
  const difficulties = ['beginner', 'intermediate', 'advanced']

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        unit_id: unitId,
        topic_number: data.topic_number || 1,
        topic_type: data.topic_type || 'discussion',
        title_en: data.title_en || '', title_ar: data.title_ar || '',
        prompt_en: data.prompt_en || '', prompt_ar: data.prompt_ar || '',
        preparation_notes: data.preparation_notes || [],
        useful_phrases: data.useful_phrases || [],
        model_audio_url: data.model_audio_url || null,
        min_duration_seconds: data.min_duration_seconds || 60,
        max_duration_seconds: data.max_duration_seconds || 180,
        evaluation_criteria: data.evaluation_criteria || { pronunciation: 25, fluency: 25, grammar: 25, content: 25 },
        difficulty: data.difficulty || 'intermediate',
      }

      if (data.id) {
        const { error } = await supabase.from('curriculum_speaking').update(payload).eq('id', data.id)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase.from('curriculum_speaking').insert(payload).select('id').single()
        if (error) throw error
        setData(prev => ({ ...prev, id: inserted.id }))
      }
      onRefresh?.()
    } catch (err) {
      console.error('Save speaking error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select value={data.topic_type || 'discussion'} onChange={e => update('topic_type', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
          {topicTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={data.difficulty || 'intermediate'} onChange={e => update('difficulty', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
          {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input value={data.title_en || ''} onChange={e => update('title_en', e.target.value)} placeholder="Title (EN)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        <input value={data.title_ar || ''} onChange={e => update('title_ar', e.target.value)} placeholder="العنوان" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
      </div>

      <textarea value={data.prompt_en || ''} onChange={e => update('prompt_en', e.target.value)} placeholder="Speaking prompt (English)" rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />
      <textarea value={data.prompt_ar || ''} onChange={e => update('prompt_ar', e.target.value)} placeholder="تعليمات المحادثة" rows={3} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} />

      <JSONArrayEditor label="ملاحظات التحضير" value={data.preparation_notes || []} onChange={v => update('preparation_notes', v)} />
      <JSONArrayEditor label="عبارات مفيدة" value={data.useful_phrases || []} onChange={v => update('useful_phrases', v)} />

      <AudioPreview label="صوت نموذجي" value={data.model_audio_url} onChange={v => update('model_audio_url', v)} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الحد الأدنى (ثواني)</label>
          <input type="number" value={data.min_duration_seconds || 60} onChange={e => update('min_duration_seconds', Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الحد الأقصى (ثواني)</label>
          <input type="number" value={data.max_duration_seconds || 180} onChange={e => update('max_duration_seconds', Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
      </div>

      <RubricSliders
        value={data.evaluation_criteria || {}}
        onChange={v => update('evaluation_criteria', v)}
        labels={['pronunciation', 'fluency', 'grammar', 'content']}
      />

      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: saving ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.2)', color: '#38bdf8', fontFamily: 'Tajawal', border: '1px solid rgba(56,189,248,0.3)' }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'جارٍ الحفظ...' : 'حفظ المحادثة'}
      </button>
    </div>
  )
}
