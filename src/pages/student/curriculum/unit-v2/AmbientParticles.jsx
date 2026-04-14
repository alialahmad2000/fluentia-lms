import { useEffect, useRef } from 'react'
import { useCinematicMotion } from '../_premiumPrimitives'

/* ═══════════════════════════════════════════════
   Particle presets
   ═══════════════════════════════════════════════ */
const PARTICLE_PRESETS = {
  confetti: {
    count: 30,
    shape: 'square',
    sizes: [3, 5, 7],
    colors: ['#f5c842', '#00d4ff', '#f472b6', '#a78bfa'],
    velocity: { y: [0.2, 0.6], x: [-0.3, 0.3] },
    rotation: true,
    lifespan: [8000, 15000],
  },
  bubbles: {
    count: 25,
    shape: 'circle',
    sizes: [4, 8, 12],
    colors: ['rgba(0,212,255,0.15)', 'rgba(255,255,255,0.1)'],
    velocity: { y: [-0.3, -0.7], x: [-0.1, 0.1] },
    rotation: false,
    lifespan: [10000, 18000],
  },
  stars: {
    count: 40,
    shape: 'star',
    sizes: [2, 3, 5],
    colors: ['rgba(255,255,255,0.6)', 'rgba(245,200,66,0.4)'],
    velocity: { y: [-0.05, 0.05], x: [-0.05, 0.05] },
    twinkle: true,
    lifespan: [15000, 25000],
  },
  goldDust: {
    count: 50,
    shape: 'circle',
    sizes: [1, 2, 3],
    colors: ['rgba(245,200,66,0.4)', 'rgba(245,200,66,0.2)'],
    velocity: { y: [-0.1, 0.2], x: [-0.1, 0.1] },
    lifespan: [12000, 20000],
  },
  energySparks: {
    count: 20,
    shape: 'spark',
    sizes: [2, 4],
    colors: ['#f5c842', '#ff6b35'],
    velocity: { y: [-0.4, 0.4], x: [-0.4, 0.4] },
    lifespan: [3000, 6000],
  },
  paintDrops: {
    count: 15,
    shape: 'blob',
    sizes: [8, 12, 16],
    colors: [
      'rgba(244,114,182,0.15)',
      'rgba(167,139,250,0.15)',
      'rgba(245,200,66,0.15)',
    ],
    velocity: { y: [0.1, 0.3], x: [0, 0] },
    lifespan: [15000, 25000],
  },
  circuits: {
    count: 15,
    shape: 'line',
    sizes: [2, 3],
    colors: ['rgba(0,212,255,0.2)'],
    velocity: { y: [-0.1, 0.1], x: [-0.1, 0.1] },
    lifespan: [8000, 12000],
  },
  ambientDots: {
    count: 20,
    shape: 'circle',
    sizes: [1, 2],
    colors: ['rgba(255,255,255,0.2)'],
    velocity: { y: [-0.1, 0.1], x: [-0.1, 0.1] },
    lifespan: [10000, 20000],
  },
}

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */
function rand(min, max) {
  return Math.random() * (max - min) + min
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function spawnParticle(preset, canvasW, canvasH) {
  const lifespan = rand(preset.lifespan[0], preset.lifespan[1])
  return {
    x: rand(0, canvasW),
    y: rand(0, canvasH),
    vx: rand(preset.velocity.x[0], preset.velocity.x[1]),
    vy: rand(preset.velocity.y[0], preset.velocity.y[1]),
    size: randItem(preset.sizes),
    color: randItem(preset.colors),
    born: performance.now(),
    lifespan,
    rotation: 0,
    rotationSpeed: preset.rotation ? rand(-0.03, 0.03) : 0,
  }
}

/* ═══════════════════════════════════════════════
   Shape renderers
   ═══════════════════════════════════════════════ */
function drawCircle(ctx, p) {
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fillStyle = p.color
  ctx.fill()
}

function drawSquare(ctx, p) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.fillStyle = p.color
  ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
  ctx.restore()
}

function drawStar(ctx, p) {
  const spikes = 5
  const outerR = p.size
  const innerR = p.size * 0.4
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.beginPath()
  ctx.moveTo(0, -outerR)

  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR)
    rot += step
    ctx.lineTo(Math.cos(rot) * innerR, Math.sin(rot) * innerR)
    rot += step
  }

  ctx.lineTo(0, -outerR)
  ctx.closePath()
  ctx.fillStyle = p.color
  ctx.fill()
  ctx.restore()
}

function drawSpark(ctx, p) {
  const len = p.size * 4
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)

  ctx.shadowBlur = 6
  ctx.shadowColor = p.color
  ctx.strokeStyle = p.color
  ctx.lineWidth = p.size * 0.5

  ctx.beginPath()
  ctx.moveTo(-len / 2, 0)
  ctx.lineTo(len / 2, 0)
  ctx.stroke()

  ctx.shadowBlur = 0
  ctx.restore()
}

function drawBlob(ctx, p) {
  ctx.save()
  ctx.filter = 'blur(3px)'
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fillStyle = p.color
  ctx.fill()
  ctx.filter = 'none'
  ctx.restore()
}

function drawLine(ctx, p) {
  const len = p.size * 10
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  ctx.strokeStyle = p.color
  ctx.lineWidth = p.size * 0.5
  ctx.beginPath()
  ctx.moveTo(-len / 2, 0)
  ctx.lineTo(len / 2, 0)
  ctx.stroke()
  ctx.restore()
}

function drawParticle(ctx, p, shape) {
  switch (shape) {
    case 'circle':
      drawCircle(ctx, p)
      break
    case 'square':
      drawSquare(ctx, p)
      break
    case 'star':
      drawStar(ctx, p)
      break
    case 'spark':
      drawSpark(ctx, p)
      break
    case 'blob':
      drawBlob(ctx, p)
      break
    case 'line':
      drawLine(ctx, p)
      break
    default:
      drawCircle(ctx, p)
  }
}

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */
export default function AmbientParticles({ type = 'ambientDots' }) {
  const { reduced } = useCinematicMotion()

  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const rafRef = useRef(null)

  useEffect(() => {
    if (reduced) return
    const preset = PARTICLE_PRESETS[type] || PARTICLE_PRESETS.ambientDots
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    /* Determine max particle count — halve on mobile */
    const isMobile = () => window.innerWidth < 768
    const maxCount = () =>
      Math.min(
        isMobile() ? Math.floor(preset.count * 0.5) : preset.count,
        50
      )

    /* Resize canvas to viewport */
    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    /* Seed initial particles */
    const count = maxCount()
    particlesRef.current = Array.from({ length: count }, () =>
      spawnParticle(preset, canvas.width, canvas.height)
    )

    /* Render loop */
    function loop() {
      if (document.visibilityState === 'hidden') {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const now = performance.now()
      const desired = maxCount()
      const particles = particlesRef.current

      /* Respawn dead particles to maintain desired count */
      while (particles.length < desired) {
        particles.push(spawnParticle(preset, canvas.width, canvas.height))
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        const age = now - p.born
        const progress = age / p.lifespan // 0 → 1

        if (progress >= 1) {
          // Replace dead particle
          particles[i] = spawnParticle(preset, canvas.width, canvas.height)
          continue
        }

        /* Move */
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed

        /* Wrap around edges */
        if (p.x < -20) p.x = canvas.width + 20
        if (p.x > canvas.width + 20) p.x = -20
        if (p.y < -20) p.y = canvas.height + 20
        if (p.y > canvas.height + 20) p.y = -20

        /* Fade-in and fade-out */
        const fadeInEnd = 0.1
        const fadeOutStart = 0.85
        let alpha = 1

        if (progress < fadeInEnd) {
          alpha = progress / fadeInEnd
        } else if (progress > fadeOutStart) {
          alpha = (1 - progress) / (1 - fadeOutStart)
        }

        /* Twinkle for stars */
        if (preset.twinkle) {
          alpha *= 0.5 + 0.5 * Math.sin((now / 800) * Math.PI + p.born)
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        drawParticle(ctx, p, preset.shape)
        ctx.globalAlpha = 1
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [type, reduced]) // re-init when type changes or motion preference changes

  if (reduced) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
