import { motion } from 'framer-motion';

/**
 * Determine the bar gradient based on percentage (unless overridden).
 */
function gradientForValue(value) {
  if (value >= 100) return 'linear-gradient(90deg, #22c55e, #16a34a)'; // green
  if (value >= 75) return 'linear-gradient(90deg, #22c55e, #0ea5e9)'; // green -> sky
  if (value >= 50) return 'linear-gradient(90deg, #0ea5e9, #6366f1)'; // sky -> indigo
  if (value >= 25) return 'linear-gradient(90deg, #6366f1, #8b5cf6)'; // indigo -> violet
  return 'linear-gradient(90deg, #8b5cf6, #a78bfa)'; // violet
}

export default function ShimmerProgress({
  value = 0,
  className = '',
  showLabel = false,
  color,
  height = 8,
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const bg = color || gradientForValue(clamped);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        borderRadius: '9999px',
        background: 'rgba(128,128,128,0.15)',
        overflow: 'hidden',
      }}
    >
      {/* Filled portion */}
      <motion.div
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '9999px',
          background: bg,
        }}
      />

      {/* Shimmer overlay */}
      <motion.div
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '50%',
          height: '100%',
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
          borderRadius: '9999px',
          pointerEvents: 'none',
        }}
      />

      {/* Optional label */}
      {showLabel && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.6rem',
            fontWeight: 600,
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
