export default function RubricSliders({ value = {}, onChange, labels = ['content', 'grammar', 'vocabulary', 'organization'] }) {
  const rubric = { content: 25, grammar: 25, vocabulary: 25, organization: 25, ...value }
  const total = labels.reduce((s, k) => s + (rubric[k] || 0), 0)

  const labelNames = {
    content: 'المحتوى',
    grammar: 'القواعد',
    vocabulary: 'المفردات',
    organization: 'التنظيم',
    pronunciation: 'النطق',
    fluency: 'الطلاقة',
  }

  const update = (key, val) => {
    onChange({ ...rubric, [key]: Number(val) })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
          معايير التقييم
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: total === 100 ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)',
            color: total === 100 ? '#4ade80' : '#fb923c',
          }}
        >
          {total}/100
        </span>
      </div>
      {labels.map(key => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
              {labelNames[key] || key}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              {rubric[key] || 0}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={rubric[key] || 0}
            onChange={e => update(key, e.target.value)}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#38bdf8', background: 'rgba(255,255,255,0.08)' }}
          />
        </div>
      ))}
    </div>
  )
}
