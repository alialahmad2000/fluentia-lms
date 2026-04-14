export default function DSLoadingSkeleton({ rows = 3, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="ds-skeleton"
          style={{
            height: i === 0 ? 28 : 18,
            width: i === 0 ? '60%' : `${80 - i * 10}%`,
            borderRadius: 'var(--radius-sm)',
          }}
        />
      ))}
      <style>{`
        .ds-skeleton {
          background: linear-gradient(
            90deg,
            var(--ds-surface-1, rgba(255,255,255,0.035)) 25%,
            var(--ds-surface-2, rgba(255,255,255,0.065)) 50%,
            var(--ds-surface-1, rgba(255,255,255,0.035)) 75%
          );
          background-size: 200% 100%;
          animation: ds-shimmer 1.8s ease-in-out infinite;
        }
        @keyframes ds-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
