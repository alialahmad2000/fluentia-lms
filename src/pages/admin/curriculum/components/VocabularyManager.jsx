import { Plus, Trash2, Check } from 'lucide-react'

export default function VocabularyManager({ vocabulary = [], onChange }) {
  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const add = () => {
    onChange([...vocabulary, {
      word: '', definition_en: '', definition_ar: '', example_sentence: '',
      part_of_speech: 'noun', pronunciation_ipa: '', audio_url: '', image_url: '', difficulty_tier: 'core',
    }])
  }

  const remove = (i) => onChange(vocabulary.filter((_, idx) => idx !== i))

  const update = (i, field, val) => {
    const next = [...vocabulary]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  const posOptions = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'phrase']
  const tierOptions = ['core', 'academic', 'advanced']

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
          المفردات
        </h4>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
          {vocabulary.length} كلمة
        </span>
      </div>

      {vocabulary.map((v, i) => (
        <div
          key={i}
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
            <div className="flex items-center gap-2">
              {v.audio_url && <Check size={12} style={{ color: '#4ade80' }} />}
              <button onClick={() => remove(i)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <input value={v.word || ''} onChange={e => update(i, 'word', e.target.value)} placeholder="Word" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
            <input value={v.definition_en || ''} onChange={e => update(i, 'definition_en', e.target.value)} placeholder="Definition (EN)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
            <input value={v.definition_ar || ''} onChange={e => update(i, 'definition_ar', e.target.value)} placeholder="التعريف (عربي)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            <input value={v.example_sentence || ''} onChange={e => update(i, 'example_sentence', e.target.value)} placeholder="Example sentence" className="px-3 py-2 rounded-lg text-sm col-span-2" style={inputStyle} dir="ltr" />
            <select value={v.part_of_speech || 'noun'} onChange={e => update(i, 'part_of_speech', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              {posOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={v.pronunciation_ipa || ''} onChange={e => update(i, 'pronunciation_ipa', e.target.value)} placeholder="IPA" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
            <select value={v.difficulty_tier || 'core'} onChange={e => update(i, 'difficulty_tier', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              {tierOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={v.audio_url || ''} onChange={e => update(i, 'audio_url', e.target.value)} placeholder="Audio URL" className="px-3 py-2 rounded-lg text-sm col-span-2" style={inputStyle} dir="ltr" />
          </div>
        </div>
      ))}

      <button
        onClick={add}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium w-full justify-center"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(255,255,255,0.12)',
          color: 'var(--text-secondary)',
          fontFamily: 'Tajawal',
        }}
      >
        <Plus size={14} />
        إضافة كلمة
      </button>
    </div>
  )
}
