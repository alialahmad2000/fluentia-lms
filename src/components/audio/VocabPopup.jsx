import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Volume2, Bookmark, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import SmartAudioPlayer from './SmartAudioPlayer'

// ── Vocab lookup ──────────────────────────────────────────────────────────────
async function lookupVocab(word, readingId) {
  // 1. Exact match in this reading
  const { data: local } = await supabase
    .from('curriculum_vocabulary')
    .select('id, word, definition_ar, example_sentence, pronunciation_ipa, audio_url, image_url, part_of_speech, cefr_level')
    .ilike('word', word)
    .eq('reading_id', readingId)
    .maybeSingle()
  if (local) return { ...local, scope: 'reading' }

  // 2. Global match (any reading), prefer lower CEFR
  const { data: global } = await supabase
    .from('curriculum_vocabulary')
    .select('id, word, definition_ar, example_sentence, pronunciation_ipa, audio_url, image_url, part_of_speech, cefr_level')
    .ilike('word', word)
    .limit(1)
    .maybeSingle()
  if (global) return { ...global, scope: 'global' }

  return null
}

// ── Bottom sheet (mobile) ─────────────────────────────────────────────────────
function MobileSheet({ vocab, word, loading, onClose }) {
  const sheetRef = useRef(null)
  const startYRef = useRef(null)

  const onTouchStart = (e) => { startYRef.current = e.touches[0].clientY }
  const onTouchEnd = (e) => {
    if (startYRef.current === null) return
    const dy = e.changedTouches[0].clientY - startYRef.current
    if (dy > 80) onClose()
    startYRef.current = null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
        style={{ '@media (prefers-reduced-motion: reduce)': { backdropFilter: 'none' } }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl"
        style={{
          background: 'var(--bg-card, #1c1c1e)',
          border: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          animation: 'slideUp 250ms ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <VocabContent vocab={vocab} word={word} loading={loading} onClose={onClose} />
      </div>
    </>
  )
}

// ── Desktop popover ───────────────────────────────────────────────────────────
function DesktopPopover({ vocab, word, loading, onClose, anchorPosition }) {
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Sidebar-aware positioning
  const POPUP_W = 360, POPUP_H = 480, MARGIN = 16
  const BAR_H = typeof window !== 'undefined' && window.innerWidth < 768 ? 72 : 96
  const sidebar = typeof document !== 'undefined'
    ? document.querySelector('aside[role="navigation"]')
    : null
  const sidebarLeft = sidebar ? sidebar.getBoundingClientRect().left : null
  const rightBoundary = sidebarLeft != null ? sidebarLeft - MARGIN : window.innerWidth - MARGIN
  const bottomBoundary = window.innerHeight - BAR_H - MARGIN

  const anchorX = anchorPosition?.x ?? 200
  const anchorY = anchorPosition?.y ?? 200
  let px = anchorX - POPUP_W / 2
  let py = anchorY + 16
  if (px + POPUP_W > rightBoundary) px = rightBoundary - POPUP_W
  if (px < MARGIN) px = MARGIN
  if (py + POPUP_H > bottomBoundary) py = anchorY - POPUP_H - 16
  if (py < MARGIN) py = MARGIN

  const style = {
    position: 'fixed',
    top: py,
    left: px,
    width: POPUP_W,
    zIndex: 60,
    background: 'var(--bg-card, #1c1c1e)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    animation: 'fadeScaleIn 150ms ease-out',
  }

  return (
    <div ref={ref} style={style}>
      <VocabContent vocab={vocab} word={word} loading={loading} onClose={onClose} />
    </div>
  )
}

// ── Shared content ────────────────────────────────────────────────────────────
function VocabContent({ vocab, word, loading, onClose }) {
  return (
    <div className="p-5 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-100" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
            {vocab?.word || word}
          </h2>
          {vocab?.pronunciation_ipa && (
            <p className="text-sm text-slate-400 mt-0.5 font-['Inter']" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
              /{vocab.pronunciation_ipa}/
            </p>
          )}
          {vocab?.part_of_speech && (
            <span className="inline-block text-[11px] px-2 py-0.5 rounded-full mt-1 bg-slate-700/50 text-slate-400 font-['Inter']" dir="ltr">
              {vocab.part_of_speech}
            </span>
          )}
        </div>
        <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors mt-0.5">
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 rounded bg-white/5 w-3/4" />
          <div className="h-3 rounded bg-white/5 w-1/2" />
        </div>
      ) : !vocab ? (
        <p className="text-sm text-slate-400 font-['Tajawal']">
          هذه الكلمة ليست في القاموس بعد. تواصل مع مدرّبك لإضافتها.
        </p>
      ) : (
        <>
          {/* Vocab image */}
          {vocab.image_url && (
            <div className="my-2 rounded-lg overflow-hidden bg-white/5 aspect-video">
              <img
                src={vocab.image_url}
                alt={vocab.word}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { e.target.parentElement.style.display = 'none' }}
              />
            </div>
          )}

          {/* Audio player */}
          {vocab.audio_url && (
            <div className="mt-1">
              <SmartAudioPlayer
                audioUrl={vocab.audio_url}
                contentId={vocab.id}
                contentType="vocab"
                variant="compact"
                features={{ karaoke: false, speedControl: false, skipButtons: false, paragraphNav: false, sentenceNav: false, abLoop: false, bookmarks: false, hideTranscript: false, keyboardShortcuts: false, mobileGestures: false, dictation: false, autoResume: false }}
              />
            </div>
          )}

          {/* Divider */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Definition */}
          {vocab.definition_ar && (
            <div>
              <p className="text-xs text-slate-500 mb-1 font-['Tajawal']">المعنى</p>
              <p className="text-base text-slate-100 font-['Tajawal']">{vocab.definition_ar}</p>
            </div>
          )}

          {/* Example sentence */}
          {vocab.example_sentence && (
            <div>
              <p className="text-xs text-slate-500 mb-1 font-['Tajawal']">مثال</p>
              <p className="text-sm text-slate-300 leading-relaxed font-['Inter'] italic" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                {vocab.example_sentence}
              </p>
            </div>
          )}

          {/* Divider */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => console.log('Save to flashcards not implemented yet', vocab.word)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors font-['Tajawal']"
            >
              <Bookmark size={13} />
              احفظ في مفرداتي
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function VocabPopup({ word, readingId, isOpen, onClose, anchorPosition }) {
  const [vocab, setVocab] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // All hooks before conditional returns
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (!isOpen || !word) return
    let isMounted = true
    setVocab(null)
    setLoading(true)
    lookupVocab(word, readingId).then(result => {
      if (!isMounted) return
      setVocab(result)
      setLoading(false)
    })
    return () => { isMounted = false }
  }, [isOpen, word, readingId])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return isMobile
    ? <MobileSheet vocab={vocab} word={word} loading={loading} onClose={onClose} />
    : <DesktopPopover vocab={vocab} word={word} loading={loading} onClose={onClose} anchorPosition={anchorPosition} />
}
