// RetentionAudioPlayer — minimal audio player for retention surfaces.
// Used by:
// - Module 1 Daily Partner (AI persona turn playback)
// - Module 5 Lesson Briefs (~30s pre-class / ~45s post-class narration)
//
// Implements the Safari-safe pattern from SKILL.md:
// - Explicit el.src + el.load() on [src] change
// - playsInline attribute
// - try/catch on play() rejection
// - Visible Arabic error state, not silent failure

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'

export default function RetentionAudioPlayer({
  src,
  label,
  autoPlay = false,
  onEnded,
  onPlay,
  onPause,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Reload audio element whenever the src changes
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (!src) {
      el.removeAttribute('src')
      setError(null)
      setProgress(0)
      return
    }
    el.src = src
    el.load()
    setError(null)
    setProgress(0)
    setIsLoading(true)
  }, [src])

  // Auto-play when requested and src is loaded
  useEffect(() => {
    if (!autoPlay) return
    const el = audioRef.current
    if (!el || !src) return
    const tryPlay = async () => {
      try {
        await el.play()
        setIsPlaying(true)
        onPlay?.()
      } catch {
        // Autoplay blocked — user must tap. Not an error worth surfacing.
      }
    }
    const onCanPlay = () => tryPlay()
    el.addEventListener('canplay', onCanPlay, { once: true })
    return () => el.removeEventListener('canplay', onCanPlay)
  }, [autoPlay, src, onPlay])

  const handleToggle = useCallback(async () => {
    const el = audioRef.current
    if (!el || !src) return
    try {
      if (isPlaying) {
        el.pause()
        setIsPlaying(false)
        onPause?.()
      } else {
        await el.play()
        setIsPlaying(true)
        onPlay?.()
      }
    } catch {
      setError('تعذّر تشغيل الصوت — تحقّقي من الاتصال أو حاولي مرة ثانية')
      setIsPlaying(false)
    }
  }, [isPlaying, src, onPlay, onPause])

  const handleRestart = useCallback(async () => {
    const el = audioRef.current
    if (!el || !src) return
    el.currentTime = 0
    setProgress(0)
    try {
      await el.play()
      setIsPlaying(true)
      onPlay?.()
    } catch {
      setIsPlaying(false)
    }
  }, [src, onPlay])

  const onTimeUpdate = useCallback(() => {
    const el = audioRef.current
    if (!el || !el.duration) return
    setProgress((el.currentTime / el.duration) * 100)
  }, [])

  const onLoadedMetadata = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setProgress(100)
    onEnded?.()
  }, [onEnded])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setIsPlaying(false)
    setError('تعذّر تحميل الصوت — تحقّقي من الاتصال')
  }, [])

  const buttonSize = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20

  return (
    <div className={`flex items-center gap-3 ${className}`} dir="rtl">
      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        onPlaying={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
      />

      <motion.button
        type="button"
        onClick={handleToggle}
        disabled={!src || isLoading}
        whileTap={{ scale: 0.94 }}
        className={`${buttonSize} flex items-center justify-center shrink-0 transition`}
        style={{
          background: 'var(--ds-accent-primary)',
          color: 'var(--ds-text-inverse)',
          opacity: !src || isLoading ? 0.6 : 1,
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 6px 18px -8px var(--ds-accent-primary-glow)',
        }}
        aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
      >
        {isPlaying ? <Pause size={iconSize} /> : <Play size={iconSize} />}
      </motion.button>

      <div className="flex-1 min-w-0">
        {label && (
          <div
            className="text-sm font-semibold mb-1.5 truncate"
            style={{ color: 'var(--ds-text-primary)' }}
          >
            {label}
          </div>
        )}
        <div
          className="h-1.5 overflow-hidden"
          style={{
            background: 'var(--ds-surface-2)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <div
            className="h-full transition-[width] duration-150"
            style={{
              width: `${progress}%`,
              background: 'var(--ds-accent-primary)',
              borderRadius: 'var(--radius-full)',
            }}
          />
        </div>
        {error && (
          <div
            className="mt-2 text-xs"
            style={{ color: 'var(--ds-accent-danger)' }}
          >
            {error}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleRestart}
        disabled={!src}
        className="w-8 h-8 flex items-center justify-center opacity-70 hover:opacity-100 transition"
        style={{
          color: 'var(--ds-text-secondary)',
          borderRadius: 'var(--radius-full)',
        }}
        aria-label="إعادة من البداية"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  )
}
