// AUDIO DEBUG OVERLAY (prompt 15) — flag-gated diagnostic, students never see it.
//
// Renders ONLY when the listening player decides `?debug=audio` is in the URL.
// It OBSERVES the real <audio> element the play button controls (via the same
// audioRef) and prints its live state every 250ms, plus an on-screen VERDICT and
// four one-tap tests. It does NOT touch the player's playback logic.
//
// Positioned at the TOP of the screen on purpose: the listening player is a fixed
// BOTTOM bar, so a bottom overlay would cover the Play button Ali needs to press.
import { useEffect, useState, useRef } from 'react'

const btn = {
  background: '#1f2937',
  color: '#9effa0',
  border: '1px solid #374151',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  cursor: 'pointer',
}

export function AudioDebugOverlay({ audioRef, audioUrl, wordPronInfo }) {
  const [state, setState] = useState({})
  const freshRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => {
      const a = audioRef?.current
      if (!a) {
        setState({ element: 'NULL — no <audio> ref' })
        return
      }
      setState({
        src: a.currentSrc || a.src || '(none)',
        muted: a.muted,
        volume: a.volume,
        defaultMuted: a.defaultMuted,
        paused: a.paused,
        currentTime: Number(a.currentTime).toFixed(2),
        duration: isNaN(a.duration) ? 'NaN' : Number(a.duration).toFixed(2),
        readyState: a.readyState, // 0..4 (>=2 to play, 4 = enough data)
        networkState: a.networkState, // 0..3
        error: a.error ? `code ${a.error.code}: ${a.error.message}` : 'none',
        playbackRate: a.playbackRate,
        sinkId: a.sinkId ?? '(default output)',
      })
    }, 250)
    return () => clearInterval(id)
  }, [audioRef])

  // VERDICT — interpret the live state in plain words on screen.
  const verdict = (() => {
    const a = audioRef?.current
    if (!a) return '❌ No audio element found (ref is null).'
    if (a.muted) return '🔇 ELEMENT IS MUTED — this is the cause. Tap "Force Unmute".'
    if (a.volume === 0) return '🔇 VOLUME IS 0 — this is the cause. Tap "Force Volume 100%".'
    if (a.error) return `❌ Audio error code ${a.error.code}. Not a mute issue — load/decode problem.`
    if (a.readyState < 2) return '⏳ Not enough data loaded (readyState < 2) — load/network problem, not mute.'
    if (!a.paused && parseFloat(a.currentTime) > 0)
      return '✅ Element IS playing with sound enabled (not muted, volume>0, time advancing). If you hear nothing, the silence is DOWNSTREAM: Safari per-tab mute, or output routing. Tap "Test Beep" → if the beep is also silent, it is Safari tab mute / output, NOT the app.'
    return 'ℹ️ Press the listening Play button (bottom bar) and watch currentTime here.'
  })()

  const forceUnmute = () => {
    const a = audioRef?.current
    if (a) {
      a.muted = false
      a.volume = 1
    }
  }
  const forceVolume = () => {
    const a = audioRef?.current
    if (a) a.volume = 1
  }

  // Test beep via Web Audio — proves whether ANY audio output reaches the speakers
  // in this tab (independent of the <audio> element).
  const testBeep = async () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      const ctx = new Ctx()
      if (ctx.state === 'suspended') await ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      gain.gain.value = 0.2
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 440
      osc.start()
      osc.stop(ctx.currentTime + 0.6)
    } catch (e) {
      alert('Beep failed: ' + e.message)
    }
  }

  // Play the SAME url in a brand-new Audio(), bypassing ALL React/player logic.
  const freshPlay = () => {
    try {
      if (freshRef.current) {
        try {
          freshRef.current.pause()
        } catch {}
      }
      const a = new Audio(audioUrl)
      a.volume = 1
      a.muted = false
      freshRef.current = a
      a.play().catch((e) => alert('Fresh Audio play() failed: ' + e.name + ': ' + e.message))
    } catch (e) {
      alert('Fresh Audio error: ' + (e?.message || e))
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        right: 8,
        top: 8,
        zIndex: 99999,
        background: 'rgba(10,8,16,0.95)',
        color: '#9effa0',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: 12,
        borderRadius: 10,
        border: '1px solid #333',
        direction: 'ltr',
        maxHeight: '46vh',
        overflow: 'auto',
      }}
    >
      <div style={{ color: '#ffd479', fontWeight: 'bold', marginBottom: 6 }}>
        AUDIO DEBUG (?debug=audio)
      </div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(state, null, 2)}</pre>
      <div style={{ color: '#ffd479', marginTop: 8, fontWeight: 'bold' }}>VERDICT</div>
      <div style={{ color: '#fff', marginBottom: 8 }}>{verdict}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={forceUnmute} style={btn}>
          Force Unmute
        </button>
        <button type="button" onClick={forceVolume} style={btn}>
          Force Volume 100%
        </button>
        <button type="button" onClick={testBeep} style={btn}>
          Test Beep (Web Audio)
        </button>
        <button type="button" onClick={freshPlay} style={btn}>
          Fresh &lt;audio&gt; play()
        </button>
      </div>
      <div style={{ color: '#888', marginTop: 8, fontSize: 11 }}>
        word-pron path:{' '}
        {wordPronInfo ||
          'Tier 1 MP3 via <audio>, Tier 2 Web Speech (speechSynthesis) — Tier 2 bypasses Safari tab-mute'}
      </div>
    </div>
  )
}
