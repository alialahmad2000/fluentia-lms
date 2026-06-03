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

function masteryMeta(level) {
  if (level === 'mastered') return { cls: 'is-mastered', label: 'أتقنتِها' }
  if (level === 'learning') return { cls: 'is-learning', label: 'تتعلمينها' }
  return { cls: 'is-new', label: 'جديدة' }
}

export default function Flashcard({ word, mastery, onFlip }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const star = masteryMeta(mastery)

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

  // Bold the target word inside the example sentence.
  // Escape regex metacharacters so a word like "C++" or "(re)do" never throws.
  const renderExample = (sentence, targetWord) => {
    if (!sentence || !targetWord) return sentence
    const safe = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${safe})`, 'gi')
    const parts = sentence.split(regex)
    return parts.map((part, i) =>
      part.toLowerCase() === targetWord.toLowerCase()
        ? <strong key={i} className="font-bold" style={{ color: 'var(--vc-indigo-bright)' }}>{part}</strong>
        : part
    )
  }

  const faceStyle = {
    backfaceVisibility: 'hidden',
    background:
      'radial-gradient(120% 140% at 100% 0%, rgba(129, 140, 248, 0.07), transparent 55%), var(--vc-surface)',
    border: '1px solid var(--vc-border)',
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
          className="absolute inset-0 rounded-[22px] flex flex-col items-center justify-center gap-3 p-6"
          style={faceStyle}
        >
          {/* Mastery star (top corner) */}
          <span
            className={`vc-star ${star.cls} absolute top-4 right-4`}
            title={star.label}
          />

          <span className="vc-word text-[30px] sm:text-[34px] font-bold" style={{ color: 'var(--vc-text)' }}>
            {word.word}
          </span>

          {word.part_of_speech && (
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--vc-surface-2)', color: 'var(--vc-text-dim)' }}>
              {POS_LABELS[word.part_of_speech] || word.part_of_speech}
            </span>
          )}

          {word.audio_url && (
            <button
              onClick={playAudio}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'var(--vc-surface-2)', color: 'var(--vc-indigo-bright)' }}
              aria-label="تشغيل النطق"
            >
              <Volume2 size={20} />
            </button>
          )}

          <span className="absolute bottom-4 text-xs" style={{ color: 'var(--vc-text-dim)' }}>
            اضغطي للقلب
          </span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-[22px] flex flex-col items-center justify-center gap-3 p-6"
          style={{ ...faceStyle, transform: 'rotateY(180deg)' }}
        >
          <span className="text-[24px] sm:text-[28px] font-bold text-center leading-relaxed" style={{ color: 'var(--vc-text)' }}>
            {word.definition_ar}
          </span>

          {word.definition_en && (
            <span className="text-sm text-center max-w-[90%]" style={{ color: 'var(--vc-text-dim)' }}>
              {word.definition_en}
            </span>
          )}

          {word.example_sentence && (
            <p className="text-sm italic text-center max-w-[90%] leading-relaxed" style={{ color: 'var(--vc-text-soft)' }}>
              {renderExample(word.example_sentence, word.word)}
            </p>
          )}

          {word.audio_url && (
            <button
              onClick={playAudio}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'var(--vc-surface-2)', color: 'var(--vc-indigo-bright)' }}
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
