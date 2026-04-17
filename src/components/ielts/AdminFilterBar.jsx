import { Search, X } from 'lucide-react'

const sel = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--text-primary)',
  fontFamily: 'Tajawal',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 13,
  cursor: 'pointer',
}

export default function AdminFilterBar({ contentType, filters, onChange, onReset }) {
  const showVariant = contentType === 'reading' || contentType === 'writing'
  const showDifficulty = contentType === 'reading' || contentType === 'writing'
  const hasActiveFilter = filters.search || filters.variant !== 'all' || filters.difficulty !== 'all' || filters.published !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4" dir="rtl">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="بحث..."
          style={{ ...sel, paddingRight: 30, width: '100%' }}
          dir="rtl"
        />
      </div>

      {showVariant && (
        <select value={filters.variant} onChange={e => onChange({ ...filters, variant: e.target.value })} style={sel}>
          <option value="all">كل الأنواع</option>
          <option value="academic">أكاديمي</option>
          <option value="general_training">عام</option>
        </select>
      )}

      {showDifficulty && (
        <select value={filters.difficulty} onChange={e => onChange({ ...filters, difficulty: e.target.value })} style={sel}>
          <option value="all">كل المستويات</option>
          <option value="band_5_6">Band 5-6</option>
          <option value="band_6_7">Band 6-7</option>
          <option value="band_7_8">Band 7-8</option>
        </select>
      )}

      <select value={filters.published} onChange={e => onChange({ ...filters, published: e.target.value })} style={sel}>
        <option value="all">الكل</option>
        <option value="published">منشور</option>
        <option value="draft">مسودة</option>
      </select>

      {hasActiveFilter && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontFamily: 'Tajawal' }}
        >
          <X size={11} />
          إعادة
        </button>
      )}

      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
        {filters._total !== undefined ? `${filters._count} / ${filters._total}` : ''}
      </span>
    </div>
  )
}
