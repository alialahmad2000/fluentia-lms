import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Loader2, Headphones, Check, X, Eye } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { toast } from '../../../../components/ui/FluentiaToast'
import AdminFilterBar from '../../../../components/ielts/AdminFilterBar'
import PreviewModal from '../../../../components/ielts/PreviewModal'
import AudioPreview from './AudioPreview'
import JSONArrayEditor from './JSONArrayEditor'

const EMPTY_FILTERS = { search: '', variant: 'all', difficulty: 'all', published: 'all' }

export default function IELTSListeningManager() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [preview, setPreview] = useState(null)

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['ielts-listening-sections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_listening_sections').select('*').order('test_id, section_number')
      if (error) throw error
      return data || []
    },
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, field, value }) => {
      const { error } = await supabase
        .from('ielts_listening_sections')
        .update({ [field]: value })
        .in('id', Array.from(ids))
      if (error) throw error
      return ids.size
    },
    onSuccess: (count) => {
      toast.success(`تم تحديث ${count} عنصر`)
      setSelectedIds(new Set())
    },
    onError: (err) => toast.error(err.message || 'فشلت العملية'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ielts-listening-sections'] }),
  })

  const filtered = sections.filter(s => {
    if (filters.search && !s.title?.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.published !== 'all') {
      if (filters.published === 'published' && !s.is_published) return false
      if (filters.published === 'draft' && s.is_published) return false
    }
    return true
  })

  const hasActiveFilter = filters.search || filters.published !== 'all'

  // Group filtered sections by test_id
  const grouped = filtered.reduce((acc, s) => {
    const key = s.test_id || 'ungrouped'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const allSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(s => n.delete(s.id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(s => n.add(s.id)); return n })
    }
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
    <div className="space-y-4" dir="rtl">
      <AdminFilterBar contentType="listening" filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <span className="text-sm" style={{ color: '#38bdf8', fontFamily: 'Tajawal' }}>تم اختيار {selectedIds.size}</span>
          <select onChange={e => e.target.value !== '' && bulkMutation.mutate({ ids: selectedIds, field: 'is_published', value: e.target.value === 'true' })}
            defaultValue="" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontFamily: 'Tajawal' }}>
            <option value="">النشر</option>
            <option value="true">نشر</option>
            <option value="false">إلغاء النشر</option>
          </select>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>✕ إلغاء</button>
        </div>
      )}

      {/* Master checkbox when filters active */}
      {hasActiveFilter && filtered.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3 h-3" />
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>تحديد الكل ({filtered.length})</span>
        </div>
      )}

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
              selected={selectedIds.has(section.id)}
              onSelect={checked => setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(section.id) : n.delete(section.id); return n })}
              onToggle={() => setExpandedId(expandedId === section.id ? null : section.id)}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['ielts-listening-sections'] })}
              onPreview={() => setPreview(section)}
            />
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>لا توجد أقسام استماع</div>
      )}

      <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة قسم
      </button>

      {preview && <PreviewModal contentType="listening" contentData={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function SectionRow({ section, expanded, selected, onSelect, onToggle, onRefresh, onPreview }) {
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
        is_published: data.is_published,
      }).eq('id', section.id)
      if (error) throw error
      onRefresh()
      toast.success('تم الحفظ')
    } catch (err) { console.error(err); toast.error('فشل الحفظ') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${selected ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
      <div className="w-full flex items-center justify-between px-4 py-3 text-sm" style={{ background: selected ? 'rgba(56,189,248,0.04)' : 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={selected} onChange={e => { e.stopPropagation(); onSelect(e.target.checked) }} className="w-3 h-3" />
          <button onClick={onToggle} className="flex items-center gap-3">
            <span style={{ color: 'var(--text-muted)' }}>القسم {section.section_number}</span>
            <span style={{ color: 'var(--text-primary)' }}>{section.title || '—'}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {section.audio_url ? <Check size={14} style={{ color: '#4ade80' }} /> : <X size={14} style={{ color: '#ef4444' }} />}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{section.accent}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{questionCount} سؤال</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: section.is_published ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)', color: section.is_published ? '#4ade80' : '#ef4444' }}>
            {section.is_published ? 'منشور' : 'مسودة'}
          </span>
          <button onClick={onPreview} title="معاينة" style={{ color: 'var(--text-muted)', padding: 4 }}>
            <Eye size={14} />
          </button>
        </div>
      </div>

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
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
            <input type="checkbox" checked={!!data.is_published} onChange={e => update('is_published', e.target.checked)} className="accent-emerald-500" />
            منشور
          </label>
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
