import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Loader2, Check, X } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

export default function IELTSMockTestManager() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['ielts-mock-tests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_mock_tests').select('*').order('test_number')
      if (error) throw error
      return data || []
    },
  })

  const addNew = async () => {
    setAdding(true)
    try {
      const maxNum = tests.reduce((max, t) => Math.max(max, t.test_number || 0), 0)
      const { error } = await supabase.from('ielts_mock_tests').insert({
        test_number: maxNum + 1,
        reading_passage_ids: [], writing_task_ids: [],
        listening_test_id: null, speaking_question_ids: [],
        is_published: false,
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['ielts-mock-tests'] })
    } catch (err) { console.error(err) } finally { setAdding(false) }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  if (isLoading) return <div className="animate-pulse space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />)}</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-4 px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
        <span>رقم الاختبار</span>
        <span>القراءة</span>
        <span>الكتابة</span>
        <span>الاستماع</span>
        <span>المحادثة</span>
        <span>الحالة</span>
      </div>

      {tests.map(test => {
        const hasReading = Array.isArray(test.reading_passage_ids) && test.reading_passage_ids.length > 0
        const hasWriting = Array.isArray(test.writing_task_ids) && test.writing_task_ids.length > 0
        const hasListening = !!test.listening_test_id
        const hasSpeaking = Array.isArray(test.speaking_question_ids) && test.speaking_question_ids.length > 0
        const allReady = hasReading && hasWriting && hasListening && hasSpeaking

        return (
          <div key={test.id}>
            <button
              onClick={() => setExpandedId(expandedId === test.id ? null : test.id)}
              className="w-full grid grid-cols-6 gap-4 px-4 py-3 items-center text-sm rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{test.test_number}</span>
              <StatusIcon ok={hasReading} />
              <StatusIcon ok={hasWriting} />
              <StatusIcon ok={hasListening} />
              <StatusIcon ok={hasSpeaking} />
              <span className="text-xs px-2 py-0.5 rounded-full w-fit font-medium" style={{
                background: allReady ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)',
                color: allReady ? '#4ade80' : '#fb923c',
              }}>
                {allReady ? 'مكتمل' : 'ناقص'}
              </span>
            </button>

            {expandedId === test.id && (
              <MockTestEditor test={test} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['ielts-mock-tests'] })} />
            )}
          </div>
        )
      })}

      {tests.length === 0 && (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>لا توجد اختبارات بعد</div>
      )}

      <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إنشاء اختبار جديد
      </button>
    </div>
  )
}

function StatusIcon({ ok }) {
  return ok
    ? <Check size={16} style={{ color: '#4ade80' }} />
    : <X size={16} style={{ color: '#ef4444' }} />
}

function MockTestEditor({ test, onRefresh }) {
  const [data, setData] = useState(test)
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ielts_mock_tests').update({
        reading_passage_ids: data.reading_passage_ids || [],
        writing_task_ids: data.writing_task_ids || [],
        listening_test_id: data.listening_test_id || null,
        speaking_question_ids: data.speaking_question_ids || [],
        is_published: data.is_published,
      }).eq('id', test.id)
      if (error) throw error
      onRefresh()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  return (
    <div className="p-4 space-y-3 mt-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>معرفات نصوص القراءة (JSON array)</label>
        <textarea
          value={JSON.stringify(data.reading_passage_ids || [], null, 2)}
          onChange={e => { try { update('reading_passage_ids', JSON.parse(e.target.value)) } catch {} }}
          rows={2} className="w-full px-3 py-2 rounded-lg text-sm resize-none font-mono" style={inputStyle} dir="ltr"
        />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>معرفات مهام الكتابة (JSON array)</label>
        <textarea
          value={JSON.stringify(data.writing_task_ids || [], null, 2)}
          onChange={e => { try { update('writing_task_ids', JSON.parse(e.target.value)) } catch {} }}
          rows={2} className="w-full px-3 py-2 rounded-lg text-sm resize-none font-mono" style={inputStyle} dir="ltr"
        />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>معرف اختبار الاستماع</label>
        <input value={data.listening_test_id || ''} onChange={e => update('listening_test_id', e.target.value || null)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>معرفات أسئلة المحادثة (JSON array)</label>
        <textarea
          value={JSON.stringify(data.speaking_question_ids || [], null, 2)}
          onChange={e => { try { update('speaking_question_ids', JSON.parse(e.target.value)) } catch {} }}
          rows={2} className="w-full px-3 py-2 rounded-lg text-sm resize-none font-mono" style={inputStyle} dir="ltr"
        />
      </div>
      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <input type="checkbox" checked={data.is_published || false} onChange={e => update('is_published', e.target.checked)} className="accent-emerald-500" />
        منشور
      </label>
      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal' }}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        حفظ
      </button>
    </div>
  )
}
