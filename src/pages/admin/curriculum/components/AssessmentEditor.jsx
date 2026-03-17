import { useState } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

export default function AssessmentEditor({ unitId, levelId, assessment, onRefresh }) {
  const [data, setData] = useState(assessment || {})
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (field, val) => setData(prev => ({ ...prev, [field]: val }))

  const assessmentTypes = ['unit_quiz', 'mid_level', 'final']
  const questionTypes = ['MCQ', 'fill_blank', 'true_false', 'matching']

  const questions = data.questions || []

  const addQuestion = () => {
    update('questions', [...questions, {
      type: 'MCQ', question: '', options: ['', '', '', ''], correct: 0, points: 1,
    }])
  }

  const removeQuestion = (i) => update('questions', questions.filter((_, idx) => idx !== i))

  const updateQuestion = (i, field, val) => {
    const next = [...questions]
    next[i] = { ...next[i], [field]: val }
    update('questions', next)
  }

  const updateOption = (qi, oi, val) => {
    const next = [...questions]
    const options = [...(next[qi].options || [])]
    options[oi] = val
    next[qi] = { ...next[qi], options }
    update('questions', next)
  }

  const addOption = (qi) => {
    const next = [...questions]
    next[qi] = { ...next[qi], options: [...(next[qi].options || []), ''] }
    update('questions', next)
  }

  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0)

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        unit_id: unitId || null, level_id: levelId || null,
        assessment_type: data.assessment_type || 'unit_quiz',
        title_ar: data.title_ar || '', title_en: data.title_en || '',
        questions: questions,
        passing_score: data.passing_score || 60,
        time_limit_minutes: data.time_limit_minutes || 30,
      }

      if (data.id) {
        const { error } = await supabase.from('curriculum_assessments').update(payload).eq('id', data.id)
        if (error) throw error
      } else {
        const { data: inserted, error } = await supabase.from('curriculum_assessments').insert(payload).select('id').single()
        if (error) throw error
        setData(prev => ({ ...prev, id: inserted.id }))
      }
      onRefresh?.()
    } catch (err) {
      console.error('Save assessment error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <select value={data.assessment_type || 'unit_quiz'} onChange={e => update('assessment_type', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
          {assessmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
            {totalPoints} نقطة
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input value={data.title_en || ''} onChange={e => update('title_en', e.target.value)} placeholder="Title (EN)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
        <input value={data.title_ar || ''} onChange={e => update('title_ar', e.target.value)} placeholder="العنوان" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>درجة النجاح (%)</label>
          <input type="number" value={data.passing_score || 60} onChange={e => update('passing_score', Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الوقت (دقائق)</label>
          <input type="number" value={data.time_limit_minutes || 30} onChange={e => update('time_limit_minutes', Number(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
        </div>
      </div>

      <h4 className="text-sm font-semibold pt-2" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>الأسئلة</h4>

      {questions.map((q, qi) => (
        <div key={qi} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>سؤال {qi + 1}</span>
            <button onClick={() => removeQuestion(qi)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select value={q.type || 'MCQ'} onChange={e => updateQuestion(qi, 'type', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              {questionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" value={q.points || 1} onChange={e => updateQuestion(qi, 'points', Number(e.target.value))} placeholder="النقاط" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          </div>

          <textarea value={q.question || ''} onChange={e => updateQuestion(qi, 'question', e.target.value)} placeholder="نص السؤال" rows={2} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} />

          {(q.type === 'MCQ' || q.type === 'matching') && (
            <div className="space-y-2 mr-4">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>الخيارات:</span>
              {(q.options || []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio" name={`aq-${qi}`}
                    checked={q.correct === oi}
                    onChange={() => updateQuestion(qi, 'correct', oi)}
                    className="accent-emerald-500"
                  />
                  <input
                    value={opt}
                    onChange={e => updateOption(qi, oi, e.target.value)}
                    placeholder={`خيار ${oi + 1}`}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
              ))}
              <button onClick={() => addOption(qi)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}>
                + خيار
              </button>
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="radio" name={`tf-${qi}`} checked={q.correct === true} onChange={() => updateQuestion(qi, 'correct', true)} className="accent-emerald-500" />
                صح
              </label>
              <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input type="radio" name={`tf-${qi}`} checked={q.correct === false} onChange={() => updateQuestion(qi, 'correct', false)} className="accent-emerald-500" />
                خطأ
              </label>
            </div>
          )}

          {q.type === 'fill_blank' && (
            <input value={q.correct || ''} onChange={e => updateQuestion(qi, 'correct', e.target.value)} placeholder="الإجابة الصحيحة" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          )}
        </div>
      ))}

      <button onClick={addQuestion} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium w-full justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة سؤال
      </button>

      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: saving ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.2)', color: '#38bdf8', fontFamily: 'Tajawal', border: '1px solid rgba(56,189,248,0.3)' }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'جارٍ الحفظ...' : 'حفظ التقييم'}
      </button>
    </div>
  )
}
