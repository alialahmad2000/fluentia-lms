import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Loader2, Eye } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { toast } from '../../../../components/ui/FluentiaToast'
import AdminFilterBar from '../../../../components/ielts/AdminFilterBar'
import PreviewModal from '../../../../components/ielts/PreviewModal'
import JSONArrayEditor from './JSONArrayEditor'

const EMPTY_FILTERS = { search: '', variant: 'all', difficulty: 'all', published: 'all' }

export default function IELTSSpeakingManager() {
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState('part1')
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [preview, setPreview] = useState(null)

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['ielts-speaking-questions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_speaking_questions').select('*').order('part, topic')
      if (error) throw error
      return data || []
    },
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, field, value }) => {
      const { error } = await supabase
        .from('ielts_speaking_questions')
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ielts-speaking-questions'] }),
  })

  const partNum = subTab === 'part1' ? 1 : subTab === 'part2' ? 2 : 3
  const byPart = questions.filter(q => q.part === partNum)
  const filtered = byPart.filter(q => {
    if (filters.search && !q.topic?.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.published !== 'all') {
      if (filters.published === 'published' && !q.is_published) return false
      if (filters.published === 'draft' && q.is_published) return false
    }
    return true
  })

  const allSelected = filtered.length > 0 && filtered.every(q => selectedIds.has(q.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(q => n.delete(q.id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(q => n.add(q.id)); return n })
    }
  }

  const addNew = async () => {
    setAdding(true)
    try {
      const { error } = await supabase.from('ielts_speaking_questions').insert({
        part: partNum, topic: '', questions: [], cue_card: null,
        follow_up_questions: [],
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['ielts-speaking-questions'] })
    } catch (err) { console.error(err) } finally { setAdding(false) }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-2">
        {['part1', 'part2', 'part3'].map(t => (
          <button
            key={t}
            onClick={() => { setSubTab(t); setExpandedId(null); setSelectedIds(new Set()) }}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: subTab === t ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
              color: subTab === t ? '#38bdf8' : 'var(--text-secondary)',
              border: subTab === t ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.06)',
              fontFamily: 'Tajawal',
            }}
          >
            {t === 'part1' ? 'Part 1' : t === 'part2' ? 'Part 2' : 'Part 3'}
          </button>
        ))}
      </div>

      <AdminFilterBar contentType="speaking" filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />

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

      {/* Header */}
      <div className="grid items-center px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal', gridTemplateColumns: '20px 28px 1fr 60px 60px 36px' }}>
        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3 h-3" />
        <span>#</span><span>الموضوع</span><span>الأسئلة</span><span>حالة</span><span></span>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />)}</div>
      ) : (
        filtered.map((q, i) => (
          <QuestionRow
            key={q.id}
            question={q}
            index={i + 1}
            part={partNum}
            expanded={expandedId === q.id}
            selected={selectedIds.has(q.id)}
            onSelect={checked => setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(q.id) : n.delete(q.id); return n })}
            onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['ielts-speaking-questions'] })}
            onPreview={() => setPreview(q)}
          />
        ))
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>لا توجد أسئلة</div>
      )}

      <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة
      </button>

      {preview && <PreviewModal contentType="speaking" contentData={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function QuestionRow({ question, index, part, expanded, selected, onSelect, onToggle, onRefresh, onPreview }) {
  const [data, setData] = useState(question)
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))
  const qCount = Array.isArray(data.questions) ? data.questions.length : 0

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ielts_speaking_questions').update({
        topic: data.topic, questions: data.questions || [],
        cue_card: data.cue_card, follow_up_questions: data.follow_up_questions || [],
        is_published: data.is_published,
      }).eq('id', question.id)
      if (error) throw error
      onRefresh()
      toast.success('تم الحفظ')
    } catch (err) { console.error(err); toast.error('فشل الحفظ') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${selected ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
      <div className="grid items-center px-4 py-3 text-sm" style={{ background: selected ? 'rgba(56,189,248,0.04)' : 'rgba(255,255,255,0.02)', gridTemplateColumns: '20px 28px 1fr 60px 60px 36px' }}>
        <input type="checkbox" checked={selected} onChange={e => { e.stopPropagation(); onSelect(e.target.checked) }} className="w-3 h-3" />
        <span style={{ color: 'var(--text-muted)' }} onClick={onToggle} className="cursor-pointer">{index}</span>
        <span style={{ color: 'var(--text-primary)' }} onClick={onToggle} className="cursor-pointer truncate">{question.topic || '—'}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }} onClick={onToggle}>{qCount} سؤال</span>
        <span className="text-xs px-2 py-0.5 rounded-full" onClick={onToggle} style={{ background: question.is_published ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)', color: question.is_published ? '#4ade80' : '#ef4444', cursor: 'pointer' }}>
          {question.is_published ? 'منشور' : 'مسودة'}
        </span>
        <button onClick={onPreview} title="معاينة" style={{ color: 'var(--text-muted)', padding: 4 }}>
          <Eye size={14} />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input value={data.topic || ''} onChange={e => update('topic', e.target.value)} placeholder="الموضوع" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          <JSONArrayEditor label="الأسئلة" value={data.questions || []} onChange={v => update('questions', v)} placeholder="سؤال..." />

          {part === 2 && (
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>بطاقة الموضوع (JSON)</label>
              <textarea
                value={typeof data.cue_card === 'object' && data.cue_card ? JSON.stringify(data.cue_card, null, 2) : data.cue_card || ''}
                onChange={e => { try { update('cue_card', JSON.parse(e.target.value)) } catch { update('cue_card', e.target.value) } }}
                rows={4} className="w-full px-3 py-2 rounded-lg text-sm resize-none font-mono" style={inputStyle} dir="ltr"
              />
            </div>
          )}

          {part === 3 && (
            <JSONArrayEditor label="أسئلة المتابعة" value={data.follow_up_questions || []} onChange={v => update('follow_up_questions', v)} />
          )}

          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
            <input type="checkbox" checked={!!data.is_published} onChange={e => update('is_published', e.target.checked)} className="accent-emerald-500" />
            منشور
          </label>

          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ
          </button>
        </div>
      )}
    </div>
  )
}
