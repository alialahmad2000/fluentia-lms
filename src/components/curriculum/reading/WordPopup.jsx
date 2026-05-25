import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Loader2, Check, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { pronounceWord } from '@/lib/audio/pronounceWord'

const POPUP_W = 320
const MARGIN = 16

// Reading editorial rebuild — the dominant interaction. Anchored editorial card
// (not a center modal). Reuses the megafix pronounceWord lib (clean MP3 → Web
// Speech). vocabRow comes from useArticleVocabIndex; null = word not in dictionary.
export default function WordPopup({ word, vocabRow, anchorRect, studentId, unitId, onClose }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  const [audioState, setAudioState] = useState('idle') // idle | loading | curriculum | web_speech | failed
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const play = useCallback(async () => {
    setAudioState('loading')
    try {
      const res = await pronounceWord(word, { studentId })
      if (res?.ok) setAudioState(res.source === 'web_speech' ? 'web_speech' : 'curriculum')
      else if (res?.source === 'web_speech' || res?.reason === 'web_speech') setAudioState('web_speech')
      else setAudioState('failed')
    } catch {
      setAudioState('failed')
    }
  }, [word, studentId])

  // Auto-play once on open (student-requested feel).
  useEffect(() => { play() }, [play])

  // Anchor: below the word if room, else above; clamp horizontally to viewport.
  useLayoutEffect(() => {
    if (!anchorRect) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(POPUP_W, vw - 2 * MARGIN)
    let left = Math.min(Math.max(anchorRect.left, MARGIN), vw - width - MARGIN)
    const belowRoom = vh - anchorRect.bottom
    const placeBelow = belowRoom >= 180
    const top = placeBelow ? anchorRect.bottom + 8 : Math.max(MARGIN, anchorRect.top - 8)
    setPos({ left, top, width, placeBelow })
  }, [anchorRect])

  // Dismiss on outside tap / Escape / scroll-away.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const startY = window.scrollY
    const onScroll = () => { if (Math.abs(window.scrollY - startY) > 200) onClose() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      window.removeEventListener('scroll', onScroll)
    }
  }, [onClose])

  const handleSave = async () => {
    if (saved || saving) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('student_saved_words')
        .insert({
          student_id: studentId,
          word,
          meaning: vocabRow?.definition_ar || null,
          source_unit_id: unitId || null,
          curriculum_vocabulary_id: vocabRow?.id || null,
          source: 'reading',
        })
        .select()
      if (!error) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  if (!pos) return null

  const audioSolid = audioState === 'curriculum'
  const audioBg = audioSolid
    ? 'var(--ds-accent-primary, #e9b949)'
    : 'transparent'
  const audioColor = audioSolid ? '#0a0d14' : 'var(--ds-accent-primary, #e9b949)'

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: pos.placeBelow ? -6 : 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        dir="rtl"
        className="fixed z-[120]"
        style={{
          left: pos.left,
          top: pos.top,
          width: pos.width,
          background: 'var(--ds-bg-elevated, var(--ds-surface-1, #11131c))',
          border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
          borderRadius: 14,
          boxShadow: '0 24px 64px -20px rgba(0,0,0,0.5), 0 8px 24px -12px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px) saturate(140%)',
          padding: '18px 20px',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ color: 'var(--ds-text-tertiary, #64748b)' }}
        >
          <X size={15} />
        </button>

        {/* Word + audio */}
        <div className="flex items-center justify-between gap-3" dir="ltr">
          <div className="min-w-0">
            <div
              style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                fontStyle: 'italic',
                fontSize: 26,
                lineHeight: 1.1,
                color: 'var(--ds-text-primary, #f8fafc)',
              }}
              className="truncate"
            >
              {word}
            </div>
            {vocabRow?.pronunciation_ipa && (
              <div style={{ fontFamily: "'Space Grotesk', monospace", fontSize: 13, color: 'var(--ds-text-tertiary, #64748b)' }}>
                /{vocabRow.pronunciation_ipa.replace(/^\/|\/$/g, '')}/
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={play}
            aria-label={audioState === 'web_speech' ? 'نطق المتصفح' : 'نطق المتعلّم'}
            title={audioState === 'web_speech' ? 'نطق المتصفح' : 'نطق المتعلّم'}
            className="shrink-0 flex items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              width: 48, height: 48,
              background: audioBg,
              color: audioColor,
              border: `1.5px solid var(--ds-accent-primary, #e9b949)`,
            }}
          >
            {audioState === 'loading' ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
          </button>
        </div>

        {/* Meaning */}
        <div className="mt-4">
          <div style={{ fontFamily: "'Space Grotesk', monospace", fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--ds-accent-primary, #e9b949)', opacity: 0.8 }}>
            المعنى
          </div>
          <div className="mt-1.5" style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 17, color: vocabRow?.definition_ar ? 'var(--ds-text-primary, #f8fafc)' : 'var(--ds-text-tertiary, #64748b)' }}>
            {vocabRow?.definition_ar || 'لا توجد ترجمة لهذه الكلمة في القاموس'}
          </div>
        </div>

        {/* Example (vocab only) */}
        {vocabRow?.example_sentence && (
          <div className="mt-3.5" dir="ltr">
            <div style={{ fontFamily: "'Space Grotesk', monospace", fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--ds-text-tertiary, #64748b)' }} dir="rtl">
              في سياق
            </div>
            <p className="mt-1" style={{ fontFamily: "'Readex Pro', sans-serif", fontStyle: 'italic', fontSize: 14, lineHeight: 1.5, color: 'var(--ds-text-secondary, #94a3b8)' }}>
              {vocabRow.example_sentence}
            </p>
          </div>
        )}

        {/* Save to vocab */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium font-['Tajawal'] px-3 py-1.5 transition-colors"
          style={{
            color: saved ? 'var(--ds-accent-success, #22c55e)' : 'var(--ds-accent-primary, #e9b949)',
            border: `1px solid ${saved ? 'rgba(34,197,94,0.4)' : 'rgba(233,185,73,0.4)'}`,
            background: saved ? 'rgba(34,197,94,0.08)' : 'transparent',
          }}
        >
          {saved ? <Check size={14} /> : <Plus size={14} />}
          {saved ? 'محفوظة في مفرداتي' : 'احفظ في مفرداتي'}
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
