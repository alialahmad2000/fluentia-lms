// Deterministic color from speaker label — hashes to one of 5 palettes
const PALETTES = [
  'bg-sky-500/20 text-sky-300',
  'bg-rose-500/20 text-rose-300',
  'bg-amber-500/20 text-amber-300',
  'bg-violet-500/20 text-violet-300',
  'bg-slate-500/20 text-slate-300',
]

function hashLabel(label) {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0
  return Math.abs(h) % PALETTES.length
}

export function SpeakerBadge({ label, size = 'sm' }) {
  if (!label) return null
  const palette = PALETTES[hashLabel(label)]
  const sizeClass = size === 'lg'
    ? 'px-5 py-1.5 rounded-2xl text-sm font-semibold'
    : 'px-3 py-0.5 rounded-full text-xs font-medium'
  return (
    <span
      className={`inline-flex items-center ${sizeClass} transition-colors duration-300 ${palette}`}
      dir="ltr"
      style={{ unicodeBidi: 'isolate' }}
    >
      {label}
    </span>
  )
}
