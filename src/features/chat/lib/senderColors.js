// المجلس — restrained per-sender identity. Instead of 10 vivid hues, every
// participant gets a STABLE warm-neutral "aged metal / earth" tone (brass, bronze,
// sand, taupe, stone, clay…) so the circle reads calm and premium, never a rainbow.
// Own messages keep the branded brass signature (via --ds-accent-gold in the chat).

export const SENDER_PALETTE = [
  { name: 'brass',  base: '#C9A86A', soft: '#E2C88E' },
  { name: 'bronze', base: '#B08D57', soft: '#CFAE7C' },
  { name: 'sand',   base: '#BCAA86', soft: '#D7C9AC' },
  { name: 'taupe',  base: '#A9A18C', soft: '#C7BFAB' },
  { name: 'stone',  base: '#9A9488', soft: '#BBB3A6' },
  { name: 'clay',   base: '#B68F77', soft: '#D2B19E' },
  { name: 'olive',  base: '#9A9B79', soft: '#BDBE9C' },
  { name: 'pewter', base: '#8E96A0', soft: '#B1B8C1' },
]

// djb2-ish stable hash → even distribution across the palette
function hash(str) {
  let h = 5381
  const s = String(str || '')
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function senderColor(senderId) {
  return SENDER_PALETTE[hash(senderId) % SENDER_PALETTE.length]
}

// 135deg gradient for avatar rings / fills
export function senderGradient(senderId) {
  const c = senderColor(senderId)
  return `linear-gradient(135deg, ${c.soft} 0%, ${c.base} 100%)`
}
