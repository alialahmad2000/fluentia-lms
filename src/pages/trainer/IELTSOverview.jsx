import { useState, useMemo } from 'react'
import { useIELTSRoster } from '@/hooks/trainer/useTrainerIELTSStudents'
import RosterTable from '@/components/trainer/ielts/RosterTable'

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'active', label: 'نشط (7 أيام)' },
  { id: 'attention', label: 'يحتاج انتباهاً' },
  { id: 'no_mock', label: 'بدون موك (30ي+)' },
]

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontFamily: "'Tajawal', sans-serif", fontSize: 13,
        background: active ? 'var(--ds-accent-primary, var(--accent-gold, #e9b949))' : 'var(--ds-surface-1, rgba(255,255,255,0.06))',
        color: active ? '#000' : 'var(--ds-text-secondary, var(--text-secondary))',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

export default function IELTSOverview() {
  const { data: roster = [], isLoading, error } = useIELTSRoster()
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'active') {
      return roster.filter(s => s.last_active_at && (Date.now() - new Date(s.last_active_at).getTime()) < 7 * 86_400_000)
    }
    if (filter === 'attention') return roster.filter(s => s.needs_attention)
    if (filter === 'no_mock') return roster.filter(s => s.days_since_last_mock === null || s.days_since_last_mock > 30)
    return roster
  }, [roster, filter])

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }} dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--ds-text-primary, var(--text-primary))', fontFamily: "'Tajawal', sans-serif" }}>
          IELTS — طلابي
        </h1>
        {!isLoading && roster.length > 0 && (
          <span style={{
            padding: '2px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: 'rgba(233,185,73,0.15)', color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))',
          }}>
            {roster.length}
          </span>
        )}
      </div>

      {/* Filters */}
      {roster.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {FILTERS.map(f => (
            <FilterChip key={f.id} label={f.label} active={filter === f.id} onClick={() => setFilter(f.id)} />
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 52, borderRadius: 10, background: 'var(--ds-surface-1, rgba(255,255,255,0.04))', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--ds-accent-rose, #f43f5e)', fontFamily: "'Tajawal', sans-serif" }}>
          حدث خطأ في تحميل البيانات
        </div>
      ) : (
        <RosterTable students={filtered} />
      )}
    </div>
  )
}
