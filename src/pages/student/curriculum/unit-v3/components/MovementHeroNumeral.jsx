import React from 'react'
import { V3_TYPOGRAPHY } from '../_v3Tokens'

// Massive Playfair-Display Roman numeral acting as a watermark behind the
// movement panel header. Non-selectable, aria-hidden, doesn't affect layout.
export default function MovementHeroNumeral({ roman, accent, theme = 'dark' }) {
  const opacity = theme === 'light' ? 0.12 : 0.09
  return (
    <div
      aria-hidden="true"
      className="v3-numeral"
      style={{
        position: 'absolute',
        top: '-12px',
        insetInlineStart: '20px',
        fontFamily: V3_TYPOGRAPHY.romanFont,
        fontWeight: 700,
        color: accent,
        opacity,
        pointerEvents: 'none',
        userSelect: 'none',
        lineHeight: 0.9,
        letterSpacing: '-0.04em',
        WebkitMaskImage: 'linear-gradient(180deg, #000 65%, transparent)',
        maskImage: 'linear-gradient(180deg, #000 65%, transparent)',
      }}
    >
      {roman}
    </div>
  )
}
