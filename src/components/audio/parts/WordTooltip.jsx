import { useEffect, useState, useRef } from 'react'
import { playAudioSlice } from '../../../lib/playAudioSlice'

export function WordTooltip({
  word, definition_ar, ipa,
  audio_url,            // standard vocab pronunciation (George voice)
  example_sentence, image_url,
  inContextAudio,       // { audioUrl, startMs, endMs, voiceLabel } — null if not in passage
  anchorEl, onClose, onMoreInfo,
}) {
  // All hooks before conditional returns
  const [position, setPosition] = useState(null)
  const tooltipRef   = useRef(null)
  const slicerRef    = useRef(null)   // playAudioSlice handle
  const standardRef  = useRef(null)   // standard <Audio>
  const [playing, setPlaying] = useState(null) // 'context' | 'standard' | null

  // Position above/below anchor element
  useEffect(() => {
    if (!anchorEl || !tooltipRef.current) return
    const anchorRect = anchorEl.getBoundingClientRect()
    const tipRect    = tooltipRef.current.getBoundingClientRect()
    const sidebar    = document.querySelector('aside[role="navigation"]')
    const sidebarLeft = sidebar ? sidebar.getBoundingClientRect().left : window.innerWidth
    const BAR_H = window.innerWidth < 768 ? 72 : 96

    let x = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2
    let y = anchorRect.top - tipRect.height - 12

    if (x + tipRect.width > sidebarLeft - 8) x = sidebarLeft - tipRect.width - 8
    if (x < 8) x = 8
    if (y < 60) y = anchorRect.bottom + 12
    const maxY = window.innerHeight - BAR_H - tipRect.height - 8
    if (y > maxY) y = maxY

    setPosition({ x, y })
  }, [anchorEl])

  // Stop all audio helpers
  function stopAll() {
    if (slicerRef.current) { slicerRef.current.cancel(); slicerRef.current = null }
    if (standardRef.current) { standardRef.current.pause(); standardRef.current.currentTime = 0 }
    setPlaying(null)
  }

  function playInContext() {
    if (!inContextAudio) return
    stopAll()
    setPlaying('context')
    slicerRef.current = playAudioSlice({
      audioUrl: inContextAudio.audioUrl,
      startMs:  inContextAudio.startMs,
      endMs:    inContextAudio.endMs,
      paddingMs: 60,
      onPlayEnd: () => setPlaying(null),
      onError:   () => setPlaying(null),
    })
  }

  function playStandard() {
    if (!audio_url) return
    stopAll()
    setPlaying('standard')
    if (!standardRef.current) {
      standardRef.current = new Audio(audio_url)
      standardRef.current.playsInline = true
      standardRef.current.addEventListener('ended', () => setPlaying(null))
    }
    standardRef.current.play().catch(() => setPlaying(null))
  }

  // Cleanup on unmount
  useEffect(() => () => stopAll(), []) // eslint-disable-line

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!definition_ar && !ipa && !audio_url && !inContextAudio) return null

  const hasAnyAudio = inContextAudio || audio_url

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
          top:  position?.y ?? -9999,
          zIndex: 58,
          background: 'rgba(8,14,28,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Image */}
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
          {/* Word + IPA */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-lg font-bold text-white">{word}</span>
              {ipa && (
                <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="text-xs text-slate-400 ml-2 font-['Inter']">/{ipa}/</span>
              )}
            </div>
          </div>

          {/* Definition */}
          {definition_ar && (
            <p className="text-sm text-slate-200 leading-snug mb-2 font-['Tajawal']" dir="rtl">{definition_ar}</p>
          )}

          {/* Example */}
          {example_sentence && (
            <p dir="ltr" className="text-xs text-slate-400 italic mb-3 leading-relaxed font-['Inter']" style={{ unicodeBidi: 'isolate' }}>
              {example_sentence}
            </p>
          )}

          {/* Audio buttons */}
          {hasAnyAudio && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {inContextAudio && (
                <button
                  onClick={playing === 'context' ? stopAll : playInContext}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all font-['Tajawal'] ${
                    playing === 'context'
                      ? 'bg-sky-500/30 border border-sky-400/50 text-sky-200'
                      : 'bg-sky-500/15 border border-sky-400/30 text-sky-300 hover:bg-sky-500/20'
                  }`}
                  aria-label={`صوت ${inContextAudio.voiceLabel || 'المتحدث'}`}
                >
                  <span>{playing === 'context' ? '⏸' : '🎤'}</span>
                  <span>{playing === 'context' ? 'جارٍ...' : `صوت ${inContextAudio.voiceLabel || 'المتحدث'}`}</span>
                </button>
              )}

              {audio_url && (
                <button
                  onClick={playing === 'standard' ? stopAll : playStandard}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all font-['Tajawal'] ${
                    playing === 'standard'
                      ? 'bg-white/15 border border-white/25 text-white'
                      : 'bg-white/[0.06] border border-white/[0.10] text-slate-300 hover:bg-white/[0.10]'
                  }`}
                  aria-label="نطق قياسي"
                >
                  <span>{playing === 'standard' ? '⏸' : '🔊'}</span>
                  <span>{playing === 'standard' ? 'جارٍ...' : 'نطق قياسي'}</span>
                </button>
              )}
            </div>
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
