function bandColor(b) {
  if (!b) return 'var(--ds-text-tertiary, var(--text-tertiary))'
  if (b >= 7) return 'var(--ds-accent-emerald, #10b981)'
  if (b >= 5.5) return 'var(--ds-accent-amber, #f59e0b)'
  return 'var(--ds-accent-rose, #f43f5e)'
}

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function StudentMocksPanel({ results }) {
  const mocks = (results || []).filter(r => r.result_type === 'mock').slice(0, 5)

  if (mocks.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontSize: 13, fontFamily: "'Tajawal', sans-serif" }}>
        لم يؤدِّ الطالب أي موك حتى الآن
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {mocks.map((r, i) => (
        <div key={r.id || i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: 10,
          background: 'var(--ds-surface-1, rgba(255,255,255,0.03))',
          border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))',
        }}>
          <div style={{ fontSize: 13, color: 'var(--ds-text-secondary, var(--text-secondary))', fontFamily: "'Tajawal', sans-serif" }}>
            {fmt(r.completed_at)}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
            {r.reading_score != null && <span>R: {r.reading_score}</span>}
            {r.listening_score != null && <span>L: {r.listening_score}</span>}
            {r.writing_score != null && <span>W: {r.writing_score}</span>}
            {r.speaking_score != null && <span>S: {r.speaking_score}</span>}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: bandColor(r.overall_band) }}>
            {r.overall_band ?? '—'}
          </div>
        </div>
      ))}
    </div>
  )
}
