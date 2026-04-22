import React from 'react';

/**
 * KuficMark — The atelier's rare hallmark.
 * Use ONLY on premium moments: welcome hero, achievement reveal, login theater.
 * Do not place on standard pages.
 *
 * @param {number} size - pixel size (default 40)
 * @param {string} color - CSS color (default: var(--atelier-gold-dim))
 * @param {number} opacity - (default 0.08)
 */
export default function KuficMark({ size = 40, color, opacity = 0.08, className = '', ...rest }) {
  const stroke = color || 'var(--atelier-gold-dim, #8F7545)';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      stroke={stroke}
      strokeWidth="1"
      strokeLinecap="square"
      width={size}
      height={size}
      style={{ opacity }}
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="M 4 8 L 4 32 L 8 32 L 8 20 L 16 20 L 16 32 L 20 32 L 20 8 L 16 8 L 16 16 L 8 16 L 8 8 Z" />
      <path d="M 24 8 L 24 32 L 36 32 L 36 28 L 28 28 L 28 22 L 34 22 L 34 18 L 28 18 L 28 12 L 36 12 L 36 8 Z" />
      <circle cx="20" cy="4" r="1" />
    </svg>
  );
}
