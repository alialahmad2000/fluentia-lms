import { useState, useEffect, memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`

const BLOB_PATHS = [
  { x: ['0%', '30%', '-10%', '20%', '0%'], y: ['0%', '-20%', '10%', '-15%', '0%'], dur: 40 },
  { x: ['60%', '30%', '70%', '40%', '60%'], y: ['20%', '50%', '10%', '40%', '20%'], dur: 55 },
  { x: ['30%', '60%', '20%', '50%', '30%'], y: ['60%', '30%', '70%', '40%', '60%'], dur: 70 },
]

// Detect low-end desktop (few cores) so we can skip blob animation —
// 3× blurred 70vw animated blobs drive ~10-15% constant GPU cost on older laptops.
// Threshold of <= 4 cores covers Intel U-series laptops which students commonly use.
function isLowEndDevice() {
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency
  return cores != null && cores <= 4
}

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

function AuroraBackground() {
  const reducedMotion = useReducedMotion()
  const [renderMode, setRenderMode] = useState('full') // 'full' | 'reduced' | 'static'
  const [hidden, setHidden] = useState(() => document.hidden)

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const lowEnd = isLowEndDevice()

    // Low-end laptops (<= 4 cores) previously got the full 3-blob animated
    // aurora on desktop, which pegged their GPU idle-cost. Drop them to the
    // single static-blob variant same as mobile-reduced — still looks rich.
    if (reducedMotion || (isMobile && lowEnd)) {
      setRenderMode('static')
    } else if (isMobile || lowEnd) {
      setRenderMode('reduced')
    }
  }, [reducedMotion])

  useEffect(() => {
    const handler = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // Static: lightweight CSS gradient only (no blobs, no animation)
  if (renderMode === 'static') {
    return (
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: -1 }}
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, var(--ds-aurora-1) 0%, transparent 70%)',
            opacity: 0.15,
          }}
        />
      </div>
    )
  }

  // Reduced: 1 static blob, no animation
  if (renderMode === 'reduced') {
    return (
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: -1 }}
        aria-hidden
      >
        <div
          className="absolute blur-2xl rounded-full"
          style={{
            width: '50vw',
            height: '50vw',
            top: '20%',
            left: '25%',
            background: 'var(--ds-aurora-1)',
            opacity: 'var(--ds-aurora-opacity)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, var(--ds-bg-base, #060e1c) 100%)',
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {/* Aurora blobs — blur reduced from blur-3xl (64px) to blur-2xl (40px) */}
      {BLOB_PATHS.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute blur-2xl rounded-full"
          style={{
            width: '70vw',
            height: '70vw',
            background: `var(--ds-aurora-${i + 1})`,
            opacity: 'var(--ds-aurora-opacity)',
            animationPlayState: hidden ? 'paused' : 'running',
          }}
          animate={hidden ? false : {
            x: blob.x,
            y: blob.y,
          }}
          transition={{
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

export default memo(AuroraBackground)
