// canvas-confetti (~24 kB) loads on demand and is warmed during idle, so it
// stays out of the entry chunk. Worst case a celebration's FIRST burst arrives
// ~100 ms late; visuals are otherwise identical.
let _confetti = null
function withConfetti(fn) {
  if (_confetti) { fn(_confetti); return }
  import('canvas-confetti').then((m) => { _confetti = m.default; fn(_confetti) }).catch(() => {})
}
if (typeof window !== 'undefined') {
  const warm = () => import('canvas-confetti').then((m) => { _confetti = m.default }).catch(() => {})
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 5000 })
  else setTimeout(warm, 3000)
}

// ===== SOUND PREFERENCE =====
function isSoundEnabled() {
  return localStorage.getItem('fluentia_sounds') !== 'off'
}

function isReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// ===== CONFETTI EFFECTS =====
export const celebrations = {
  // Small burst — XP gain, correct answer
  sparkle: () => {
    if (isReducedMotion()) return
    withConfetti((confetti) => {
      confetti({
        particleCount: 30,
        spread: 60,
        startVelocity: 20,
        gravity: 0.8,
        colors: ['#38bdf8', '#818cf8', '#c084fc'],
        disableForReducedMotion: true,
      })
    })
  },

  // Medium — assignment submitted, word mastered
  burst: () => {
    if (isReducedMotion()) return
    withConfetti((confetti) => {
      confetti({
        particleCount: 60,
        spread: 80,
        startVelocity: 25,
        colors: ['#38bdf8', '#818cf8', '#fbbf24', '#34d399'],
        disableForReducedMotion: true,
      })
    })
  },

  // Big — streak milestone, level up, all words mastered
  fireworks: () => {
    if (isReducedMotion()) return
    withConfetti((confetti) => {
      const end = Date.now() + 2000
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval)
        confetti({
          particleCount: 40,
          startVelocity: 30,
          spread: 360,
          origin: { x: Math.random(), y: Math.random() * 0.4 },
          colors: ['#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#818cf8'],
          disableForReducedMotion: true,
        })
      }, 300)
    })
  },

  // Gold rain — achievement unlocked, star earned
  goldRain: () => {
    if (isReducedMotion()) return
    withConfetti((confetti) => {
      confetti({
        particleCount: 80,
        spread: 120,
        startVelocity: 35,
        gravity: 0.6,
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#fde68a'],
        shapes: ['circle'],
        disableForReducedMotion: true,
      })
    })
  },

  // Side cannons — big win (both sides)
  cannons: () => {
    if (isReducedMotion()) return
    withConfetti((confetti) => {
      const defaults = { startVelocity: 35, spread: 55, colors: ['#38bdf8', '#fbbf24', '#34d399', '#f472b6'] }
      confetti({ ...defaults, particleCount: 40, origin: { x: 0, y: 0.7 }, angle: 60 })
      confetti({ ...defaults, particleCount: 40, origin: { x: 1, y: 0.7 }, angle: 120 })
    })
  },
}

// ===== SOUND EFFECTS (Web Audio API) =====
let audioContext = null
function getAudioContext() {
  if (!audioContext && typeof window !== 'undefined') {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch {}
  }
  // Resume if the engine started the context suspended (Safari often does even
  // when constructed inside a click — autoplay policy + user-activation timing).
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }
  return audioContext
}

export const sounds = {
  // Quick beep for XP gain
  xpGain: () => {
    const ctx = getAudioContext()
    if (!ctx || !isSoundEnabled()) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } catch {}
  },

  // Success chime (ascending C-E-G)
  success: () => {
    const ctx = getAudioContext()
    if (!ctx || !isSoundEnabled()) return
    try {
      ;[523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12)
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.25)
        osc.start(ctx.currentTime + i * 0.12)
        osc.stop(ctx.currentTime + i * 0.12 + 0.25)
      })
    } catch {}
  },

  // Achievement fanfare (full chord)
  achievement: () => {
    const ctx = getAudioContext()
    if (!ctx || !isSoundEnabled()) return
    try {
      ;[523, 659, 784, 1047].forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)
      })
    } catch {}
  },
}

// ===== MAIN CELEBRATE FUNCTION =====
export function celebrate(eventType) {
  switch (eventType) {
    case 'xp_gain':
      sounds.xpGain()
      break
    case 'correct_answer':
      sounds.xpGain()
      break
    case 'assignment_submitted':
      sounds.success()
      celebrations.burst()
      break
    case 'writing_submitted':
      sounds.success()
      celebrations.burst()
      break
    case 'speaking_uploaded':
      sounds.success()
      celebrations.sparkle()
      break
    case 'word_mastered':
      sounds.xpGain()
      celebrations.sparkle()
      break
    case 'all_words_mastered':
      sounds.achievement()
      celebrations.goldRain()
      break
    case 'grammar_complete':
      sounds.success()
      celebrations.burst()
      break
    case 'streak_milestone':
      sounds.achievement()
      celebrations.fireworks()
      break
    case 'level_up':
      sounds.achievement()
      celebrations.cannons()
      break
    case 'star_earned':
      sounds.success()
      celebrations.goldRain()
      break
    case 'achievement_unlocked':
      sounds.achievement()
      celebrations.cannons()
      break
    case 'unit_complete':
      sounds.achievement()
      celebrations.fireworks()
      break
    default:
      sounds.success()
      celebrations.sparkle()
  }
}

// ===== SAFE WRAPPER =====
export function safeCelebrate(eventType) {
  try {
    if (isReducedMotion()) return
    celebrate(eventType)
  } catch (e) {
    console.warn('Celebration failed:', e)
  }
}
