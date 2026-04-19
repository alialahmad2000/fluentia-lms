export default function CueCardDisplay({ cueCard, topic }) {
  if (!cueCard) return null
  const bullets = Array.isArray(cueCard.bullet_points) ? cueCard.bullet_points : []

  return (
    <div style={{ padding: 20, borderRadius: 14, background: 'rgba(167,139,250,0.06)', border: '1.5px solid rgba(167,139,250,0.25)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', fontFamily: 'sans-serif', letterSpacing: '0.08em', marginBottom: 8 }}>
        IELTS SPEAKING — PART 2 CUE CARD
      </p>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', textAlign: 'left', lineHeight: 1.6, marginBottom: 12 }}>
        {cueCard.prompt || topic}
      </p>
      {bullets.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', direction: 'ltr', marginBottom: 6 }}>You should say:</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bullets.map((b, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'sans-serif', direction: 'ltr', textAlign: 'left', display: 'flex', gap: 8 }}>
                <span style={{ color: '#a78bfa', flexShrink: 0 }}>•</span> {b}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cueCard.preparation_tips_ar && (
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(167,139,250,0.08)', marginTop: 8 }}>
          <p style={{ fontSize: 12, color: '#a78bfa', fontFamily: 'Tajawal', fontWeight: 700, marginBottom: 4 }}>نصائح للتحضير:</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Tajawal', lineHeight: 1.7 }}>
            {cueCard.preparation_tips_ar}
          </p>
        </div>
      )}
    </div>
  )
}
