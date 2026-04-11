import { Volume2 } from 'lucide-react'

/**
 * المعنى tab — Arabic meaning, English definition, example sentence + translation, audio.
 * This is the default tab and is always present in WordDetailModal.
 */

function Section({ label, children }) {
  return (
    <div className="rounded-xl bg-slate-800/30 border border-slate-800/50 p-4 sm:p-5">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
        {label}
      </div>
      {children}
    </div>
  )
}

function highlightWord(sentence, target) {
  if (!sentence || !target) return sentence
  try {
    const regex = new RegExp(
      `(${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    )
    const parts = sentence.split(regex)
    return parts.map((part, i) =>
      part.toLowerCase() === target.toLowerCase() ? (
        <strong key={i} className="text-sky-300 font-bold">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    )
  } catch {
    return sentence
  }
}

export default function MeaningTab({ word }) {
  const playAudio = (e) => {
    e?.stopPropagation()
    if (!word.audio_url) return
    try {
      new Audio(word.audio_url).play().catch(() => {})
    } catch {}
  }

  const hasAnyContent =
    word.definition_ar ||
    word.definition_en ||
    word.example_sentence

  if (!hasAnyContent) {
    return (
      <p className="text-slate-400 text-sm font-['Tajawal'] text-center py-10">
        لا توجد تفاصيل معنى لهذه الكلمة بعد
      </p>
    )
  }

  return (
    <div dir="rtl" className="space-y-4">
      {word.definition_ar && (
        <Section label="المعنى بالعربي">
          <p className="text-lg sm:text-xl text-slate-100 font-['Tajawal'] leading-relaxed">
            {word.definition_ar}
          </p>
        </Section>
      )}

      {word.definition_en && (
        <Section label="English Definition">
          <p
            dir="ltr"
            className="text-sm sm:text-base text-slate-200 leading-relaxed font-['Inter']"
          >
            {word.definition_en}
          </p>
        </Section>
      )}

      {word.example_sentence && (
        <Section label="مثال">
          <div className="space-y-2">
            <p
              dir="ltr"
              className="text-sm sm:text-base italic text-slate-100 leading-relaxed font-['Inter']"
            >
              {highlightWord(word.example_sentence, word.word)}
            </p>
            {word.example_translation && (
              <p className="text-sm text-slate-400 font-['Tajawal'] leading-relaxed">
                {word.example_translation}
              </p>
            )}
            {word.audio_url && (
              <button
                onClick={playAudio}
                className="mt-1 inline-flex items-center gap-1.5 text-xs text-sky-300 hover:text-sky-200 transition-colors font-['Tajawal']"
              >
                <Volume2 size={14} />
                استمع للمثال
              </button>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}
