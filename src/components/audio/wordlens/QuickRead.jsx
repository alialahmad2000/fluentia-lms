import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Star, Check, ChevronDown, Loader2 } from 'lucide-react'

export function QuickRead({
  data,
  isLoading,
  onPlayAudio,
  isPlayingAudio,
  audioTier,
  onSave,
  onUnsave,
  isSaved,
  isSaving,
  onExpand,
}) {
  const [justSaved, setJustSaved] = useState(false)

  // +1 burst animation triggers the moment isSaving flips false AND isSaved became true.
  useEffect(() => {
    if (!isSaving && isSaved) {
      setJustSaved(true)
      const t = setTimeout(() => setJustSaved(false), 900)
      return () => clearTimeout(t)
    }
  }, [isSaving, isSaved])

  const handleSaveClick = () => {
    if (isSaving) return
    if (isSaved) onUnsave()
    else onSave()
  }

  return (
    <div className="p-5 space-y-4" dir="rtl">
      {/* Row 1: word + part_of_speech */}
      <div className="flex items-baseline gap-3" dir="ltr">
        <span
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--ds-text-primary, var(--text-primary))' }}
        >
          {data.word}
        </span>
        {data.part_of_speech && (
          <span
            className="text-xs italic font-['Inter']"
            style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}
          >
            {data.part_of_speech}
          </span>
        )}
      </div>

      {/* Row 2: Arabic translation */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-1" dir="rtl">
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--ds-text-muted, var(--text-muted))' }} />
          <span className="text-sm font-['Tajawal']" style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}>
            جاري الترجمة...
          </span>
        </div>
      ) : data.meaning_ar ? (
        <p
          className="text-xl font-semibold font-['Tajawal'] leading-snug"
          style={{ color: 'var(--ds-text-primary, var(--text-primary))' }}
        >
          {data.meaning_ar}
        </p>
      ) : (
        <p className="text-sm font-['Tajawal']" style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}>
          لا تتوفر ترجمة لهذه الكلمة
        </p>
      )}

      {/* Row 3: button cluster */}
      <div className="flex items-center gap-3">
        {/* Listen */}
        <button
          onClick={onPlayAudio}
          disabled={isPlayingAudio}
          className="flex items-center justify-center gap-2 min-w-11 h-11 px-4 rounded-xl transition-all font-['Tajawal']"
          style={{
            background: isPlayingAudio
              ? 'var(--ds-accent-primary-soft, rgba(56,189,248,0.18))'
              : 'var(--ds-surface-1, rgba(255,255,255,0.04))',
            border: `1.5px solid ${isPlayingAudio
              ? 'var(--ds-accent-primary, var(--accent-sky))'
              : 'var(--ds-card-border, rgba(255,255,255,0.10))'}`,
            color: 'var(--ds-accent-primary, var(--accent-sky))',
          }}
          aria-label="استمع"
          title={audioTier ? `Tier ${audioTier}: ${audioTier === 1 ? 'in-passage slice' : audioTier === 2 ? 'vocab audio' : 'speech synthesis'}` : 'استمع'}
        >
          <Volume2 size={16} strokeWidth={2} />
          <span className="text-sm">استمع</span>
        </button>

        {/* Save / Saved */}
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="relative flex-1 flex items-center justify-center gap-2 min-w-11 h-11 rounded-xl transition-all font-['Tajawal']"
          style={{
            background: isSaved
              ? 'var(--ds-accent-gold-soft, rgba(251,191,36,0.15))'
              : 'var(--ds-surface-1, rgba(255,255,255,0.04))',
            border: `1.5px solid ${isSaved
              ? 'var(--ds-accent-gold, var(--accent-gold))'
              : 'var(--ds-card-border, rgba(255,255,255,0.10))'}`,
            color: isSaved
              ? 'var(--ds-accent-gold, var(--accent-gold))'
              : 'var(--ds-text-secondary, var(--text-secondary))',
          }}
          aria-label={isSaved ? 'محفوظة في قاموسك' : 'احفظ الكلمة'}
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isSaved ? (
            <Check size={16} strokeWidth={2.5} />
          ) : (
            <Star size={16} strokeWidth={2} />
          )}
          <span className="text-sm">{isSaved ? 'محفوظة' : 'احفظ'}</span>
          <AnimatePresence>
            {justSaved && (
              <motion.span
                key="plus-one"
                initial={{ opacity: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: 1, y: -22, scale: 1 }}
                exit={{ opacity: 0, y: -34 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute top-0 text-xs font-bold pointer-events-none"
                style={{
                  insetInlineStart: '50%',
                  transform: 'translateX(-50%)',
                  color: 'var(--ds-accent-gold, var(--accent-gold))',
                }}
                aria-hidden="true"
              >
                +1
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Row 4: expand */}
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-['Tajawal'] transition-colors"
        style={{ color: 'var(--ds-text-muted, var(--text-muted))' }}
      >
        تفاصيل أكثر
        <ChevronDown size={14} />
      </button>
    </div>
  )
}
