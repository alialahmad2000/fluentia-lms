import React, { useMemo } from 'react';
import './IELTSSunsetBackground.css';

/**
 * Sunset Atlas — IELTS V2 premium background atmosphere.
 *
 * Layers (back to front):
 *   1. Base deep-bronze gradient
 *   2-4. Three aurora blobs (orange / amber / bronze) with slow drift
 *   5. Islamic geometric pattern overlay
 *   6. Dust particles (CSS-only, pre-generated positions)
 *   7. Lens flares (CSS radial gradients)
 *   8. Vignette
 *   9. Grain noise
 *
 * Usage:
 *   <div style={{ position: 'relative' }}>
 *     <IELTSSunsetBackground />
 *     <main style={{ position: 'relative', zIndex: 1 }}>...</main>
 *   </div>
 */
export default function IELTSSunsetBackground({ intensity = 'default' }) {
  const dustParticles = useMemo(() => {
    const particles = [];
    for (let i = 0; i < 50; i++) {
      const seed = (i * 7919) % 100;
      const left = ((i * 3) * 17) % 100;
      const top = ((i * 5) * 23) % 100;
      const size = 1 + (seed % 3);
      const delay = seed % 60;
      const duration = 40 + (seed % 40);
      particles.push({ id: i, left, top, size, delay, duration });
    }
    return particles;
  }, []);

  const intensityClass = intensity === 'subtle' ? 'sunset-subtle' : '';

  return (
    <div className={`ielts-sunset-bg ${intensityClass}`} aria-hidden="true">
      {/* Layer 1 — Base gradient */}
      <div className="sunset-base" />

      {/* Layers 2-4 — Aurora blobs */}
      <div className="sunset-aurora sunset-aurora-1" />
      <div className="sunset-aurora sunset-aurora-2" />
      <div className="sunset-aurora sunset-aurora-3" />

      {/* Layer 5 — Islamic geometric pattern */}
      <div className="sunset-pattern">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="sunset-geometry" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="#fbbf24" strokeWidth="0.6" opacity="0.9">
                <polygon points="40,10 48,32 70,32 52,46 58,68 40,56 22,68 28,46 10,32 32,32" />
                <circle cx="40" cy="40" r="3" />
                <line x1="0" y1="40" x2="80" y2="40" strokeDasharray="2 6" opacity="0.4" />
                <line x1="40" y1="0" x2="40" y2="80" strokeDasharray="2 6" opacity="0.4" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sunset-geometry)" />
        </svg>
      </div>

      {/* Layer 6 — Dust particles */}
      <div className="sunset-dust">
        {dustParticles.map((p) => (
          <span
            key={p.id}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Layer 7 — Lens flares */}
      <div className="sunset-flare sunset-flare-tr" />
      <div className="sunset-flare sunset-flare-bl" />
      <div className="sunset-flare sunset-flare-c" />

      {/* Layer 8 — Vignette */}
      <div className="sunset-vignette" />

      {/* Layer 9 — Grain */}
      <div className="sunset-grain" />
    </div>
  );
}
