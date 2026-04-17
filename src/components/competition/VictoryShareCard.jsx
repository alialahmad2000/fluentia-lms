import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share2, Loader2, Copy, Check } from 'lucide-react'

const SIZE = 1080

function roundRectCtx(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function loadTajawal() {
  if (document.fonts.check('800 16px Tajawal')) return
  try {
    const defs = [
      ['400', 'Iura6YBj_oCad4k1nzGBCw'],
      ['700', 'Iura6YBj_oCad4k1nzSBDg'],
      ['800', 'Iura6YBj_oCad4k1nzqBDQ'],
    ]
    const loaded = await Promise.all(
      defs.map(([w, h]) =>
        new FontFace('Tajawal', `url('https://fonts.gstatic.com/s/tajawal/v9/${h}.woff2')`, { weight: w }).load()
      )
    )
    loaded.forEach((f) => document.fonts.add(f))
  } catch {}
}

async function generateVictoryImage({ comp, myTeam, myRank, isWinner, isTie }) {
  await loadTajawal()

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  const color = myTeam?.color ?? '#38bdf8'
  const secondColor = '#38bdf8'

  // Dark background
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE)
  bg.addColorStop(0, '#060e1c')
  bg.addColorStop(0.45, '#0a1930')
  bg.addColorStop(1, '#0d1f3c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Subtle glow blobs
  ctx.fillStyle = `${color}14`
  ctx.beginPath()
  ctx.arc(SIZE * 0.12, SIZE * 0.18, 340, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `${color}09`
  ctx.beginPath()
  ctx.arc(SIZE * 0.88, SIZE * 0.82, 280, 0, Math.PI * 2)
  ctx.fill()

  // Top gradient bar
  const barGrad = ctx.createLinearGradient(0, 0, SIZE, 0)
  barGrad.addColorStop(0, color)
  barGrad.addColorStop(1, secondColor)
  ctx.fillStyle = barGrad
  ctx.fillRect(0, 0, SIZE, 10)

  // Academy label
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = "400 38px 'Tajawal', sans-serif"
  ctx.textAlign = 'center'
  ctx.fillText('أكاديمية طلاقة', SIZE / 2, 80)

  // Separator dot line
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  for (let i = 0; i < SIZE; i += 14) {
    ctx.beginPath()
    ctx.arc(i, 100, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Big emoji
  ctx.font = '180px serif'
  ctx.textAlign = 'center'
  ctx.fillText(isWinner ? '🏆' : isTie ? '🤝' : '⚔️', SIZE / 2, 340)

  // Main headline
  ctx.fillStyle = '#ffffff'
  if (isWinner) {
    ctx.font = "800 76px 'Tajawal', sans-serif"
    ctx.fillText('فريقي فاز! 🎉', SIZE / 2, 460)
  } else if (isTie) {
    ctx.font = "800 70px 'Tajawal', sans-serif"
    ctx.fillText('تعادلنا بشرف! 🤝', SIZE / 2, 460)
  } else {
    ctx.font = "800 62px 'Tajawal', sans-serif"
    ctx.fillText('شاركنا في تحدي طلاقة', SIZE / 2, 460)
  }

  // Team name
  const grad2 = ctx.createLinearGradient(0, 500, SIZE, 540)
  grad2.addColorStop(0, color)
  grad2.addColorStop(1, secondColor)
  ctx.fillStyle = grad2
  ctx.font = "700 52px 'Tajawal', sans-serif"
  ctx.fillText(`${myTeam?.emoji ?? ''} ${myTeam?.name ?? ''}`, SIZE / 2, 540)

  // Stat cards
  const stats = [{ label: 'نقاط النصر', value: `${myTeam?.victory_points ?? 0} VP` }]
  if (myRank) stats.push({ label: 'ترتيبي بالفريق', value: `#${myRank}` })

  const slotW = SIZE / stats.length
  stats.forEach((s, i) => {
    const cx = slotW * i + slotW / 2
    const cardX = slotW * i + 70
    const cardW = slotW - 140

    roundRectCtx(ctx, cardX, 600, cardW, 160, 24)
    ctx.fillStyle = `${color}18`
    ctx.fill()
    ctx.strokeStyle = `${color}45`
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = color
    ctx.font = "800 58px 'Tajawal', sans-serif"
    ctx.textAlign = 'center'
    ctx.fillText(s.value, cx, 685)

    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = "400 32px 'Tajawal', sans-serif"
    ctx.fillText(s.label, cx, 740)
  })

  // Competition sub-label
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.font = "400 38px 'Tajawal', sans-serif"
  ctx.textAlign = 'center'
  ctx.fillText('تحدي طلاقة أبريل 2026', SIZE / 2, 840)

  // Watermark
  ctx.fillStyle = barGrad
  ctx.font = "700 44px 'Tajawal', sans-serif"
  ctx.fillText('fluentia.academy', SIZE / 2, 970)

  // Bottom bar
  ctx.fillStyle = barGrad
  ctx.fillRect(0, SIZE - 10, SIZE, 10)

  return canvas.toDataURL('image/png', 0.93)
}

const SHARE_BUTTONS = [
  {
    id: 'whatsapp',
    label: 'واتساب',
    color: '#25D366',
    emoji: '💬',
    getUrl: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: 'twitter',
    label: 'تويتر / X',
    color: '#1DA1F2',
    emoji: '🐦',
    getUrl: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    id: 'snapchat',
    label: 'سناب',
    color: '#FFFC00',
    emoji: '👻',
    getUrl: () => 'https://www.snapchat.com/',
  },
]

export default function VictoryShareCard({ comp, myTeam, myRank, onClose }) {
  const [generating, setGenerating] = useState(true)
  const [dataUrl, setDataUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  const teamKey = myTeam === comp?.team_a ? 'A' : 'B'
  const isWinner = !!comp?.winner_team && comp.winner_team !== 'tie' && comp.winner_team === teamKey
  const isTie = comp?.winner_team === 'tie'

  useEffect(() => {
    let cancelled = false
    generateVictoryImage({ comp, myTeam, myRank, isWinner, isTie })
      .then((url) => { if (!cancelled) { setDataUrl(url); setGenerating(false) } })
      .catch(() => { if (!cancelled) setGenerating(false) })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = useCallback(() => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `fluentia-competition-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [dataUrl])

  const handleNativeShare = useCallback(async () => {
    if (!dataUrl || !navigator.share) return
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'fluentia-victory.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'فريقي في تحدي طلاقة! ⚔️',
          text: 'شارك في تحدي طلاقة أبريل 2026 🏆 fluentia.academy',
        })
      }
    } catch {}
  }, [dataUrl])

  const handleCopy = useCallback(async () => {
    const text = `فريق ${myTeam?.emoji ?? ''} ${myTeam?.name ?? ''} في تحدي طلاقة أبريل 2026 ⚔️\nfluentia.academy`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [myTeam])

  const shareText = `${isWinner ? '🏆 فريقي فاز في تحدي طلاقة أبريل 2026!\n' : '⚔️ شاركت في تحدي طلاقة أبريل 2026\n'}فريق ${myTeam?.emoji ?? ''} ${myTeam?.name ?? ''} — ${myTeam?.victory_points ?? 0} نقطة نصر${myRank ? `\nكنت المركز #${myRank} في فريقي` : ''}\nfluentia.academy`

  return (
    <AnimatePresence>
      <motion.div
        key="share-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            width: '100%',
            maxWidth: 440,
            maxHeight: '92dvh',
            overflowY: 'auto',
            fontFamily: 'Tajawal, sans-serif',
          }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-0">
            <span className="font-bold text-white text-sm">بطاقة الإنجاز</span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]">
              <X size={18} />
            </button>
          </div>

          {/* Preview */}
          <div className="p-4">
            <div
              className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: '#0a1930', aspectRatio: '1 / 1', minHeight: 200 }}
            >
              {generating ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Loader2 size={32} className="animate-spin" />
                  <span className="text-sm">جاري تجهيز البطاقة...</span>
                </div>
              ) : dataUrl ? (
                <img src={dataUrl} alt="victory card" className="w-full h-full object-contain" />
              ) : (
                <div className="text-slate-500 text-sm">فشل تحميل البطاقة</div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-6 space-y-3">
            {/* Download + Native share row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownload}
                disabled={!dataUrl}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' }}
              >
                <Download size={15} />
                حفظ
              </button>
              {navigator.share ? (
                <button
                  onClick={handleNativeShare}
                  disabled={!dataUrl}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-40"
                  style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' }}
                >
                  <Share2 size={15} />
                  مشاركة
                </button>
              ) : (
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                  style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8' }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'تم النسخ' : 'نسخ النص'}
                </button>
              )}
            </div>

            {/* Social share links */}
            <div className="grid grid-cols-3 gap-2">
              {SHARE_BUTTONS.map((btn) => (
                <a
                  key={btn.id}
                  href={btn.getUrl(shareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold"
                  style={{ background: `${btn.color}12`, border: `1px solid ${btn.color}30`, color: btn.color }}
                >
                  <span className="text-lg">{btn.emoji}</span>
                  {btn.label}
                </a>
              ))}
            </div>

            {/* Copy text */}
            {navigator.share && (
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-300"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'تم نسخ النص' : 'نسخ النص فقط'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
