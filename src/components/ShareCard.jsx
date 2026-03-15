import { useState, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Share2, Copy, Check, ExternalLink,
  Flame, Zap, Trophy, Star, Award, BookOpen, Medal,
} from 'lucide-react'
import { ACADEMY } from '../lib/constants'
import { formatDateAr } from '../utils/dateHelpers'
import { shareToWhatsApp, shareToTwitter, copyToClipboard, generateShareText } from '../utils/socialShare'

// ─── Achievement Config ────────────────────────────────────────────────────────
// Maps each `type` prop to display metadata used inside the card.

const ACHIEVEMENT_META = {
  streak: {
    icon: '🔥',
    glowColor: 'rgba(251,146,60,0.55)',
    gradientTop: '#7c1d00',
    gradientMid: '#b84800',
    accentColor: '#fb923c',
    accentColorLight: 'rgba(251,146,60,0.18)',
    label: (data) => `حققت سلسلة ${data.value ?? data.days ?? '?'} يوم متتالي! 🔥`,
    sublabel: () => 'إنجاز الاستمرارية',
  },
  level_up: {
    icon: '🚀',
    glowColor: 'rgba(139,92,246,0.55)',
    gradientTop: '#1e0050',
    gradientMid: '#3b0082',
    accentColor: '#a78bfa',
    accentColorLight: 'rgba(139,92,246,0.18)',
    label: (data) => `ارتقيت إلى مستوى ${data.levelTitle ?? data.level ?? '?'}! 🚀`,
    sublabel: (data) => data.levelTitleAr ? `المستوى ${data.levelTitleAr}` : 'ترقية مستوى',
  },
  badge: {
    icon: '🏅',
    glowColor: 'rgba(212,175,55,0.55)',
    gradientTop: '#1a1100',
    gradientMid: '#3d2c00',
    accentColor: '#D4AF37',
    accentColorLight: 'rgba(212,175,55,0.18)',
    label: (data) => `حصلت على شارة ${data.badgeName ?? data.badge ?? '?'}! 🏅`,
    sublabel: () => 'شارة إنجاز',
  },
  leaderboard: {
    icon: '🏆',
    glowColor: 'rgba(234,179,8,0.55)',
    gradientTop: '#1a1300',
    gradientMid: '#3b2c00',
    accentColor: '#eab308',
    accentColorLight: 'rgba(234,179,8,0.18)',
    label: (data) => `أنا في المركز ${data.rank ?? '?'} على لوحة المتصدرين! 🏆`,
    sublabel: () => 'لوحة المتصدرين',
  },
  quiz: {
    icon: '⭐',
    glowColor: 'rgba(56,189,248,0.55)',
    gradientTop: '#001a2e',
    gradientMid: '#003459',
    accentColor: '#38bdf8',
    accentColorLight: 'rgba(56,189,248,0.18)',
    label: (data) => `حصلت على ${data.score ?? '?'}% في التقييم! ⭐`,
    sublabel: (data) => data.quizType ?? 'إنجاز في التقييم',
  },
  certificate: {
    icon: '🎓',
    glowColor: 'rgba(212,175,55,0.55)',
    gradientTop: '#0f0c29',
    gradientMid: '#1a1040',
    accentColor: '#D4AF37',
    accentColorLight: 'rgba(212,175,55,0.18)',
    label: (data) => `حصلت على شهادة ${data.certTitle ?? data.cert ?? '?'}! 🎓`,
    sublabel: () => 'شهادة معتمدة',
  },
}

// ─── Decorative Star Field (pure CSS/SVG, no lib) ────────────────────────────
function StarField() {
  // Deterministic star positions — 28 stars using a simple LCG seed
  const stars = useMemo(() => {
    const list = []
    let seed = 0x4d2f9a1b
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      return (seed >>> 0) / 0xffffffff
    }
    for (let i = 0; i < 28; i++) {
      list.push({
        x: lcg() * 100,
        y: lcg() * 100,
        r: 0.6 + lcg() * 1.4,
        opacity: 0.15 + lcg() * 0.55,
        delay: lcg() * 3,
      })
    }
    return list
  }, [])

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="white"
          opacity={s.opacity}
          style={{
            animation: `twinkle-${i % 4} ${2 + s.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </svg>
  )
}

// ─── Gold Ornament SVGs ───────────────────────────────────────────────────────
function CornerOrnament({ position, accentColor }) {
  const style = { position: 'absolute', opacity: 0.5 }
  const posMap = {
    'top-right':    { top: 10, right: 10 },
    'top-left':     { top: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 },
    'bottom-left':  { bottom: 10, left: 10 },
  }
  const pathMap = {
    'top-right':    'M2 2 H14 M2 2 V14',
    'top-left':     'M26 2 H14 M26 2 V14',
    'bottom-right': 'M2 26 H14 M2 26 V14',
    'bottom-left':  'M26 26 H14 M26 26 V14',
  }
  const circleMap = {
    'top-right':    [2, 2],
    'top-left':     [26, 2],
    'bottom-right': [2, 26],
    'bottom-left':  [26, 26],
  }
  const [cx, cy] = circleMap[position]

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      style={{ ...style, ...posMap[position] }}
      aria-hidden="true"
    >
      <path d={pathMap[position]} stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2" fill={accentColor} />
    </svg>
  )
}

// ─── Divider with centre gem ──────────────────────────────────────────────────
function GoldDivider({ accentColor }) {
  return (
    <div className="flex items-center gap-2 w-full px-6 my-3">
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to left, transparent, ${accentColor}60)` }}
      />
      <span style={{ color: accentColor, fontSize: 10, lineHeight: 1 }}>✦</span>
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${accentColor}60)` }}
      />
    </div>
  )
}

// ─── The Visual Share Card ────────────────────────────────────────────────────
// This is the screenshot-optimised card — pure inline styles for portability
// in the print window. Fixed 9:16 aspect ratio (Instagram Stories).

export function ShareCardVisual({ type, data, cardRef }) {
  const meta = ACHIEVEMENT_META[type] || ACHIEVEMENT_META.certificate
  const {
    icon, glowColor, gradientTop, gradientMid,
    accentColor, accentColorLight, label, sublabel,
  } = meta

  const labelText  = label(data)
  const sublabelText = sublabel(data)
  const studentName  = data.studentName ?? data.name ?? ''
  const dateText     = data.date
    ? formatDateAr(data.date)
    : formatDateAr(new Date().toISOString())

  // A square variant vs story variant. Default: story (9:16).
  // Pass data.format = 'square' to get 1:1.
  const isSquare = data.format === 'square'

  return (
    <div
      ref={cardRef}
      dir="rtl"
      data-share-card
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: isSquare ? '1 / 1' : '9 / 16',
        background: `linear-gradient(160deg, ${gradientTop} 0%, #302b63 45%, ${gradientMid} 70%, #24243e 100%)`,
        borderRadius: 20,
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        boxSizing: 'border-box',
        // Gold border shimmer
        boxShadow: `inset 0 0 0 1.5px ${accentColor}55, 0 0 60px ${glowColor}`,
      }}
    >
      {/* Twinkling star field */}
      <StarField />

      {/* Ambient radial glow centred on icon area */}
      <div
        style={{
          position: 'absolute',
          top: isSquare ? '15%' : '22%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70%',
          paddingTop: '70%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 68%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Corner ornaments */}
      <CornerOrnament position="top-right"    accentColor={accentColor} />
      <CornerOrnament position="top-left"     accentColor={accentColor} />
      <CornerOrnament position="bottom-right" accentColor={accentColor} />
      <CornerOrnament position="bottom-left"  accentColor={accentColor} />

      {/* Gradient border ring (outer glow strip) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 20,
          pointerEvents: 'none',
          background: `linear-gradient(160deg, ${accentColor}22 0%, transparent 35%, transparent 65%, ${accentColor}18 100%)`,
        }}
      />

      {/* ── Content ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%',
          padding: isSquare ? '5% 7%' : '6% 7%',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        {/* ── TOP: Academy branding ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {/* Logo text lockup */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: accentColorLight,
              border: `1px solid ${accentColor}44`,
              borderRadius: 50,
              padding: '4px 14px',
            }}
          >
            <span style={{ fontSize: '0.75em', color: accentColor, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Fluentia
            </span>
            <span style={{ color: `${accentColor}55`, fontSize: '0.65em' }}>|</span>
            <span style={{ fontSize: '0.72em', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
              أكاديمية طلاقة
            </span>
          </div>

          {/* Sub-label: achievement category */}
          <p
            style={{
              fontSize: '0.6em',
              color: 'rgba(255,255,255,0.38)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            {sublabelText}
          </p>
        </div>

        {/* ── MIDDLE: Big icon + achievement text ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flex: 1, justifyContent: 'center' }}>
          {/* Icon circle with glow */}
          <div
            style={{
              width: isSquare ? '22%' : '28%',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, ${accentColor}dd 0%, ${accentColor}77 55%, ${accentColor}33 100%)`,
              boxShadow: `0 0 0 2px ${accentColor}44, 0 0 30px ${glowColor}, 0 0 60px ${glowColor}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: isSquare ? '4%' : '5%',
              border: `1.5px solid ${accentColor}88`,
              fontSize: isSquare ? '2em' : '2.6em',
            }}
          >
            {icon}
          </div>

          {/* Divider */}
          <GoldDivider accentColor={accentColor} />

          {/* Main achievement text */}
          <h1
            style={{
              fontSize: isSquare ? '1.05em' : '1.12em',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.45,
              letterSpacing: '0.01em',
              margin: '0 4%',
              textShadow: `0 2px 12px rgba(0,0,0,0.6)`,
            }}
          >
            {labelText}
          </h1>

          {/* Student name */}
          {studentName ? (
            <p
              style={{
                marginTop: '4%',
                fontSize: '0.82em',
                color: accentColor,
                fontWeight: 700,
                letterSpacing: '0.03em',
                background: accentColorLight,
                border: `1px solid ${accentColor}33`,
                borderRadius: 50,
                padding: '3px 16px',
              }}
            >
              {studentName}
            </p>
          ) : null}

          {/* Date */}
          <p
            style={{
              marginTop: '3%',
              fontSize: '0.62em',
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.04em',
            }}
          >
            {dateText}
          </p>
        </div>

        {/* ── BOTTOM: Social handles + site ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {/* Thin separator */}
          <div
            style={{
              width: '40%',
              height: 1,
              background: `linear-gradient(to right, transparent, ${accentColor}44, transparent)`,
              marginBottom: 2,
            }}
          />

          {/* Website */}
          <p
            style={{
              fontSize: '0.6em',
              color: accentColor,
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
          >
            {ACADEMY.landing}
          </p>

          {/* Handles row */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: '0.55em', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em' }}>
              {ACADEMY.tiktok}
            </span>
            <span style={{ fontSize: '0.45em', color: `${accentColor}55` }}>●</span>
            <span style={{ fontSize: '0.55em', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.06em' }}>
              {ACADEMY.instagram}
            </span>
          </div>
        </div>
      </div>

      {/* Keyframe animation injected once per card mount */}
      <style>{`
        @keyframes twinkle-0 { 0%,100%{opacity:0.6} 50%{opacity:0.1} }
        @keyframes twinkle-1 { 0%,100%{opacity:0.2} 50%{opacity:0.7} }
        @keyframes twinkle-2 { 0%,100%{opacity:0.4} 50%{opacity:0.08} }
        @keyframes twinkle-3 { 0%,100%{opacity:0.15} 50%{opacity:0.55} }
      `}</style>
    </div>
  )
}

// ─── HTML escape helper ───────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── Print / Save handler ─────────────────────────────────────────────────────
// Opens the card HTML in a new window, injects all its inline styles, and
// triggers window.print(). The user can then "Save as PDF" or "Save to Photos"
// from the browser print dialog — no npm packages required.

function buildPrintHTML({ type, data }) {
  const meta = ACHIEVEMENT_META[type] || ACHIEVEMENT_META.certificate
  const {
    icon, glowColor, gradientTop, gradientMid,
    accentColor, accentColorLight, label, sublabel,
  } = meta

  const labelText    = escHtml(label(data))
  const sublabelText = escHtml(sublabel(data))
  const studentName  = escHtml(data.studentName ?? data.name ?? '')
  const isSquare     = data.format === 'square'
  const dateText     = escHtml(
    data.date ? formatDateAr(data.date) : formatDateAr(new Date().toISOString())
  )

  const cardW = isSquare ? 540 : 405
  const cardH = isSquare ? 540 : 720

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>بطاقة الإنجاز — ${ACADEMY.name_ar}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      background:#0f0c29;
      display:flex;align-items:center;justify-content:center;
      min-height:100vh;
      font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
    }
    .card{
      width:${cardW}px;height:${cardH}px;
      background:linear-gradient(160deg,${gradientTop} 0%,#302b63 45%,${gradientMid} 70%,#24243e 100%);
      border-radius:24px;overflow:hidden;
      position:relative;
      box-shadow:inset 0 0 0 1.5px ${accentColor}55, 0 0 60px ${glowColor};
    }
    .glow{
      position:absolute;top:${isSquare?'12%':'20%'};left:50%;
      transform:translateX(-50%);
      width:68%;padding-top:68%;border-radius:50%;
      background:radial-gradient(circle,${glowColor} 0%,transparent 68%);
      pointer-events:none;
    }
    .content{
      position:relative;z-index:10;
      display:flex;flex-direction:column;
      align-items:center;justify-content:space-between;
      height:100%;padding:${isSquare?'30px 38px':'40px 38px'};
      text-align:center;
    }
    .brand-pill{
      display:flex;align-items:center;gap:10px;
      background:${accentColorLight};
      border:1px solid ${accentColor}44;
      border-radius:50px;padding:5px 18px;
    }
    .brand-pill .en{font-size:13px;color:${accentColor};font-weight:700;letter-spacing:.12em;text-transform:uppercase}
    .brand-pill .sep{color:${accentColor}55;font-size:11px}
    .brand-pill .ar{font-size:12px;color:rgba(255,255,255,.85);font-weight:600}
    .cat{font-size:10px;color:rgba(255,255,255,.35);letter-spacing:.22em;text-transform:uppercase;margin-top:6px}
    .icon-circle{
      width:${isSquare?'110px':'130px'};height:${isSquare?'110px':'130px'};
      border-radius:50%;
      background:radial-gradient(circle at 35% 35%,${accentColor}dd 0%,${accentColor}77 55%,${accentColor}33 100%);
      box-shadow:0 0 0 2px ${accentColor}44, 0 0 30px ${glowColor}, 0 0 60px ${glowColor}66;
      border:1.5px solid ${accentColor}88;
      display:flex;align-items:center;justify-content:center;
      font-size:${isSquare?'3rem':'3.6rem'};
      margin-bottom:${isSquare?'18px':'24px'};
    }
    .divider{display:flex;align-items:center;gap:10px;width:88%;margin-bottom:12px}
    .divider-line{flex:1;height:1px}
    .divider-gem{font-size:10px;color:${accentColor}}
    h1{
      font-size:${isSquare?'1.25rem':'1.35rem'};font-weight:800;color:#fff;
      line-height:1.5;letter-spacing:.01em;
      text-shadow:0 2px 12px rgba(0,0,0,.6);
      margin:0 5%;
    }
    .name-pill{
      margin-top:14px;
      font-size:.82rem;color:${accentColor};font-weight:700;
      background:${accentColorLight};border:1px solid ${accentColor}33;
      border-radius:50px;padding:3px 20px;
    }
    .date{margin-top:10px;font-size:.62rem;color:rgba(255,255,255,.32);letter-spacing:.04em}
    .footer{display:flex;flex-direction:column;align-items:center;gap:5px}
    .site{font-size:.62rem;color:${accentColor};font-weight:600;letter-spacing:.08em}
    .handles{display:flex;gap:14px;align-items:center}
    .handle{font-size:.55rem;color:rgba(255,255,255,.36);letter-spacing:.06em}
    .dot{font-size:.45rem;color:${accentColor}55}
    @keyframes twinkle-0{0%,100%{opacity:.6}50%{opacity:.1}}
    @keyframes twinkle-1{0%,100%{opacity:.2}50%{opacity:.7}}
    @keyframes twinkle-2{0%,100%{opacity:.4}50%{opacity:.08}}
    @keyframes twinkle-3{0%,100%{opacity:.15}50%{opacity:.55}}
    @media print{
      body{background:#0f0c29;min-height:unset}
      .card{box-shadow:none}
    }
  </style>
</head>
<body>
<div class="card">
  <!-- Stars SVG -->
  <svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" viewBox="0 0 100 100" preserveAspectRatio="none">
    ${Array.from({length:28},(_,i)=>{
      let s=0x4d2f9a1b
      const lcg=()=>{s=(s*1664525+1013904223)&0xffffffff;return(s>>>0)/0xffffffff}
      // Re-run the same sequence as StarField
      for(let k=0;k<i;k++){lcg();lcg();lcg();lcg();lcg()}
      const x=lcg()*100,y=lcg()*100,r=0.6+lcg()*1.4,op=0.15+lcg()*0.55,d=lcg()*3
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="white" opacity="${op.toFixed(2)}" style="animation:twinkle-${i%4} ${(2+d).toFixed(1)}s ease-in-out infinite"/>`
    }).join('')}
  </svg>

  <div class="glow"></div>

  <!-- Corners -->
  <svg style="position:absolute;top:10px;right:10px;opacity:.5" width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M2 2 H14 M2 2 V14" stroke="${accentColor}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="2" cy="2" r="2" fill="${accentColor}"/>
  </svg>
  <svg style="position:absolute;top:10px;left:10px;opacity:.5" width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M26 2 H14 M26 2 V14" stroke="${accentColor}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="26" cy="2" r="2" fill="${accentColor}"/>
  </svg>
  <svg style="position:absolute;bottom:10px;right:10px;opacity:.5" width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M2 26 H14 M2 26 V14" stroke="${accentColor}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="2" cy="26" r="2" fill="${accentColor}"/>
  </svg>
  <svg style="position:absolute;bottom:10px;left:10px;opacity:.5" width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M26 26 H14 M26 26 V14" stroke="${accentColor}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="26" cy="26" r="2" fill="${accentColor}"/>
  </svg>

  <div class="content">
    <!-- Top branding -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <div class="brand-pill">
        <span class="en">Fluentia</span>
        <span class="sep">|</span>
        <span class="ar">أكاديمية طلاقة</span>
      </div>
      <p class="cat">${sublabelText}</p>
    </div>

    <!-- Middle -->
    <div style="display:flex;flex-direction:column;align-items:center;flex:1;justify-content:center">
      <div class="icon-circle">${icon}</div>
      <div class="divider">
        <div class="divider-line" style="background:linear-gradient(to left,transparent,${accentColor}60)"></div>
        <span class="divider-gem">✦</span>
        <div class="divider-line" style="background:linear-gradient(to right,transparent,${accentColor}60)"></div>
      </div>
      <h1>${labelText}</h1>
      ${studentName ? `<p class="name-pill">${studentName}</p>` : ''}
      <p class="date">${dateText}</p>
    </div>

    <!-- Bottom -->
    <div class="footer">
      <div style="width:40%;height:1px;background:linear-gradient(to right,transparent,${accentColor}44,transparent);margin-bottom:2px"></div>
      <p class="site">${ACADEMY.landing}</p>
      <div class="handles">
        <span class="handle">${ACADEMY.tiktok}</span>
        <span class="dot">●</span>
        <span class="handle">${ACADEMY.instagram}</span>
      </div>
    </div>
  </div>
</div>
<script>window.onload=()=>{window.print();}<\/script>
</body>
</html>`
}

// ─── Share Text Builder ───────────────────────────────────────────────────────

function buildShareText(type, data) {
  // Map ShareCard type → socialShare.js generateShareText type
  const typeMap = {
    streak:      () => generateShareText('streak',      { days: data.value ?? data.days }),
    level_up:    () => generateShareText('level_up',    { level: data.levelTitle ?? data.level }),
    badge:       () => generateShareText('badge',       { badge: data.badgeName ?? data.badge }),
    leaderboard: () => generateShareText('leaderboard', { rank: data.rank }),
    quiz:        () => generateShareText('quiz_score',  { score: data.score, quiz: data.quizType ?? 'التقييم' }),
    certificate: () => generateShareText('certificate', { cert: data.certTitle ?? data.cert }),
  }
  return (typeMap[type] ?? typeMap.certificate)()
}

// ─── Share Action Buttons ─────────────────────────────────────────────────────

function ShareButtons({ type, data, onCopied }) {
  const [copied, setCopied] = useState(false)
  const shareText = useMemo(() => buildShareText(type, data), [type, data])

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(shareText)
    if (ok) {
      setCopied(true)
      onCopied?.()
      setTimeout(() => setCopied(false), 2200)
    }
  }, [shareText, onCopied])

  const handleWhatsApp = useCallback(() => {
    shareToWhatsApp(shareText)
  }, [shareText])

  const handleTwitter = useCallback(() => {
    shareToTwitter(shareText)
  }, [shareText])

  return (
    <div className="space-y-3">
      {/* Copy row */}
      <div
        className="flex items-center gap-2 rounded-xl p-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="flex-1 text-xs text-muted truncate font-mono leading-relaxed" dir="rtl">
          {shareText.split('\n')[0]}
        </p>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200"
          style={{
            background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(212,175,55,0.12)',
            color:      copied ? '#10b981'                 : '#D4AF37',
            border:     `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(212,175,55,0.25)'}`,
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'تم النسخ' : 'نسخ'}
        </button>
      </div>

      {/* Platform buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-white font-semibold transition-all duration-200 hover:translate-y-[-2px] active:opacity-70"
          style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
        >
          <ExternalLink size={14} />
          WhatsApp
        </button>
        <button
          onClick={handleTwitter}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-white font-semibold transition-all duration-200 hover:translate-y-[-2px] active:opacity-70"
          style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <ExternalLink size={14} />
          X / Twitter
        </button>
      </div>

      {/* Native share (mobile) */}
      {typeof navigator !== 'undefined' && navigator.share && (
        <button
          onClick={() => navigator.share({
            title: 'إنجازي في أكاديمية طلاقة',
            text: shareText,
          }).catch(() => {})}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          مشاركة عبر التطبيقات
        </button>
      )}
    </div>
  )
}

// ─── Main ShareCard Modal ─────────────────────────────────────────────────────

/**
 * ShareCard — Reusable achievement share card modal.
 *
 * Props:
 *   type     {string}   'streak' | 'level_up' | 'badge' | 'leaderboard' | 'quiz' | 'certificate'
 *   data     {object}   Achievement data — see ACHIEVEMENT_META above for per-type fields
 *   visible  {boolean}  Whether the modal is shown
 *   onClose  {function} Called when the user dismisses the modal
 *
 * data shape examples:
 *   streak      : { studentName, value: 30, date? }
 *   level_up    : { studentName, level: 5, levelTitle: 'Skilled', levelTitleAr: 'ماهر', date? }
 *   badge       : { studentName, badgeName: 'ملتزم', date? }
 *   leaderboard : { studentName, rank: 1, date? }
 *   quiz        : { studentName, score: 95, quizType: 'تقييم دوري', date? }
 *   certificate : { studentName, certTitle: 'إتمام مستوى A1', cert: '...', date? }
 *   Any type can include: format: 'square' (default is story 9:16)
 */
export default function ShareCard({ type = 'certificate', data = {}, visible = false, onClose }) {
  const cardRef     = useRef(null)
  const [saving, setSaving] = useState(false)
  const [copiedFeedback, setCopiedFeedback] = useState(false)

  const handleSave = useCallback(() => {
    setSaving(true)
    try {
      const html = buildPrintHTML({ type, data })
      const win = window.open('', '_blank', 'width=520,height=820,menubar=no,toolbar=no')
      if (!win) {
        setSaving(false)
        return
      }
      win.document.write(html)
      win.document.close()
    } catch {
      // Silent fail — nothing critical
    }
    setTimeout(() => setSaving(false), 900)
  }, [type, data])

  const handleCopied = useCallback(() => {
    setCopiedFeedback(true)
    setTimeout(() => setCopiedFeedback(false), 2400)
  }, [])

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.()
  }, [onClose])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="share-card-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
          dir="rtl"
        >
          <motion.div
            key="share-card-panel"
            initial={{ scale: 0.88, opacity: 0, y: 40 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{   scale: 0.88, opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Modal header ── */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}
                >
                  {ACHIEVEMENT_META[type]?.icon ?? '🏆'}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white leading-tight">شارك إنجازك</h2>
                  <p className="text-xs text-muted leading-tight">{ACHIEVEMENT_META[type]?.sublabel(data) ?? 'إنجاز'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-white transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                aria-label="إغلاق"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Card preview ── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                // Constrain the story card to a sensible preview height
                maxHeight: data.format === 'square' ? 320 : 420,
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}
            >
              <ShareCardVisual type={type} data={data} cardRef={cardRef} />
            </div>

            {/* ── Action panel ── */}
            <div
              className="glass-card-raised rounded-2xl p-5 space-y-3"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: saving
                    ? 'rgba(212,175,55,0.08)'
                    : 'linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.10) 100%)',
                  border: '1px solid rgba(212,175,55,0.35)',
                  color: '#D4AF37',
                }}
              >
                <Download size={15} className={saving ? 'animate-bounce' : ''} />
                {saving ? 'جارٍ الفتح...' : 'حفظ الصورة'}
              </button>

              {/* Share buttons */}
              <ShareButtons type={type} data={data} onCopied={handleCopied} />
            </div>

            {/* Copy feedback toast */}
            <AnimatePresence>
              {copiedFeedback && (
                <motion.div
                  key="copy-toast"
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0,  scale: 1 }}
                  exit={{   opacity: 0, y: 8,  scale: 0.95 }}
                  className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium"
                  style={{
                    background: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    color: '#10b981',
                  }}
                >
                  <Check size={13} />
                  تم نسخ رسالة المشاركة
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
