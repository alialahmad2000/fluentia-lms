import { X, Volume2 } from 'lucide-react'

/**
 * Fixed header for WordDetailModal: word, IPA, POS · Arabic meaning, audio, close, level badge.
 * Always visible above the tab bar and content.
 */

const POS_AR = {
  noun: 'اسم',
  verb: 'فعل',
  adjective: 'صفة',
  adverb: 'ظرف',
  preposition: 'حرف جر',
  conjunction: 'حرف عطف',
  pronoun: 'ضمير',
  interjection: 'تعجب',
  phrase: 'عبارة',
}

const LEVEL_STYLES = {
  1: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  2: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  3: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  4: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  5: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

export default function WordDetailHeader({ word, onClose }) {
  const level = word.difficulty_tier || word.level
  const levelCls = LEVEL_STYLES[level] || ''

  const playAudio = (e) => {
    e?.stopPropagation()
    if (!word.audio_url) return
    try {
      new Audio(word.audio_url).play().catch(() => {})
    } catch {}
  }

  const ipa = word.ipa || word.pronunciation_alert?.ipa || null
  const posLabel = word.part_of_speech
    ? POS_AR[word.part_of_speech.toLowerCase?.()] || word.part_of_speech
    : null

  return (
    <div
      dir="rtl"
      className="relative px-5 sm:px-8 pt-4 pb-5 sm:pt-6 sm:pb-6 border-b border-slate-800/70 shrink-0"
    >
      {/* Close button — top-right visually in RTL (via left-3 to appear on left in LTR DOM) */}
      <button
        onClick={onClose}
        aria-label="إغلاق"
        className="absolute top-3 left-3 sm:top-5 sm:left-5 w-11 h-11 rounded-full bg-slate-800/70 hover:bg-slate-700/80 flex items-center justify-center text-slate-300 hover:text-slate-100 transition-colors"
      >
        <X size={18} />
      </button>

      {/* Level badge — top-left visually in RTL */}
      {level && (
        <span
          className={`absolute top-5 right-5 sm:top-7 sm:right-8 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${levelCls}`}
        >
          L{level}
        </span>
      )}

      <div className="flex flex-col items-center gap-1.5 sm:gap-2 pt-7 sm:pt-2">
        <h2
          dir="ltr"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-50 font-['Inter'] text-center leading-tight"
        >
          {word.word}
        </h2>
        {ipa && (
          <span dir="ltr" className="text-xs sm:text-sm text-slate-400 font-mono">
            {ipa}
          </span>
        )}
        {(posLabel || word.definition_ar) && (
          <div className="flex items-center gap-2 flex-wrap justify-center px-4">
            {posLabel && (
              <span className="text-sm sm:text-base text-slate-300 font-['Tajawal']">
                {posLabel}
              </span>
            )}
            {posLabel && word.definition_ar && <span className="text-slate-500">·</span>}
            {word.definition_ar && (
              <span className="text-sm sm:text-base text-slate-200 font-['Tajawal']">
                {word.definition_ar}
              </span>
            )}
          </div>
        )}
        {word.audio_url && (
          <button
            onClick={playAudio}
            aria-label="تشغيل النطق"
            className="mt-1.5 w-11 h-11 rounded-full bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 flex items-center justify-center transition-colors"
          >
            <Volume2 size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
