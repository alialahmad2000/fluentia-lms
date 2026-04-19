const TABS = [
  { key: null,       label: 'الكل' },
  { key: 'reading',  label: '📖 قراءة' },
  { key: 'listening',label: '🎧 استماع' },
]

export default function ErrorFilterTabs({ activeSkill, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {TABS.map(tab => (
        <button
          key={String(tab.key)}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '7px 16px', borderRadius: 10,
            background: activeSkill === tab.key ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
            color: activeSkill === tab.key ? '#38bdf8' : 'var(--text-tertiary)',
            border: activeSkill === tab.key ? '1.5px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.06)',
            fontFamily: 'Tajawal', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
