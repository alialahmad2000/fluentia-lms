import { Plus, Trash2 } from 'lucide-react'

export default function PassageEditor({ value = { paragraphs: [] }, onChange }) {
  const paragraphs = value?.paragraphs || []

  const addParagraph = () => {
    onChange({ ...value, paragraphs: [...paragraphs, ''] })
  }

  const updateParagraph = (i, text) => {
    const next = [...paragraphs]
    next[i] = text
    onChange({ ...value, paragraphs: next })
  }

  const removeParagraph = (i) => {
    onChange({ ...value, paragraphs: paragraphs.filter((_, idx) => idx !== i) })
  }

  const wordCount = paragraphs.join(' ').split(/\s+/).filter(Boolean).length

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
          فقرات النص
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
          {wordCount} كلمة
        </span>
      </div>

      {paragraphs.map((p, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-xs mt-2.5 shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
          <textarea
            value={p}
            onChange={e => updateParagraph(i, e.target.value)}
            rows={3}
            className="flex-1 px-3 py-2 rounded-lg text-sm resize-none"
            style={inputStyle}
            placeholder={`الفقرة ${i + 1}`}
          />
          <button
            onClick={() => removeParagraph(i)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 self-start mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        onClick={addParagraph}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(255,255,255,0.12)',
          color: 'var(--text-secondary)',
          fontFamily: 'Tajawal',
        }}
      >
        <Plus size={13} />
        إضافة فقرة
      </button>
    </div>
  )
}
