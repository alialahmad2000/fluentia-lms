import { useState, useRef, useCallback, useEffect } from 'react'
import { WordPopover } from './WordPopover'
import { useWordTimestamps } from './lib/useWordTimestamps'
import { useWordAudio } from './lib/useWordAudio'
import { useUnitVocab } from '../../hooks/useUnitVocab'
import { useTranslateWord } from '../../hooks/useTranslateWord'
import { useSavedWords } from '../../hooks/useSavedWords'
import './passage-vocab.css'

/**
 * Interactive passage renderer.
 *
 * - Vocab words from the unit: gold dashed underline + Arabic meaning always visible inline.
 * - Any word: click to see translation popover + play per-word audio.
 * - Timestamps looked up by position (0-indexed matchable-word count) — same rule used
 *   in useWordTimestamps.js, avoiding drift from punctuation disagreements.
 */
export function InteractivePassage({
  content,
  audioUrl,
  wordTimestampsJson,
  unitId,
  className = '',
}) {
  // ALL hooks before any conditional return
  const [activeWord, setActiveWord] = useState(null)
  const containerRef = useRef(null)
  const { lookup: lookupTimestamp } = useWordTimestamps(wordTimestampsJson)
  const { playWord } = useWordAudio(audioUrl)
  const { lookup: lookupVocab } = useUnitVocab(unitId)
  const { translation, fetchTranslation } = useTranslateWord()
  const { isWordSaved, addWord } = useSavedWords()

  // Close popover on outside click or scroll
  useEffect(() => {
    if (!activeWord) return
    const onMouseDown = (e) => {
      if (!containerRef.current?.contains(e.target)) setActiveWord(null)
    }
    const onScroll = () => setActiveWord(null)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('touchstart', onMouseDown)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('touchstart', onMouseDown)
      window.removeEventListener('scroll', onScroll)
    }
  }, [activeWord])

  const handleWordClick = useCallback((e, { word, position, vocabRow }) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setActiveWord({ text: word, rect, position, isVocab: !!vocabRow, vocabRow })

    // Vocab words already have a known translation — skip the API call
    if (!vocabRow) fetchTranslation(word)

    // Play word audio in parallel with showing popover
    const ts = lookupTimestamp(position, word)
    playWord(word, ts)
  }, [lookupTimestamp, playWord, fetchTranslation])

  const renderParagraph = useCallback((para, paraIdx, posCounterRef) => {
    const tokens = para.split(/(\s+)/)

    return (
      <p key={paraIdx} className="leading-loose text-[var(--text-primary)] mb-5 font-['Inter']" dir="ltr">
        {tokens.map((tok, i) => {
          if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>

          const cleanWord = tok.replace(/[^a-zA-Z']/g, '')
          if (!cleanWord) return <span key={i}>{tok}</span>

          // Only matchable (letter-containing) tokens increment the position counter —
          // same rule as isMatchable() in useWordTimestamps.js
          const position = posCounterRef.current++
          const vocabRow = lookupVocab(cleanWord)
          const isActive = activeWord?.position === position

          if (vocabRow) {
            // Isolate punctuation so the underline stays under the word only
            const leadPunct = tok.match(/^[^a-zA-Z']*/)?.[0] || ''
            const trailPunct = tok.match(/[^a-zA-Z']*$/)?.[0] || ''
            const coreWord = tok.slice(leadPunct.length, tok.length - trailPunct.length || undefined)

            return (
              <span key={i}>
                {leadPunct}
                <span
                  className={`vocab-word${isActive ? ' active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleWordClick(e, { word: cleanWord, position, vocabRow })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click() }}
                >
                  {coreWord}
                  <span className="vocab-word-translation">{vocabRow.meaning_ar}</span>
                </span>
                {trailPunct}
              </span>
            )
          }

          return (
            <span
              key={i}
              className={`regular-word${isActive ? ' active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(e) => handleWordClick(e, { word: cleanWord, position, vocabRow: null })}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click() }}
            >
              {tok}
            </span>
          )
        })}
      </p>
    )
  }, [activeWord, lookupVocab, handleWordClick])

  const paragraphs = (content || '').split(/\n\n+/).filter(Boolean)
  // posCounter is a plain object so renderParagraph can mutate it synchronously
  const posCounter = { current: 0 }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="passage-text text-[16px] sm:text-[17px]">
        {paragraphs.map((p, idx) => renderParagraph(p, idx, posCounter))}
      </div>

      {activeWord && (
        <WordPopover
          word={activeWord.text}
          rect={activeWord.rect}
          translation={
            activeWord.isVocab
              ? { ar: activeWord.vocabRow.meaning_ar, loading: false }
              : translation
          }
          onPlayAudio={() => {
            const ts = lookupTimestamp(activeWord.position, activeWord.text)
            playWord(activeWord.text, ts)
          }}
          onAddToVocab={async () => {
            await addWord({
              word: activeWord.text,
              translation_ar: activeWord.isVocab ? activeWord.vocabRow.meaning_ar : translation.ar,
              source: 'passage',
            })
          }}
          isInVocab={isWordSaved(activeWord.text)}
          onClose={() => setActiveWord(null)}
        />
      )}
    </div>
  )
}
