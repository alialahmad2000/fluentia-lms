const SKILL_AR = { reading: 'قراءة', listening: 'استماع', writing: 'كتابة', speaking: 'محادثة' }

export default function StudentErrorsPanel({ errors }) {
  const total = errors.length
  const mastered = errors.filter(e => e.mastered).length
  const now = Date.now()
  const due = errors.filter(e => !e.mastered && (!e.next_review_at || new Date(e.next_review_at).getTime() <= now)).length

  // Top hotspots by skill × question_type
  const counts = {}
  for (const e of errors) {
    if (e.mastered) continue
    const key = `${e.skill_type}::${e.question_type || 'عام'}`
    counts[key] = (counts[key] || 0) + 1
  }
  const hotspots = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  if (total === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontSize: 13, fontFamily: "'Tajawal', sans-serif" }}>
        لا توجد أخطاء في البنك بعد
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'المجموع', value: total, color: 'var(--ds-text-primary, var(--text-primary))' },
          { label: 'مستحق الآن', value: due, color: 'var(--ds-accent-amber, #f59e0b)' },
          { label: 'متقن', value: mastered, color: 'var(--ds-accent-emerald, #10b981)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, textAlign: 'center',
            background: 'var(--ds-surface-1, rgba(255,255,255,0.03))',
            border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary, var(--text-tertiary))', marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {hotspots.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--ds-text-tertiary, var(--text-tertiary))', marginBottom: 8, fontFamily: "'Tajawal', sans-serif" }}>أبرز نقاط الضعف</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {hotspots.map(([key, count]) => {
              const [skill, qtype] = key.split('::')
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 12px', borderRadius: 8,
                  background: 'var(--ds-surface-1, rgba(255,255,255,0.02))',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--ds-text-secondary, var(--text-secondary))', fontFamily: "'Tajawal', sans-serif" }}>
                    {SKILL_AR[skill] || skill} · {qtype}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ds-accent-amber, #f59e0b)', fontWeight: 600 }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
