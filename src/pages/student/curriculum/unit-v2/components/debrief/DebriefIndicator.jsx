/**
 * 5 dots top-center — active = gold, past = muted clickable, future = disabled.
 */
export default function DebriefIndicator({ total, current, onJump }) {
  return (
    <div style={{
      position: 'absolute', top: '16px', left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', gap: '8px', alignItems: 'center', zIndex: 10,
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => i <= current && onJump(i)}
          disabled={i > current}
          aria-label={`المرحلة ${i + 1}`}
          style={{
            width: i === current ? '24px' : '8px',
            height: '8px',
            borderRadius: '100px',
            background: i === current
              ? 'var(--cinematic-accent-gold, #fbbf24)'
              : i < current
                ? 'rgba(251,191,36,0.4)'
                : 'rgba(255,255,255,0.15)',
            border: 'none',
            cursor: i <= current ? 'pointer' : 'default',
            padding: 0,
            transition: 'width 0.3s ease, background 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}
