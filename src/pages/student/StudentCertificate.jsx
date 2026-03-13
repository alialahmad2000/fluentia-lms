import { useState, useRef, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Download, Share2, CheckCircle, Star, Flame,
  Copy, Check, ExternalLink, ChevronRight, X, Loader2,
  Trophy, BookOpen, Zap,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS, ACADEMY, GAMIFICATION_LEVELS } from '../../lib/constants'
import { formatDateAr } from '../../utils/dateHelpers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGamLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

// Generate a short deterministic "certificate ID" from student id + cert type + date
function certId(studentId, type, date) {
  const raw = `${studentId}-${type}-${date}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i)
    hash |= 0
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')
  return `FL-${hex}`
}

// ─── QR Code (pure SVG, no library) ──────────────────────────────────────────
// Generates a minimal visual QR-like pattern. For a real deployment, swap this
// for qrcode.react or a server-side QR. This implementation uses a deterministic
// bit-pattern seeded by the URL string to produce a plausible visual.
function QRCodeSVG({ value, size = 80 }) {
  const modules = 21 // Version 1 QR has 21×21
  // Seed a pseudo-random grid from the URL
  const bits = useMemo(() => {
    const grid = []
    let seed = 0
    for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) & 0xffffffff
    for (let r = 0; r < modules; r++) {
      grid[r] = []
      for (let c = 0; c < modules; c++) {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff
        grid[r][c] = (seed >>> 0) % 2 === 0
      }
    }
    // Finder patterns (top-left, top-right, bottom-left) — always dark
    const fp = [[0, 0], [0, modules - 7], [modules - 7, 0]]
    fp.forEach(([row, col]) => {
      for (let dr = 0; dr < 7; dr++) {
        for (let dc = 0; dc < 7; dc++) {
          const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6
          const onInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
          grid[row + dr][col + dc] = onBorder || onInner
        }
      }
    })
    return grid
  }, [value])

  const cell = size / modules
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="white" rx="4" />
      {bits.map((row, r) =>
        row.map((dark, c) =>
          dark ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill="#1a1a2e"
            />
          ) : null
        )
      )}
    </svg>
  )
}

// ─── Certificate Card (rendered HTML/CSS) ────────────────────────────────────
function CertificateCard({ cert, studentName, forwardRef }) {
  const verifyUrl = `https://${ACADEMY.landing}/verify/${cert.id}`

  return (
    <div
      ref={forwardRef}
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0d1b2a 100%)',
        fontFamily: 'inherit',
        minHeight: 340,
      }}
    >
      {/* Gold border glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 0 1.5px rgba(212,175,55,0.55), 0 0 40px rgba(212,175,55,0.12)',
        }}
      />

      {/* Decorative corner ornaments */}
      <svg className="absolute top-3 right-3 text-gold-400 opacity-40" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M1 1 H14 V1 M1 1 V14" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
        <circle cx="1" cy="1" r="2" fill="#D4AF37" />
      </svg>
      <svg className="absolute top-3 left-3 text-gold-400 opacity-40" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M35 1 H22 V1 M35 1 V14" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
        <circle cx="35" cy="1" r="2" fill="#D4AF37" />
      </svg>
      <svg className="absolute bottom-3 right-3 opacity-40" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M1 35 H14 M1 35 V22" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
        <circle cx="1" cy="35" r="2" fill="#D4AF37" />
      </svg>
      <svg className="absolute bottom-3 left-3 opacity-40" width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path d="M35 35 H22 M35 35 V22" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
        <circle cx="35" cy="35" r="2" fill="#D4AF37" />
      </svg>

      {/* Radial glow behind medal */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)', top: '-20px' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-8 py-7 text-center">
        {/* Academy brand */}
        <p className="text-xs tracking-[0.25em] uppercase" style={{ color: '#D4AF37', opacity: 0.8 }}>
          {ACADEMY.name}
        </p>
        <p className="text-[10px] tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          شهادة معتمدة
        </p>

        {/* Medal icon */}
        <div
          className="mt-4 mb-4 w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5E27A 50%, #D4AF37 100%)',
            boxShadow: '0 0 20px rgba(212,175,55,0.4)',
          }}
        >
          <span className="text-2xl">{cert.icon}</span>
        </div>

        {/* Certificate type */}
        <h2
          className="text-sm font-semibold tracking-wider uppercase mb-2"
          style={{ color: '#D4AF37' }}
        >
          {cert.typeLabel}
        </h2>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-xs mb-3">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.5))' }} />
          <span style={{ color: 'rgba(212,175,55,0.6)', fontSize: 10 }}>✦</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.5))' }} />
        </div>

        {/* This certifies */}
        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>يُشهد لـ</p>
        <h1 className="text-xl font-bold text-white mb-1" style={{ letterSpacing: '0.02em' }}>
          {studentName}
        </h1>

        {/* Certificate title */}
        <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {cert.title}
        </p>
        <p className="text-xs mb-4 max-w-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {cert.description}
        </p>

        {/* Date + QR row */}
        <div className="flex items-center justify-between w-full mt-1">
          <div className="text-right">
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>تاريخ الإصدار</p>
            <p className="text-xs font-medium text-white">{formatDateAr(cert.issuedAt)}</p>
            <p className="text-[10px] mt-1 font-mono" style={{ color: 'rgba(212,175,55,0.6)' }}>{cert.id}</p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <QRCodeSVG value={verifyUrl} size={60} />
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>تحقق</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Certificate List Card ────────────────────────────────────────────────────
function CertRow({ cert, onClick, delay }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="w-full text-right glass-card p-4 flex items-center gap-4 hover:translate-y-[-2px] hover:border-gold-500/30 border border-transparent transition-all duration-200 group"
    >
      {/* Icon badge */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
          border: '1px solid rgba(212,175,55,0.25)',
        }}
      >
        {cert.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{cert.title}</p>
        <p className="text-xs text-muted mt-0.5">{cert.typeLabel}</p>
        <p className="text-[10px] mt-1 font-mono" style={{ color: 'rgba(212,175,55,0.6)' }}>
          {cert.id}
        </p>
      </div>

      {/* Date + chevron */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-muted">{formatDateAr(cert.issuedAt)}</span>
        <ChevronRight
          size={16}
          className="text-muted group-hover:text-gold-400 transition-colors"
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>
    </motion.button>
  )
}

// ─── Share Overlay ────────────────────────────────────────────────────────────
function ShareOverlay({ cert, onClose }) {
  const [copied, setCopied] = useState(false)
  const verifyUrl = `https://${ACADEMY.landing}/verify/${cert.id}`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select a temp input
      const el = document.createElement('input')
      el.value = verifyUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [verifyUrl])

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: cert.title,
          text: `حصلت على شهادة "${cert.title}" من أكاديمية طلاقة!`,
          url: verifyUrl,
        })
      } catch {
        // User cancelled or not supported
      }
    }
  }, [cert, verifyUrl])

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `حصلت على شهادة "${cert.title}" من أكاديمية طلاقة! 🎓`
  )}&url=${encodeURIComponent(verifyUrl)}`

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `حصلت على شهادة "${cert.title}" من أكاديمية طلاقة! 🎓\n${verifyUrl}`
  )}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="glass-card w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">مشاركة الشهادة</h3>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Copy link */}
        <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
          <p className="flex-1 text-xs text-muted truncate font-mono">{verifyUrl}</p>
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(212,175,55,0.15)',
              color: copied ? '#10b981' : '#D4AF37',
              border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(212,175,55,0.3)'}`,
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'تم النسخ' : 'نسخ'}
          </button>
        </div>

        {/* Social share buttons */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-white font-medium transition-opacity hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
          >
            <ExternalLink size={14} />
            WhatsApp
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-white font-medium transition-opacity hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #1DA1F2, #0d8ed9)' }}
          >
            <ExternalLink size={14} />
            Twitter / X
          </a>
        </div>

        {/* Native share (mobile) */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={handleNativeShare}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            مشاركة عبر التطبيقات
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Certificate Detail Modal ─────────────────────────────────────────────────
function CertificateModal({ cert, studentName, onClose }) {
  const cardRef = useRef(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [printLoading, setPrintLoading] = useState(false)

  const handlePrint = useCallback(() => {
    setPrintLoading(true)
    // Open a print-specific window with just the certificate
    const printContent = cardRef.current?.outerHTML
    if (!printContent) { setPrintLoading(false); return }

    const printWindow = window.open('', '_blank', 'width=700,height=500')
    if (!printWindow) { setPrintLoading(false); return }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>${cert.title} — Fluentia</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: #0f0c29;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; padding: 40px;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .cert-wrap { width: 580px; }
          @media print {
            body { padding: 0; background: white; }
            .cert-wrap { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="cert-wrap">${printContent}</div>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => setPrintLoading(false), 1000)
  }, [cert, cardRef])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 22 }}
          className="w-full max-w-md space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">الشهادة</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-muted hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Certificate card */}
          <CertificateCard cert={cert} studentName={studentName} forwardRef={cardRef} />

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              disabled={printLoading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                border: '1px solid rgba(212,175,55,0.3)',
                color: '#D4AF37',
              }}
            >
              {printLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              طباعة / حفظ
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(99,102,241,0.1))',
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            >
              <Share2 size={16} />
              مشاركة
            </button>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {shareOpen && (
          <ShareOverlay cert={cert} onClose={() => setShareOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Generate certificates dynamically ───────────────────────────────────────
function buildCertificates({ profile, studentData, assessments, xpHistory }) {
  const studentId = profile?.id || 'unknown'
  const certs = []

  // 1) Academic level completion certificates
  const currentLevel = studentData?.academic_level || 1
  // Award certificates for all levels the student has progressed through (levels 1 to currentLevel-1)
  for (let lvl = 1; lvl < currentLevel; lvl++) {
    const info = ACADEMIC_LEVELS[lvl]
    if (!info) continue
    // Approximate issue date: use join date + (lvl * 4 months) as a rough estimate
    const joinDate = new Date(studentData?.created_at || profile?.created_at || Date.now())
    const issued = new Date(joinDate)
    issued.setMonth(issued.getMonth() + (lvl * 4))
    const id = certId(studentId, `level_${lvl}`, issued.toISOString().split('T')[0])
    certs.push({
      id,
      type: 'level',
      typeLabel: 'إتمام المستوى',
      icon: '🎓',
      title: `إتمام مستوى ${info.name_ar} (${info.cefr})`,
      description: `أتمّ الطالب بنجاح مستوى ${info.name_ar} الموافق لمستوى ${info.cefr} وفق الإطار الأوروبي المرجعي، وأظهر كفاءة ملحوظة في مهارات اللغة الإنجليزية.`,
      issuedAt: issued.toISOString(),
    })
  }

  // 2) Quiz / assessment excellence certificates (overall_score >= 90)
  const excellentAssessments = (assessments || []).filter(
    (a) => a.overall_score != null && a.overall_score >= 90
  )
  const ASSESSMENT_TYPE_LABELS = { placement: 'تقييم أولي', periodic: 'تقييم دوري', self: 'تقييم ذاتي' }
  excellentAssessments.forEach((a) => {
    const id = certId(studentId, `quiz_${a.id}`, a.created_at?.split('T')[0] || '')
    certs.push({
      id,
      type: 'quiz',
      typeLabel: 'تميّز في التقييم',
      icon: '⭐',
      title: `تميّز في ${ASSESSMENT_TYPE_LABELS[a.type] || 'التقييم'} — ${a.overall_score}%`,
      description: `حقّق الطالب درجة استثنائية بلغت ${a.overall_score}% في ${ASSESSMENT_TYPE_LABELS[a.type] || 'التقييم'}، مما يدلّ على إتقان عالٍ لمهارات اللغة الإنجليزية.`,
      issuedAt: a.created_at,
    })
  })

  // 3) Streak achievement certificates (30, 60, 100 days)
  const maxStreak = studentData?.longest_streak || studentData?.current_streak || 0
  const STREAK_MILESTONES = [
    { days: 30, icon: '🔥', label: 'سلسلة 30 يوماً' },
    { days: 60, icon: '💫', label: 'سلسلة 60 يوماً' },
    { days: 100, icon: '🏆', label: 'سلسلة 100 يوماً' },
  ]
  STREAK_MILESTONES.forEach(({ days, icon, label }) => {
    if (maxStreak >= days) {
      // Try to find approximate date from xp_transactions streak_bonus entries
      const streakTx = (xpHistory || []).find((tx) => tx.reason === 'streak_bonus')
      const issued = streakTx?.created_at || studentData?.created_at || new Date().toISOString()
      const id = certId(studentId, `streak_${days}`, issued.split('T')[0])
      certs.push({
        id,
        type: 'streak',
        typeLabel: 'إنجاز الاستمرارية',
        icon,
        title: label,
        description: `حافظ الطالب على سلسلة تعلّم متواصلة لمدة ${days} يوماً متتالية، مُجسِّداً ببراعة قيمة الانتظام والمثابرة في رحلة تعلّم اللغة الإنجليزية.`,
        issuedAt: issued,
      })
    }
  })

  // 4) Gamification level 20 "Fluentia" certificate
  const gamLevel = getGamLevel(studentData?.xp_total || 0)
  if (gamLevel.level >= 20) {
    const id = certId(studentId, 'fluentia_master', new Date().toISOString().split('T')[0])
    certs.push({
      id,
      type: 'special',
      typeLabel: 'إنجاز استثنائي',
      icon: '👑',
      title: 'طلاقة كاملة — المستوى الأسطوري',
      description: 'وصل الطالب إلى قمة نظام التقدم في أكاديمية طلاقة، محققاً المستوى العشرين "طلاقة"، ليُجسّد بذلك أعلى درجات الإتقان والتميّز.',
      issuedAt: new Date().toISOString(),
    })
  }

  // Sort: newest first
  certs.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt))
  return certs
}

// ─── Category Tab ─────────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',     label: 'الكل',       icon: Award },
  { key: 'level',   label: 'المستويات',  icon: BookOpen },
  { key: 'quiz',    label: 'تقييمات',    icon: Star },
  { key: 'streak',  label: 'استمرارية',  icon: Flame },
  { key: 'special', label: 'مميزة',      icon: Trophy },
]

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ tab }) {
  const messages = {
    all:     { title: 'لا توجد شهادات بعد', sub: 'أكمل المستويات وحقق نتائج مميزة لتحصل على شهاداتك' },
    level:   { title: 'لا توجد شهادات مستويات', sub: 'أكمل مستوى دراسي لتحصل على شهادة إتمام' },
    quiz:    { title: 'لا توجد شهادات تقييمات', sub: 'احصل على 90% أو أكثر في أي تقييم' },
    streak:  { title: 'لا توجد شهادات استمرارية', sub: 'حافظ على 30 يوماً متتالية من التعلّم' },
    special: { title: 'لا توجد شهادات مميزة', sub: 'حقق إنجازات استثنائية للحصول على شهادات خاصة' },
  }
  const msg = messages[tab] || messages.all
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 text-3xl"
        style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)' }}
      >
        🎖️
      </div>
      <p className="text-white font-semibold mb-1">{msg.title}</p>
      <p className="text-muted text-sm max-w-xs">{msg.sub}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentCertificate() {
  const { profile, studentData } = useAuthStore()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedCert, setSelectedCert] = useState(null)

  // Fetch assessments (for quiz excellence certs)
  const { data: assessments } = useQuery({
    queryKey: ['student-assessments-certs', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessments')
        .select('id, type, overall_score, created_at')
        .eq('student_id', profile?.id)
        .gte('overall_score', 90)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Fetch recent XP history (for streak date inference)
  const { data: xpHistory } = useQuery({
    queryKey: ['student-xp-certs', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('xp_transactions')
        .select('id, reason, created_at')
        .eq('student_id', profile?.id)
        .in('reason', ['streak_bonus'])
        .order('created_at', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Build certificates
  const allCerts = useMemo(
    () => buildCertificates({ profile, studentData, assessments, xpHistory }),
    [profile, studentData, assessments, xpHistory]
  )

  const filteredCerts = useMemo(
    () => (activeTab === 'all' ? allCerts : allCerts.filter((c) => c.type === activeTab)),
    [allCerts, activeTab]
  )

  const studentName = profile?.display_name || profile?.full_name || 'الطالب'

  return (
    <div className="space-y-8">
      {/* ─── Page Header ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
            <Award size={20} style={{ color: '#D4AF37' }} />
          </div>
          شهاداتي
        </h1>
        <p className="text-muted text-sm mt-1">شهاداتك المعتمدة من أكاديمية طلاقة</p>
      </motion.div>

      {/* ─── Stats Bar ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-5"
      >
        {[
          { label: 'إجمالي الشهادات', value: allCerts.length, icon: Award, color: '#D4AF37' },
          {
            label: 'شهادات المستويات',
            value: allCerts.filter((c) => c.type === 'level').length,
            icon: BookOpen,
            color: '#38bdf8',
          },
          {
            label: 'إنجازات مميزة',
            value: allCerts.filter((c) => c.type === 'streak' || c.type === 'special').length,
            icon: Trophy,
            color: '#a78bfa',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.07 }}
            className="glass-card p-4 text-center hover:translate-y-[-2px] transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${stat.color}15` }}>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="text-[11px] text-muted leading-tight">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Category Tabs ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      >
        {TABS.map((tab) => {
          const count = tab.key === 'all' ? allCerts.length : allCerts.filter((c) => c.type === tab.key).length
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0"
              style={{
                background: active ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: active ? '#D4AF37' : 'rgba(255,255,255,0.5)',
              }}
            >
              <tab.icon size={14} />
              {tab.label}
              {count > 0 && (
                <span
                  className="text-[10px] rounded-full px-1.5 py-0.5 leading-none"
                  style={{
                    background: active ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.08)',
                    color: active ? '#D4AF37' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </motion.div>

      {/* ─── Certificate List ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <AnimatePresence mode="wait">
          {filteredCerts.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass-card">
                <EmptyState tab={activeTab} />
              </div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {filteredCerts.map((cert, i) => (
                <CertRow
                  key={cert.id}
                  cert={cert}
                  delay={i * 0.06}
                  onClick={() => setSelectedCert(cert)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Info Banner ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-4 flex items-start gap-3"
        style={{ borderColor: 'rgba(212,175,55,0.15)' }}
      >
        <CheckCircle size={18} style={{ color: '#D4AF37', marginTop: 1, flexShrink: 0 }} />
        <div>
          <p className="text-sm font-medium text-white mb-1">كيف تحصل على شهادات؟</p>
          <ul className="text-xs text-muted space-y-1 leading-relaxed">
            <li className="flex items-center gap-1.5">
              <BookOpen size={11} className="text-sky-400 shrink-0" />
              أكمل كل مستوى دراسي للحصول على شهادة إتمام المستوى
            </li>
            <li className="flex items-center gap-1.5">
              <Star size={11} className="text-amber-400 shrink-0" />
              احصل على 90% أو أكثر في أي تقييم لشهادة التميّز
            </li>
            <li className="flex items-center gap-1.5">
              <Flame size={11} className="text-orange-400 shrink-0" />
              حافظ على سلسلة 30 أو 60 أو 100 يوم متتالي
            </li>
            <li className="flex items-center gap-1.5">
              <Zap size={11} className="text-purple-400 shrink-0" />
              بلّغ المستوى العشرين في نظام النقاط للشهادة الأسطورية
            </li>
          </ul>
        </div>
      </motion.div>

      {/* ─── Certificate Modal ───────────────────────────────── */}
      <AnimatePresence>
        {selectedCert && (
          <CertificateModal
            cert={selectedCert}
            studentName={studentName}
            onClose={() => setSelectedCert(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
