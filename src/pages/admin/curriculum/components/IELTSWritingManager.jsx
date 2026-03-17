import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import JSONArrayEditor from './JSONArrayEditor'

export default function IELTSWritingManager() {
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState('task1')
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['ielts-writing-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_writing_tasks').select('*').order('created_at')
      if (error) throw error
      return data || []
    },
  })

  const filtered = tasks.filter(t => t.task_type === (subTab === 'task1' ? 'task1' : 'task2'))

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const addNew = async () => {
    setAdding(true)
    try {
      const { error } = await supabase.from('ielts_writing_tasks').insert({
        task_type: subTab === 'task1' ? 'task1' : 'task2',
        sub_type: '',
        prompt: '',
        model_answers: {},
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['ielts-writing-tasks'] })
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {['task1', 'task2'].map(t => (
          <button
            key={t}
            onClick={() => { setSubTab(t); setExpandedId(null) }}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: subTab === t ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
              color: subTab === t ? '#38bdf8' : 'var(--text-secondary)',
              border: subTab === t ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.06)',
              fontFamily: 'Tajawal',
            }}
          >
            {t === 'task1' ? 'Task 1' : 'Task 2'}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="grid grid-cols-5 gap-4 px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
        <span>#</span>
        <span>النوع الفرعي</span>
        <span>العنوان</span>
        <span>النماذج</span>
        <span>الحالة</span>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />)}</div>
      ) : (
        filtered.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            index={i + 1}
            expanded={expandedId === task.id}
            onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['ielts-writing-tasks'] })}
          />
        ))
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
          لا توجد مهام بعد
        </div>
      )}

      <button
        onClick={addNew}
        disabled={adding}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}
      >
        <Plus size={14} />
        إضافة مهمة
      </button>
    </div>
  )
}

function TaskRow({ task, index, expanded, onToggle, onRefresh }) {
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

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ielts_writing_tasks').update({
        sub_type: data.sub_type, prompt: data.prompt,
        image_url: data.image_url, template_structure: data.template_structure,
        key_phrases: data.key_phrases, model_answers: data.model_answers || {},
      }).eq('id', task.id)
      if (error) throw error
      onRefresh()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onToggle} className="w-full grid grid-cols-5 gap-4 px-4 py-3 items-center text-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ color: 'var(--text-muted)' }}>{index}</span>
        <span style={{ color: 'var(--text-primary)' }}>{task.sub_type || '—'}</span>
        <span style={{ color: 'var(--text-primary)' }} className="truncate">{task.prompt?.substring(0, 40) || '—'}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{modelCount}</span>
        <span className="text-xs px-2 py-0.5 rounded-full w-fit font-medium" style={{
          background: task.prompt ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
          color: task.prompt ? '#4ade80' : '#ef4444',
        }}>
          {task.prompt ? 'جاهز' : 'فارغ'}
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input value={data.sub_type || ''} onChange={e => update('sub_type', e.target.value)} placeholder="النوع الفرعي" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          <textarea value={data.prompt || ''} onChange={e => update('prompt', e.target.value)} placeholder="نص المهمة" rows={4} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />
          <input value={data.image_url || ''} onChange={e => update('image_url', e.target.value)} placeholder="رابط الصورة (اختياري)" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />

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
