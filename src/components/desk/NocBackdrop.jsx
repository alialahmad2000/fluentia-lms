// NocBackdrop — the "Operations Room" atmosphere for the Pro Desk. A first-person
// receding data-centre aisle (two converging rack rows), glowing status LEDs, a glowing
// vanishing point, a reflective cool floor, volumetric haze and drifting brass motes.
// Full-bleed, fixed, behind everything (the Desk chrome sits over it, like the Library room).
//
// Performance: DPR-capped, resize-aware, motion gated — reduced-motion or a low-core device
// gets a single static frame (mirrors the AmbientParticles discipline that fixed the Android
// toolbar-scroll flicker).
import { useEffect, useRef } from 'react'

export default function NocBackdrop() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const lowCore = (navigator.hardwareConcurrency || 8) <= 4
    const animate = !reduce && !lowCore

    let W = 0, H = 0, dpr = 1, raf = 0
    const ROWS = 12 // cabinets per side

    // deterministic per-cabinet LED phases (index-derived, no Math.random)
    const cab = []
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < ROWS; i++) {
        const leds = []
        for (let k = 0; k < 6; k++) {
          const seed = (side * 31 + i * 7 + k * 13)
          leds.push({
            hue: seed % 11 === 0 ? 'red' : seed % 3 === 0 ? 'teal' : 'brass',
            phase: (seed % 100) / 100,
            speed: 0.4 + ((seed % 5) * 0.2),
          })
        }
        cab.push({ side, i, leds })
      }
    }
    const motes = Array.from({ length: 46 }, (_, i) => ({
      x: ((i * 53) % 100) / 100,
      y: ((i * 29) % 100) / 100,
      z: 0.3 + ((i * 17) % 70) / 100,
      drift: 0.2 + ((i * 11) % 40) / 100,
    }))

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const LED = { brass: [239, 210, 153], teal: [90, 200, 214], red: [231, 110, 84] }

    const draw = (tMs) => {
      const t = tMs / 1000
      const vpx = W * 0.63   // vanishing point — aisle recedes toward the sidebar side
      const vpy = H * 0.5

      // base wash
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#070a12')
      bg.addColorStop(0.5, '#0a0f1a')
      bg.addColorStop(1, '#0c101c')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // glowing far end — teal core + brass ring
      const core = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, Math.max(W, H) * 0.55)
      core.addColorStop(0, 'rgba(120,210,224,0.28)')
      core.addColorStop(0.18, 'rgba(90,170,200,0.16)')
      core.addColorStop(0.45, 'rgba(201,162,92,0.06)')
      core.addColorStop(1, 'rgba(7,10,18,0)')
      ctx.fillStyle = core
      ctx.fillRect(0, 0, W, H)

      // reflective cool floor sheen (lower half)
      const floor = ctx.createLinearGradient(0, vpy, 0, H)
      floor.addColorStop(0, 'rgba(60,110,140,0.10)')
      floor.addColorStop(0.5, 'rgba(40,80,110,0.06)')
      floor.addColorStop(1, 'rgba(20,45,70,0.14)')
      ctx.fillStyle = floor
      ctx.fillRect(0, vpy, W, H - vpy)

      // aisle floor lines converging to VP
      ctx.strokeStyle = 'rgba(120,170,195,0.12)'
      ctx.lineWidth = 1
      for (let g = -7; g <= 7; g++) {
        const fx = W * 0.5 + g * (W * 0.13)
        ctx.beginPath()
        ctx.moveTo(fx, H + 4)
        ctx.lineTo(vpx, vpy)
        ctx.stroke()
      }
      // a few receding cross-lines for floor depth
      ctx.strokeStyle = 'rgba(120,170,195,0.07)'
      for (let r = 1; r <= 5; r++) {
        const ry = vpy + (H - vpy) * Math.pow(r / 6, 2.2)
        ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(W, ry); ctx.stroke()
      }

      // cabinets far → near
      for (const c of cab) {
        const depth = c.i / (ROWS - 1)
        const ease = Math.pow(depth, 1.6)
        const scale = 0.09 + ease * 1.1
        const spread = W * 0.36
        const wallX = c.side === 0 ? vpx - spread * scale : vpx + spread * scale
        const cw = W * 0.13 * scale
        const chH = H * 0.66 * scale
        const cy = vpy - chH * 0.34
        const cx = wallX - cw / 2
        const dim = c.side === 1 ? 0.66 : 1        // right wall quieter (behind the text)
        const alpha = (0.2 + ease * 0.62) * dim

        // rack face + a lit inner edge toward the aisle
        ctx.fillStyle = `rgba(16,22,33,${0.5 + ease * 0.42})`
        ctx.fillRect(cx, cy, cw, chH)
        const edgeX = c.side === 0 ? cx + cw : cx
        const eg = ctx.createLinearGradient(edgeX - (c.side === 0 ? cw * 0.4 : 0), 0, edgeX, 0)
        eg.addColorStop(0, 'rgba(90,170,200,0)')
        eg.addColorStop(1, `rgba(90,170,200,${0.10 * dim + ease * 0.10})`)
        ctx.fillStyle = eg
        ctx.fillRect(cx, cy, cw, chH)
        ctx.strokeStyle = `rgba(150,180,205,${0.06 + ease * 0.12})`
        ctx.lineWidth = 1
        ctx.strokeRect(cx, cy, cw, chH)
        // rack shelf lines
        if (ease > 0.25) {
          ctx.strokeStyle = `rgba(120,150,180,${0.05 + ease * 0.06})`
          for (let s = 1; s < 6; s++) {
            const sy = cy + (chH / 6) * s
            ctx.beginPath(); ctx.moveTo(cx, sy); ctx.lineTo(cx + cw, sy); ctx.stroke()
          }
        }

        // LEDs (bright, with bloom)
        const ledR = Math.max(0.7, 1.9 * scale)
        for (let k = 0; k < c.leds.length; k++) {
          const led = c.leds[k]
          const ly = cy + chH * (0.12 + k * 0.145)
          const lx = cx + cw * (0.26 + (k % 2) * 0.46)
          const blink = animate
            ? 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * led.speed + led.phase * 6.28))
            : 0.7
          const [r, gg, b] = LED[led.hue]
          const a = alpha * blink
          if (ease > 0.28) {
            const bloom = ctx.createRadialGradient(lx, ly, 0, lx, ly, ledR * 5)
            bloom.addColorStop(0, `rgba(${r},${gg},${b},${a * 0.5})`)
            bloom.addColorStop(1, `rgba(${r},${gg},${b},0)`)
            ctx.fillStyle = bloom
            ctx.beginPath(); ctx.arc(lx, ly, ledR * 5, 0, 6.283); ctx.fill()
          }
          ctx.fillStyle = `rgba(${r},${gg},${b},${Math.min(1, a + 0.15)})`
          ctx.beginPath(); ctx.arc(lx, ly, ledR, 0, 6.283); ctx.fill()
        }
      }

      // volumetric haze at the vanishing point
      const haze = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, Math.min(W, H) * 0.55)
      haze.addColorStop(0, 'rgba(150,190,210,0.14)')
      haze.addColorStop(0.5, 'rgba(110,150,180,0.05)')
      haze.addColorStop(1, 'rgba(7,10,18,0)')
      ctx.fillStyle = haze
      ctx.fillRect(0, 0, W, H)

      // drifting brass motes
      for (const m of motes) {
        const y = animate ? (m.y + (t * 0.014 * m.drift)) % 1 : m.y
        const px = m.x * W
        const py = y * H
        ctx.fillStyle = `rgba(201,162,92,${0.06 + m.z * 0.12})`
        ctx.beginPath(); ctx.arc(px, py, m.z * 1.5, 0, 6.283); ctx.fill()
      }

      if (animate) raf = requestAnimationFrame(draw)
    }

    resize()
    draw(0)
    if (animate) raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="desk-noc" aria-hidden="true" />
}
