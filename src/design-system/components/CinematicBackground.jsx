import { memo } from 'react'
import './CinematicBackground.css'

/**
 * Cinematic background layer for main dashboards.
 *
 * Renders behind all content (z-index: 0). Parent must have position: relative
 * and z-index: 1 for child content.
 *
 * Theme-aware: reads CSS vars from the active theme.
 * Performance: pure CSS, GPU-accelerated transforms, no JS loop.
 * Respects prefers-reduced-motion: reduce (drops slow drift animation).
 */
function CinematicBackground({ variant = 'default', className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`cinematic-bg cinematic-bg--${variant} ${className}`}
    >
      <div className="cinematic-bg__gradient" />
      <div className="cinematic-bg__orb cinematic-bg__orb--1" />
      <div className="cinematic-bg__orb cinematic-bg__orb--2" />
      <div className="cinematic-bg__orb cinematic-bg__orb--3" />
      <div className="cinematic-bg__grain" />
    </div>
  )
}

export default memo(CinematicBackground)
