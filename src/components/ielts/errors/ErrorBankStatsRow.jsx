import { GlassPanel } from '@/design-system/components'

export default function ErrorBankStatsRow({ summary }) {
  const { total = 0, due = 0, mastered = 0, masteryRate = 0 } = summary || {}
  const tiles = [
    { label: 'إجمالي الأخطاء', value: total, color: 'var(--text-primary)', emoji: '📋' },
    { label: 'مستحقة المراجعة', value: due, color: due > 0 ? '#fb923c' : '#4ade80', emoji: due > 0 ? '🔔' : '✅' },
    { label: 'تم إتقانها', value: mastered, color: '#4ade80', emoji: '🏆' },
    { label: 'نسبة الإتقان', value: `${masteryRate}%`, color: masteryRate >= 70 ? '#4ade80' : masteryRate >= 40 ? '#38bdf8' : '#fb923c', emoji: '📈' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
      {tiles.map(tile => (
        <GlassPanel key={tile.label} style={{ padding: '14px 16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>{tile.emoji}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: tile.color, fontFamily: 'Tajawal', lineHeight: 1, marginBottom: 4 }}>
            {tile.value}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{tile.label}</div>
        </GlassPanel>
      ))}
    </div>
  )
}
