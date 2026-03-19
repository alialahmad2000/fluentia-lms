import { useState } from 'react'
import { motion } from 'framer-motion'
import { Volume2 } from 'lucide-react'

const POS_LABELS = {
  noun: 'اسم',
  verb: 'فعل',
  adjective: 'صفة',
  adverb: 'ظرف',
  preposition: 'حرف جر',
  conjunction: 'حرف عطف',
  pronoun: 'ضمير',
  interjection: 'تعجب',
}

export default function Flashcard({ word, onFlip }) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
    onFlip?.(!isFlipped)
  }

  const playAudio = (e) => {
    e.stopPropagation()
    if (!word.audio_url) return
    const audio = new Audio(word.audio_url)
    audio.play().catch(() => {})
  }

  // Bold the word in the example sentence
  const renderExample = (sentence, targetWord) => {
    if (!sentence || !targetWord) return sentence
    const regex = new RegExp(`(${targetWord})`, 'gi')
    const parts = sentence.split(regex)
    return parts.map((part, i) =>
      part.toLowerCase() === targetWord.toLowerCase()
        ? <strong key={i} className="text-sky-400 font-bold">{part}</strong>
        : part
    )
  }

  return (
    <div
      className="relative w-full max-w-[380px] h-[240px] max-sm:max-w-full max-sm:h-[200px] cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={handleFlip}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center gap-3 p-6"
          style={{
            backfaceVisibility: 'hidden',
            background: 'var(--card-bg, rgba(255,255,255,0.05))',
            border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
          }}
        >
          <span className="text-[28px] sm:text-[32px] font-bold text-[var(--text-primary)]">
            {word.word}
          </span>

          {word.part_of_speech && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--muted-bg,rgba(255,255,255,0.08))] text-[var(--text-muted)]">
              {POS_LABELS[word.part_of_speech] || word.part_of_speech}
            </span>
          )}

          {word.audio_url && (
            <button
              onClick={playAudio}
              className="w-11 h-11 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500/30 transition-colors"
              aria-label="تشغيل النطق"
            >
              <Volume2 size={20} />
            </button>
          )}

          <span className="absolute bottom-4 text-xs text-[var(--text-muted)] opacity-60">
            اضغط للقلب
          </span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center gap-3 p-6"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'var(--card-bg, rgba(255,255,255,0.05))',
            border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
          }}
        >
          <span className="text-[24px] sm:text-[28px] font-bold text-[var(--text-primary)] font-[Tajawal] text-center leading-relaxed">
            {word.definition_ar}
          </span>

          {word.definition_en && (
            <span className="text-sm text-[var(--text-muted)] text-center max-w-[90%]">
              {word.definition_en}
            </span>
          )}

          {word.example_sentence && (
            <p className="text-sm italic text-[var(--text-secondary)] text-center max-w-[90%] leading-relaxed">
              {renderExample(word.example_sentence, word.word)}
            </p>
          )}

          {word.audio_url && (
            <button
              onClick={playAudio}
              className="w-11 h-11 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500/30 transition-colors"
              aria-label="تشغيل النطق"
            >
              <Volume2 size={20} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
