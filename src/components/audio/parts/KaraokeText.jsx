import { useRef, useMemo } from 'react'
import { parseFormattedText, tokenizeWords, isWordToken } from '../lib/parseFormattedText'

const LONG_PRESS_MS = 500
const HOVER_DELAY_MS = 300

const HIGHLIGHT_CLASSES = {
  yellow: 'bg-yellow-400/30 border-b-2 border-yellow-400',
  green:  'bg-emerald-400/25 border-b-2 border-emerald-400',
  pink:   'bg-pink-400/25 border-b-2 border-pink-400',
  blue:   'bg-sky-400/25 border-b-2 border-sky-400',
  purple: 'bg-purple-400/25 border-b-2 border-purple-400',
}

/**
 * KaraokeText — renders a passage segment with:
 *   - Paragraph structure + *italic* / **bold** formatting
 *   - Karaoke highlighting (current/past/future) — VISUAL ONLY when enabled
 *   - Tap to seek (onWordTap), long-press to open action menu (onWordLongPress)
 *   - Hover tooltip (desktop) via onWordHover/onWordHoverEnd
 *   - Student highlight colors (highlightLookup map)
 *   - Vocab word marking (vocabSet)
 *
 * PARITY: ALL handlers, data attributes, highlights, vocab underline, and hover
 * are ALWAYS present regardless of karaokeEnabled. The ONLY thing karaokeEnabled
 * controls is the current-word blue bg and past-word fade visual classes.
 */
export function KaraokeText({
  segment, segmentIndex,
  currentWordIndex, karaokeEnabled,
  onWordTap, onWordLongPress,
  onVocabWordTap,   // tap on vocab-highlighted word → instant translation tooltip
  onWordHover, onWordHoverEnd,
  setWordRef,
  large = false,
  highlightLookup,  // Map<`${segIdx}:${wordIdx}`, highlight> — optional
  vocabSet,         // Set<string> lowercase words that are in vocab list — optional
}) {
  const text = segment?.text_content || segment?.text || ''
  const timestamps = segment?.word_timestamps || []
  const paragraphs = useMemo(() => parseFormattedText(text), [text])
  const pressTimers = useRef({})
  const hoverTimers = useRef({})

  if (!segment) return null

  function handlePointerDown(e, wordIdx, word) {
    if (e.button !== undefined && e.button !== 0) return
    const timer = setTimeout(() => {
      delete pressTimers.current[wordIdx]
      try { navigator.vibrate?.(30) } catch {}
      const rect = e.target.getBoundingClientRect()
      onWordLongPress?.(word, segmentIndex, wordIdx, {
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      })
    }, LONG_PRESS_MS)
    pressTimers.current[wordIdx] = { timer, startTime: Date.now() }
  }

  function handlePointerUp(e, wordIdx, word, startMs, isVocabWord) {
    const ref = pressTimers.current[wordIdx]
    if (!ref) return
    clearTimeout(ref.timer)
    delete pressTimers.current[wordIdx]
    if (Date.now() - ref.startTime < LONG_PRESS_MS) {
      if (isVocabWord && onVocabWordTap) {
        const rect = e.target.getBoundingClientRect()
        onVocabWordTap(word, segmentIndex, wordIdx, e.target, {
          x: rect.left + rect.width / 2,
          y: rect.top,
        })
      } else {
        onWordTap?.(word, segmentIndex, wordIdx, startMs ?? 0)
      }
    }
  }

  function handlePointerCancel(wordIdx) {
    const ref = pressTimers.current[wordIdx]
    if (ref) { clearTimeout(ref.timer); delete pressTimers.current[wordIdx] }
  }

  function handleContextMenu(e, wordIdx, word) {
    e.preventDefault()
    const rect = e.target.getBoundingClientRect()
    onWordLongPress?.(word, segmentIndex, wordIdx, {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    })
  }

  function handleMouseEnter(e, word, wordIdx) {
    if (!onWordHover) return
    if (!matchMedia('(hover: hover)').matches) return
    clearTimeout(hoverTimers.current[wordIdx])
    hoverTimers.current[wordIdx] = setTimeout(() => {
      onWordHover(word, segmentIndex, wordIdx, e.target)
    }, HOVER_DELAY_MS)
  }

  function handleMouseLeave(wordIdx) {
    clearTimeout(hoverTimers.current[wordIdx])
    setTimeout(() => onWordHoverEnd?.(), 100)
  }

  const paraBase = large
    ? 'mb-8 leading-[2] text-[19px] md:text-[20px]'
    : 'mb-6 leading-loose text-[17px]'

  let globalIdx = 0

  return (
    <div dir="ltr" style={{ unicodeBidi: 'isolate' }}>
      {paragraphs.map((para, pIdx) => (
        <p key={pIdx} className={paraBase}>
          {para.children.map((inline, iIdx) => {
            const tokens = tokenizeWords(inline.text)
            const Wrapper = inline.type === 'em' ? 'em' : inline.type === 'strong' ? 'strong' : 'span'
            const wrapperCls = inline.type === 'em' ? 'italic text-sky-200' : inline.type === 'strong' ? 'font-semibold text-white' : ''

            const rendered = tokens.map((token, tIdx) => {
              if (!isWordToken(token)) return <span key={tIdx}>{token}</span>

              const idx = globalIdx
              const ts = timestamps[idx]
              const startMs = ts?.start_ms ?? 0
              const wordClean = token.replace(/[.,!?;:'"()[\]]/g, '').toLowerCase()

              // Karaoke visual state — only when karaoke is enabled
              const isCurrent = karaokeEnabled && idx === currentWordIndex
              const isPast    = karaokeEnabled && idx < currentWordIndex

              const highlight = highlightLookup?.get(`${segmentIndex}:${idx}`)
              const isVocab   = vocabSet?.has(wordClean)

              // Visual class priority:
              // 1. Current word (karaoke ON) — blue highlight
              // 2. Past word (karaoke ON) — faded, but still shows student highlight
              // 3. Student highlight — always rendered regardless of karaoke
              // 4. Vocab dotted underline — always rendered regardless of karaoke
              // 5. Default prose color
              let visualCls
              if (isCurrent) {
                visualCls = 'bg-sky-500/25 text-sky-50 font-semibold rounded px-0.5'
              } else if (isPast) {
                visualCls = highlight
                  ? `${HIGHLIGHT_CLASSES[highlight.color] || ''} rounded px-0.5 opacity-70`
                  : 'text-slate-400'
              } else if (highlight) {
                visualCls = `${HIGHLIGHT_CLASSES[highlight.color] || ''} rounded px-0.5`
              } else if (isVocab) {
                visualCls = 'underline decoration-dotted decoration-sky-300/40 underline-offset-4'
              } else {
                visualCls = 'text-slate-100'
              }

              globalIdx++

              return (
                <span
                  key={tIdx}
                  data-word-idx={idx}
                  data-is-vocab={isVocab ? 'true' : undefined}
                  ref={el => setWordRef?.(segmentIndex, idx, el)}
                  className={`${visualCls} cursor-pointer transition-all duration-150 rounded touch-manipulation`}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, idx, wordClean)}
                  onPointerUp={(e) => handlePointerUp(e, idx, wordClean, startMs, isVocab)}
                  onPointerCancel={() => handlePointerCancel(idx)}
                  onContextMenu={(e) => handleContextMenu(e, idx, wordClean)}
                  onMouseEnter={(e) => handleMouseEnter(e, wordClean, idx)}
                  onMouseLeave={() => handleMouseLeave(idx)}
                >
                  {token}
                </span>
              )
            })

            return <Wrapper key={iIdx} className={wrapperCls}>{rendered}</Wrapper>
          })}
        </p>
      ))}
    </div>
  )
}
