import { useEffect, useRef } from 'react'

// ─── SVG grid pattern (48×48 cells, arena floor) ─────
const GRID_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='0.5'/%3E%3C/svg%3E")`

const ORB_COLORS = [
  'rgba(139,92,246,0.18)',  // violet
  'rgba(236,72,153,0.14)',  // pink
  'rgba(34,211,238,0.12)',  // cyan
]

export default function DuelsBackdrop() {
  const prefersReduced = useRef(false)

  useEffect(() => {
    prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ background: '#0a0514' }}
      aria-hidden="true"
    >
      {/* Layer 1: Violet radial glow from top */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% -20%, rgba(139,92,246,0.25), transparent 60%)',
        }}
      />

      {/* Layer 2: Pink hint from bottom-right */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 100% 100%, rgba(236,72,153,0.15), transparent 50%)',
        }}
      />

      {/* Layer 3: Grid texture with perspective */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: GRID_SVG,
          backgroundSize: '48px 48px',
          transform: 'perspective(600px) rotateX(8deg)',
          transformOrigin: 'center bottom',
          opacity: 0.6,
        }}
      />

      {/* Layer 4: Floating orbs */}
      {ORB_COLORS.map((color, i) => (
        <div
          key={i}
          className="absolute rounded-full duels-orb"
          style={{
            width: `${280 + i * 60}px`,
            height: `${280 + i * 60}px`,
            background: color,
            filter: 'blur(80px)',
            left: `${15 + i * 30}%`,
            top: `${20 + i * 25}%`,
            animationDelay: `${i * -7}s`,
            willChange: 'transform',
          }}
        />
      ))}

      {/* Layer 5: Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Scoped styles for orb animation */}
      <style>{`
        .duels-orb {
          animation: duels-float 20s ease-in-out infinite;
        }
        @keyframes duels-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 25px) scale(0.95); }
        }
        @media (prefers-reduced-motion: reduce) {
          .duels-orb { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
