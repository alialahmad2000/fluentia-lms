// Web Audio API sound effects for duels — tiny synthesized sounds, no file downloads

let audioCtx = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function playTone(freq, duration, type = 'sine', volume = 0.3) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = volume
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

export function playTick() {
  playTone(800, 0.05, 'square', 0.1)
}

export function playCorrect() {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime
    ;[523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.value = 0.2
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15 + i * 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + 0.2 + i * 0.08)
    })
  } catch {}
}

export function playWrong() {
  playTone(200, 0.3, 'sawtooth', 0.15)
}

export function playWin() {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime
    ;[523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.value = 0.25
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5 + i * 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + 0.6 + i * 0.12)
    })
  } catch {}
}

export function playLose() {
  try {
    const ctx = getCtx()
    const now = ctx.currentTime
    ;[400, 350, 300].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.value = 0.15
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4 + i * 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + i * 0.15)
      osc.stop(now + 0.5 + i * 0.15)
    })
  } catch {}
}

export function vibrate(ms = 50) {
  try { navigator.vibrate?.(ms) } catch {}
}
