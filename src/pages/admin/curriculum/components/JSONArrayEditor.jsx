import { Plus, Trash2, GripVertical } from 'lucide-react'

export default function JSONArrayEditor({ value = [], onChange, placeholder = 'عنصر جديد...', label, renderItem }) {
  const items = Array.isArray(value) ? value : []

  const add = () => onChange([...items, ''])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i, val) => {
    const next = [...items]
    next[i] = val
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
          {label}
        </label>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical size={14} className="shrink-0 cursor-grab" style={{ color: 'var(--text-muted)' }} />
          {renderItem ? (
            renderItem(item, i, (val) => update(i, val))
          ) : (
            <input
              value={typeof item === 'string' ? item : JSON.stringify(item)}
              onChange={e => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-primary)',
                fontFamily: 'Tajawal',
              }}
            />
          )}
          <button
            onClick={() => remove(i)}
            className="p-1.5 rounded-lg hover:bg-red-500/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(255,255,255,0.12)',
          color: 'var(--text-secondary)',
          fontFamily: 'Tajawal',
        }}
      >
        <Plus size={13} />
        إضافة
      </button>
    </div>
  )
}
