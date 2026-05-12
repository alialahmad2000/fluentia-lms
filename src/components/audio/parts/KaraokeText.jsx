import { useRef, useMemo } from 'react'
import { parseFormattedText, tokenizeWords, isWordToken } from '../lib/parseFormattedText'

const LONG_PRESS_MS = 500

/**
 * KaraokeText — renders a passage segment with:
 *   - Paragraph structure (split by \n\n)
 *   - Inline *italic* / **bold** formatting
 *   - Per-word karaoke highlighting (current/past/future)
 *   - Tap to seek (onWordTap), long-press to lookup (onWordLongPress)
 *
 * large: use premium reading typography (bottom-bar mode)
 */
export function KaraokeText({
  segment, segmentIndex,
  currentWordIndex, karaokeEnabled,
  onWordTap, onWordLongPress,
  setWordRef,
  large = false,
}) {
  // All hooks before any conditional returns
  const text = segment?.text_content || segment?.text || ''
  const timestamps = segment?.word_timestamps || []
  const paragraphs = useMemo(() => parseFormattedText(text), [text])
  const pressTimers = useRef({})

  if (!segment) return null

  // Long-press handlers
  function handlePointerDown(e, wordIdx, word) {
    if (e.button !== undefined && e.button !== 0) return // ignore right-click on pointerdown
    const timer = setTimeout(() => {
      delete pressTimers.current[wordIdx]
      // Haptic feedback
      try { navigator.vibrate?.(30) } catch {}
      const rect = e.target.getBoundingClientRect()
      onWordLongPress?.(word, segmentIndex, {
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
    const elapsed = Date.now() - ref.startTime
    if (elapsed < LONG_PRESS_MS) {
      // Short tap → seek
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
    onWordLongPress?.(word, segmentIndex, {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    })
  }

  const paraBase = large
    ? 'mb-8 leading-[2] text-[19px] md:text-[20px]'
    : 'mb-6 leading-loose text-[17px]'

  // If karaoke disabled, render with formatting but no highlighting
  if (!karaokeEnabled || timestamps.length === 0) {
    return (
      <div dir="ltr" style={{ unicodeBidi: 'isolate' }}>
        {paragraphs.map((para, pIdx) => (
          <p key={pIdx} className={`${paraBase} text-slate-100`}>
            {para.children.map((inline, iIdx) => {
              const content = renderInlineNoKaraoke(inline)
              return <span key={iIdx}>{content}</span>
            })}
          </p>
        ))}
      </div>
    )
  }

  // Karaoke enabled: assign each word a global index matching timestamps
  let globalIdx = 0

  return (
    <div dir="ltr" style={{ unicodeBidi: 'isolate' }}>
      {paragraphs.map((para, pIdx) => (
        <p key={pIdx} className={paraBase}>
          {para.children.map((inline, iIdx) => {
            const tokens = tokenizeWords(inline.text)
            const Wrapper = inline.type === 'em' ? 'em'
              : inline.type === 'strong' ? 'strong'
              : 'span'
            const wrapperCls = inline.type === 'em' ? 'italic text-sky-200'
              : inline.type === 'strong' ? 'font-semibold text-white'
              : ''

            const rendered = tokens.map((token, tIdx) => {
              if (!isWordToken(token)) {
                // whitespace or pure punctuation — render as-is
                return <span key={tIdx}>{token}</span>
              }

              const idx = globalIdx
              const ts = timestamps[idx]
              const startMs = ts?.start_ms ?? 0
              const wordClean = token.replace(/[.,!?;:'"()[\]]/g, '').toLowerCase()

              const isCurrent = idx === currentWordIndex
              const isPast = idx < currentWordIndex

              const highlightCls = isCurrent
                ? 'bg-sky-500/25 text-sky-50 font-semibold rounded px-0.5 transition-colors duration-150'
                : isPast
                  ? 'text-slate-400 transition-colors duration-150'
                  : 'text-inherit transition-colors duration-150'

              globalIdx++

              return (
                <span
                  key={tIdx}
                  data-word-idx={idx}
                  ref={el => setWordRef?.(segmentIndex, idx, el)}
                  className={`${highlightCls} cursor-pointer rounded touch-manipulation`}
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                  onPointerDown={(e) => handlePointerDown(e, idx, wordClean)}
                  onPointerUp={(e) => handlePointerUp(e, idx, wordClean, startMs)}
                  onPointerCancel={() => handlePointerCancel(idx)}
                  onContextMenu={(e) => handleContextMenu(e, idx, wordClean)}
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

function renderInlineNoKaraoke(inline) {
  if (inline.type === 'em') return <em className="italic text-sky-200">{inline.text}</em>
  if (inline.type === 'strong') return <strong className="font-semibold text-white">{inline.text}</strong>
  return inline.text
}
