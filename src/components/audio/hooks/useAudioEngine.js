import { useEffect, useRef, useCallback, useState } from 'react'

const RATES = [0.5, 0.75, 1.0, 1.25, 1.5]

export function useAudioEngine({
  audioUrl,
  segments,
  onSegmentComplete,
  onPlaybackComplete,
}) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
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
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio

    const onCanPlay = () => setIsLoading(false)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime * 1000)
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration * 1000)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onError = () => {
      setIsLoading(false)
      setError('load_failed')
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
        audio.play().catch(() => {})
      } else {
        setIsPlaying(false)
        onPlaybackCompleteRef.current?.()
      }
    }
    const onWaiting = () => setIsLoading(true)

    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('waiting', onWaiting)

    return () => {
      audio.pause()
      audio.src = ''
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('waiting', onWaiting)
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
    setError(null)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    currentSegIdxRef.current = 0
    setCurrentSegmentIndex(0)

    if (sourceUrl) {
      setIsLoading(true)
      audio.src = sourceUrl
      audio.load()
    } else {
      audio.removeAttribute('src')
      audio.load()
    }
  }, [sourceUrl])

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {})
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [])

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

  const retry = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setError(null)
    setIsLoading(true)
    audio.load()
    audio.play().catch(() => {})
  }, [])

  return {
    isPlaying, isLoading, error,
    currentTime, duration,
    playbackRate, volume,
    currentSegmentIndex,
    play, pause, toggle, seek, skip,
    setRate, setVolume,
    jumpToSegment, retry,
    RATES,
  }
}
