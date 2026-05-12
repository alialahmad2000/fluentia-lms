import { memo, useEffect, useState } from 'react'
import './AuroraBackground.css'

/**
 * Velvet Atmosphere — premium 5-layer ambient background.
 *
 * Replaces the legacy aurora-blob + constellation pattern. Layers (back → front):
 *   1. Base vertical gradient
 *   2. Three drifting aurora orbs (radial-gradient, GPU-cheap)
 *   3. Subtle dot grid (static)
 *   4. Edge vignette (static)
 *   5. SVG film grain via mix-blend-mode overlay (static)
 *
 * Theme-aware via CSS variables (--atmo-*). Auto-pauses on tab hide.
 * Respects prefers-reduced-motion. Simplifies on mobile.
 *
 * @param {Object} props
 * @param {'default'|'subtle'|'intense'} [props.variant='default']
 */
function AuroraBackground({ variant = 'default' }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const handler = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return (
    <div
      className={`velvet-atmo velvet-atmo--${variant}${hidden ? ' is-paused' : ''}`}
      aria-hidden="true"
    >
      <div className="velvet-atmo__base" />
      <div className="velvet-atmo__orb velvet-atmo__orb--1" />
      <div className="velvet-atmo__orb velvet-atmo__orb--2" />
      <div className="velvet-atmo__orb velvet-atmo__orb--3" />
      <div className="velvet-atmo__dotgrid" />
      <div className="velvet-atmo__vignette" />
      <div className="velvet-atmo__grain" />
    </div>
  )
}

export default memo(AuroraBackground)
