function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ageDays(date) {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
}

function TagList({ items, color }) {
  if (!items || items.length === 0) return <span style={{ color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontSize: 12 }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item, i) => (
        <span key={i} style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 20,
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
          fontFamily: "'Tajawal', sans-serif",
        }}>
          {typeof item === 'string' ? item : JSON.stringify(item)}
        </span>
      ))}
    </div>
  )
}

export default function StudentPlanPanel({ plan }) {
  if (!plan) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontSize: 13, fontFamily: "'Tajawal', sans-serif" }}>
        لم تُولَد خطة تكيّفية بعد
      </div>
    )
  }

  const age = ageDays(plan.last_regenerated_at)
  const isStale = age !== null && age > 14

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'الهدف', value: plan.target_band ?? '—' },
          { label: 'التقدير الحالي', value: plan.current_band_estimate ?? '—' },
          { label: 'تاريخ الامتحان', value: plan.target_exam_date ? fmt(plan.target_exam_date) : '—' },
          { label: 'الأسبوع الحالي', value: plan.current_week ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: '1 1 100px', padding: '10px 14px', borderRadius: 10,
            background: 'var(--ds-surface-1, rgba(255,255,255,0.03))',
            border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary, var(--text-tertiary))', marginBottom: 4, fontFamily: "'Tajawal', sans-serif" }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-text-primary, var(--text-primary))' }}>{value}</div>
          </div>
        ))}
      </div>

      {isStale && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: 'var(--ds-accent-amber, #f59e0b)', fontFamily: "'Tajawal', sans-serif" }}>
          ⚠️ خطة قديمة — آخر تحديث منذ {age} يوم. بإمكان الطالب إعادة التوليد بعد أداء موك جديد.
        </div>
      )}

      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary, var(--text-tertiary))', marginBottom: 6, fontFamily: "'Tajawal', sans-serif" }}>المجالات الضعيفة</div>
          <TagList items={plan.weak_areas} color="var(--ds-accent-rose, #f43f5e)" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary, var(--text-tertiary))', marginBottom: 6, fontFamily: "'Tajawal', sans-serif" }}>المجالات القوية</div>
          <TagList items={plan.strong_areas} color="var(--ds-accent-emerald, #10b981)" />
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontFamily: "'Tajawal', sans-serif" }}>
        آخر تحديث للخطة: {fmt(plan.last_regenerated_at)}
      </div>
    </div>
  )
}
