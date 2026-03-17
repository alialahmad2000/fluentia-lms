import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import AudioPreview from './AudioPreview'
import JSONArrayEditor from './JSONArrayEditor'

export default function ListeningEditor({ unitId, listening, onRefresh }) {
  const [data, setData] = useState(listening || {})
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))
  const audioTypes = ['monologue', 'dialogue', 'lecture', 'interview', 'news_report']
  const difficulties = ['beginner', 'intermediate', 'advanced']

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        unit_id: unitId,
        listening_number: data.listening_number || 1,
        title_en: data.title_en || '', title_ar: data.title_ar || '',
        audio_url: data.audio_url || null,
        audio_duration_seconds: data.audio_duration_seconds || null,
        transcript: data.transcript || '',
        audio_type: data.audio_type || 'monologue',
        before_listen: data.before_listen || {},
        exercises: data.exercises || [],
        discussion_prompts: data.discussion_prompts || [],
        difficulty: data.difficulty || 'intermediate',
      }

      if (data.id) {
        const { error } = await supabase.from('curriculum_listening').update(payload).eq('id', data.id)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase.from('curriculum_listening').insert(payload).select('id').single()
        if (error) throw error
        setData(prev => ({ ...prev, id: inserted.id }))
      }
      onRefresh?.()
    } catch (err) {
      console.error('Save listening error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <input value={data.title_en || ''} onChange={e => update('title_en', e.target.value)} placeholder="Title (EN)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        <input value={data.title_ar || ''} onChange={e => update('title_ar', e.target.value)} placeholder="العنوان" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select value={data.audio_type || 'monologue'} onChange={e => update('audio_type', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
          {audioTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={data.difficulty || 'intermediate'} onChange={e => update('difficulty', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
          {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <AudioPreview label="ملف الصوت" value={data.audio_url} onChange={v => update('audio_url', v)} />

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>المدة (ثواني)</label>
        <input type="number" value={data.audio_duration_seconds || ''} onChange={e => update('audio_duration_seconds', e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>النص المكتوب (مخفي عن الطلاب)</label>
        <textarea value={data.transcript || ''} onChange={e => update('transcript', e.target.value)} rows={5} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />
      </div>

      <JSONArrayEditor label="قبل الاستماع (مفردات + توقعات)" value={Array.isArray(data.before_listen) ? data.before_listen : []} onChange={v => update('before_listen', v)} />
      <JSONArrayEditor label="التمارين" value={Array.isArray(data.exercises) ? data.exercises : []} onChange={v => update('exercises', v)} />
      <JSONArrayEditor label="أسئلة النقاش" value={data.discussion_prompts || []} onChange={v => update('discussion_prompts', v)} />

      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: saving ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.2)', color: '#38bdf8', fontFamily: 'Tajawal', border: '1px solid rgba(56,189,248,0.3)' }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'جارٍ الحفظ...' : 'حفظ الاستماع'}
      </button>
    </div>
  )
}
