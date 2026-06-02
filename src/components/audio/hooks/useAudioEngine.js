import { useEffect, useRef, useCallback, useState } from 'react'
import { logAudioEvent, classifyPlayError, preflightAudio } from '../../../lib/audio/audioEventLog'

const RATES = [0.5, 0.75, 1.0, 1.25, 1.5]

// Discrete play state machine for diagnostics.
// idle → loading → ready → playing ⇄ paused, with terminal {ended, error}.
// Existing boolean fields (isPlaying, isLoading, error) are still emitted so
// no consumer needs to change; this is purely an additive surface.
export const PLAY_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  BUFFERING: 'buffering',
  ENDED: 'ended',
  ERROR: 'error',
}

export function useAudioEngine({
  audioUrl,
  segments,
  studentId = null,
  playerId = 'player',
  onSegmentComplete,
  onPlaybackComplete,
}) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errorReason, setErrorReason] = useState(null) // classified reason for arabicErrorMessage()
  const [playState, setPlayState] = useState(PLAY_STATES.IDLE)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [volume, setVolumeState] = useState(1)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)

  const segmentsRef = useRef(segments)
  const currentSegIdxRef = useRef(0)
  const onSegmentCompleteRef = useRef(onSegmentComplete)
  const onPlaybackCompleteRef = useRef(onPlaybackComplete)

  useEffect(() => { segmentsRef.current = segments }, [segments])
  useEffect(() => { onSegmentCompleteRef.current = onSegmentComplete }, [onSegmentComplete])
  useEffect(() => { onPlaybackCompleteRef.current = onPlaybackComplete }, [onPlaybackComplete])

  // Stable refs so listener closures + log() callers don't reform on every render.
  const studentIdRef = useRef(studentId)
  const playerIdRef = useRef(playerId)
  useEffect(() => { studentIdRef.current = studentId }, [studentId])
  useEffect(() => { playerIdRef.current = playerId }, [playerId])

  const log = useCallback((event, reason = null, state = null, url = null) => {
    logAudioEvent({
      studentId: studentIdRef.current,
      playerId: playerIdRef.current,
      audioUrl: url ?? audioRef.current?.src ?? null,
      event,
      reason,
      state,
    })
  }, [])

  const isMulti = Array.isArray(segments) && segments.length > 0

  // Derived source URL — the URL the <audio> element should actually be playing.
  // Tracked as a stable value (not the segments array's identity) so the load-source
  // effect below re-runs whenever the underlying source changes, including a new
  // segments[0].audio_url. This is the single source of truth for "what is loaded?".
  const sourceUrl = isMulti ? segments?.[0]?.audio_url ?? null : audioUrl ?? null

  const loadSegment = useCallback((idx) => {
    const audio = audioRef.current
    if (!audio) return
    const segs = segmentsRef.current
    if (!segs || idx >= segs.length) return
    setIsLoading(true)
    setError(null)
    audio.pause()
    audio.src = segs[idx].audio_url
    audio.load()
    audio.playbackRate = playbackRate
  }, [playbackRate])

  // Setup audio element
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.playsInline = true
    // no crossOrigin — plain playback of public Supabase media; no Web Audio API
    // consumes this element, so crossOrigin only forces strict CORS media mode that
    // iOS Safari can silently abort (Chrome is lenient) (WebKit fix, prompt 10)
    audioRef.current = audio

    const onLoadStart = () => {
      setIsLoading(true)
      setPlayState(PLAY_STATES.LOADING)
    }
    const onCanPlay = () => {
      setIsLoading(false)
      // Don't downgrade from PLAYING to READY if media is already playing.
      setPlayState((s) => (s === PLAY_STATES.PLAYING ? s : PLAY_STATES.READY))
    }
    const onTimeUpdate = () => setCurrentTime(audio.currentTime * 1000)
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration * 1000)
    }
    const onPlay = () => {
      setIsPlaying(true)
      setPlayState(PLAY_STATES.PLAYING)
      setError(null)
      setErrorReason(null)
    }
    const onPlaying = () => {
      setIsLoading(false)
      setIsPlaying(true)
      setPlayState(PLAY_STATES.PLAYING)
    }
    const onPause = () => {
      setIsPlaying(false)
      // Only flip to paused if we're not already in a terminal state.
      setPlayState((s) => (s === PLAY_STATES.ENDED || s === PLAY_STATES.ERROR ? s : PLAY_STATES.PAUSED))
    }
    const onError = () => {
      setIsLoading(false)
      setIsPlaying(false)
      setError('load_failed')
      setErrorReason('audio_unavailable')
      setPlayState(PLAY_STATES.ERROR)
      log('media_error', 'audio_unavailable', PLAY_STATES.ERROR)
    }
    const onEnded = () => {
      const segs = segmentsRef.current
      const idx = currentSegIdxRef.current
      if (segs && idx < segs.length - 1) {
        onSegmentCompleteRef.current?.(idx)
        const next = idx + 1
        currentSegIdxRef.current = next
        setCurrentSegmentIndex(next)
        loadSegment(next)
        audio.play().catch((err) => {
          const reason = classifyPlayError(err)
          if (reason !== 'AbortError') log('play_rejected_segment_advance', reason, PLAY_STATES.ERROR)
        })
      } else {
        setIsPlaying(false)
        setPlayState(PLAY_STATES.ENDED)
        onPlaybackCompleteRef.current?.()
      }
    }
    const onWaiting = () => {
      setIsLoading(true)
      setPlayState((s) => (s === PLAY_STATES.PLAYING || s === PLAY_STATES.BUFFERING ? PLAY_STATES.BUFFERING : s))
    }
    const onStalled = () => log('stalled', null, null)

    audio.addEventListener('loadstart', onLoadStart)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('stalled', onStalled)

    return () => {
      audio.pause()
      audio.src = ''
      audio.removeEventListener('loadstart', onLoadStart)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('stalled', onStalled)
      audioRef.current = null
    }
  }, []) // eslint-disable-line

  // Load source whenever the resolved sourceUrl changes (audioUrl, isMulti,
  // or segments[0].audio_url all funnel through sourceUrl). Reactive on segment
  // swaps — previously this effect's deps were [audioUrl, isMulti] and missed
  // segments-array updates, leaving audio.src stale on article change.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    let aborted = false

    setError(null)
    setErrorReason(null)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    currentSegIdxRef.current = 0
    setCurrentSegmentIndex(0)

    if (sourceUrl) {
      setIsLoading(true)
      setPlayState(PLAY_STATES.LOADING)
      audio.src = sourceUrl
      audio.load()

      // Preflight HEAD: surfaces 404 / network errors BEFORE the user
      // taps play. Runs async; if it fails we mark error + log.
      ;(async () => {
        const result = await preflightAudio(sourceUrl)
        if (aborted) return
        if (!result.ok) {
          setError('preflight_failed')
          setErrorReason(result.reason || 'audio_unavailable')
          setPlayState(PLAY_STATES.ERROR)
          log('preflight_failed', result.reason || 'unknown', PLAY_STATES.ERROR, sourceUrl)
        } else {
          log('preflight_ok', null, null, sourceUrl)
        }
      })()
    } else {
      audio.removeAttribute('src')
      audio.load()
      setPlayState(PLAY_STATES.IDLE)
    }

    return () => { aborted = true }
  }, [sourceUrl, log])

  // Awaited play() — classify any rejection + surface Arabic-mappable reason.
  // AbortError (pause raced ahead of play resolving) is intentionally silent.
  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    try {
      const p = audio.play()
      if (p !== undefined) await p
      log('play_ok')
    } catch (err) {
      const reason = classifyPlayError(err)
      if (reason === 'AbortError') return // benign, common when toggling fast
      setError('play_rejected')
      setErrorReason(reason)
      setPlayState(PLAY_STATES.ERROR)
      log('play_rejected', reason, PLAY_STATES.ERROR)
    }
  }, [log])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    log('pause_invoked')
  }, [log])

  const toggle = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      try {
        const p = audio.play()
        if (p !== undefined) await p
      } catch (err) {
        const reason = classifyPlayError(err)
        if (reason === 'AbortError') return
        setError('play_rejected')
        setErrorReason(reason)
        setPlayState(PLAY_STATES.ERROR)
        log('play_rejected_toggle', reason, PLAY_STATES.ERROR)
      }
    } else {
      audio.pause()
    }
  }, [log])

  const seek = useCallback((ms) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, ms / 1000)
  }, [])

  const skip = useCallback((ms) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, audio.currentTime + ms / 1000)
  }, [])

  const setRate = useCallback((rate) => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = rate
    setPlaybackRateState(rate)
  }, [])

  const setVolume = useCallback((vol) => {
    const audio = audioRef.current
    const v = Math.max(0, Math.min(1, vol))
    if (audio) audio.volume = v
    setVolumeState(v)
  }, [])

  const jumpToSegment = useCallback((idx) => {
    const segs = segmentsRef.current
    if (!segs || idx < 0 || idx >= segs.length) return
    currentSegIdxRef.current = idx
    setCurrentSegmentIndex(idx)
    loadSegment(idx)
    audioRef.current?.play().catch(() => {})
  }, [loadSegment])

  const retry = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    setError(null)
    setErrorReason(null)
    setIsLoading(true)
    setPlayState(PLAY_STATES.LOADING)
    audio.load()
    try {
      const p = audio.play()
      if (p !== undefined) await p
      log('retry_ok')
    } catch (err) {
      const reason = classifyPlayError(err)
      if (reason === 'AbortError') return
      setError('play_rejected')
      setErrorReason(reason)
      setPlayState(PLAY_STATES.ERROR)
      log('retry_failed', reason, PLAY_STATES.ERROR)
    }
  }, [log])

  return {
    isPlaying, isLoading, error, errorReason, playState,
    currentTime, duration,
    playbackRate, volume,
    currentSegmentIndex,
    play, pause, toggle, seek, skip,
    setRate, setVolume,
    jumpToSegment, retry,
    RATES,
  }
}
