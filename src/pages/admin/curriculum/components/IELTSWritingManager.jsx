import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Loader2, Eye } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { toast } from '../../../../components/ui/FluentiaToast'
import { VariantPill } from '../../../../components/ielts/VariantPill'
import AdminFilterBar from '../../../../components/ielts/AdminFilterBar'
import PreviewModal from '../../../../components/ielts/PreviewModal'
import JSONArrayEditor from './JSONArrayEditor'

const EMPTY_FILTERS = { search: '', variant: 'all', difficulty: 'all', published: 'all' }

export default function IELTSWritingManager() {
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState('task1')
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [preview, setPreview] = useState(null)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['ielts-writing-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_writing_tasks').select('*').order('created_at')
      if (error) throw error
      return data || []
    },
  })

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, field, value }) => {
      console.log('Bulk update writing:', ids.size, 'rows, field:', field, 'value:', value)
      const { error } = await supabase
        .from('ielts_writing_tasks')
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ielts-writing-tasks'] }),
  })

  const byType = tasks.filter(t => t.task_type === (subTab === 'task1' ? 'task1' : 'task2'))
  const filtered = byType.filter(t => {
    if (filters.search && !t.prompt?.toLowerCase().includes(filters.search.toLowerCase()) && !t.sub_type?.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.variant !== 'all') {
      if (filters.variant === 'academic' && t.test_variant !== 'academic') return false
      if (filters.variant === 'general_training' && t.test_variant !== 'general_training') return false
    }
    if (filters.difficulty !== 'all' && t.difficulty_band !== filters.difficulty) return false
    if (filters.published !== 'all') {
      if (filters.published === 'published' && !t.is_published) return false
      if (filters.published === 'draft' && t.is_published) return false
    }
    return true
  })

  const allSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(t => n.delete(t.id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(t => n.add(t.id)); return n })
    }
  }

  const addNew = async () => {
    setAdding(true)
    try {
      const { error } = await supabase.from('ielts_writing_tasks').insert({
        task_type: subTab === 'task1' ? 'task1' : 'task2',
        sub_type: '', prompt: '', model_answers: {},
        test_variant: subTab === 'task1' ? 'academic' : null,
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['ielts-writing-tasks'] })
    } catch (err) { console.error(err) } finally { setAdding(false) }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {['task1', 'task2'].map(t => (
          <button key={t} onClick={() => { setSubTab(t); setExpandedId(null); setSelectedIds(new Set()) }}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: subTab === t ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)', color: subTab === t ? '#38bdf8' : 'var(--text-secondary)', border: subTab === t ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.06)', fontFamily: 'Tajawal' }}>
            {t === 'task1' ? 'Task 1' : 'Task 2'}
          </button>
        ))}
      </div>

      <AdminFilterBar contentType="writing" filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <span className="text-sm" style={{ color: '#38bdf8', fontFamily: 'Tajawal' }}>تم اختيار {selectedIds.size}</span>
          {subTab === 'task1' && (
            <select onChange={e => e.target.value && bulkMutation.mutate({ ids: selectedIds, field: 'test_variant', value: e.target.value })}
              defaultValue="" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontFamily: 'Tajawal' }}>
              <option value="">تغيير النوع</option>
              <option value="academic">أكاديمي</option>
              <option value="general_training">عام</option>
            </select>
          )}
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
      <div className="grid items-center px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal', gridTemplateColumns: '20px 28px 120px 1fr 80px 60px 36px' }}>
        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3 h-3" />
        <span>#</span><span>النوع الفرعي</span><span>النص</span><span>النوع</span><span>حالة</span><span></span>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />)}</div>
      ) : (
        filtered.map((task, i) => (
          <TaskRow key={task.id} task={task} index={i + 1} subTab={subTab}
            expanded={expandedId === task.id}
            selected={selectedIds.has(task.id)}
            onSelect={checked => setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(task.id) : n.delete(task.id); return n })}
            onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['ielts-writing-tasks'] })}
            onPreview={() => setPreview(task)}
          />
        ))
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>لا توجد مهام</div>
      )}

      <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة مهمة
      </button>

      {preview && <PreviewModal contentType="writing" contentData={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function TaskRow({ task, index, subTab, expanded, selected, onSelect, onToggle, onRefresh, onPreview }) {
  const queryClient = useQueryClient()
  const [data, setData] = useState(task)
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))
  const modelCount = data.model_answers ? Object.keys(data.model_answers).length : 0

  const quickVariant = async (newVariant) => {
    update('test_variant', newVariant || null)
    const { error } = await supabase.from('ielts_writing_tasks').update({ test_variant: newVariant || null }).eq('id', task.id)
    if (error) {
      update('test_variant', task.test_variant)
      toast.error('فشل التحديث')
    } else {
      toast.success('تم التحديث')
      queryClient.invalidateQueries({ queryKey: ['ielts-writing-tasks'] })
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ielts_writing_tasks').update({
        sub_type: data.sub_type, prompt: data.prompt,
        image_url: data.image_url, template_structure: data.template_structure,
        key_phrases: data.key_phrases, model_answers: data.model_answers || {},
        test_variant: data.test_variant || null, is_published: data.is_published,
        difficulty_band: data.difficulty_band,
      }).eq('id', task.id)
      if (error) throw error
      onRefresh()
      toast.success('تم الحفظ')
    } catch (err) { console.error(err); toast.error('فشل الحفظ') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${selected ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
      <div className="grid items-center px-4 py-3 text-sm" style={{ background: selected ? 'rgba(56,189,248,0.04)' : 'rgba(255,255,255,0.02)', gridTemplateColumns: '20px 28px 120px 1fr 80px 60px 36px' }}>
        <input type="checkbox" checked={selected} onChange={e => { e.stopPropagation(); onSelect(e.target.checked) }} className="w-3 h-3" />
        <span style={{ color: 'var(--text-muted)' }} onClick={onToggle} className="cursor-pointer">{index}</span>
        <span style={{ color: 'var(--text-primary)', fontSize: 12 }} onClick={onToggle} className="cursor-pointer truncate">{task.sub_type || '—'}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }} onClick={onToggle} className="cursor-pointer truncate">{task.prompt?.substring(0, 50) || '—'}</span>
        <div onClick={e => e.stopPropagation()}>
          {subTab === 'task1' ? (
            <select value={data.test_variant || ''} onChange={e => quickVariant(e.target.value)}
              style={{ background: 'transparent', border: 'none', fontSize: 11, cursor: 'pointer', color: data.test_variant === 'general_training' ? '#a855f7' : '#38bdf8', fontFamily: 'Tajawal', fontWeight: 700 }}>
              <option value="academic">أكاديمي</option>
              <option value="general_training">عام</option>
            </select>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
          )}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" onClick={onToggle} style={{ background: task.prompt ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)', color: task.prompt ? '#4ade80' : '#ef4444', cursor: 'pointer' }}>
          {task.prompt ? 'جاهز' : 'فارغ'}
        </span>
        <button onClick={onPreview} title="معاينة" style={{ color: 'var(--text-muted)', padding: 4 }}>
          <Eye size={14} />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="grid grid-cols-3 gap-3">
            <input value={data.sub_type || ''} onChange={e => update('sub_type', e.target.value)} placeholder="النوع الفرعي" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            {subTab === 'task1' && (
              <select value={data.test_variant || 'academic'} onChange={e => update('test_variant', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                <option value="academic">أكاديمي</option>
                <option value="general_training">عام (GT)</option>
              </select>
            )}
            <select value={data.difficulty_band || ''} onChange={e => update('difficulty_band', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              <option value="">—</option>
              <option value="band_5_6">Band 5–6</option>
              <option value="band_6_7">Band 6–7</option>
              <option value="band_7_8">Band 7–8</option>
            </select>
          </div>
          <textarea value={data.prompt || ''} onChange={e => update('prompt', e.target.value)} placeholder="نص المهمة" rows={4} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />
          <input value={data.image_url || ''} onChange={e => update('image_url', e.target.value)} placeholder="رابط الصورة (اختياري)" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
            <input type="checkbox" checked={!!data.is_published} onChange={e => update('is_published', e.target.checked)} className="accent-emerald-500" />
            منشور
          </label>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>إجابات نموذجية (JSON)</label>
            <textarea
              value={typeof data.model_answers === 'object' ? JSON.stringify(data.model_answers, null, 2) : '{}'}
              onChange={e => { try { update('model_answers', JSON.parse(e.target.value)) } catch {} }}
              rows={6} className="w-full px-3 py-2 rounded-lg text-sm resize-none font-mono" style={inputStyle} dir="ltr"
            />
          </div>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ
          </button>
        </div>
      )}
    </div>
  )
}
