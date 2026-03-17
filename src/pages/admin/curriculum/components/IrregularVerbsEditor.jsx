import { useState } from 'react'
import { Save, Loader2, Plus, Trash2, Check } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import JSONArrayEditor from './JSONArrayEditor'

export default function IrregularVerbsEditor({ levelId, verbs = [], verbExercises = [], onRefresh }) {
  const [verbList, setVerbList] = useState(verbs)
  const [exercises, setExercises] = useState(verbExercises)
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const addVerb = () => {
    setVerbList([...verbList, {
      verb_base: '', verb_past: '', verb_past_participle: '',
      meaning_ar: '', example_sentence: '', group_tag: '', difficulty: 1,
      audio_base_url: '', audio_past_url: '', audio_pp_url: '',
    }])
  }

  const removeVerb = (i) => setVerbList(verbList.filter((_, idx) => idx !== i))

  const updateVerb = (i, field, val) => {
    const next = [...verbList]
    next[i] = { ...next[i], [field]: val }
    setVerbList(next)
  }

  const addExercise = () => {
    setExercises([...exercises, { exercise_type: 'fill_blank', instructions_en: '', instructions_ar: '', items: [], is_auto_gradeable: true }])
  }

  const removeExercise = (i) => setExercises(exercises.filter((_, idx) => idx !== i))

  const updateExercise = (i, field, val) => {
    const next = [...exercises]
    next[i] = { ...next[i], [field]: val }
    setExercises(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      // Delete and re-insert verbs
      await supabase.from('curriculum_irregular_verbs').delete().eq('level_id', levelId)
      if (verbList.length > 0) {
        const rows = verbList.map((v, i) => ({
          level_id: levelId, verb_base: v.verb_base, verb_past: v.verb_past,
          verb_past_participle: v.verb_past_participle, meaning_ar: v.meaning_ar,
          example_sentence: v.example_sentence || '', group_tag: v.group_tag || '',
          difficulty: v.difficulty || 1, sort_order: i,
          audio_base_url: v.audio_base_url || null,
          audio_past_url: v.audio_past_url || null,
          audio_pp_url: v.audio_pp_url || null,
        }))
        const { error } = await supabase.from('curriculum_irregular_verbs').insert(rows)
        if (error) throw error
      }

      // Delete and re-insert exercises
      await supabase.from('curriculum_irregular_verb_exercises').delete().eq('level_id', levelId)
      if (exercises.length > 0) {
        const rows = exercises.map((ex, i) => ({
          level_id: levelId, exercise_type: ex.exercise_type,
          instructions_en: ex.instructions_en, instructions_ar: ex.instructions_ar,
          items: ex.items || [], is_auto_gradeable: ex.is_auto_gradeable ?? true, sort_order: i,
        }))
        const { error } = await supabase.from('curriculum_irregular_verb_exercises').insert(rows)
        if (error) throw error
      }

      onRefresh?.()
    } catch (err) {
      console.error('Save verbs error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>الأفعال الشاذة</h4>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
          {verbList.length} فعل
        </span>
      </div>

      {verbList.map((v, i) => (
        <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
            <div className="flex items-center gap-2">
              {(v.audio_base_url || v.audio_past_url || v.audio_pp_url) && <Check size={12} style={{ color: '#4ade80' }} />}
              <button onClick={() => removeVerb(i)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={v.verb_base || ''} onChange={e => updateVerb(i, 'verb_base', e.target.value)} placeholder="Base" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
            <input value={v.verb_past || ''} onChange={e => updateVerb(i, 'verb_past', e.target.value)} placeholder="Past" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
            <input value={v.verb_past_participle || ''} onChange={e => updateVerb(i, 'verb_past_participle', e.target.value)} placeholder="Past Part." className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={v.meaning_ar || ''} onChange={e => updateVerb(i, 'meaning_ar', e.target.value)} placeholder="المعنى" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            <input value={v.example_sentence || ''} onChange={e => updateVerb(i, 'example_sentence', e.target.value)} placeholder="Example" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
            <input value={v.group_tag || ''} onChange={e => updateVerb(i, 'group_tag', e.target.value)} placeholder="Group" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
          </div>
        </div>
      ))}

      <button onClick={addVerb} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium w-full justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة فعل
      </button>

      <h4 className="text-sm font-semibold pt-4" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>التمارين</h4>
      {exercises.map((ex, i) => (
        <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>تمرين {i + 1}</span>
            <button onClick={() => removeExercise(i)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={14} />
            </button>
          </div>
          <select value={ex.exercise_type} onChange={e => updateExercise(i, 'exercise_type', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
            <option value="fill_blank">Fill Blank</option>
            <option value="choose_correct">Choose Correct</option>
            <option value="match">Match</option>
          </select>
          <input value={ex.instructions_en || ''} onChange={e => updateExercise(i, 'instructions_en', e.target.value)} placeholder="Instructions (EN)" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
          <input value={ex.instructions_ar || ''} onChange={e => updateExercise(i, 'instructions_ar', e.target.value)} placeholder="التعليمات" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          <JSONArrayEditor label="العناصر" value={ex.items || []} onChange={v => updateExercise(i, 'items', v)} />
        </div>
      ))}

      <button onClick={addExercise} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة تمرين
      </button>

      <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: saving ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.2)', color: '#38bdf8', fontFamily: 'Tajawal', border: '1px solid rgba(56,189,248,0.3)' }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'جارٍ الحفظ...' : 'حفظ الأفعال'}
      </button>
    </div>
  )
}
