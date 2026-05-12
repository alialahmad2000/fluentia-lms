// Ghost-text system messages — tiny, centered, 60% opacity.
// Intentionally takes no more visual weight than a hairline.
export default function MessageBubbleSystem({ body, compact = false }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ paddingTop: compact ? 2 : 4, paddingBottom: compact ? 2 : 4 }}
    >
      <span
        style={{
          fontFamily: 'Tajawal, sans-serif',
          fontSize: compact ? 11 : 12,
          color: 'var(--ds-text-muted)',
          opacity: 0.6,
          letterSpacing: '0.01em',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 10, opacity: 0.7 }}>◌</span>
        {body}
      </span>
    </div>
  )
}
