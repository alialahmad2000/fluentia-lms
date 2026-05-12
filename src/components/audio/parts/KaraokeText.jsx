import { useRef, useMemo, useState, useCallback } from 'react'
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
 *   - Karaoke highlighting (current/past/future)
 *   - Tap to seek (onWordTap), long-press to open action menu (onWordLongPress)
 *   - Hover tooltip (desktop) via onWordHover/onWordHoverEnd
 *   - Student highlight colors (highlightLookup map)
 *   - Vocab word marking (vocabSet)
 *
 * large: premium reading typography (bottom-bar mode)
 */
export function KaraokeText({
  segment, segmentIndex,
  currentWordIndex, karaokeEnabled,
  onWordTap, onWordLongPress,
  onWordHover, onWordHoverEnd,
  setWordRef,
  large = false,
  highlightLookup,  // Map<`${segIdx}:${wordIdx}`, highlight> — optional
  vocabSet,         // Set<string> lowercase words that are in vocab list — optional
}) {
  // All hooks before any conditional returns
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

  function handlePointerUp(e, wordIdx, word, startMs) {
    const ref = pressTimers.current[wordIdx]
    if (!ref) return
    clearTimeout(ref.timer)
    delete pressTimers.current[wordIdx]
    if (Date.now() - ref.startTime < LONG_PRESS_MS) {
      onWordTap?.(word, segmentIndex, wordIdx, startMs ?? 0)
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

  if (!karaokeEnabled || timestamps.length === 0) {
    return (
      <div dir="ltr" style={{ unicodeBidi: 'isolate' }}>
        {paragraphs.map((para, pIdx) => (
          <p key={pIdx} className={`${paraBase} text-slate-100`}>
            {para.children.map((inline, iIdx) => renderInlineNoKaraoke(inline, iIdx))}
          </p>
        ))}
      </div>
    )
  }

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

              const isCurrent = idx === currentWordIndex
              const isPast = idx < currentWordIndex
              const highlight = highlightLookup?.get(`${segmentIndex}:${idx}`)
              const isVocab = vocabSet?.has(wordClean)

              let highlightCls
              if (isCurrent) {
                highlightCls = 'bg-sky-500/25 text-sky-50 font-semibold rounded px-0.5 transition-colors duration-150'
              } else if (highlight) {
                highlightCls = `${HIGHLIGHT_CLASSES[highlight.color] || ''} rounded px-0.5 transition-colors duration-150`
              } else if (isPast) {
                highlightCls = 'text-slate-400 transition-colors duration-150'
              } else {
                highlightCls = 'text-inherit transition-colors duration-150'
              }

              globalIdx++

              return (
                <span
                  key={tIdx}
                  data-word-idx={idx}
                  data-is-vocab={isVocab ? 'true' : undefined}
                  ref={el => setWordRef?.(segmentIndex, idx, el)}
                  className={`${highlightCls} cursor-pointer rounded touch-manipulation`}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, idx, wordClean)}
                  onPointerUp={(e) => handlePointerUp(e, idx, wordClean, startMs)}
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

function renderInlineNoKaraoke(inline, key) {
  if (inline.type === 'em') return <em key={key} className="italic text-sky-200">{inline.text}</em>
  if (inline.type === 'strong') return <strong key={key} className="font-semibold text-white">{inline.text}</strong>
  return <span key={key}>{inline.text}</span>
}
