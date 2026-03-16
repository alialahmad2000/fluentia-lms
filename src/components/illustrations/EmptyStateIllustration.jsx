import { motion } from 'framer-motion'

/**
 * Reusable SVG illustrations for empty states.
 * Variants: 'no-data', 'coming-soon', 'no-results', 'success', 'error', 'writing', 'speaking'
 */
const ILLUSTRATIONS = {
  'no-data': NoDataIllustration,
  'coming-soon': ComingSoonIllustration,
  'no-results': NoResultsIllustration,
  'success': SuccessIllustration,
  'writing': WritingIllustration,
  'speaking': SpeakingIllustration,
}

export default function EmptyStateIllustration({ variant = 'no-data', size = 160, className = '' }) {
  const Component = ILLUSTRATIONS[variant] || ILLUSTRATIONS['no-data']
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      <Component size={size} />
    </motion.div>
  )
}

function NoDataIllustration({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Floating circles background */}
      <circle cx="100" cy="100" r="80" fill="url(#nodata-bg)" opacity="0.15" />
      <circle cx="60" cy="60" r="8" fill="var(--accent-sky)" opacity="0.2">
        <animate attributeName="cy" values="60;55;60" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="80" r="5" fill="var(--accent-violet)" opacity="0.25">
        <animate attributeName="cy" values="80;75;80" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="45" cy="140" r="6" fill="var(--accent-gold)" opacity="0.2">
        <animate attributeName="cy" values="140;135;140" dur="3.5s" repeatCount="indefinite" />
      </circle>
      {/* Folder / document shape */}
      <rect x="55" y="70" width="90" height="70" rx="8" fill="var(--surface-raised)" stroke="var(--border-default)" strokeWidth="1.5" />
      <rect x="55" y="62" width="40" height="16" rx="6" fill="var(--surface-raised)" stroke="var(--border-default)" strokeWidth="1.5" />
      {/* Lines on document */}
      <rect x="70" y="90" width="60" height="4" rx="2" fill="var(--accent-sky)" opacity="0.3" />
      <rect x="70" y="100" width="45" height="4" rx="2" fill="var(--accent-violet)" opacity="0.2" />
      <rect x="70" y="110" width="50" height="4" rx="2" fill="var(--accent-sky)" opacity="0.15" />
      <rect x="70" y="120" width="30" height="4" rx="2" fill="var(--accent-violet)" opacity="0.1" />
      <defs>
        <radialGradient id="nodata-bg" cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="var(--accent-sky)" />
          <stop offset="1" stopColor="var(--accent-violet)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function ComingSoonIllustration({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="75" fill="url(#cs-bg)" opacity="0.12" />
      {/* Rocket body */}
      <g transform="translate(100, 100)">
        <animateTransform attributeName="transform" type="translate" values="100,100;100,94;100,100" dur="2.5s" repeatCount="indefinite" />
        {/* Body */}
        <ellipse cx="0" cy="-5" rx="18" ry="35" fill="var(--surface-raised)" stroke="var(--accent-sky)" strokeWidth="1.5" opacity="0.9" />
        {/* Window */}
        <circle cx="0" cy="-12" r="7" fill="var(--accent-sky)" opacity="0.3" />
        <circle cx="0" cy="-12" r="4" fill="var(--accent-sky)" opacity="0.5" />
        {/* Fins */}
        <path d="M-18 20 L-12 5 L-10 20 Z" fill="var(--accent-violet)" opacity="0.5" />
        <path d="M18 20 L12 5 L10 20 Z" fill="var(--accent-violet)" opacity="0.5" />
        {/* Flame */}
        <ellipse cx="0" cy="32" rx="8" ry="12" fill="var(--accent-gold)" opacity="0.4">
          <animate attributeName="ry" values="12;15;12" dur="0.3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.6;0.4" dur="0.3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="0" cy="30" rx="4" ry="8" fill="var(--accent-gold)" opacity="0.6">
          <animate attributeName="ry" values="8;10;8" dur="0.25s" repeatCount="indefinite" />
        </ellipse>
      </g>
      {/* Stars */}
      <circle cx="40" cy="50" r="2" fill="var(--accent-sky)" opacity="0.5">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="160" cy="40" r="2" fill="var(--accent-violet)" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="30" cy="140" r="1.5" fill="var(--accent-gold)" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="170" cy="130" r="2" fill="var(--accent-sky)" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <defs>
        <radialGradient id="cs-bg" cx="0.5" cy="0.4" r="0.5">
          <stop stopColor="var(--accent-violet)" />
          <stop offset="1" stopColor="var(--accent-sky)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function NoResultsIllustration({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="url(#nr-bg)" opacity="0.1" />
      {/* Magnifying glass */}
      <circle cx="90" cy="85" r="30" fill="none" stroke="var(--accent-sky)" strokeWidth="3" opacity="0.5" />
      <line x1="112" y1="107" x2="140" y2="135" stroke="var(--accent-sky)" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      {/* Question mark inside */}
      <text x="90" y="93" textAnchor="middle" fontSize="28" fill="var(--accent-sky)" opacity="0.4" fontFamily="Tajawal, sans-serif" fontWeight="700">?</text>
      {/* Floating dots */}
      <circle cx="50" cy="50" r="3" fill="var(--accent-violet)" opacity="0.3">
        <animate attributeName="cy" values="50;45;50" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="155" cy="60" r="2" fill="var(--accent-gold)" opacity="0.3">
        <animate attributeName="cy" values="60;55;60" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <defs>
        <radialGradient id="nr-bg" cx="0.4" cy="0.4" r="0.5">
          <stop stopColor="var(--accent-sky)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function SuccessIllustration({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="url(#suc-bg)" opacity="0.15" />
      {/* Check circle */}
      <circle cx="100" cy="95" r="40" fill="var(--accent-emerald)" opacity="0.12" stroke="var(--accent-emerald)" strokeWidth="2" opacity="0.4" />
      <path d="M80 95 L93 108 L120 81" stroke="var(--accent-emerald)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      {/* Confetti particles */}
      <rect x="50" y="55" width="6" height="6" rx="1" fill="var(--accent-sky)" opacity="0.5" transform="rotate(25 53 58)">
        <animate attributeName="y" values="55;50;55" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="140" y="50" width="5" height="5" rx="1" fill="var(--accent-gold)" opacity="0.4" transform="rotate(-15 142 52)">
        <animate attributeName="y" values="50;45;50" dur="2.3s" repeatCount="indefinite" />
      </rect>
      <circle cx="55" cy="130" r="3" fill="var(--accent-violet)" opacity="0.3">
        <animate attributeName="cy" values="130;125;130" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="125" r="4" fill="var(--accent-sky)" opacity="0.25">
        <animate attributeName="cy" values="125;120;125" dur="2s" repeatCount="indefinite" />
      </circle>
      <defs>
        <radialGradient id="suc-bg" cx="0.5" cy="0.45" r="0.5">
          <stop stopColor="var(--accent-emerald)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function WritingIllustration({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="url(#wr-bg)" opacity="0.12" />
      {/* Paper */}
      <rect x="50" y="50" width="80" height="100" rx="6" fill="var(--surface-raised)" stroke="var(--border-default)" strokeWidth="1.5" />
      {/* Lines */}
      <rect x="62" y="68" width="55" height="3" rx="1.5" fill="var(--accent-sky)" opacity="0.3" />
      <rect x="62" y="78" width="45" height="3" rx="1.5" fill="var(--accent-violet)" opacity="0.2" />
      <rect x="62" y="88" width="50" height="3" rx="1.5" fill="var(--accent-sky)" opacity="0.25" />
      <rect x="62" y="98" width="35" height="3" rx="1.5" fill="var(--accent-violet)" opacity="0.15" />
      <rect x="62" y="108" width="42" height="3" rx="1.5" fill="var(--accent-sky)" opacity="0.2" />
      {/* Pen */}
      <g transform="translate(135, 75) rotate(-30)">
        <animateTransform attributeName="transform" type="translate" values="135,75;135,73;135,75" dur="2s" repeatCount="indefinite" additive="replace" />
        <rect x="-3" y="-25" width="6" height="40" rx="2" fill="var(--accent-violet)" opacity="0.7" />
        <polygon points="-3,15 3,15 0,22" fill="var(--accent-gold)" opacity="0.6" />
      </g>
      {/* Sparkle */}
      <circle cx="155" cy="55" r="3" fill="var(--accent-gold)" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="40" cy="130" r="2" fill="var(--accent-sky)" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <defs>
        <radialGradient id="wr-bg" cx="0.4" cy="0.4" r="0.5">
          <stop stopColor="var(--accent-violet)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  )
}

function SpeakingIllustration({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="url(#sp-bg)" opacity="0.1" />
      {/* Microphone */}
      <rect x="88" y="60" width="24" height="45" rx="12" fill="var(--surface-raised)" stroke="var(--accent-violet)" strokeWidth="2" opacity="0.8" />
      {/* Stand */}
      <path d="M80 95 C80 115 120 115 120 95" fill="none" stroke="var(--accent-violet)" strokeWidth="2" opacity="0.5" />
      <line x1="100" y1="115" x2="100" y2="135" stroke="var(--accent-violet)" strokeWidth="2" opacity="0.5" />
      <line x1="85" y1="135" x2="115" y2="135" stroke="var(--accent-violet)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      {/* Sound waves */}
      <path d="M125 70 C130 75 130 90 125 95" fill="none" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1.5s" repeatCount="indefinite" />
      </path>
      <path d="M135 62 C143 72 143 93 135 103" fill="none" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.5;0.25" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
      </path>
      <path d="M75 70 C70 75 70 90 75 95" fill="none" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1.5s" repeatCount="indefinite" />
      </path>
      <path d="M65 62 C57 72 57 93 65 103" fill="none" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.5;0.25" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
      </path>
      <defs>
        <radialGradient id="sp-bg" cx="0.5" cy="0.4" r="0.5">
          <stop stopColor="var(--accent-violet)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  )
}
