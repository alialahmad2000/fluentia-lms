import { useState } from 'react'
import { playWordAudioOnce } from '../../../../lib/audio/wordAudioGate'
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
    playWordAudioOnce(word.audio_url)
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
        ? <strong key={i} className="font-bold" style={{ color: 'var(--vc-sky-bright)' }}>{part}</strong>
        : part
    )
  }

  const posLabel = word.part_of_speech ? (POS_LABELS[word.part_of_speech] || word.part_of_speech) : null

  return (
    <div
      className="relative w-full max-w-[400px] h-[224px] max-sm:max-w-full max-sm:h-[200px] cursor-pointer"
      style={{ perspective: '1200px' }}
      onClick={handleFlip}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front — the "star" */}
        <div
          className={`vc-face ${star.cls} absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 py-7`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="vc-face-glow" />

          {/* Mastery chip (top-start corner) */}
          <span
            className="absolute top-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              insetInlineStart: '0.875rem',
              background: 'var(--vc-surface-2)',
              border: '1px solid var(--vc-border)',
              color: 'var(--vc-text-dim)',
            }}
          >
            <span className={`vc-star ${star.cls}`} style={{ width: 10, height: 10 }} />
            {star.label}
          </span>

          <span className="vc-word relative text-[38px] sm:text-[44px] font-bold leading-none text-center" style={{ color: 'var(--vc-text)' }}>
            {word.word}
          </span>

          {posLabel && (
            <span
              className="relative text-[13px] tracking-[0.14em] uppercase"
              style={{ color: 'var(--vc-text-soft)', fontFamily: "'Cormorant Garamond','Playfair Display',serif" }}
            >
              {posLabel}
            </span>
          )}

          {word.audio_url && (
            <button
              onClick={playAudio}
              className="vc-audio relative w-11 h-11 mt-0.5"
              aria-label="تشغيل النطق"
            >
              <Volume2 size={19} />
            </button>
          )}

          <span className="absolute bottom-3.5 text-xs" style={{ color: 'var(--vc-text-dim)' }}>
            اضغطي للقلب
          </span>
        </div>

        {/* Back — meaning */}
        <div
          className={`vc-face ${star.cls} absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-6 py-7`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="vc-face-glow" />

          <span className="relative text-[24px] sm:text-[27px] font-bold text-center leading-snug" style={{ color: 'var(--vc-text)' }}>
            {word.definition_ar}
          </span>

          {word.definition_en && (
            <span className="relative text-sm text-center max-w-[92%]" style={{ color: 'var(--vc-text-dim)' }} dir="ltr">
              {word.definition_en}
            </span>
          )}

          {word.example_sentence && (
            <p className="relative text-[13px] italic text-center max-w-[92%] leading-relaxed" style={{ color: 'var(--vc-text-soft)' }} dir="ltr">
              {renderExample(word.example_sentence, word.word)}
            </p>
          )}

          {word.audio_url && (
            <button
              onClick={playAudio}
              className="vc-audio relative w-11 h-11 mt-0.5"
              aria-label="تشغيل النطق"
            >
              <Volume2 size={19} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
