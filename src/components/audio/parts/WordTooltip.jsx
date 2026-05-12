import { useEffect, useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'

export function WordTooltip({ word, definition_ar, ipa, audio_url, example_sentence, image_url, anchorEl, onClose, onMoreInfo }) {
  const [position, setPosition] = useState(null)
  const tooltipRef = useRef(null)
  const audioRef = useRef(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)

  // Position above anchor element
  useEffect(() => {
    if (!anchorEl || !tooltipRef.current) return
    const anchorRect = anchorEl.getBoundingClientRect()
    const tipRect = tooltipRef.current.getBoundingClientRect()

    const sidebar = document.querySelector('aside[role="navigation"]')
    const sidebarLeft = sidebar ? sidebar.getBoundingClientRect().left : window.innerWidth
    const BAR_H = typeof window !== 'undefined' && window.innerWidth < 768 ? 72 : 96

    let x = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2
    let y = anchorRect.top - tipRect.height - 12

    if (x + tipRect.width > sidebarLeft - 8) x = sidebarLeft - tipRect.width - 8
    if (x < 8) x = 8
    if (y < 60) y = anchorRect.bottom + 12
    const maxY = window.innerHeight - BAR_H - tipRect.height - 8
    if (y > maxY) y = maxY

    setPosition({ x, y })
  }, [anchorEl])

  // Word audio playback
  const handlePlayWord = () => {
    if (!audio_url) return
    if (!audioRef.current) {
      audioRef.current = new Audio(audio_url)
      audioRef.current.addEventListener('ended', () => setIsAudioPlaying(false))
      audioRef.current.playsInline = true
    }
    if (isAudioPlaying) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsAudioPlaying(false)
    } else {
      audioRef.current.play().catch(() => setIsAudioPlaying(false))
      setIsAudioPlaying(true)
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!definition_ar && !ipa && !audio_url) return null

  return (
    <>
      {/* Mobile tap-outside backdrop */}
      <div className="fixed inset-0 z-[57] md:hidden" onClick={onClose} />

      <div
        ref={tooltipRef}
        className="rounded-2xl shadow-2xl max-w-[320px] overflow-hidden"
        style={{
          position: 'fixed',
          left: position?.x ?? -9999,
          top: position?.y ?? -9999,
          zIndex: 58,
          background: 'rgba(8,14,28,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Image (if available) */}
        {image_url && (
          <div className="aspect-video bg-white/5 overflow-hidden">
            <img
              src={image_url}
              alt={word}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.target.parentElement.style.display = 'none' }}
            />
          </div>
        )}

        <div className="p-3">
          {/* Word + IPA + audio play */}
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-lg font-bold text-white">{word}</span>
              {ipa && (
                <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-xs text-slate-400 ml-2 font-['Inter']">/{ipa}/</span>
              )}
            </div>
            {audio_url && (
              <button
                onClick={handlePlayWord}
                className="w-9 h-9 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="استمع للكلمة"
              >
                {isAudioPlaying
                  ? <Pause size={15} className="text-sky-300"/>
                  : <Play size={15} className="text-sky-300" style={{ marginLeft: 1 }}/>
                }
              </button>
            )}
          </div>

          {/* Arabic definition */}
          {definition_ar && (
            <p className="text-sm text-slate-200 leading-snug mb-2 font-['Tajawal']" dir="rtl">{definition_ar}</p>
          )}

          {/* Example sentence */}
          {example_sentence && (
            <p dir="ltr" className="text-xs text-slate-400 italic mb-2 leading-relaxed font-['Inter']" style={{ unicodeBidi: 'isolate' }}>
              {example_sentence}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.06]">
            {onMoreInfo ? (
              <button onClick={onMoreInfo} className="text-sky-400 hover:text-sky-300 transition-colors font-['Tajawal']">
                تفاصيل أكثر ←
              </button>
            ) : <span/>}
            <span className="text-slate-600 font-['Tajawal']">اضغط مطوّلاً للتمييز</span>
          </div>
        </div>
      </div>
    </>
  )
}
