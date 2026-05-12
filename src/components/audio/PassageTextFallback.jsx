// Renders passage paragraphs as plain clickable text when no audio is available.
// Matches KaraokeText visual style so it looks consistent with the player.
export function PassageTextFallback({ paragraphs = [], onWordClick }) {
  return (
    <div className="py-2">
      {paragraphs.map((para, pIdx) => (
        <p key={pIdx} className="mb-6 leading-loose text-[17px] text-slate-100" dir="ltr" style={{ unicodeBidi: 'isolate' }}>
          {para.split(/(\s+)/).map((token, i) => {
            const isSpace = /^\s+$/.test(token)
            if (isSpace) return token
            const word = token.replace(/[.,!?;:'"()\[\]]/g, '').trim()
            if (!word || !onWordClick) return <span key={i}>{token}</span>
            return (
              <span
                key={i}
                className="cursor-pointer hover:bg-white/5 rounded transition-colors duration-100"
                onClick={(e) => onWordClick(word.toLowerCase(), 0, e.clientX)}
              >
                {token}
              </span>
            )
          })}
        </p>
      ))}
    </div>
  )
}
