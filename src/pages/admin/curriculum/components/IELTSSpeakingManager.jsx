import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import JSONArrayEditor from './JSONArrayEditor'

export default function IELTSSpeakingManager() {
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState('part1')
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['ielts-speaking-questions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_speaking_questions').select('*').order('part, topic')
      if (error) throw error
      return data || []
    },
  })

  const partNum = subTab === 'part1' ? 1 : subTab === 'part2' ? 2 : 3
  const filtered = questions.filter(q => q.part === partNum)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
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
    <div className="space-y-4">
      <div className="flex gap-2">
        {['part1', 'part2', 'part3'].map(t => (
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
            {t === 'part1' ? 'Part 1' : t === 'part2' ? 'Part 2' : 'Part 3'}
          </button>
        ))}
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
            onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['ielts-speaking-questions'] })}
          />
        ))
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>لا توجد أسئلة بعد</div>
      )}

      <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة
      </button>
    </div>
  )
}

function QuestionRow({ question, index, part, expanded, onToggle, onRefresh }) {
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
      }).eq('id', question.id)
      if (error) throw error
      onRefresh()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--text-muted)' }}>{index}</span>
          <span style={{ color: 'var(--text-primary)' }}>{question.topic || '—'}</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{qCount} سؤال</span>
      </button>

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

          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ
          </button>
        </div>
      )}
    </div>
  )
}
