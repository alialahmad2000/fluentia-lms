// KaraokeText — renders word-highlighted transcript for one segment
// large=true: premium reading typography (bottom-bar mode)
export function KaraokeText({ segment, segmentIndex, currentWordIndex, karaokeEnabled, onWordClick, setWordRef, large = false }) {
  if (!segment) return null
  const text = segment.text_content || segment.text || ''
  const timestamps = segment.word_timestamps || []

  const paraClass = large
    ? 'mb-8 leading-[2] text-[19px] md:text-[20px] text-slate-100'
    : 'mb-6 leading-loose text-[17px] text-slate-100'

  if (!karaokeEnabled || timestamps.length === 0) {
    return (
      <p className={paraClass} dir="ltr" style={{ unicodeBidi: 'isolate' }}>
        {text}
      </p>
    )
  }

  return (
    <p className={large ? 'mb-8 leading-[2] text-[19px] md:text-[20px]' : 'mb-6 leading-loose text-[17px]'} dir="ltr" style={{ unicodeBidi: 'isolate' }}>
      {timestamps.map((wt, i) => {
        const isPast = i < currentWordIndex
        const isCurrent = i === currentWordIndex
        const cls = isCurrent
          ? 'bg-sky-500/20 text-sky-100 font-semibold rounded px-0.5 transition-colors duration-150'
          : isPast
            ? 'text-slate-400 transition-colors duration-150'
            : 'text-slate-200 transition-colors duration-150'
        return (
          <span
            key={i}
            data-word-idx={i}
            ref={el => setWordRef?.(segmentIndex, i, el)}
            className={`${cls} ${onWordClick ? 'cursor-pointer hover:bg-white/5' : ''}`}
            onClick={onWordClick ? () => onWordClick(wt.word.replace(/[.,!?;:'"()[\]]/g, '').toLowerCase(), segmentIndex, wt.start_ms) : undefined}
          >
            {wt.word}{' '}
          </span>
        )
      })}
    </p>
  )
}
