import { useEffect, useRef } from 'react'
import './TrainerBackground.css'

export default function TrainerBackground() {
  const ref = useRef(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    let raf = 0
    let lastX = 50, lastY = 50

    const handle = (x, y) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        lastX = lastX * 0.7 + (x / window.innerWidth) * 100 * 0.3
        lastY = lastY * 0.7 + (y / window.innerHeight) * 100 * 0.3
        document.body.style.setProperty('--sx', lastX.toFixed(2) + '%')
        document.body.style.setProperty('--sy', lastY.toFixed(2) + '%')
        raf = 0
      })
    }

    const onMove = (e) => handle(e.clientX, e.clientY)
    const onTouch = (e) => { if (e.touches?.[0]) handle(e.touches[0].clientX, e.touches[0].clientY) }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} className="trainer-bg" aria-hidden="true">
      <div className="trainer-bg__base" />

      <svg className="trainer-bg__pattern" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="tr-geometric" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="var(--tr-pattern-stroke)" strokeWidth="1">
              <polygon points="60,15 71,39 99,39 76,57 85,85 60,67 35,85 44,57 21,39 49,39" />
              <circle cx="60" cy="60" r="28" />
              <circle cx="60" cy="60" r="14" />
              <polygon points="60,32 68,52 88,52 72,65 78,85 60,72 42,85 48,65 32,52 52,52" />
            </g>
            <g fill="var(--tr-pattern-color)">
              <circle cx="60" cy="60" r="2" />
              <circle cx="0" cy="0" r="2" />
              <circle cx="120" cy="0" r="2" />
              <circle cx="0" cy="120" r="2" />
              <circle cx="120" cy="120" r="2" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tr-geometric)" />
      </svg>

      <div className="trainer-bg__spotlight" />
      <div className="trainer-bg__vignette" />
    </div>
  )
}
