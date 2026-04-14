import { motion, useReducedMotion } from 'framer-motion'

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`

const BLOB_PATHS = [
  { x: ['0%', '30%', '-10%', '20%', '0%'], y: ['0%', '-20%', '10%', '-15%', '0%'], dur: 40 },
  { x: ['60%', '30%', '70%', '40%', '60%'], y: ['20%', '50%', '10%', '40%', '20%'], dur: 55 },
  { x: ['30%', '60%', '20%', '50%', '30%'], y: ['60%', '30%', '70%', '40%', '60%'], dur: 70 },
]

const STARS = [
  { top: '12%', left: '8%', size: 2 },
  { top: '6%', left: '45%', size: 1.5 },
  { top: '18%', left: '72%', size: 2.5 },
  { top: '35%', left: '15%', size: 1.5 },
  { top: '42%', left: '88%', size: 2 },
  { top: '55%', left: '35%', size: 1 },
  { top: '68%', left: '62%', size: 2 },
  { top: '78%', left: '22%', size: 1.5 },
  { top: '85%', left: '78%', size: 2 },
  { top: '92%', left: '50%', size: 1 },
]

export default function AuroraBackground() {
  const reducedMotion = useReducedMotion()

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {/* Aurora blobs */}
      {BLOB_PATHS.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute blur-3xl rounded-full"
          style={{
            width: '70vw',
            height: '70vw',
            background: `var(--ds-aurora-${i + 1})`,
            opacity: 'var(--ds-aurora-opacity)',
          }}
          animate={reducedMotion ? {} : {
            x: blob.x,
            y: blob.y,
          }}
          transition={reducedMotion ? {} : {
            duration: blob.dur,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Noise grain overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_SVG,
          backgroundRepeat: 'repeat',
          opacity: 0.03,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, var(--ds-bg-base, #060e1c) 100%)',
        }}
      />

      {/* Constellation dots — only visible in night theme */}
      <div className="absolute inset-0">
        {STARS.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              background: 'rgba(255, 255, 255, 0.5)',
              display: 'var(--ds-star-display, none)',
            }}
          />
        ))}
      </div>

      <style>{`
        :where([data-theme="night"]) {
          --ds-star-display: block;
        }
      `}</style>
    </div>
  )
}
