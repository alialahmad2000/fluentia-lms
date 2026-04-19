import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
}

export default function MockTrajectorySparkline({ results, targetBand, height = 80 }) {
  if (!results || results.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
          لا توجد نتائج بعد
        </p>
      </div>
    )
  }

  const data = [...results].reverse().map(r => ({
    date: formatDate(r.completed_at),
    band: Number(r.overall_band),
  }))

  const lastBand = data[data.length - 1]?.band
  const prevBand = data.length >= 2 ? data[data.length - 2]?.band : null
  const delta = prevBand != null ? +(lastBand - prevBand).toFixed(1) : null

  return (
    <div>
      {lastBand != null && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#38bdf8', fontFamily: 'Tajawal', lineHeight: 1 }}>
            {lastBand.toFixed(1)}
          </span>
          {delta != null && (
            <span style={{ fontSize: 13, fontWeight: 700, color: delta >= 0 ? '#4ade80' : '#ef4444', fontFamily: 'Tajawal' }}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>آخر اختبار</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--glass-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, fontFamily: 'Tajawal' }}
            itemStyle={{ color: '#38bdf8' }}
            formatter={(v) => [v.toFixed(1), 'Band']}
          />
          {targetBand && (
            <ReferenceLine y={targetBand} stroke="#fbbf24" strokeDasharray="4 4" strokeWidth={1} label={{ value: `هدف ${targetBand}`, fill: '#fbbf24', fontSize: 10, fontFamily: 'Tajawal' }} />
          )}
          <Line
            type="monotone"
            dataKey="band"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={{ fill: '#38bdf8', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
