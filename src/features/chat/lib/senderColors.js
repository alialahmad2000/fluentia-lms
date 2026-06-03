// Per-sender colour identity — every participant gets a distinct, STABLE hue
// (Telegram / Slack / Discord style) so the conversation reads colourful and
// alive instead of monochrome. Own messages use a separate branded signature.

export const SENDER_PALETTE = [
  { name: 'sky',     base: '#38bdf8', soft: '#7dd3fc' },
  { name: 'indigo',  base: '#818cf8', soft: '#a5b4fc' },
  { name: 'violet',  base: '#c084fc', soft: '#d8b4fe' },
  { name: 'fuchsia', base: '#e879f9', soft: '#f0abfc' },
  { name: 'rose',    base: '#fb7185', soft: '#fda4af' },
  { name: 'orange',  base: '#fb923c', soft: '#fdba74' },
  { name: 'amber',   base: '#fbbf24', soft: '#fcd34d' },
  { name: 'lime',    base: '#a3e635', soft: '#bef264' },
  { name: 'emerald', base: '#34d399', soft: '#6ee7b7' },
  { name: 'teal',    base: '#2dd4bf', soft: '#5eead4' },
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
