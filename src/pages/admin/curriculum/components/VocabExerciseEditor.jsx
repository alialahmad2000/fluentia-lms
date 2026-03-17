import { Plus, Trash2 } from 'lucide-react'
import JSONArrayEditor from './JSONArrayEditor'

export default function VocabExerciseEditor({ exercises = [], onChange }) {
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const exerciseTypes = ['fill_blank', 'matching', 'definition_match', 'context_clues', 'word_forms', 'sentence_completion']

  const add = () => {
    onChange([...exercises, {
      exercise_label: String.fromCharCode(65 + exercises.length),
      exercise_type: 'fill_blank',
      instructions_en: '', instructions_ar: '', mini_passage: '', items: [],
    }])
  }

  const remove = (i) => onChange(exercises.filter((_, idx) => idx !== i))

  const update = (i, field, val) => {
    const next = [...exercises]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        تمارين المفردات
      </h4>

      {exercises.map((ex, i) => (
        <div
          key={i}
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              تمرين {ex.exercise_label || String.fromCharCode(65 + i)}
            </span>
            <button onClick={() => remove(i)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={ex.exercise_label || ''}
              onChange={e => update(i, 'exercise_label', e.target.value)}
              placeholder="Label (A, B, C)"
              className="px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
            <select
              value={ex.exercise_type || 'fill_blank'}
              onChange={e => update(i, 'exercise_type', e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            >
              {exerciseTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <input
            value={ex.instructions_en || ''}
            onChange={e => update(i, 'instructions_en', e.target.value)}
            placeholder="Instructions (English)"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
          <input
            value={ex.instructions_ar || ''}
            onChange={e => update(i, 'instructions_ar', e.target.value)}
            placeholder="التعليمات (عربي)"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
            dir="rtl"
          />

          <textarea
            value={ex.mini_passage || ''}
            onChange={e => update(i, 'mini_passage', e.target.value)}
            placeholder="Mini passage (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
            style={inputStyle}
          />

          <JSONArrayEditor
            label="العناصر (JSON)"
            value={ex.items || []}
            onChange={val => update(i, 'items', val)}
            placeholder="عنصر..."
          />
        </div>
      ))}

      <button
        onClick={add}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(255,255,255,0.12)',
          color: 'var(--text-secondary)',
          fontFamily: 'Tajawal',
        }}
      >
        <Plus size={14} />
        إضافة تمرين
      </button>
    </div>
  )
}
