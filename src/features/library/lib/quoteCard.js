// Build a beautiful, branded quote card from a sentence and share/download it.
// Pure client-side Canvas — instant, free, offline. No AI / network needed.

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').trim().split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w } else { line = test }
  }
  if (line) lines.push(line)
  return lines
}

export async function shareQuote({ en, ar, title }) {
  // best-effort: make sure the display fonts are ready so the canvas isn't bland
  try {
    await Promise.all([
      document.fonts.load('600 58px "Cormorant Garamond"'),
      document.fonts.load('italic 40px "Cormorant Garamond"'),
      document.fonts.load('500 34px "Tajawal"'),
    ])
  } catch { /* fall back to system serif */ }

  const W = 1080, H = 1350
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')

  // warm midnight background + lamp glow
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#10131c'); bg.addColorStop(1, '#0a0c14')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, -80, 40, W / 2, 220, 760)
  glow.addColorStop(0, 'rgba(251,191,36,0.13)'); glow.addColorStop(1, 'rgba(251,191,36,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

  // gold frame
  ctx.strokeStyle = 'rgba(251,191,36,0.32)'; ctx.lineWidth = 2
  ctx.strokeRect(60, 60, W - 120, H - 120)

  ctx.textAlign = 'center'

  // opening quotation mark
  ctx.fillStyle = 'rgba(251,191,36,0.45)'
  ctx.font = 'italic 220px "Cormorant Garamond", Georgia, serif'
  ctx.fillText('“', W / 2, 340)

  // English quote (serif, wrapped, centred)
  ctx.fillStyle = '#ede4d3'
  ctx.font = '500 58px "Cormorant Garamond", Georgia, serif'
  const enLines = wrapText(ctx, en, W - 240)
  const lh = 80
  let y = 460
  enLines.forEach((l) => { ctx.fillText(l, W / 2, y); y += lh })

  // Arabic translation (dimmer whisper)
  if (ar) {
    ctx.fillStyle = '#b9a98f'
    ctx.font = '400 36px "Tajawal", sans-serif'
    const arLines = wrapText(ctx, ar, W - 280)
    let ay = y + 46
    arLines.forEach((l) => { ctx.fillText(l, W / 2, ay); ay += 56 })
  }

  // footer: gold rule + book title + brand
  ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(W / 2 - 64, H - 232); ctx.lineTo(W / 2 + 64, H - 232); ctx.stroke()
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'italic 42px "Cormorant Garamond", Georgia, serif'
  if (title) ctx.fillText(title, W / 2, H - 168)
  ctx.fillStyle = 'rgba(237,228,211,0.6)'
  ctx.font = '500 30px "Tajawal", sans-serif'
  ctx.fillText('مكتبة طلاقة · Fluentia Library', W / 2, H - 116)

  const blob = await new Promise((res) => c.toBlob(res, 'image/png', 0.95))
  if (!blob) return
  const file = new File([blob], 'fluentia-quote.png', { type: 'image/png' })

  // native share sheet (iOS/Android → WhatsApp etc.); else download
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'اقتباس من مكتبة طلاقة' }); return } catch { /* user cancelled → fall through to download */ }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'fluentia-quote.png'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
