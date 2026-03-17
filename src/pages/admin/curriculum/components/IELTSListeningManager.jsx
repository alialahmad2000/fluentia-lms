import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Loader2, Headphones, Check, X } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import AudioPreview from './AudioPreview'
import JSONArrayEditor from './JSONArrayEditor'

export default function IELTSListeningManager() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['ielts-listening-sections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_listening_sections').select('*').order('test_id, section_number')
      if (error) throw error
      return data || []
    },
  })

  // Group by test_id
  const grouped = sections.reduce((acc, s) => {
    const key = s.test_id || 'ungrouped'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const addNew = async () => {
    setAdding(true)
    try {
      const maxTest = sections.reduce((max, s) => Math.max(max, s.test_id || 0), 0)
      const { error } = await supabase.from('ielts_listening_sections').insert({
        test_id: maxTest + 1, section_number: 1, title: '', audio_url: '',
        accent: 'british', speaker_count: 1, questions: [],
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['ielts-listening-sections'] })
    } catch (err) { console.error(err) } finally { setAdding(false) }
  }

  if (isLoading) return <div className="animate-pulse space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />)}</div>

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([testId, secs]) => (
        <div key={testId} className="space-y-2">
          <h4 className="text-sm font-semibold px-1" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
            <Headphones size={14} className="inline ml-1" /> اختبار {testId}
          </h4>
          {secs.map(section => (
            <SectionRow
              key={section.id}
              section={section}
              expanded={expandedId === section.id}
              onToggle={() => setExpandedId(expandedId === section.id ? null : section.id)}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['ielts-listening-sections'] })}
            />
          ))}
        </div>
      ))}

      {sections.length === 0 && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>لا توجد أقسام استماع بعد</div>
      )}

      <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة قسم
      </button>
    </div>
  )
}

function SectionRow({ section, expanded, onToggle, onRefresh }) {
  const [data, setData] = useState(section)
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))
  const questionCount = Array.isArray(data.questions) ? data.questions.length : 0

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ielts_listening_sections').update({
        title: data.title, audio_url: data.audio_url, transcript: data.transcript,
        accent: data.accent, speaker_count: data.speaker_count, questions: data.questions || [],
      }).eq('id', section.id)
      if (error) throw error
      onRefresh()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--text-muted)' }}>القسم {section.section_number}</span>
          <span style={{ color: 'var(--text-primary)' }}>{section.title || '—'}</span>
        </div>
        <div className="flex items-center gap-3">
          {section.audio_url ? <Check size={14} style={{ color: '#4ade80' }} /> : <X size={14} style={{ color: '#ef4444' }} />}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{section.accent}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{questionCount} سؤال</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input value={data.title || ''} onChange={e => update('title', e.target.value)} placeholder="العنوان" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          <AudioPreview label="ملف الصوت" value={data.audio_url} onChange={v => update('audio_url', v)} />
          <textarea value={data.transcript || ''} onChange={e => update('transcript', e.target.value)} placeholder="النص المكتوب (مخفي)" rows={4} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />
          <div className="grid grid-cols-2 gap-3">
            <select value={data.accent || 'british'} onChange={e => update('accent', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              <option value="british">British</option>
              <option value="american">American</option>
              <option value="australian">Australian</option>
              <option value="mixed">Mixed</option>
            </select>
            <input type="number" value={data.speaker_count || 1} onChange={e => update('speaker_count', Number(e.target.value))} placeholder="عدد المتحدثين" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          </div>
          <JSONArrayEditor label="الأسئلة" value={data.questions || []} onChange={v => update('questions', v)} />
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ
          </button>
        </div>
      )}
    </div>
  )
}
