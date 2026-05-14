import { useState, useRef, useCallback, useEffect } from 'react'
import { WordPopover } from './WordPopover'
import { useWordTimestamps } from './lib/useWordTimestamps'
import { useWordAudio } from './lib/useWordAudio'
import { useTranslateWord } from '../../hooks/useTranslateWord'
import { useSavedWords } from '../../hooks/useSavedWords'

export function InteractivePassage({
  content,
  audioUrl,
  wordTimestampsJson,
  className = ''
}) {
  // ALL hooks declared before any conditional return
  const [activeWord, setActiveWord] = useState(null)
  const containerRef = useRef(null)
  const { findByOccurrence } = useWordTimestamps(wordTimestampsJson)
  const { playWord } = useWordAudio(audioUrl)
  const { translation, fetchTranslation } = useTranslateWord()
  const { isWordSaved, addWord } = useSavedWords()

  useEffect(() => {
    if (!activeWord) return
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setActiveWord(null)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [activeWord])

  const renderParagraph = useCallback((para, paraIdx) => {
    const tokens = para.split(/(\s+)/)
    let wordCounter = 0

    return (
      <p key={paraIdx} className="leading-loose text-[var(--text-primary)] mb-4 font-['Inter']" dir="ltr">
        {tokens.map((tok, i) => {
          if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>
          const cleanWord = tok.replace(/[^a-zA-Z']/g, '')
          if (!cleanWord) return <span key={i}>{tok}</span>

          const occurrenceIndex = wordCounter++
          const isActive = activeWord?.text === cleanWord && activeWord?.occurrenceIndex === occurrenceIndex

          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                setActiveWord({ text: cleanWord, rect, occurrenceIndex, originalToken: tok })
                fetchTranslation(cleanWord)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
              }}
              className={`cursor-pointer rounded px-0.5 transition-colors ${
                isActive
                  ? 'bg-sky-500 text-white'
                  : 'hover:bg-sky-500/15 hover:text-[var(--text-primary)]'
              }`}
            >
              {tok}
            </span>
          )
        })}
      </p>
    )
  }, [activeWord, fetchTranslation])

  const paragraphs = (content || '').split(/\n\n+/).filter(Boolean)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="passage-text text-[16px] sm:text-[17px]">
        {paragraphs.map(renderParagraph)}
      </div>

      {activeWord && (
        <WordPopover
          word={activeWord.text}
          rect={activeWord.rect}
          translation={translation}
          onPlayAudio={() => {
            const ts = findByOccurrence(activeWord.text, activeWord.occurrenceIndex)
            playWord(activeWord.text, ts)
          }}
          onAddToVocab={async () => {
            await addWord({
              word: activeWord.text,
              translation_ar: translation.ar,
              source: 'reading_passage'
            })
          }}
          isInVocab={isWordSaved(activeWord.text)}
          onClose={() => setActiveWord(null)}
        />
      )}
    </div>
  )
}
